const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

process.on('uncaughtException', (err) => {
  fs.writeFileSync(path.join(__dirname, 'crash.log'), err.stack);
  console.error("FATAL ERROR:", err);
});

const Database = require('better-sqlite3');
const express = require('express');
const cors = require('cors');

// --- SUPPRESS HARmless GTK/GLIB WARNINGS ---
const originalStderrWrite = process.stderr.write;
process.stderr.write = function(chunk, encoding, callback) {
  if (typeof chunk === 'string' && chunk.includes('GLib-GObject')) {
    // Ignore harmless GTK warnings
    return true;
  }
  return originalStderrWrite.apply(process.stderr, arguments);
};
// --------------------------------------------

app.disableHardwareAcceleration();
let mainWindow = null;
let expressApp = null;
let server = null;

// ==========================================
// 1. INISIALISASI DATABASE SQLITE
// ==========================================
const dbPath = path.join(app.getPath('userData'), 'nabastala-arsip-v2.sqlite');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      nama_instansi TEXT,
      folder_surat_keluar TEXT,
      folder_surat_masuk TEXT,
      format_nomor_default TEXT,
      manual_folder_selected INTEGER,
      master_pin TEXT,
      counter_surat_keluar INTEGER,
      server_enabled INTEGER DEFAULT 0,
      server_port INTEGER DEFAULT 8080,
      enable_qrcode INTEGER DEFAULT 0,
      convertapi_secret TEXT
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_template TEXT,
      konten TEXT,
      variables TEXT,
      is_docx INTEGER,
      file_name TEXT,
      file_path TEXT,
      ukuran_kertas TEXT,
      kop_surat_path TEXT
    );

    CREATE TABLE IF NOT EXISTS master_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT,
      kategori TEXT,
      attributes TEXT
    );

    CREATE TABLE IF NOT EXISTS outgoing_letters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_surat TEXT,
      nama_template TEXT,
      perihal TEXT,
      nama_file TEXT,
      formData TEXT,
      konten TEXT,
      file_path TEXT,
      is_docx INTEGER,
      folder_tersimpan TEXT,
      created_at TEXT,
      status TEXT DEFAULT 'Draf'
    );

    CREATE TABLE IF NOT EXISTS incoming_archives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_surat TEXT,
      perihal TEXT,
      tanggal_diterima TEXT,
      pengirim TEXT,
      file_name TEXT,
      folder_tersimpan TEXT,
      file_path TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      waktu TEXT,
      aktivitas TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT,
      role TEXT DEFAULT 'operator',
      nama_lengkap TEXT DEFAULT 'Pengguna'
    );
  `);

  // Migrations for existing databases
  try { db.exec("ALTER TABLE settings ADD COLUMN enable_qrcode INTEGER DEFAULT 0;"); } catch(e) {}
  try { db.exec("ALTER TABLE settings ADD COLUMN convertapi_secret TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'operator';"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN nama_lengkap TEXT DEFAULT 'Pengguna';"); } catch(e) {}
  try { db.exec("ALTER TABLE outgoing_letters ADD COLUMN status TEXT DEFAULT 'Draf';"); } catch(e) {}

  // Update existing admin to be admin role if just migrated
  try { db.prepare("UPDATE users SET role = 'admin' WHERE username = 'admin' AND role = 'operator'").run(); } catch(e) {}

  // Seed default settings
  const settingsCount = db.prepare('SELECT count(*) as count FROM settings').get();
  if (settingsCount.count === 0) {
    db.exec(`
      INSERT INTO settings (id, nama_instansi, folder_surat_keluar, folder_surat_masuk, format_nomor_default, manual_folder_selected, master_pin, counter_surat_keluar, server_enabled, server_port, enable_qrcode, convertapi_secret)
      VALUES (
        'config', 
        'Sistem Arsip Internal', 
        'D:/data/surat/keluar', 
        'D:/data/surat/masuk', 
        'SURAT-{NO_URUT}/{BULAN_ROMAWI}/{TAHUN}', 
        0, 
        '123456', 
        0, 
        0, 
        8080, 
        0,
        ''
      )
    `);
  }

  // Migrasi incoming_archives
  try {
    const tableInfo = db.prepare("PRAGMA table_info(incoming_archives)").all();
    const columns = tableInfo.map(c => c.name);
    if (!columns.includes('perihal')) {
      db.prepare("ALTER TABLE incoming_archives RENAME COLUMN judul_surat TO perihal").run();
    }
    if (!columns.includes('folder_tersimpan')) {
      db.prepare("ALTER TABLE incoming_archives RENAME COLUMN kategori TO folder_tersimpan").run();
    }
    if (!columns.includes('file_name')) {
      db.prepare("ALTER TABLE incoming_archives ADD COLUMN file_name TEXT").run();
    }
  } catch (e) {
    console.log("Migration incoming_archives error:", e);
  }

  // Seed user
  const userCount = db.prepare('SELECT count(*) as count FROM users').get();
  if (userCount.count === 0) {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', '123', 'admin');
  }
}
initDatabase();

// Helper Logger
function addAuditLog(aktivitas) {
  try {
    db.prepare('INSERT INTO audit_logs (waktu, aktivitas) VALUES (?, ?)').run(new Date().toLocaleString('id-ID'), aktivitas);
  } catch (e) {
    console.error('Gagal log:', e);
  }
}

// ==========================================
// 2. EXPRESS.JS WEB SERVER (API + STATIC FILES)
// ==========================================
function startExpressServer(port) {
  if (server) return; // Sudah berjalan

  expressApp = express();
  expressApp.use(cors());
  expressApp.use(express.json({ limit: '50mb' })); // Terima payload besar untuk base64

  // Melayani file statis Frontend React
  const distPath = path.join(__dirname, '../..', 'dist'); // Path ke build vite
  if (fs.existsSync(distPath)) {
    expressApp.use(express.static(distPath));
  }

  // --- API ROUTING ---
  
  // Settings API
  expressApp.get('/api/settings', (req, res) => {
    const data = db.prepare("SELECT * FROM settings LIMIT 1").get();
    res.json(data || {});
  });
  expressApp.post('/api/settings', (req, res) => {
    const { nama_instansi, folder_surat_keluar, folder_surat_masuk, format_nomor_default, manual_folder_selected, master_pin, counter_surat_keluar, server_enabled, server_port, enable_qrcode, convertapi_secret } = req.body;
    
    // First ensure there is at least one row
    const count = db.prepare('SELECT count(*) as count FROM settings').get();
    if (count.count === 0) {
      db.prepare(`INSERT INTO settings (id, counter_surat_keluar) VALUES ('config', 0)`).run();
    }
    
    db.prepare(`
      UPDATE settings SET 
        nama_instansi = ?, folder_surat_keluar = ?, folder_surat_masuk = ?, format_nomor_default = ?, 
        manual_folder_selected = ?, master_pin = ?, counter_surat_keluar = ?, server_enabled = ?, server_port = ?, enable_qrcode = ?, convertapi_secret = ?
    `).run(nama_instansi, folder_surat_keluar, folder_surat_masuk, format_nomor_default, manual_folder_selected ? 1 : 0, master_pin, counter_surat_keluar, server_enabled ? 1 : 0, server_port, enable_qrcode ? 1 : 0, convertapi_secret || '');
    
    res.json({ success: true });
  });

  // Auth API
  expressApp.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (user && user.password === password) {
      addAuditLog(`Login berhasil: ${username}`);
      res.json({ success: true, role: user.role || 'operator', nama_lengkap: user.nama_lengkap || 'Pengguna' });
    } else {
      addAuditLog(`Percobaan login gagal untuk: ${username}`);
      res.status(401).json({ error: 'Unauthorized' });
    }
  });

  // Users API (RBAC)
  expressApp.get('/api/users', (req, res) => {
    const data = db.prepare('SELECT username, role, nama_lengkap FROM users').all();
    res.json(data);
  });
  expressApp.post('/api/users', (req, res) => {
    const { username, password, role, nama_lengkap } = req.body;
    // Check if exists
    const existing = db.prepare('SELECT username FROM users WHERE username = ?').get(username);
    if (existing) {
       // Update
       if (password && password.trim() !== '') {
          db.prepare('UPDATE users SET password = ?, role = ?, nama_lengkap = ? WHERE username = ?').run(password, role, nama_lengkap || 'Pengguna', username);
       } else {
          db.prepare('UPDATE users SET role = ?, nama_lengkap = ? WHERE username = ?').run(role, nama_lengkap || 'Pengguna', username);
       }
       addAuditLog(`Mengubah pengguna: ${username}`);
    } else {
       // Insert
       db.prepare('INSERT INTO users (username, password, role, nama_lengkap) VALUES (?, ?, ?, ?)').run(username, password, role, nama_lengkap || 'Pengguna');
       addAuditLog(`Menambahkan pengguna baru: ${username} (${role})`);
    }
    res.json({ success: true });
  });
  expressApp.delete('/api/users/:username', (req, res) => {
    if (req.params.username === 'admin') return res.status(400).json({ error: 'Cannot delete admin' });
    db.prepare('DELETE FROM users WHERE username = ?').run(req.params.username);
    addAuditLog(`Menghapus pengguna: ${req.params.username}`);
    res.json({ success: true });
  });

  // Dashboard Stats API
  expressApp.get('/api/dashboard/stats', (req, res) => {
    const total_outgoing = db.prepare('SELECT count(*) as c FROM outgoing_letters').get().c;
    const total_incoming = db.prepare('SELECT count(*) as c FROM incoming_archives').get().c;
    const total_templates = db.prepare('SELECT count(*) as c FROM templates').get().c;
    
    // Get monthly counts for the current year
    const year = new Date().getFullYear().toString();
    const outgoing_monthly = db.prepare("SELECT strftime('%m', created_at) as month, count(*) as count FROM outgoing_letters WHERE strftime('%Y', created_at) = ? GROUP BY month").all(year);
    const incoming_monthly = db.prepare("SELECT strftime('%m', created_at) as month, count(*) as count FROM incoming_archives WHERE strftime('%Y', created_at) = ? GROUP BY month").all(year);
    
    const chartData = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for(let i=1; i<=12; i++) {
       const mStr = i.toString().padStart(2, '0');
       const outItem = outgoing_monthly.find(x => x.month === mStr);
       const incItem = incoming_monthly.find(x => x.month === mStr);
       chartData.push({
          name: months[i-1],
          outgoing: outItem ? outItem.count : 0,
          incoming: incItem ? incItem.count : 0
       });
    }

    res.json({
       total_outgoing,
       total_incoming,
       total_templates,
       chartData
    });
  });

  // Master Data API
  expressApp.get('/api/master', (req, res) => {
    const data = db.prepare('SELECT * FROM master_data').all();
    // Parse attributes JSON
    const parsedData = data.map(d => ({ ...d, attributes: JSON.parse(d.attributes || '{}') }));
    res.json(parsedData);
  });

  // Opsi 2 Template Injection
  expressApp.post('/api/inject-opsi2', (req, res) => {
    try {
      const existing = db.prepare("SELECT id FROM templates WHERE nama_template = 'Surat Keterangan (HTML Sempurna)'").get();
      if (!existing) {
        const htmlContent = `<div class="surat-container" style="font-family:'Times New Roman',Times,serif;color:#000;">
  <table class="kop-table">
    <tr>
      <td class="kop-logo">
        <img src="https://via.placeholder.com/75x75.png?text=LOGO" style="width:75px;height:auto;" alt="Logo" />
      </td>
      <td class="kop-text">
        <h3>YAYASAN KYAI HAJI SUFYAN TSAURI</h3>
        <h3>SEKOLAH MENENGAH PERTAMA</h3>
        <h2>SMP ISLAM CARUY</h2>
        <p><b>STATUS TERAKREDITASI A &nbsp;|&nbsp; NPSN : 20300483</b></p>
        <p>Alamat : Jl. Masjid Karang Jambu Caruy PO.BOX. 16 Majenang 53257 Cilacap</p>
        <p>Email : smpislamcaruy85@gmail.com</p>
      </td>
    </tr>
  </table>
  <div class="judul-surat">
    <u>SURAT KETERANGAN</u><br>
    Nomor : {nomor_surat}
  </div>
  <p style="text-align: justify; text-indent: 30px;">
    Yang bertanda tangan di bawah ini Kepala SMP Islam Caruy Kecamatan Cipari Kabupaten Cilacap, dengan ini menerangkan bahwa :
  </p>
  <table class="bio-table">
    <tr><td style="width: 180px;">Nama</td><td style="width: 15px;">:</td><td><b>{nama}</b></td></tr>
    <tr><td>Jenis Kelamin</td><td>:</td><td>{jenis_kelamin}</td></tr>
    <tr><td>NIS / NISN</td><td>:</td><td>{nipd} / {nisn}</td></tr>
    <tr><td>Tempat / Tgl Lahir</td><td>:</td><td>{tempat_lahir}, {tanggal_lahir}</td></tr>
    <tr><td>Kelas</td><td>:</td><td>{kelas}</td></tr>
    <tr><td>Nama Orang Tua</td><td>:</td><td></td></tr>
    <tr><td style="padding-left: 20px;">a. Ayah</td><td>:</td><td>{nama_ayah}</td></tr>
    <tr><td style="padding-left: 20px;">b. Ibu</td><td>:</td><td>{nama_ibu}</td></tr>
    <tr><td>Alamat</td><td>:</td><td>{jalan} RT {rt} / RW {rw} Dusun {dusun}, {desa}</td></tr>
  </table>
  <p style="text-align: justify;">
    Nama tersebut di atas terdaftar sebagai siswa aktif di SMP Islam Caruy Kec. Cipari, Kab. Cilacap pada tahun pelajaran 2025/2026.
  </p>
  <p style="text-align: justify;">
    Demikian Surat Keterangan ini kami buat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
  </p>
  <table class="ttd-table">
    <tr>
      <td style="width: 60%;"></td>
      <td style="width: 40%; text-align: left;">
        Caruy, {tanggal_pengesahan}<br>
        Kepala Sekolah,<br><br><br><br><br>
        <b><u>GHULAM AHMAD, S.T.P.</u></b>
      </td>
    </tr>
  </table>
</div>`;
        const variables = ["nomor_surat", "nama", "jenis_kelamin", "nipd", "nisn", "tempat_lahir", "tanggal_lahir", "kelas", "nama_ayah", "nama_ibu", "jalan", "rt", "rw", "dusun", "desa", "tanggal_pengesahan"];
        db.prepare("INSERT INTO templates (nama_template, konten, variables, is_docx) VALUES (?, ?, ?, ?)").run('Surat Keterangan (HTML Sempurna)', htmlContent, JSON.stringify(variables), 0);
      }
      res.json({ success: true });
    } catch (e) {
      console.error("Inject Opsi 2 Error:", e);
      res.status(500).json({ error: e.message, stack: e.stack });
    }
  });
  expressApp.post('/api/master', (req, res) => {
    const { nama, kategori, attributes } = req.body;
    const info = db.prepare('INSERT INTO master_data (nama, kategori, attributes) VALUES (?, ?, ?)').run(nama, kategori, JSON.stringify(attributes || {}));
    addAuditLog(`Menambahkan Master Data Entitas: ${nama}`);
    res.json({ id: info.lastInsertRowid });
  });
  expressApp.delete('/api/outgoing/:id', (req, res) => {
    db.prepare('DELETE FROM outgoing_letters WHERE id = ?').run(req.params.id);
    addAuditLog(`Menghapus Surat Keluar ID: ${req.params.id}`);
    res.json({ success: true });
  });
  expressApp.put('/api/outgoing/:id/file', (req, res) => {
    const { file_name, file_path } = req.body;
    db.prepare('UPDATE outgoing_letters SET file_name = ?, file_path = ? WHERE id = ?').run(file_name, file_path, req.params.id);
    res.json({ success: true });
  });
  expressApp.put('/api/incoming/:id/file', (req, res) => {
    const { file_name, file_path } = req.body;
    db.prepare('UPDATE incoming_archives SET file_name = ?, file_path = ? WHERE id = ?').run(file_name, file_path, req.params.id);
    res.json({ success: true });
  });
  expressApp.delete('/api/master/:id', (req, res) => {
    db.prepare('DELETE FROM master_data WHERE id = ?').run(req.params.id);
    addAuditLog(`Menghapus Master Data ID: ${req.params.id}`);
    res.json({ success: true });
  });
  expressApp.delete('/api/master/bulk/all', (req, res) => {
    db.prepare('DELETE FROM master_data').run();
    addAuditLog('Menghapus SELURUH Master Data');
    res.json({ success: true });
  });
  expressApp.post('/api/master/bulk/delete', (req, res) => {
    const { ids } = req.body;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM master_data WHERE id IN (${placeholders})`).run(ids);
      addAuditLog(`Menghapus ${ids.length} Master Data secara massal`);
    }
    res.json({ success: true });
  });

  // Templates API
  expressApp.get('/api/templates', (req, res) => {
    const data = db.prepare('SELECT * FROM templates').all();
    const parsed = data.map(d => {
      let base64 = null;
      if (d.is_docx === 1 && d.file_path && fs.existsSync(d.file_path)) {
        base64 = fs.readFileSync(d.file_path, { encoding: 'base64' });
      }
      return { 
        ...d, 
        variables: JSON.parse(d.variables || '[]'), 
        is_docx: d.is_docx === 1,
        file_base64: base64
      };
    });
    res.json(parsed);
  });
  expressApp.post('/api/templates', (req, res) => {
    const { id, nama_template, konten, variables, is_docx, file_name, file_base64, ukuran_kertas, kop_surat_base64 } = req.body;
    
    let file_path = '';
    let kop_surat_path = '';
    const folderArsip = path.join(app.getPath('userData'), 'Berkas_Arsip');
    if (!fs.existsSync(folderArsip)) fs.mkdirSync(folderArsip, { recursive: true });

    if (file_base64 && file_base64.trim() !== '') {
      const safeName = `${Date.now()}_${(file_name || 'template.docx').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      file_path = path.join(folderArsip, safeName);
      fs.writeFileSync(file_path, Buffer.from(file_base64.replace(/^data:.*,/, ''), 'base64'));
    }

    if (kop_surat_base64 && kop_surat_base64.trim() !== '') {
      const safeNameKop = `${Date.now()}_kop_surat.png`;
      kop_surat_path = path.join(folderArsip, safeNameKop);
      fs.writeFileSync(kop_surat_path, Buffer.from(kop_surat_base64.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64'));
    }

    if (id) {
      // UPDATE MODE
      const existing = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
      if (existing) {
        const finalFilePath = file_path ? file_path : existing.file_path;
        const finalKopPath = kop_surat_path ? kop_surat_path : existing.kop_surat_path;
        // Keep the old file_name if not updating docx
        const finalFileName = file_base64 ? file_name : existing.file_name;

        db.prepare(`
          UPDATE templates 
          SET nama_template = ?, konten = ?, variables = ?, is_docx = ?, file_name = ?, file_path = ?, ukuran_kertas = ?, kop_surat_path = ?
          WHERE id = ?
        `).run(nama_template, konten, JSON.stringify(variables || []), is_docx ? 1 : 0, finalFileName, finalFilePath, ukuran_kertas, finalKopPath, id);
        addAuditLog(`Mengubah Template Surat: ${nama_template}`);
        return res.json({ id: id });
      }
    }

    // INSERT MODE
    const info = db.prepare(`
      INSERT INTO templates (nama_template, konten, variables, is_docx, file_name, file_path, ukuran_kertas, kop_surat_path) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(nama_template, konten, JSON.stringify(variables || []), is_docx ? 1 : 0, file_name, file_path, ukuran_kertas, kop_surat_path);
    addAuditLog(`Menyimpan Template Surat Baru: ${nama_template}`);
    res.json({ id: info.lastInsertRowid });
  });
  expressApp.delete('/api/templates/:id', (req, res) => {
    db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Outgoing Letters API
  expressApp.get('/api/outgoing', (req, res) => {
    const data = db.prepare('SELECT * FROM outgoing_letters').all();
    const parsed = data.map(d => ({ ...d, formData: JSON.parse(d.formData || '{}'), is_docx: d.is_docx === 1 }));
    res.json(parsed);
  });
  expressApp.post('/api/outgoing', (req, res) => {
    const { nomor_surat, nama_template, perihal, nama_file, formData, konten, file_path, is_docx, folder_tersimpan, file_base64 } = req.body;
    
    let finalFilePath = file_path || '';

    // Auto-fix for WSL/Linux environments running with Windows Paths
    let targetDir = folder_tersimpan;
    if (targetDir && process.platform !== 'win32') {
      targetDir = targetDir
        .replace(/^\\\\wsl\.localhost\\[^\\]+/, '')
        .replace(/^([A-Za-z]):[\\/]/, (match, drive) => {
          return `/mnt/${drive.toLowerCase()}/`;
        }).replace(/\\/g, '/');
    }

    // Jika ada base64 (DOCX murni dari generateNativeDocx), tulis file fisiknya!
    if (is_docx && file_base64 && targetDir) {
      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        finalFilePath = path.join(targetDir, `${nama_file}.docx`);
        const base64Data = file_base64.replace(/^data:.*,/, '');
        fs.writeFileSync(finalFilePath, Buffer.from(base64Data, 'base64'));
      } catch (err) {
        console.error("Gagal menyimpan fisik DOCX:", err);
      }
    } else if (!is_docx && konten && targetDir) {
      // Fallback: Tulis file HTML sebagai .doc untuk template editor biasa
      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        finalFilePath = path.join(targetDir, `${nama_file}.doc`);
        const header = "<html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' " +
          "xmlns:w='urn:schemas-microsoft-com:office:word' " +
          "xmlns='http://www.w3.org/TR/REC-html40'>" +
          "<head><meta charset='utf-8'><title>" + (nomor_surat || 'Surat') + "</title>" +
          "<style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;margin:2cm;}</style></head><body>";
        const formattedBody = konten.replace(/\n/g, '<br/>');
        const footer = "</body></html>";
        const sourceHTML = header + formattedBody + footer;
        fs.writeFileSync(finalFilePath, '\ufeff' + sourceHTML, 'utf8');
      } catch (err) {
        console.error("Gagal menyimpan fisik DOC (HTML):", err);
      }
    }

    const info = db.prepare(`
      INSERT INTO outgoing_letters (nomor_surat, nama_template, perihal, nama_file, formData, konten, file_path, is_docx, folder_tersimpan, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(nomor_surat, nama_template, perihal, nama_file, JSON.stringify(formData || {}), konten, finalFilePath, is_docx ? 1 : 0, folder_tersimpan, new Date().toISOString());
    
    // Auto-increment counter (using COALESCE to handle NULL values)
    try {
      const updateRes = db.prepare("UPDATE settings SET counter_surat_keluar = COALESCE(counter_surat_keluar, 0) + 1").run();
      console.log("Auto-increment settings update result:", updateRes);
    } catch (dbErr) {
      console.error("Gagal auto-increment counter:", dbErr);
    }
    addAuditLog(`Membuat Surat Keluar No: ${nomor_surat}`);
    res.json({ id: info.lastInsertRowid });
  });
  // Update Status Outgoing Letter
  expressApp.post('/api/outgoing/:id/status', (req, res) => {
    const { status } = req.body;
    db.prepare('UPDATE outgoing_letters SET status = ? WHERE id = ?').run(status, req.params.id);
    addAuditLog(`Memperbarui status surat keluar ID ${req.params.id} menjadi: ${status}`);
    res.json({ success: true });
  });

  // Download File API (Untuk Arsip)
  expressApp.get('/api/download', (req, res) => {
    const filePath = req.query.path;
    if (filePath && fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: 'File tidak ditemukan di server.' });
    }
  });

  expressApp.post('/api/convert-pdf', express.json(), async (req, res) => {
    const { file_path } = req.body;
    if (!file_path || !fs.existsSync(file_path)) {
      return res.status(404).json({ error: 'File tidak ditemukan.' });
    }

    try {
      const settings = db.prepare("SELECT convertapi_secret FROM settings LIMIT 1").get();
      if (!settings || !settings.convertapi_secret) {
        return res.status(400).json({ error: 'ConvertAPI Secret belum diatur di Pengaturan.' });
      }

      const fileBuffer = fs.readFileSync(file_path);
      const fileName = path.basename(file_path);

      // We use the simpler binary upload method since FormData requires Blob which might not be fully standard in all Node versions
      const response = await fetch(`https://v2.convertapi.com/convert/docx/to/pdf?Secret=${settings.convertapi_secret}&StoreFile=true`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${fileName}"`
        },
        body: fileBuffer
      });

      const result = await response.json();

      if (response.ok && result.Files && result.Files.length > 0) {
         const fileData = result.Files[0].FileData;
         const pdfBuffer = Buffer.from(fileData, 'base64');
         
         // Set response headers to trigger file download
         res.setHeader('Content-Type', 'application/pdf');
         res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace('.docx', '.pdf')}"`);
         res.send(pdfBuffer);
      } else {
         throw new Error(result.Message || 'Konversi gagal');
      }

    } catch (err) {
      console.error("PDF Conversion Error:", err);
      res.status(500).json({ error: err.message || 'Terjadi kesalahan saat mengonversi PDF.' });
    }
  });

  expressApp.delete('/api/outgoing/:id', (req, res) => {
    db.prepare('DELETE FROM outgoing_letters WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Incoming Archives API
  expressApp.get('/api/incoming', (req, res) => {
    res.json(db.prepare('SELECT * FROM incoming_archives').all());
  });
  expressApp.post('/api/incoming', (req, res) => {
    const { id, nomor_surat, perihal, tanggal_diterima, pengirim, file_name, folder_tersimpan, file_path } = req.body;
    const tgl = tanggal_diterima || new Date().toISOString().split('T')[0];
    
    let info;
    if (id) {
      info = db.prepare(`
        UPDATE incoming_archives 
        SET nomor_surat = ?, perihal = ?, tanggal_diterima = ?, pengirim = ?, file_name = ?, folder_tersimpan = ?, file_path = ?
        WHERE id = ?
      `).run(nomor_surat, perihal, tgl, pengirim, file_name, folder_tersimpan, file_path, id);
      addAuditLog(`Mengupdate Surat Masuk No: ${nomor_surat}`);
      res.json({ id: id, updated: true });
    } else {
      info = db.prepare(`
        INSERT INTO incoming_archives (nomor_surat, perihal, tanggal_diterima, pengirim, file_name, folder_tersimpan, file_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(nomor_surat, perihal, tgl, pengirim, file_name, folder_tersimpan, file_path, new Date().toISOString());
      addAuditLog(`Mengarsipkan Surat Masuk No: ${nomor_surat}`);
      res.json({ id: info.lastInsertRowid });
    }
  });
  expressApp.delete('/api/incoming/:id', (req, res) => {
    db.prepare('DELETE FROM incoming_archives WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Audit Logs API
  expressApp.get('/api/logs', (req, res) => {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC').all();
    res.json(logs);
  });

  // Backup Database Endpoint
  expressApp.get('/api/backup', (req, res) => {
    // Return the sqlite file
    res.download(dbPath, 'nabastala-arsip-v2_backup.sqlite');
    addAuditLog('Melakukan Backup Database');
  });

  // Since restore requires file upload and we only have express.json(), 
  // it's better to handle restore via IPC to let user select a file via Native Dialog.


  const bindAddress = db.prepare("SELECT server_enabled FROM settings WHERE id = 'config'").get()?.server_enabled === 1 ? '0.0.0.0' : '127.0.0.1';
  
  expressApp.get('/api/ip', (req, res) => {
    const interfaces = os.networkInterfaces();
    let localIp = '127.0.0.1';
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip over internal and non-ipv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                localIp = iface.address;
                break;
            }
        }
        if (localIp !== '127.0.0.1') break;
    res.json({ ip: localIp });
  });

  expressApp.get('/verify', (req, res) => {
    const token = req.query.token;
    if (!token) {
      return res.send("Token verifikasi tidak disertakan.");
    }

    let payload = null;
    try {
      payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    } catch (e) {
      return res.send("Format token verifikasi tidak valid.");
    }

    const nomor = payload.nomor;
    if (!nomor) return res.send("Nomor surat tidak ditemukan dalam token.");

    const surat = db.prepare("SELECT * FROM outgoing_letters WHERE nomor_surat = ?").get(nomor);
    const settings = db.prepare("SELECT nama_instansi, logo_base64 FROM settings LIMIT 1").get();
    const instansi = settings ? settings.nama_instansi : "Sistem Surat";
    const logoUrl = settings && settings.logo_base64 ? settings.logo_base64 : 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Garuda_Pancasila_Coat_of_Arms_of_Indonesia.svg/500px-Garuda_Pancasila_Coat_of_Arms_of_Indonesia.svg.png';

    const crypto = require('crypto');
    const signatureHash = crypto.createHash('sha256').update(nomor + instansi + (surat ? surat.created_at : 'INVALID')).digest('hex');

    const isValid = !!surat;
    const primaryColor = isValid ? '#047857' : '#be123c';
    const secondaryColor = isValid ? '#10b981' : '#e11d48';
    const bgColor = isValid ? '#d1fae5' : '#ffe4e6';
    const badgeText = isValid ? 'DOKUMEN VALID & TEROTENTIKASI' : 'DOKUMEN TIDAK TERDAFTAR / PALSU';
    const badgeIcon = isValid ? '✓' : '✗';
    const title = isValid ? 'Sertifikat Elektronik' : 'Peringatan Keamanan';
    const footerText = isValid 
      ? 'Dokumen ini telah ditandatangani secara elektronik. Verifikasi sistem menyatakan bahwa dokumen ini asli dan tidak mengalami perubahan sejak diterbitkan.'
      : 'PERINGATAN: Sistem tidak dapat menemukan rekam jejak dokumen ini. Dokumen ini mungkin telah dipalsukan atau dimodifikasi oleh pihak yang tidak bertanggung jawab.';

    res.send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hasil Verifikasi Dokumen Elektronik</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body { font-family: 'Inter', sans-serif; background: #e2e8f0; margin: 0; padding: 20px; color: #1e293b; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          .cert-container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 20px 40px -10px rgb(0 0 0 / 0.15); width: 100%; max-width: 500px; position: relative; border-top: 10px solid ${primaryColor}; overflow: hidden; }
          .cert-container::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle, transparent 20%, #ffffff 20%, #ffffff 80%, transparent 80%, transparent), radial-gradient(circle, transparent 20%, #ffffff 20%, #ffffff 80%, transparent 80%, transparent) 25px 25px, linear-gradient(#f8fafc 2px, transparent 2px) 0 -1px, linear-gradient(90deg, #f8fafc 2px, #ffffff 2px) -1px 0; background-size: 50px 50px, 50px 50px, 25px 25px, 25px 25px; opacity: 0.4; z-index: 0; pointer-events: none; }
          .content { position: relative; z-index: 10; text-align: center; }
          .logo { width: 90px; height: 90px; object-fit: contain; margin-bottom: 20px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }
          .badge { display: inline-flex; align-items: center; gap: 8px; background: ${bgColor}; color: ${primaryColor}; padding: 10px 20px; border-radius: 99px; font-weight: 800; font-size: 13px; margin-bottom: 25px; border: 1px solid ${secondaryColor}; box-shadow: 0 4px 10px ${bgColor}; }
          .badge-icon { width: 22px; height: 22px; background: ${secondaryColor}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
          h1 { font-size: 24px; font-weight: 800; margin: 0 0 8px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
          p.instansi { font-size: 16px; color: #475569; margin: 0 0 35px; font-weight: 600; }
          .detail-box { text-align: left; background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 14px; margin-bottom: 25px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
          .row { margin-bottom: 18px; display: flex; flex-direction: column; }
          .row:last-child { margin-bottom: 0; }
          .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px; }
          .val { font-weight: 700; color: #1e293b; font-size: 15px; word-break: break-word; line-height: 1.4; }
          .hash-box { background: #0f172a; color: ${secondaryColor}; font-family: 'Courier New', monospace; padding: 16px; border-radius: 8px; font-size: 12px; word-break: break-all; text-align: left; margin-bottom: 25px; box-shadow: inset 0 4px 6px rgba(0,0,0,0.3); }
          .hash-title { color: #94a3b8; font-size: 10px; text-transform: uppercase; margin-bottom: 8px; font-family: 'Inter', sans-serif; font-weight: 800; letter-spacing: 1px; }
          .footer { font-size: 12px; color: #64748b; font-weight: 500; border-top: 2px dashed #cbd5e1; padding-top: 25px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="cert-container">
          <div class="content">
            <img src="${logoUrl}" class="logo" alt="Logo Instansi" />
            
            <div class="badge">
              <div class="badge-icon">${badgeIcon}</div>
              ${badgeText}
            </div>
            
            <h1>${title}</h1>
            <p class="instansi">${instansi}</p>
            
            ${isValid ? `
            <div class="detail-box">
              <div class="row">
                <span class="label">Nomor Surat</span>
                <span class="val">${surat.nomor_surat}</span>
              </div>
              <div class="row">
                <span class="label">Perihal</span>
                <span class="val">${surat.perihal || '-'}</span>
              </div>
              <div class="row">
                <span class="label">Tanggal Dikeluarkan</span>
                <span class="val">${new Date(surat.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit'})} WIB</span>
              </div>
              <div class="row">
                <span class="label">Otoritas Penandatangan</span>
                <span class="val">Pimpinan ${instansi}</span>
              </div>
            </div>
            ` : `
            <div class="detail-box" style="background: #fff1f2; border-color: #fecdd3;">
              <div class="row">
                <span class="label" style="color: #be123c;">Informasi Nomor Surat</span>
                <span class="val" style="color: #881337;">${nomor}</span>
              </div>
              <div class="row">
                <span class="label" style="color: #be123c;">Pesan Sistem</span>
                <span class="val" style="color: #881337;">Tidak ada catatan penerbitan resmi untuk surat ini di database pusat.</span>
              </div>
            </div>
            `}

            <div class="hash-box">
              <div class="hash-title">Digital Signature Fingerprint (SHA-256)</div>
              ${signatureHash}
            </div>

            <div class="footer">
              ${footerText}
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Fallback for React Router (Single Page App)
  expressApp.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    const htmlPath = path.join(distPath, 'index.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send('Dev Mode: Frontend is served by Vite on port 5173');
    }
  });

  server = expressApp.listen(port, bindAddress, () => {
    console.log(`Express Server running on ${bindAddress}:${port}`);
  });
}

function stopExpressServer() {
  if (server) {
    server.close();
    server = null;
    expressApp = null;
    console.log('Express Server stopped.');
  }
}

// ALWAYS start Express server on startup because local React frontend relies on it
const s = db.prepare("SELECT server_port FROM settings WHERE id = 'config'").get();
const parsedPort = parseInt(s?.server_port, 10);
startExpressServer(isNaN(parsedPort) ? 8080 : parsedPort);

// ==========================================
// 3. JENDELA APLIKASI ELECTRON (FRONTEND UTAMA)
// ==========================================
function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    autoHideMenuBar: true,
    frame: false
  });

  const s = db.prepare("SELECT server_port FROM settings WHERE id = 'config'").get();
  const activePort = parseInt(s?.server_port, 10) || 8080;

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(`http://localhost:5173?port=${activePort}`);
    // Buka Console (DevTools) otomatis saat dalam mode development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../..', 'dist/index.html'), { query: { port: String(activePort) } });
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (server) server.close();
    db.close(); 
    app.quit();
  }
});

// ==========================================
// 4. IPC HANDLERS UNTUK WINDOW & NATIVE DIALOG
// ==========================================
ipcMain.on('window:minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});
ipcMain.on('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});
ipcMain.on('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('fs:hapusSuratFisik', async (event, filePath) => {
  try {
    let targetPath = filePath;
    if (process.platform !== 'win32') {
      targetPath = targetPath
        .replace(/^\\\\wsl\.localhost\\[^\\]+/, '')
        .replace(/^([A-Za-z]):[\\/]/, (match, drive) => {
          return `/mnt/${drive.toLowerCase()}/`;
        }).replace(/\\/g, '/');
    }

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      return { success: true };
    }
    return { success: false, error: 'File tidak ditemukan di: ' + targetPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('dialog:pilihFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

// IPC Handler untuk menyimpan file fisik dari Base64 (Untuk KOP SURAT & DOCX)
ipcMain.handle('fs:saveFile', (event, data) => {
  try {
    const base64Data = data.base64Data || data.fileData;
    const filename = data.filename || data.fileName;
    const folder = data.folder || data.folderPath;

    if (!base64Data || !filename || !folder) {
      console.error("Save file error: Missing parameters", data);
      return { success: false, error: 'Missing parameters' };
    }

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(folder, safeName);
    
    // Strip base64 header if exists (e.g. data:image/png;base64,)
    const base64Content = base64Data.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));
    
    return { success: true, filePath: filePath };
  } catch (err) {
    console.error("Save file error:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('server:toggle', (event, { enabled, port }) => {
  stopExpressServer();
  startExpressServer(port); // startExpressServer will now check DB and bind to 0.0.0.0 or 127.0.0.1
  return true;
});

ipcMain.handle('dialog:pilihFileRestore', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return { success: false };
  
  const selectedPath = result.filePaths[0];
  try {
    // Copy the selected file to override current dbPath
    // In production, we should close DB first, copy, then restart app/db.
    // For simplicity, we just copy over it (better-sqlite3 might throw if locked, but let's try)
    fs.copyFileSync(selectedPath, dbPath);
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('dialog:pilihFileDocx', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Word Document', extensions: ['docx'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return { success: false };
  
  const selectedPath = result.filePaths[0];
  try {
    const buffer = fs.readFileSync(selectedPath);
    const base64 = buffer.toString('base64');
    const name = path.basename(selectedPath);
    
    // Gunakan pizzip dan docxtemplater untuk ekstrak teks (lebih akurat untuk variabel {{}})
    // Gunakan mammoth untuk preview agar kebal terhadap salah ketik (typo) kurung kurawal di Word
    let text = "";
    let htmlPreview = "";
    try {
      const mammoth = require('mammoth');
      // Extract raw text for variables
      const mammothResult = await mammoth.extractRawText({ buffer: buffer });
      text = mammothResult.value;
      
      // Extract rough HTML for UI preview
      const htmlResult = await mammoth.convertToHtml({ buffer: buffer });
      htmlPreview = htmlResult.value;
    } catch(err) {
      console.error("Mammoth error in main:", err);
      return { success: false, error: "Gagal membaca teks dari file Word." };
    }
    
    return { success: true, name, base64, text, htmlPreview };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

// Print DOCX Natively via PowerShell (Windows only) - Changed to just open file based on user request
ipcMain.on('print-docx', (event, filePath) => {
    // Convert path to windows format if needed
    let winPath = filePath;
    if (process.platform !== 'win32' && filePath.startsWith('/home/')) {
        winPath = `\\\\wsl.localhost\\Ubuntu${filePath.replace(/\//g, '\\')}`;
    }
    console.log(`Opening file: ${winPath}`);
    shell.openPath(winPath).then(error => {
        if (error) {
            console.error(`Error opening file: ${error}`);
            dialog.showErrorBox('Gagal Membuka File', `Sistem gagal membuka dokumen.\n\nFile: ${winPath}\nError: ${error}`);
        }
    });
});

// Print DOCX silently in background via PowerShell
ipcMain.handle('fs:cetakSuratFisik', async (event, filePath) => {
    try {
        let winPath = filePath;
        if (process.platform !== 'win32' && filePath.startsWith('/home/')) {
            winPath = `\\\\wsl.localhost\\Ubuntu${filePath.replace(/\//g, '\\')}`;
        }
        
        console.log(`Printing file via PowerShell: ${winPath}`);
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            // Execute PowerShell command to print the document hidden in the background
            exec(`powershell.exe -WindowStyle Hidden -Command "Start-Process -FilePath '${winPath}' -Verb Print -WindowStyle Hidden"`, (error) => {
                if (error) {
                    console.error('Print error:', error);
                    resolve({ success: false, error: error.message });
                } else {
                    resolve({ success: true });
                }
            });
        });
    } catch (err) {
        console.error(err);
        return { success: false, error: err.message };
    }
});
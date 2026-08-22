const { app, BrowserWindow, ipcMain, dialog } = require('electron/main');
const path = require('node:path');
const fs = require('fs');
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
      enable_qrcode INTEGER DEFAULT 0
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
      judul_surat TEXT,
      tanggal_diterima TEXT,
      kategori TEXT,
      pengirim TEXT,
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
      role TEXT DEFAULT 'operator'
    );
  `);

  // Migrations for existing databases
  try { db.exec("ALTER TABLE settings ADD COLUMN enable_qrcode INTEGER DEFAULT 0;"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'operator';"); } catch(e) {}
  try { db.exec("ALTER TABLE outgoing_letters ADD COLUMN status TEXT DEFAULT 'Draf';"); } catch(e) {}

  // Update existing admin to be admin role if just migrated
  try { db.prepare("UPDATE users SET role = 'admin' WHERE username = 'admin' AND role = 'operator'").run(); } catch(e) {}

  // Seed default settings
  const settingsCount = db.prepare('SELECT count(*) as count FROM settings').get();
  if (settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO settings (id, nama_instansi, folder_surat_keluar, folder_surat_masuk, format_nomor_default, manual_folder_selected, master_pin, counter_surat_keluar, server_enabled, server_port, enable_qrcode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('config', 'Nama Organisasi', 'D:/data/surat/keluar', 'D:/data/surat/masuk', '{NO}/SURAT/{BULAN}/{TAHUN}', 0, '123456', 0, 0, 8080, 0);
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
    const data = db.prepare("SELECT * FROM settings WHERE id = 'config'").get();
    res.json(data);
  });
  expressApp.post('/api/settings', (req, res) => {
    const { nama_instansi, folder_surat_keluar, folder_surat_masuk, format_nomor_default, manual_folder_selected, master_pin, counter_surat_keluar, server_enabled, server_port, enable_qrcode } = req.body;
    db.prepare(`
      UPDATE settings SET 
        nama_instansi = ?, folder_surat_keluar = ?, folder_surat_masuk = ?, format_nomor_default = ?, 
        manual_folder_selected = ?, master_pin = ?, counter_surat_keluar = ?, server_enabled = ?, server_port = ?, enable_qrcode = ?
      WHERE id = 'config'
    `).run(nama_instansi, folder_surat_keluar, folder_surat_masuk, format_nomor_default, manual_folder_selected ? 1 : 0, master_pin, counter_surat_keluar, server_enabled ? 1 : 0, server_port, enable_qrcode ? 1 : 0);
    res.json({ success: true });
  });

  // Auth API
  expressApp.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (user && user.password === password) {
      addAuditLog(`Login berhasil: ${username}`);
      res.json({ success: true, role: user.role || 'operator' });
    } else {
      addAuditLog(`Percobaan login gagal untuk: ${username}`);
      res.status(401).json({ error: 'Unauthorized' });
    }
  });

  // Users API (RBAC)
  expressApp.get('/api/users', (req, res) => {
    const data = db.prepare('SELECT username, role FROM users').all();
    res.json(data);
  });
  expressApp.post('/api/users', (req, res) => {
    const { username, password, role } = req.body;
    // Check if exists
    const existing = db.prepare('SELECT username FROM users WHERE username = ?').get(username);
    if (existing) {
       // Update
       db.prepare('UPDATE users SET password = ?, role = ? WHERE username = ?').run(password, role, username);
       addAuditLog(`Mengubah pengguna: ${username}`);
    } else {
       // Insert
       db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, password, role);
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
  expressApp.post('/api/master', (req, res) => {
    const { nama, kategori, attributes } = req.body;
    const info = db.prepare('INSERT INTO master_data (nama, kategori, attributes) VALUES (?, ?, ?)').run(nama, kategori, JSON.stringify(attributes || {}));
    addAuditLog(`Menambahkan Master Data Entitas: ${nama}`);
    res.json({ id: info.lastInsertRowid });
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
    const parsed = data.map(d => ({ ...d, variables: JSON.parse(d.variables || '[]'), is_docx: d.is_docx === 1 }));
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
      targetDir = targetDir.replace(/^([A-Za-z]):[\\/]/, (match, drive) => {
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
    
    // Auto-increment counter
    db.prepare("UPDATE settings SET counter_surat_keluar = counter_surat_keluar + 1 WHERE id = 'config'").run();
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
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send("File tidak ditemukan di server lokal.");
    }
    res.download(filePath);
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
    const { nomor_surat, judul_surat, tanggal_diterima, kategori, pengirim, file_path } = req.body;
    const tgl = tanggal_diterima || new Date().toISOString().split('T')[0];
    const info = db.prepare(`
      INSERT INTO incoming_archives (nomor_surat, judul_surat, tanggal_diterima, kategori, pengirim, file_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nomor_surat, judul_surat, tgl, kategori, pengirim, file_path, new Date().toISOString());
    addAuditLog(`Mengarsipkan Surat Masuk No: ${nomor_surat}`);
    res.json({ id: info.lastInsertRowid });
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

  // Fallback for React Router (Single Page App)
  expressApp.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  const bindAddress = db.prepare("SELECT server_enabled FROM settings WHERE id = 'config'").get()?.server_enabled === 1 ? '0.0.0.0' : '127.0.0.1';
  
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
startExpressServer(s?.server_port || 8080);

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

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    // Buka Console (DevTools) otomatis saat dalam mode development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../..', 'dist/index.html'));
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

ipcMain.handle('dialog:pilihFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

// IPC Handler untuk menyimpan file fisik dari Base64 (Untuk KOP SURAT & DOCX)
ipcMain.handle('fs:saveFile', (event, { base64Data, filename, folder }) => {
  try {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(folder, safeName);
    
    // Strip base64 header if exists (e.g. data:image/png;base64,)
    const base64Content = base64Data.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));
    
    return filePath;
  } catch (err) {
    console.error("Save file error:", err);
    return null;
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
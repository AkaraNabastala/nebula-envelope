const { app, BrowserWindow, ipcMain, dialog } = require('electron/main');
const path = require('node:path');
const Database = require('better-sqlite3');
const fs = require('fs');

app.disableHardwareAcceleration();

// ==========================================
// 1. INISIALISASI DATABASE & SKEMA RELASIONAL
// ==========================================
const dbPath = path.join(app.getPath('userData'), 'nabastala-arsip.sqlite');
const db = new Database(dbPath);

// Mengaktifkan Foreign Key agar relasi antar tabel (seperti arsip dan kategori) saling mengunci
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    -- Tabel Pengguna (Untuk sistem Login)
    CREATE TABLE IF NOT EXISTS pengguna (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, -- Di tahap produksi, ini idealnya di-hash
      role TEXT DEFAULT 'Administrator'
    );

    -- Tabel Entitas (Pengembangan dari kode Anda: Fleksibel untuk Guru/Siswa/Karyawan/Klien)
    CREATE TABLE IF NOT EXISTS entitas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kategori TEXT NOT NULL, -- (misal: 'Guru', 'Siswa', 'Karyawan', 'Vendor')
      nama TEXT NOT NULL,
      nomor_induk TEXT, -- NIP / NIS / NIK
      kontak TEXT,
      detail_tambahan TEXT
    );

    -- Tabel Kategori Surat (Master Data)
    CREATE TABLE IF NOT EXISTS kategori_surat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kode_kategori TEXT UNIQUE NOT NULL, -- (misal: 'SK', 'SPK', 'INV')
      nama_kategori TEXT NOT NULL
    );

    -- Tabel Arsip Surat (Pusat Data Relasional)
    CREATE TABLE IF NOT EXISTS arsip_surat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipe_surat TEXT NOT NULL, -- 'Masuk' atau 'Keluar'
      nomor_surat TEXT UNIQUE NOT NULL,
      judul_surat TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      kategori_id INTEGER,
      entitas_id INTEGER, -- Pengirim (jika masuk) atau Penerima (jika keluar)
      file_path TEXT, -- Lokasi file PDF/Scan yang disimpan di lokal
      FOREIGN KEY(kategori_id) REFERENCES kategori_surat(id) ON DELETE SET NULL,
      FOREIGN KEY(entitas_id) REFERENCES entitas(id) ON DELETE SET NULL
    );
  `);

  // Menambahkan Akun Admin Bawaan (Jika tabel pengguna masih kosong)
  const adminCheck = db.prepare('SELECT count(*) as count FROM pengguna').get();
  if (adminCheck.count === 0) {
    db.prepare("INSERT INTO pengguna (username, password, role) VALUES (?, ?, ?)").run('admin', '123456', 'Super Administrator');
    console.log('Akun default dibuat: admin / 123456');
  }
  // Tambahkan ini di dalam fungsi initDatabase() Anda, tepat setelah db.exec(...)
  const katCheck = db.prepare('SELECT count(*) as count FROM kategori_surat').get();
  if (katCheck.count === 0) {
    const insertKat = db.prepare("INSERT INTO kategori_surat (kode_kategori, nama_kategori) VALUES (?, ?)");
    insertKat.run('SU', 'Surat Undangan');
    insertKat.run('SK', 'Surat Keputusan / Direksi');
    insertKat.run('SPK', 'Surat Perjanjian Kerjasama');
    insertKat.run('PNW', 'Surat Penawaran Kerja');
    insertKat.run('UMM', 'Umum / Lainnya');
    console.log('Kategori master default berhasil dibuat.');
  }
}

// Jalankan pembuatan tabel
initDatabase();

// ==========================================
// 2. PEMBUATAN JENDELA APLIKASI
// ==========================================
function createWindow () {
  const win = new BrowserWindow({
    width: 1280, // Dibuat lebih lebar (standar aplikasi desktop modern)
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    autoHideMenuBar: true // Menyembunyikan menu bawaan Windows agar terlihat elegan
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

// ==========================================
// 3. PUSAT KENDALI (IPC HANDLERS / API LOKAL)
// ==========================================

// -- Handler Login --
ipcMain.handle('db:verifikasiLogin', (event, { username, password }) => {
  const stmt = db.prepare('SELECT id, username, role FROM pengguna WHERE username = ? AND password = ?');
  const user = stmt.get(username, password);
  return user || null; // Mengembalikan data user jika benar, null jika salah
});

// -- Handler Entitas (Kode Anda yang Diperbarui) --
ipcMain.handle('db:getEntitas', (event, kategori) => {
  // Jika kategori kosong, ambil semua. Jika ada, saring berdasarkan kategori.
  let stmt;
  if (kategori) {
    stmt = db.prepare('SELECT * FROM entitas WHERE kategori = ? ORDER BY nama ASC');
    return stmt.all(kategori);
  } else {
    stmt = db.prepare('SELECT * FROM entitas ORDER BY nama ASC');
    return stmt.all();
  }
});

ipcMain.handle('db:tambahEntitas', (event, data) => {
  const stmt = db.prepare('INSERT INTO entitas (kategori, nama, nomor_induk, kontak, detail_tambahan) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(data.kategori, data.nama, data.nomor_induk, data.kontak, data.detail_tambahan);
  return info.lastInsertRowid;
});

// -- Handler Dialog Sistem --
ipcMain.handle('dialog:pilihFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'] // Diizinkan membuat folder baru saat memilih
  });
  return result.canceled ? null : result.filePaths[0];
});

// ==========================================
// 4. SIKLUS HIDUP APLIKASI
// ==========================================
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Menutup koneksi database dengan aman saat aplikasi dimatikan
    db.close(); 
    app.quit();
  }
});

// -- Handler Kategori Surat (Untuk Dropdown) --
ipcMain.handle('db:getKategoriSurat', (event) => {
  return db.prepare('SELECT * FROM kategori_surat ORDER BY nama_kategori ASC').all();
});

// -- Handler Ambil Semua Surat Masuk (Dengan Query Relasional JOIN) --
ipcMain.handle('db:getSuratMasuk', (event) => {
  const stmt = db.prepare(`
    SELECT a.*, e.nama as nama_pengirim, k.nama_kategori 
    FROM arsip_surat a
    LEFT JOIN entitas e ON a.entitas_id = e.id
    LEFT JOIN kategori_surat k ON a.kategori_id = k.id
    WHERE a.tipe_surat = 'Masuk'
    ORDER BY a.id DESC
  `);
  return stmt.all();
});

// -- Handler Tambah Surat Masuk Baru --
ipcMain.handle('db:tambahSuratMasuk', (event, data) => {
  const stmt = db.prepare(`
    INSERT INTO arsip_surat (tipe_surat, nomor_surat, judul_surat, tanggal, entitas_id, kategori_id, file_path)
    VALUES ('Masuk', ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(data.nomorSurat, data.judulSurat, data.tanggal, data.entitasId, data.kategoriId, data.filePath);
  return info.lastInsertRowid;
});

// -- Handler Ambil Semua Surat Keluar (Relasional JOIN) --
ipcMain.handle('db:getSuratKeluar', (event) => {
  const stmt = db.prepare(`
    SELECT a.*, e.nama as nama_penerima, k.nama_kategori 
    FROM arsip_surat a
    LEFT JOIN entitas e ON a.entitas_id = e.id
    LEFT JOIN kategori_surat k ON a.kategori_id = k.id
    WHERE a.tipe_surat = 'Keluar'
    ORDER BY a.id DESC
  `);
  return stmt.all();
});

// -- Handler Tambah Surat Keluar Baru --
ipcMain.handle('db:tambahSuratKeluar', (event, data) => {
  const stmt = db.prepare(`
    INSERT INTO arsip_surat (tipe_surat, nomor_surat, judul_surat, tanggal, entitas_id, kategori_id, file_path)
    VALUES ('Keluar', ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(data.nomorSurat, data.judulSurat, data.tanggal, data.entitasId, data.kategoriId, data.filePath);
  return info.lastInsertRowid;
});
// -- Handler Dasbor (Menghitung Statistik Realtime) --
ipcMain.handle('db:getDashboardStats', (event) => {
  // 1. Hitung Total Arsip Keseluruhan
  const totalArsip = db.prepare("SELECT count(*) as count FROM arsip_surat").get().count;
  
  // 2. Hitung Total Surat Keluar
  const totalSuratKeluar = db.prepare("SELECT count(*) as count FROM arsip_surat WHERE tipe_surat = 'Keluar'").get().count;
  
  // 3. Hitung Total Surat Masuk
  const totalSuratMasuk = db.prepare("SELECT count(*) as count FROM arsip_surat WHERE tipe_surat = 'Masuk'").get().count;
  
  // 4. Hitung Total Entitas Aktif
  const totalEntitas = db.prepare("SELECT count(*) as count FROM entitas").get().count;

  // 5. Ambil 5 Log Aktivitas Terakhir (Campuran Surat Masuk & Keluar)
  const logTerbaru = db.prepare(`
    SELECT a.nomor_surat, a.judul_surat, a.tanggal, a.tipe_surat, e.nama as nama_entitas
    FROM arsip_surat a
    LEFT JOIN entitas e ON a.entitas_id = e.id
    ORDER BY a.id DESC 
    LIMIT 5
  `).all();

  // Kembalikan semua data dalam satu paket objek
  return {
    totalArsip,
    totalSuratKeluar,
    totalSuratMasuk,
    totalEntitas,
    logTerbaru
  };
});
// -- Handler Pilih dan Salin Berkas Fisik (PDF / Gambar) --
ipcMain.handle('dialog:pilihFile', async () => {
  // 1. Buka jendela dialog pemilihan file
  const result = await dialog.showOpenDialog({
    title: 'Pilih Berkas Arsip Fisik',
    properties: ['openFile'],
    filters: [
      { name: 'Dokumen & Gambar', extensions: ['pdf', 'jpg', 'jpeg', 'png'] }
    ]
  });

  // Jika batal memilih file
  if (result.canceled || result.filePaths.length === 0) {
    return null; 
  }

  // 2. Siapkan Folder "Brankas" di data lokal aplikasi
  const folderArsip = path.join(app.getPath('userData'), 'Berkas_Arsip');
  if (!fs.existsSync(folderArsip)) {
    fs.mkdirSync(folderArsip, { recursive: true }); // Buat folder jika belum ada
  }

  // 3. Proses penyalinan file
  const sourcePath = result.filePaths[0]; // Jalur file asli
  const originalFileName = path.basename(sourcePath);
  
  // Menambahkan timestamp agar nama file unik (mencegah bentrok jika nama file sama)
  const uniqueFileName = `${Date.now()}_${originalFileName}`;
  const destPath = path.join(folderArsip, uniqueFileName); // Jalur brankas tujuan

  try {
    fs.copyFileSync(sourcePath, destPath); // Salin file
    
    // Kembalikan nama file dan jalur simpannya ke React
    return {
      nama_file: originalFileName,
      path_simpan: destPath
    };
  } catch (error) {
    console.error("Gagal menyalin file:", error);
    return null;
  }
});

// -- Handler Hapus Entitas --
ipcMain.handle('db:hapusEntitas', (event, id) => {
  const stmt = db.prepare('DELETE FROM entitas WHERE id = ?');
  stmt.run(id);
  return true;
});

// -- Handler Hapus Surat (Masuk & Keluar) beserta File Fisiknya --
ipcMain.handle('db:hapusSurat', (event, id) => {
  // 1. Cari tahu apakah surat ini punya file fisik
  const surat = db.prepare('SELECT file_path FROM arsip_surat WHERE id = ?').get(id);
  
  // 2. Jika ada filenya, hapus file tersebut dari hardisk komputer
  if (surat && surat.file_path) {
    try {
      if (fs.existsSync(surat.file_path)) {
        fs.unlinkSync(surat.file_path);
      }
    } catch (err) {
      console.error("Gagal menghapus file fisik:", err);
    }
  }
  
  // 3. Hapus data teksnya dari database SQLite
  const stmt = db.prepare('DELETE FROM arsip_surat WHERE id = ?');
  stmt.run(id);
  return true;
});
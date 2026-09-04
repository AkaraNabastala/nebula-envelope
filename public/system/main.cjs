const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const Database = require('better-sqlite3');
const express = require('express');
const cors = require('cors');

// --- AUTO GENERATE Verify.jsx KARENA PERMISSION WSL ---
const verifyJsxPath = path.join(__dirname, '../../src/pages/Verify.jsx');
if (false) {
  const verifyJsxContent = `import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, FileUp, AlertTriangle, CheckCircle2, Shield, Loader2, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../services/db';
import { toast } from 'sonner';

export default function Verify({ settings }) {
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      handleVerifyQRToken(token);
    }
  }, []);

  const handleVerifyQRToken = async (token) => {
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch(\`\${API_BASE_URL}/verify/qr?token=\${encodeURIComponent(token)}\`);
      const data = await res.json();
      if (data.success) { setResult(data); } else { setError(data.message || 'Gagal memverifikasi dokumen.'); }
    } catch (err) {
      setError('Koneksi ke server gagal.');
    } finally { setLoading(false); }
  };

  const handleManualVerify = async (e) => {
    e.preventDefault();
    if (!tagInput.trim()) return toast.error('Masukkan nomor tag terlebih dahulu.');
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch(\`\${API_BASE_URL}/verify/tag/\${encodeURIComponent(tagInput.trim())}\`);
      const data = await res.json();
      if (data.success) { setResult(data); } else { setError(data.message || 'Sistem tidak menemukan dokumen ini di pangkalan data.'); }
    } catch (err) {
      setError('Koneksi ke server gagal.');
    } finally { setLoading(false); }
  };


  const logoUrl = settings?.logo_base64 || '/logonebula.png';
  const instansiName = settings?.nama_instansi || 'Sistem Surat';

  const renderInternalResult = () => {
    if (!result?.data) return null;
    const { nomor_surat, perihal, created_at } = result.data;
    const dateStr = new Date(created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' });

    return (
      <div className="mt-8 bg-emerald-50 border-t-4 border-emerald-600 p-6 md:p-8 rounded-2xl shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <ShieldCheck className="w-40 h-40 text-emerald-900" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 p-2 rounded-full"><CheckCircle2 className="w-6 h-6 text-emerald-700" /></div>
            <h3 className="text-xl md:text-2xl font-bold text-emerald-800 tracking-tight">DOKUMEN VALID</h3>
          </div>
          <p className="text-emerald-700 text-sm mb-6 font-medium">Dokumen ini terdaftar secara resmi di sistem pangkalan data dan dapat dipertanggungjawabkan keasliannya.</p>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-5 md:p-6 border border-emerald-100 shadow-sm space-y-5">
            <div><p className="text-xs uppercase tracking-widest font-bold text-emerald-600/70 mb-1">Nomor Registrasi Surat</p><p className="font-black text-slate-900 text-lg md:text-xl">{nomor_surat}</p></div>
            <div className="h-px w-full bg-emerald-100"></div>
            <div><p className="text-xs uppercase tracking-widest font-bold text-emerald-600/70 mb-1">Perihal / Hal</p><p className="font-semibold text-slate-800 text-base">{perihal || '-'}</p></div>
            <div className="h-px w-full bg-emerald-100"></div>
            <div><p className="text-xs uppercase tracking-widest font-bold text-emerald-600/70 mb-1">Waktu Penerbitan</p><p className="font-semibold text-slate-800">{dateStr} WIB</p></div>
          </div>
          <div className="mt-6 flex flex-col gap-1.5 bg-emerald-800/5 p-4 rounded-xl border border-emerald-800/10">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-1.5"><Shield className="w-3.5 h-3.5"/> SHA-256 Digital Fingerprint</span>
            <span className="text-xs md:text-sm font-mono font-medium text-emerald-700 break-all">{result.signatureHash || 'Otentikasi Internal Sistem'}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col w-full h-full absolute inset-0 z-50 overflow-y-auto">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-900 rounded-b-[3rem] shadow-xl z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      </div>

      <header className="relative z-10 w-full max-w-5xl mx-auto pt-10 pb-6 px-6 flex flex-col items-center justify-center text-center">
        <div className="bg-white p-3 rounded-2xl shadow-lg mb-6 ring-4 ring-white/20">
          <img src={logoUrl} alt="Logo" className="h-20 w-20 object-contain" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white drop-shadow-md mb-2">Nebula Document Verification</h1>
        <p className="text-blue-100 font-medium text-lg bg-blue-950/30 px-6 py-2 rounded-full backdrop-blur-sm border border-blue-400/20">{instansiName}</p>
      </header>
      
      <main className="relative z-10 flex-grow w-full max-w-3xl mx-auto px-4 pb-12">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 p-6 md:p-10 mb-8">
          
          {!result && !loading && !error && (
            <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-blue-100">
                <Search className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Cek Keaslian Surat</h2>
              <p className="text-slate-500 text-sm font-medium px-4 md:px-12 leading-relaxed">
                Silakan masukkan <span className="text-blue-600 font-bold">Nomor Registrasi</span> atau <span className="text-blue-600 font-bold">Tag ID</span> yang tertera pada dokumen Anda untuk memverifikasi keasliannya di pangkalan data kami.
              </p>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                <ShieldCheck className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
              </div>
              <p className="text-slate-600 font-bold text-lg animate-pulse tracking-wide">Memverifikasi dokumen...</p>
            </div>
          ) : (
            <>
              {!result && !error && (
                <form onSubmit={handleManualVerify} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      value={tagInput} 
                      onChange={(e) => setTagInput(e.target.value)} 
                      placeholder="Contoh: DOC-A1B2C3D4" 
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-500 focus:bg-white font-mono font-bold text-lg md:text-xl text-center uppercase tracking-widest transition-all placeholder-slate-300 shadow-inner" 
                    />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-5 px-8 rounded-2xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3">
                    <ShieldCheck className="w-6 h-6" /> VERIFIKASI SEKARANG
                  </button>
                </form>
              )}

              {error && (
                <div className="bg-rose-50 border-t-4 border-rose-600 p-6 md:p-8 rounded-2xl shadow-sm animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-rose-100 p-3 rounded-full text-rose-600"><AlertTriangle className="w-8 h-8" /></div>
                    <h3 className="text-xl md:text-2xl font-bold text-rose-800 tracking-tight">DOKUMEN TIDAK DITEMUKAN</h3>
                  </div>
                  <p className="text-rose-700 font-medium mb-8 bg-white/50 p-4 rounded-xl border border-rose-100/50">{error}</p>
                  <button onClick={() => { setError(null); setTagInput(''); }} className="w-full flex items-center justify-center gap-2 text-rose-700 bg-rose-100 hover:bg-rose-200 px-6 py-4 rounded-xl font-bold transition-colors shadow-sm">
                    <ArrowLeft className="w-5 h-5" /> Coba Pencarian Lain
                  </button>
                </div>
              )}

              {result && (
                <div>
                  {renderInternalResult()}
                  <div className="mt-8 text-center">
                    <button onClick={() => { setResult(null); setTagInput(''); }} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-6 py-3 rounded-full font-bold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-sm">
                      <Search className="w-4 h-4" /> Verifikasi Dokumen Lainnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-white/60 backdrop-blur border border-white p-5 rounded-2xl shadow-sm flex items-start gap-4">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0"><Info className="w-5 h-5" /></div>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            <strong>Peringatan Keamanan:</strong> Portal ini adalah sarana verifikasi resmi. Pastikan data yang tampil pada layar sesuai dengan fisik dokumen yang Anda miliki. Pemalsuan dokumen adalah tindakan kriminal yang dapat dikenakan sanksi pidana.
          </p>
        </div>
      </main>

      <footer className="relative z-10 text-slate-500 py-8 text-center text-xs mt-auto shrink-0 border-t border-slate-200/60 bg-slate-50/50">
        <p className="mb-3 font-medium">&copy; {new Date().getFullYear()} Hak Cipta Dilindungi Undang-Undang.</p>
        <div className="flex items-center justify-center gap-6">
          <span className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-[10px]"><Shield className="w-3.5 h-3.5 text-blue-500"/> Secured Platform</span>
          <span className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-[10px]"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> Digital Fingerprint</span>
        </div>
      </footer>
    </div>
  );
}`;
  fs.writeFileSync(verifyJsxPath, verifyJsxContent);
}
const { exec } = require('child_process');

process.on('uncaughtException', (err) => {
  fs.writeFileSync(path.join(__dirname, 'crash.log'), err.stack);
  console.error("FATAL ERROR:", err);
});


// --- SUPPRESS HARmless GTK/GLIB WARNINGS ---
const originalStderrWrite = process.stderr.write;
process.stderr.write = function (chunk, encoding, callback) {
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
      convertapi_secret TEXT,
      komdigi_api_url TEXT,
      komdigi_api_key TEXT
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
  try { db.exec("ALTER TABLE settings ADD COLUMN enable_qrcode INTEGER DEFAULT 0;"); } catch (e) { }
  try { db.exec("ALTER TABLE settings ADD COLUMN convertapi_secret TEXT;"); } catch (e) { }
  try { db.exec("ALTER TABLE settings ADD COLUMN logo_base64 TEXT;"); } catch (e) { }
  try { db.exec("ALTER TABLE settings ADD COLUMN login_bg_base64 TEXT;"); } catch (e) { }
  try { db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'operator';"); } catch (e) { }
  try { db.exec("ALTER TABLE users ADD COLUMN nama_lengkap TEXT DEFAULT 'Pengguna';"); } catch (e) { }
  try { db.exec("ALTER TABLE outgoing_letters ADD COLUMN status TEXT DEFAULT 'Draf';"); } catch (e) { }
  try { db.exec("ALTER TABLE settings ADD COLUMN enable_tag INTEGER DEFAULT 0;"); } catch (e) { }
  try { db.exec("ALTER TABLE settings ADD COLUMN tag_prefix TEXT DEFAULT 'DOC';"); } catch (e) { }
  try { db.exec("ALTER TABLE outgoing_letters ADD COLUMN document_tag TEXT;"); } catch (e) { }


  // Update existing admin to be admin role if just migrated
  try { db.prepare("UPDATE users SET role = 'admin' WHERE username = 'admin' AND role = 'operator'").run(); } catch (e) { }
  try { db.prepare("UPDATE users SET username = 'administrator', password = 'admin123' WHERE username = 'admin'").run(); } catch (e) { }
  try { db.prepare("UPDATE settings SET master_pin = '123987' WHERE master_pin = '123456'").run(); } catch (e) { }

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
        '123987', 
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
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('administrator', 'admin123', 'admin');
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
    const { nama_instansi, folder_surat_keluar, folder_surat_masuk, format_nomor_default, manual_folder_selected, master_pin, counter_surat_keluar, server_enabled, server_port, enable_qrcode, convertapi_secret, logo_base64, login_bg_base64, enable_tag, tag_prefix } = req.body;

    const count = db.prepare('SELECT count(*) as count FROM settings').get();
    if (count.count === 0) {
      db.prepare(`INSERT INTO settings (id, counter_surat_keluar) VALUES ('config', 0)`).run();
    }

    db.prepare(`
      UPDATE settings SET 
        nama_instansi = ?, folder_surat_keluar = ?, folder_surat_masuk = ?, format_nomor_default = ?, 
        manual_folder_selected = ?, master_pin = ?, counter_surat_keluar = ?, server_enabled = ?, server_port = ?, enable_qrcode = ?, convertapi_secret = ?,
        logo_base64 = ?, login_bg_base64 = ?, enable_tag = ?, tag_prefix = ?
    `).run(
      nama_instansi || '',
      folder_surat_keluar || '',
      folder_surat_masuk || '',
      format_nomor_default || '',
      manual_folder_selected ? 1 : 0,
      master_pin || '123987',
      counter_surat_keluar || 0,
      server_enabled ? 1 : 0,
      server_port || 8080,
      enable_qrcode ? 1 : 0,
      convertapi_secret || '',
      logo_base64 || '',
      login_bg_base64 || '',
      enable_tag ? 1 : 0,
      tag_prefix || 'DOC'
    );

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

  expressApp.post('/api/auth/reset', (req, res) => {
    const { username, master_pin, new_password } = req.body;

    // Verifikasi master pin
    const config = db.prepare("SELECT master_pin FROM settings WHERE id = 'config'").get();
    const validPin = config && config.master_pin ? config.master_pin : '123987';

    if (master_pin !== validPin) {
      addAuditLog(`Percobaan reset sandi gagal (PIN salah) untuk: ${username}`);
      return res.status(401).json({ error: 'Master PIN salah' });
    }

    // Pastikan user ada
    const user = db.prepare('SELECT username FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    // Update password
    db.prepare('UPDATE users SET password = ? WHERE username = ?').run(new_password, username);
    addAuditLog(`Sandi berhasil direset menggunakan Master PIN untuk: ${username}`);
    res.json({ success: true });
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
    for (let i = 1; i <= 12; i++) {
      const mStr = i.toString().padStart(2, '0');
      const outItem = outgoing_monthly.find(x => x.month === mStr);
      const incItem = incoming_monthly.find(x => x.month === mStr);
      chartData.push({
        name: months[i - 1],
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
    try {
      const data = db.prepare('SELECT * FROM outgoing_letters ORDER BY created_at DESC').all();
      const parsed = data.map(d => ({
        ...d,
        formData: JSON.parse(d.formData || '{}'),
        is_docx: d.is_docx === 1
      }));
      res.json(parsed);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Gagal mengambil surat keluar' });
    }
  });

  expressApp.post('/api/outgoing', (req, res) => {
    const { nomor_surat, nama_template, perihal, nama_file, formData, konten, file_path, is_docx, folder_tersimpan, file_base64, status, created_at, document_tag } = req.body;

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

    const finalCreatedAt = created_at || new Date().toISOString();
    const finalStatus = status || 'Draf';

    const info = db.prepare(`
      INSERT INTO outgoing_letters (nomor_surat, nama_template, perihal, nama_file, formData, konten, file_path, is_docx, folder_tersimpan, created_at, status, document_tag)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(nomor_surat, nama_template, perihal, nama_file, JSON.stringify(formData || {}), konten, finalFilePath, is_docx ? 1 : 0, folder_tersimpan, finalCreatedAt, finalStatus, document_tag || null);

    try {
      db.prepare("UPDATE settings SET counter_surat_keluar = COALESCE(counter_surat_keluar, 0) + 1").run();
    } catch (dbErr) { console.error(dbErr); }
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

  // Bulk Delete Outgoing Letters
  expressApp.post('/api/outgoing/bulk/delete', (req, res) => {
    const { ids } = req.body;
    if (Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM outgoing_letters WHERE id IN (${placeholders})`).run(...ids);
      addAuditLog(`Menghapus massal ${ids.length} surat keluar.`);
    }
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
    }
    res.json({ ip: localIp });
  });

  // --- HALAMAN VERIFIKASI DOKUMEN (WEB AKSES PUBLIK) ---
  // --- API VERIFIKASI QR CODE (WEB AKSES PUBLIK) ---
  expressApp.get('/api/verify/qr', (req, res) => {
    const token = req.query.token;
    if (!token) return res.status(400).json({ success: false, message: 'Token tidak valid' });

    let payload = null;
    try {
      payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Format token QR tidak valid' });
    }

    const nomor = payload.nomor;
    if (!nomor) return res.status(400).json({ success: false, message: 'Data surat tidak ditemukan dalam token' });

    const surat = db.prepare("SELECT * FROM outgoing_letters WHERE nomor_surat = ?").get(nomor);
    const settings = db.prepare("SELECT nama_instansi, logo_base64 FROM settings LIMIT 1").get();
    const instansi = settings ? settings.nama_instansi : "Sistem Surat";
    const logoUrl = settings && settings.logo_base64 ? settings.logo_base64 : '/logonebula.png';
    
    if (surat) {
      const crypto = require('crypto');
      const signatureHash = crypto.createHash('sha256').update(nomor + instansi + surat.created_at).digest('hex');
      return res.json({ success: true, data: surat, instansi, logoUrl, signatureHash });
    }
    
    res.status(404).json({ success: false, message: 'Sistem tidak menemukan dokumen ini di pangkalan data.', instansi, logoUrl });
  });

  // --- API VERIFIKASI DOKUMEN MANUAL ---
  expressApp.get('/api/verify/tag/:tag', (req, res) => {
    const tag = req.params.tag;
    if (!tag) return res.status(400).json({ success: false, message: 'Tag tidak valid' });

    const letter = db.prepare('SELECT nomor_surat, perihal, created_at, nama_file FROM outgoing_letters WHERE document_tag = ?').get(tag);
    const settings = db.prepare("SELECT nama_instansi, logo_base64 FROM settings LIMIT 1").get();
    const instansi = settings ? settings.nama_instansi : "Sistem Surat";
    const logoUrl = settings && settings.logo_base64 ? settings.logo_base64 : '/logonebula.png';

    if (letter) {
      const crypto = require('crypto');
      const signatureHash = crypto.createHash('sha256').update(letter.nomor_surat + instansi + letter.created_at).digest('hex');
      return res.json({ success: true, data: letter, instansi, logoUrl, signatureHash });
    }
    res.status(404).json({ success: false, message: 'Sistem tidak menemukan dokumen ini di pangkalan data.', instansi, logoUrl });
  });


  // --- HALAMAN VERIFIKASI DOKUMEN (WEB AKSES PUBLIK VIA REACT) ---
  expressApp.get('/verify', (req, res) => {
    // Delegasikan render UI ke React JS Vite (dist/index.html)
    const indexPath = path.join(__dirname, '../../dist/index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.send("<h1>Sistem Frontend belum di-build. Jalankan 'npm run build' terlebih dahulu.</h1>");
    }
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

  const bindAddress = db.prepare("SELECT server_enabled FROM settings WHERE id = 'config'").get()?.server_enabled === 1 ? '0.0.0.0' : '127.0.0.1';

  server = expressApp.listen(port, bindAddress, () => {
    const actualPort = server.address().port;
    console.log(`Express Server running on ${bindAddress}:${actualPort}`);
    if (actualPort !== port) {
      db.prepare("UPDATE settings SET server_port = ? WHERE id = 'config'").run(actualPort);
    }
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
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, '../../src/assets/icon-apk.png'),
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
    filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return { success: false };

  const selectedPath = result.filePaths[0];
  const name = path.basename(selectedPath);
  return { success: true, filePath: selectedPath, fileName: name };
});

ipcMain.handle('db:jalankanRestore', async (event, selectedPath) => {
  try {
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
    } catch (err) {
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

ipcMain.handle('fs:openFile', async (event, filePath) => {
  try {
    let winPath = filePath;
    if (process.platform !== 'win32' && filePath.startsWith('/home/')) {
      winPath = `\\\\wsl.localhost\\Ubuntu${filePath.replace(/\//g, '\\')}`;
    }
    if (!fs.existsSync(winPath)) {
      return { success: false, error: 'File tidak ditemukan' };
    }
    const error = await shell.openPath(winPath);
    if (error) return { success: false, error };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
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
      const psPath = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
      // Execute PowerShell command to print the document hidden in the background
      exec(`"${psPath}" -WindowStyle Hidden -Command "Start-Process -FilePath '${winPath}' -Verb Print -WindowStyle Hidden"`, (error) => {
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
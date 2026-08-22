import React, { useState, useEffect } from 'react';
import { saveSettings, getUsers, saveUser, deleteUser, API_BASE_URL } from '../services/db';
import { Settings as SettingsIcon, Folder, Save, Globe, FileDigit, HelpCircle, Users, ShieldCheck, Download, QrCode, Trash2, Plus } from 'lucide-react';

export default function Settings({ settings, onSettingsSaved, onOpenFolderPicker, mode = 'general' }) {
  const [namaInstansi, setNamaInstansi] = useState(settings?.nama_instansi || 'Instansi Mandiri');
  const [folderKeluar, setFolderKeluar] = useState(settings?.folder_surat_keluar || 'D:/data/surat/keluar');
  const [folderMasuk, setFolderMasuk] = useState(settings?.folder_surat_masuk || 'D:/data/surat/masuk');
  const [formatNomor, setFormatNomor] = useState(settings?.format_nomor_default || '{NO_URUT}/{KODE_KLASIFIKASI}/{KODE_INSTANSI}/{BULAN_ROMAWI}/{TAHUN}');
  const [counterKeluar, setCounterKeluar] = useState(settings?.counter_surat_keluar || 0);
  const [lanAkses, setLanAkses] = useState(settings?.server_enabled === 1 || false);
  const [serverPort, setServerPort] = useState(settings?.server_port || 8080);
  const [enableQrcode, setEnableQrcode] = useState(settings?.enable_qrcode === 1 || false);
  
  const [notif, setNotif] = useState('');

  // RBAC State
  const [usersList, setUsersList] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('operator');

  const fetchUsersList = async () => {
    const list = await getUsers();
    setUsersList(list);
  };

  useEffect(() => {
    if (mode === 'users') {
      fetchUsersList();
    }
  }, [mode]);

  const handleAddUser = async () => {
    if(!newUsername || !newPassword) return;
    await saveUser({ username: newUsername, password: newPassword, role: newRole });
    setNewUsername('');
    setNewPassword('');
    setNewRole('operator');
    fetchUsersList();
  };

  const handleDeleteUser = async (u) => {
    if(u === 'admin') return alert('Admin tidak bisa dihapus!');
    if(window.confirm(`Hapus pengguna ${u}?`)) {
      await deleteUser(u);
      fetchUsersList();
    }
  };

  const handleClearAllUsers = async () => {
    const ops = usersList.filter(u => u.username !== 'admin');
    if (ops.length === 0) return alert('Tidak ada operator yang bisa dihapus.');
    if (window.confirm(`Yakin ingin menghapus semua ${ops.length} data operator secara permanen?`)) {
      for (const u of ops) {
        await deleteUser(u.username);
      }
      fetchUsersList();
    }
  };

  const handleBackup = () => {
    window.location.href = `${API_BASE_URL}/backup`;
  };

  const handleRestore = async () => {
    if (window.api && window.api.pilihFileRestore) {
       const res = await window.api.pilihFileRestore();
       if (res && res.success) {
          alert('Database berhasil dipulihkan! Aplikasi akan ditutup. Silakan buka kembali.');
       }
    } else {
       alert('Fitur Restore hanya tersedia di Desktop App.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const newSettings = {
      nama_instansi: namaInstansi,
      folder_surat_keluar: folderKeluar,
      folder_surat_masuk: folderMasuk,
      format_nomor_default: formatNomor,
      counter_surat_keluar: parseInt(counterKeluar, 10) || 0,
      server_enabled: lanAkses ? 1 : 0,
      server_port: parseInt(serverPort, 10) || 8080,
      enable_qrcode: enableQrcode ? 1 : 0
    };

    await saveSettings(newSettings);

    if (window.api && window.api.toggleServer) {
      await window.api.toggleServer(lanAkses, parseInt(serverPort, 10) || 8080);
    }

    if (onSettingsSaved) onSettingsSaved();
    setNotif('Pengaturan berhasil diperbarui!');
    setTimeout(() => setNotif(''), 3000);
  };

  const renderHeader = () => {
    if (mode === 'users') {
      return (
        <div className="mb-8 relative z-10">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
              <Users size={20} />
            </div>
            Manajemen Pengguna
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1.5 ml-[3.25rem]">
            Atur hak akses masuk (Role-Based Access Control).
          </p>
        </div>
      );
    }
    
    if (mode === 'backup') {
      return (
        <div className="mb-8 relative z-10">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 text-white">
              <Folder size={20} />
            </div>
            Backup & Restore
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1.5 ml-[3.25rem]">
            Amankan data sistem dengan mencadangkan secara berkala.
          </p>
        </div>
      );
    }

    return (
      <div className="mb-8 relative z-10">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white">
            <SettingsIcon size={20} />
          </div>
          Konfigurasi Sistem
        </h2>
        <p className="text-slate-500 text-sm font-medium mt-1.5 ml-[3.25rem]">
          Personalisasi identitas dan aturan operasional aplikasi.
        </p>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 w-full pb-20 relative">
      
      {/* Ambient glowing background blobs */}
      <div className="absolute top-0 left-0 w-[350px] h-[350px] bg-indigo-400/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute top-40 right-0 w-[300px] h-[300px] bg-emerald-400/10 rounded-full blur-[100px] translate-x-1/3 pointer-events-none"></div>

      {renderHeader()}

      {notif && (
        <div className="px-5 py-4 bg-emerald-500 text-white rounded-2xl mb-8 font-bold flex items-center gap-3 shadow-xl shadow-emerald-500/20 animate-in slide-in-from-top-4 fade-in duration-300 relative z-10">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          {notif}
        </div>
      )}

      {mode === 'general' && (
        <form onSubmit={handleSave} className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
          
          {/* CARD 1: Identitas Organisasi */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-500 group/card">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover/card:scale-110 transition-transform duration-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Profil Organisasi</h3>
              <p className="text-[11px] font-medium text-slate-500">Nama resmi yang tercetak pada kop surat.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="flex items-center text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Nama Organisasi
              </label>
              <input
                type="text"
                value={namaInstansi}
                onChange={(e) => setNamaInstansi(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-800 text-sm outline-none shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* CARD 2: Penomoran Surat */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-500 group/card">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-amber-500/20 group-hover/card:scale-110 transition-transform duration-500">
              <FileDigit size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Sistem Penomoran</h3>
              <p className="text-[11px] font-medium text-slate-500">Format otomatis dan kontrol hitungan mundur.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="flex items-center text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 gap-1.5">
                Pola Format Penomoran
                <div className="group relative flex items-center cursor-help">
                  <HelpCircle size={14} className="text-slate-400 hover:text-amber-500" />
                  <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs font-medium rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-all pointer-events-none text-center">
                    Gunakan {'{NO_URUT}'}, {'{BULAN_ROMAWI}'}, {'{TAHUN}'} untuk otomatisasi.
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
                  </div>
                </div>
              </label>
              <input
                type="text"
                value={formatNomor}
                onChange={(e) => setFormatNomor(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white transition-all font-mono font-bold text-slate-800 text-sm outline-none shadow-inner"
              />
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="flex items-center text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 gap-1.5">
                  Counter Terakhir
                  <div className="group relative flex items-center cursor-help">
                    <HelpCircle size={14} className="text-slate-400 hover:text-amber-500" />
                    <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 p-3 bg-slate-800 text-white text-xs font-medium rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-all pointer-events-none text-center">
                      Nomor akan otomatis bertambah 1 saat membuat surat baru.
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
                    </div>
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-mono font-bold">#</span>
                  <input
                    type="number"
                    min="0"
                    value={counterKeluar}
                    onChange={(e) => setCounterKeluar(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white transition-all font-mono font-bold text-slate-800 text-sm outline-none shadow-inner"
                  />
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setCounterKeluar(0)}
                className="px-4 py-3 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-xl text-sm font-bold transition-colors outline-none shrink-0"
              >
                Reset ke 0
              </button>
            </div>
          </div>
        </div>

        {/* CARD 3: Direktori Penyimpanan */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-500 group/card lg:col-span-2 xl:col-span-1">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover/card:scale-110 transition-transform duration-500">
              <Folder size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Ruang Penyimpanan</h3>
              <p className="text-[11px] font-medium text-slate-500">Lokasi fisik penyimpanan file arsip.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="flex items-center text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Direktori Surat Keluar
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={folderKeluar}
                  onChange={(e) => setFolderKeluar(e.target.value)}
                  required
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all font-mono font-medium text-slate-600 text-sm outline-none shadow-inner"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (window.api && window.api.pilihFolder) {
                      const folder = await window.api.pilihFolder();
                      if (folder) setFolderKeluar(folder);
                    }
                  }}
                  className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 font-bold transition-colors outline-none shrink-0"
                >
                  Ubah
                </button>
              </div>
            </div>

            <div>
              <label className="flex items-center text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Direktori Arsip Masuk
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={folderMasuk}
                  onChange={(e) => setFolderMasuk(e.target.value)}
                  required
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all font-mono font-medium text-slate-600 text-sm outline-none shadow-inner"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (window.api && window.api.pilihFolder) {
                      const folder = await window.api.pilihFolder();
                      if (folder) setFolderMasuk(folder);
                    }
                  }}
                  className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 font-bold transition-colors outline-none shrink-0"
                >
                  Ubah
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 4: Jaringan & LAN */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-500 group/card lg:col-span-2 xl:col-span-1">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover/card:scale-110 transition-transform duration-500">
              <Globe size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-800">Akses Jaringan (LAN)</h3>
              <p className="text-[11px] font-medium text-slate-500">Izin akses dari perangkat lain dalam satu Wi-Fi.</p>
            </div>
            
            {/* BIG iOS Style Toggle */}
            <label className="flex items-center cursor-pointer shrink-0 ml-4">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={lanAkses}
                  onChange={(e) => setLanAkses(e.target.checked)}
                  className="sr-only"
                />
                <div className={`block w-16 h-9 rounded-full transition-colors duration-300 ${lanAkses ? 'bg-rose-500' : 'bg-slate-200'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-7 h-7 rounded-full transition-transform duration-300 shadow-sm ${lanAkses ? 'translate-x-7' : ''}`}></div>
              </div>
            </label>
          </div>
          
          <div className="space-y-6">
            <div className={`transition-all duration-500 overflow-hidden ${lanAkses ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-5 bg-rose-50/50 border border-rose-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-widest">Jaringan Aktif</span>
                </div>
                <p className="text-xs text-slate-600 font-medium mb-3">
                  Komputer lain dapat mengakses sistem ini melalui alamat IP berikut:
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <code className="flex-1 px-4 py-3 bg-white border border-rose-100 rounded-xl text-rose-700 font-mono font-bold text-base shadow-sm">
                      http://192.168.x.x:{serverPort}
                    </code>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Port Akses</label>
                    <input 
                      type="number"
                      value={serverPort}
                      onChange={(e) => setServerPort(e.target.value)}
                      className="w-full mt-1 px-4 py-3 rounded-xl border border-rose-100 bg-white font-mono font-bold text-slate-800 focus:outline-none focus:border-rose-300"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-3 font-medium">Buka CMD dan ketik `ipconfig` untuk melihat IP Anda yang sebenarnya.</p>
              </div>
            </div>
            
            {!lanAkses && (
              <div className="h-full flex items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-sm text-slate-400 font-medium text-center">Akses jaringan dimatikan. Sistem berjalan murni secara lokal.</p>
              </div>
            )}
          </div>
        </div>

        {/* SUBMIT BUTTON - FULL WIDTH */}
        <div className="lg:col-span-2 pt-4">
          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white font-bold text-base hover:from-indigo-600 hover:to-blue-600 shadow-lg shadow-slate-900/10 hover:shadow-indigo-500/25 transition-all duration-300 flex items-center justify-center gap-3 hover:-translate-y-1 active:scale-[0.98]"
          >
            <Save size={20} />
            Terapkan & Simpan Pengaturan
          </button>
        </div>

      </form>
      )}

      {mode === 'backup' && (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-500 group/card relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-purple-500/20 group-hover/card:scale-110 transition-transform duration-500">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Keamanan & Sistem</h3>
              <p className="text-[11px] font-medium text-slate-500">Validasi dokumen dan pencadangan data.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                   <QrCode size={18} className="text-purple-600"/>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Tanda Tangan QR Code</h4>
                  <p className="text-[10px] font-medium text-slate-500">Bubuhkan QR Code otentikasi di setiap surat docx (menggunakan tag {'{qrcode}'}).</p>
                </div>
              </div>
              <label className="flex items-center cursor-pointer shrink-0 ml-4">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={enableQrcode}
                    onChange={(e) => setEnableQrcode(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`block w-12 h-7 rounded-full transition-colors duration-300 ${enableQrcode ? 'bg-purple-500' : 'bg-slate-200'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${enableQrcode ? 'translate-x-5' : ''}`}></div>
                </div>
              </label>
            </div>

            <div>
              <label className="flex items-center text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                Database (SQLite)
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBackup}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm shadow-md transition-colors"
                >
                  <Download size={16} /> Backup Data
                </button>
                <button
                  type="button"
                  onClick={handleRestore}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 text-slate-700 bg-white font-bold text-sm transition-colors"
                >
                  Restore Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'users' && (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-500 group/card relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover/card:scale-110 transition-transform duration-500">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Manajemen Pengguna</h3>
              <p className="text-[11px] font-medium text-slate-500">Atur hak akses login untuk Admin dan Operator.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-2">
               <input type="text" placeholder="Username" value={newUsername} onChange={(e)=>setNewUsername(e.target.value)} className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-blue-500 font-bold text-slate-800 text-xs outline-none transition-all shadow-inner" />
               <input type="text" placeholder="Password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-blue-500 font-bold text-slate-800 text-xs outline-none transition-all shadow-inner" />
               <select value={newRole} onChange={(e)=>setNewRole(e.target.value)} className="w-1/4 px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-blue-500 font-bold text-slate-800 text-xs outline-none transition-all shadow-inner">
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
               </select>
               <button type="button" onClick={handleAddUser} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-md flex items-center gap-2">
                 <Plus size={16} /> Tambah
               </button>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Daftar Pengguna ({usersList.length})</span>
                {usersList.length > 1 && (
                  <button type="button" onClick={handleClearAllUsers} className="text-[10px] font-bold px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg transition-colors flex items-center gap-1.5">
                    <Trash2 size={12}/> Hapus Semua Operator
                  </button>
                )}
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="p-3 pl-4">Pengguna</th>
                      <th className="p-3">Hak Akses</th>
                      <th className="p-3 text-right pr-4">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 pl-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase shadow-inner border border-slate-200">
                               {u.username.charAt(0)}
                             </div>
                             <span className="text-sm font-bold text-slate-800">{u.username}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md inline-block shadow-sm ${u.role === 'admin' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 text-right pr-4">
                          {u.username !== 'admin' ? (
                             <button type="button" onClick={() => handleDeleteUser(u.username)} className="text-rose-500 hover:bg-rose-500 hover:text-white p-2 rounded-lg transition-colors inline-flex" title={`Hapus ${u.username}`}>
                               <Trash2 size={16}/>
                             </button>
                          ) : (
                             <span className="text-[10px] font-bold text-slate-300 italic px-2">Permanen</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

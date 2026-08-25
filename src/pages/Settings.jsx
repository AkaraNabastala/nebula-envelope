import React, { useState, useEffect } from 'react';
import { saveSettings, getSettings, saveUser, deleteUser, getUsers, resetPasswordAdmin, triggerReload, triggerToast, setApiPort, API_BASE_URL } from '../services/db';
import { Settings as SettingsIcon, Folder, Save, Globe, FileDigit, HelpCircle, Users, ShieldCheck, Download, Upload, QrCode, Trash2, Plus, Database, AlertTriangle, Info, Eye, EyeOff, UserCog, AtSign, Key, X, Check, Trash } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings({ settings, onSettingsSaved, onOpenFolderPicker, mode = 'general' }) {
  const [namaInstansi, setNamaInstansi] = useState(settings?.nama_instansi || 'Instansi Mandiri');
  const [folderKeluar, setFolderKeluar] = useState(settings?.folder_surat_keluar || 'D:/data/surat/keluar');
  const [folderMasuk, setFolderMasuk] = useState(settings?.folder_surat_masuk || 'D:/data/surat/masuk');
  const [formatNomor, setFormatNomor] = useState(settings?.format_nomor_default || '{NO_URUT}/{KODE_KLASIFIKASI}/{KODE_INSTANSI}/{BULAN_ROMAWI}/{TAHUN}');
  const [counterKeluar, setCounterKeluar] = useState(settings?.counter_surat_keluar || 0);
  const [lanAkses, setLanAkses] = useState(settings?.server_enabled === 1 || false);
  const [serverPort, setServerPort] = useState(settings?.server_port || 8080);
  const [enableQrcode, setEnableQrcode] = useState(settings?.enable_qrcode === 1 || false);
  const [convertapiSecret, setConvertapiSecret] = useState(settings?.convertapi_secret || '');

  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', desc: '', actionLabel: '', onConfirm: null, type: 'danger' });

  // Backup/Restore State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState(null);

  // Logo & Login Background State
  const [logoBase64, setLogoBase64] = useState(settings?.logo_base64 || '');
  const [loginBgBase64, setLoginBgBase64] = useState(settings?.login_bg_base64 || '');

  // RBAC State
  const [usersList, setUsersList] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNamaLengkap, setNewNamaLengkap] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newRole, setNewRole] = useState('operator');
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [showDetailPassword, setShowDetailPassword] = useState(false);

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
    if (!newUsername) return; // password can be blank when editing if they don't want to change it, wait no, let's keep it simple
    if (!isEditingUser && !newPassword) {
      toast.error('Password diperlukan untuk user baru.');
      return;
    }
    await saveUser({ username: newUsername, password: newPassword, role: newRole, nama_lengkap: newNamaLengkap });
    
    // Update session if they edit themselves
    if (newRole === sessionStorage.getItem('appUserRole') || newUsername === 'admin') {
      sessionStorage.setItem('appNamaLengkap', newNamaLengkap);
      // Let's trigger a UI refresh for sidebar by dispatching a custom event
      window.dispatchEvent(new CustomEvent('user-updated', { detail: { nama_lengkap: newNamaLengkap } }));
    }

    setNewUsername('');
    setNewPassword('');
    setNewNamaLengkap('');
    setNewRole('operator');
    setIsEditingUser(false);
    triggerToast('Berhasil!', isEditingUser ? 'Pengguna berhasil diperbarui!' : 'Pengguna berhasil ditambahkan!');
    fetchUsersList();
  };

  const handleDeleteUser = async (u) => {
    if (u === 'admin') return toast.error('Admin tidak bisa dihapus!');
    setConfirmConfig({
      isOpen: true,
      title: `Hapus pengguna ${u}?`,
      desc: 'Pengguna ini tidak akan bisa login lagi.',
      actionLabel: 'Hapus',
      type: 'danger',
      onConfirm: async () => {
        window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'delete', title: `Menghapus ${u}`, subtitle: 'Membuang data pengguna...' } }));
        setTimeout(async () => {
          try {
            await deleteUser(u);
            fetchUsersList();
            window.dispatchEvent(new CustomEvent('hide-processing'));
            setTimeout(() => triggerToast('Berhasil!', `Pengguna ${u} berhasil dihapus.`), 300);
          } catch (e) {
            window.dispatchEvent(new CustomEvent('hide-processing'));
            setTimeout(() => toast.error(`Gagal menghapus pengguna ${u}`), 300);
          }
        }, 1500);
      }
    });
  };

  const handleClearAllUsers = async () => {
    const ops = usersList.filter(u => u.username !== 'admin');
    if (ops.length === 0) return toast.info('Tidak ada operator yang bisa dihapus.');

    setConfirmConfig({
      isOpen: true,
      title: `Hapus ${ops.length} data operator?`,
      desc: 'Tindakan ini akan menghapus semua operator secara permanen.',
      actionLabel: 'Hapus',
      type: 'danger',
      onConfirm: async () => {
        window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'delete', title: 'Menghapus Operator', subtitle: 'Membuang semua data operator...' } }));
        setTimeout(async () => {
          try {
            for (const u of ops) {
              await deleteUser(u.username);
            }
            fetchUsersList();
            window.dispatchEvent(new CustomEvent('hide-processing'));
            setTimeout(() => triggerToast('Berhasil!', 'Semua operator berhasil dihapus.'), 300);
          } catch (e) {
            window.dispatchEvent(new CustomEvent('hide-processing'));
            setTimeout(() => toast.error('Gagal menghapus operator'), 300);
          }
        }, 1500);
      }
    });
  };

  const handleBackup = () => {
    setIsBackingUp(true);
    window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'download', title: 'Mencadangkan Database', subtitle: 'Menyiapkan dan mengunduh file backup.db...' } }));
    setTimeout(() => {
      window.location.href = `${API_BASE_URL}/backup`;
      setIsBackingUp(false);
      window.dispatchEvent(new CustomEvent('hide-processing'));
      triggerToast('Berhasil!', 'Backup berhasil diunduh!');
    }, 2000);
  };

  const handleSelectRestoreFile = async () => {
    if (window.api && window.api.pilihFileRestore) {
      const res = await window.api.pilihFileRestore();
      if (res && res.success) {
        setSelectedRestoreFile({ path: res.filePath, name: res.fileName });
      }
    } else {
      toast.error('Fitur Restore hanya tersedia di Desktop App.');
    }
  };

  const executeRestore = async () => {
    if (!selectedRestoreFile) return;
    
    setIsRestoring(true);
    window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'upload', title: 'Memulihkan Database', subtitle: `Mengunggah ${selectedRestoreFile.name} dan memulihkan data...` } }));
    
    try {
      // Artificial delay for animation
      await new Promise(r => setTimeout(r, 2000));
      
      const res = await window.api.jalankanRestore(selectedRestoreFile.path);
      if (res && res.success) {
        window.dispatchEvent(new CustomEvent('hide-processing'));
        triggerToast('Berhasil!', 'Database berhasil dipulihkan! Memuat ulang sistem...');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        throw new Error(res.error || 'Terjadi kesalahan');
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent('hide-processing'));
      toast.error('Gagal memulihkan database', { description: e.message });
      setIsRestoring(false);
    }
  };

  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('Ukuran file maksimal 2MB!');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result);
      };
      reader.readAsDataURL(file);
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
      server_port: !isNaN(parseInt(serverPort, 10)) ? parseInt(serverPort, 10) : 8080,
      enable_qrcode: enableQrcode ? 1 : 0,
      convertapi_secret: convertapiSecret,
      manual_folder_selected: 1,
      logo_base64: logoBase64,
      login_bg_base64: loginBgBase64
    };

    await saveSettings(newSettings);

    const actualPort = !isNaN(parseInt(serverPort, 10)) ? parseInt(serverPort, 10) : 8080;
    if (window.api && window.api.toggleServer) {
      await window.api.toggleServer(lanAkses, actualPort);
      setApiPort(actualPort);
    }

    if (onSettingsSaved) onSettingsSaved();
    triggerToast('Berhasil!', 'Pengaturan berhasil diperbarui!');
  };

  const renderHeader = () => {
    if (mode === 'users' || mode === 'backup') {
      return null;
    }

    return (
      <div className="mb-6 relative z-10 hidden">
        {/* Header dihilangkan sesuai permintaan user */}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 w-full pb-20 relative">

      {/* Ambient glowing background blobs */}
      <div className="absolute top-0 left-0 w-[350px] h-[350px] bg-indigo-400/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute top-40 right-0 w-[300px] h-[300px] bg-emerald-400/10 rounded-full blur-[100px] translate-x-1/3 pointer-events-none"></div>

      {renderHeader()}



      {mode === 'general' && (
        <form onSubmit={handleSave} className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">

          {/* CARD 1: Identitas Organisasi */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-500 group/card">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover/card:scale-105 transition-transform duration-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Profil Organisasi</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Nama resmi yang tercetak pada kop surat.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    <span>Logo Organisasi</span>
                    {logoBase64 && <button type="button" onClick={() => setLogoBase64('')} className="text-rose-500 hover:text-rose-600 text-[10px]">Hapus</button>}
                  </label>
                  <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${logoBase64 ? 'border-blue-300 bg-blue-50/30' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                    {logoBase64 ? (
                      <img src={logoBase64} alt="Logo" className="h-20 object-contain drop-shadow-md" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400">
                        <Upload size={24} className="mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-center px-2">Upload PNG/JPG<br />Maks 2MB</p>
                      </div>
                    )}
                    <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleImageUpload(e, setLogoBase64)} />
                  </label>
                </div>

                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    <span>Background Login</span>
                    {loginBgBase64 && <button type="button" onClick={() => setLoginBgBase64('')} className="text-rose-500 hover:text-rose-600 text-[10px]">Hapus</button>}
                  </label>
                  <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all overflow-hidden relative ${loginBgBase64 ? 'border-blue-300' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                    {loginBgBase64 ? (
                      <img src={loginBgBase64} alt="Bg" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400">
                        <Upload size={24} className="mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-center px-2">Upload Wallpaper<br />Maks 2MB</p>
                      </div>
                    )}
                    <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleImageUpload(e, setLoginBgBase64)} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Penomoran Surat */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-500 group/card">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30 group-hover/card:scale-105 transition-transform duration-500">
                <FileDigit size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Sistem Penomoran</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Format otomatis dan kontrol hitungan mundur.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 gap-1.5">
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
                  <label className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 gap-1.5">
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
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 group-hover/card:scale-105 transition-transform duration-500">
                <Folder size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Ruang Penyimpanan</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Lokasi fisik penyimpanan file arsip.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
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
                      } else {
                        toast.error("Fitur hanya untuk aplikasi Desktop");
                      }
                    }}
                    className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 font-bold transition-colors outline-none shrink-0"
                  >
                    Ubah
                  </button>
                </div>
              </div>

              <div>
                <label className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
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
                      } else {
                        toast.error("Fitur hanya untuk aplikasi Desktop");
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
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover/card:scale-105 transition-transform duration-500 shrink-0">
                <Globe size={24} />
              </div>
              <div className="flex-1 mt-1">
                <h3 className="text-xl font-bold text-slate-800">Akses Jaringan (LAN)</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Izin akses dari perangkat lain dalam satu Wi-Fi.</p>
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
                    <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">Jaringan Aktif</span>
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
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Port Akses</label>
                      <input
                        type="number"
                        value={serverPort}
                        onChange={(e) => setServerPort(e.target.value)}
                        className="w-full mt-1 px-4 py-3 rounded-xl border border-rose-100 bg-white font-mono font-bold text-slate-800 focus:outline-none focus:border-rose-300"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-3 font-medium">Buka CMD dan ketik `ipconfig` untuk melihat IP Anda yang sebenarnya.</p>
                </div>
              </div>

              {!lanAkses && (
                <div className="h-full flex items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl">
                  <p className="text-sm text-slate-400 font-medium text-center">Akses jaringan dimatikan. Sistem berjalan murni secara lokal.</p>
                </div>
              )}
            </div>
          </div>

          {/* CARD 4: Keamanan & Fitur Tambahan */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-500 group/card lg:col-span-2">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/30 group-hover/card:scale-105 transition-transform duration-500 shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div className="mt-1">
                <h3 className="text-xl font-bold text-slate-800">Keamanan & Ekstra</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Pengaturan validasi dokumen dan fitur ekstra.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <QrCode size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Tanda Tangan QR Code</h4>
                    <p className="text-xs font-medium text-slate-500 mt-1">Bubuhkan QR Code otentikasi di setiap surat docx (menggunakan tag {'{{%qrcode}}'}).</p>
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
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-500 group/card relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover/card:scale-105 transition-transform duration-500">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Database Pencadangan</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Amankan data sistem dengan rutin melakukan pencadangan.</p>
            </div>
          </div>

          <div className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Backup Card */}
              <div className="bg-white/50 backdrop-blur border border-blue-100 rounded-3xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 group/backup">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-inner group-hover/backup:scale-110 transition-transform duration-300">
                  <Download size={32} className="group-hover/backup:animate-bounce" />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">Backup Database</h4>
                <p className="text-sm text-slate-500 mb-6 flex-1">
                  Unduh salinan database sistem saat ini untuk mengamankan data persuratan dan pengaturan Anda.
                </p>
                <button
                  type="button"
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-base shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isBackingUp ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download size={20} />
                  )}
                  {isBackingUp ? 'Memproses Backup...' : 'Buat File Backup'}
                </button>
              </div>

              {/* Restore Card */}
              <div className="bg-white/50 backdrop-blur border border-amber-100 rounded-3xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 group/restore">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600 rounded-full flex items-center justify-center mb-4 shadow-inner group-hover/restore:scale-110 transition-transform duration-300">
                  <Upload size={32} className="group-hover/restore:-translate-y-1 group-hover/restore:animate-pulse transition-transform duration-300" />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">Restore Database</h4>
                <p className="text-sm text-slate-500 mb-6 flex-1">
                  Pulihkan data sistem dari file backup (.db) yang pernah Anda buat sebelumnya. (Akan menimpa data saat ini!)
                </p>
                
                {!selectedRestoreFile ? (
                  <button
                    type="button"
                    onClick={handleSelectRestoreFile}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-700 hover:text-amber-700 font-bold text-base transition-all hover:-translate-y-0.5"
                  >
                    <Folder size={20} />
                    Pilih File Database
                  </button>
                ) : (
                  <div className="w-full flex flex-col gap-3">
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Database size={16} className="text-amber-500 shrink-0" />
                        <span className="text-xs font-semibold text-amber-900 truncate">{selectedRestoreFile.name}</span>
                      </div>
                      <button onClick={() => setSelectedRestoreFile(null)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Batal">
                        <X size={16} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={executeRestore}
                      disabled={isRestoring}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-base shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isRestoring ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Upload size={20} />
                      )}
                      {isRestoring ? 'Memulihkan Data...' : 'Upload & Restore'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'users' && (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-500 group/card relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover/card:scale-105 transition-transform duration-500">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Manajemen Pengguna</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Atur hak akses login untuk Admin dan Operator.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/40 backdrop-blur-3xl p-6 sm:p-8 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group/form">
              {/* Premium Gradient Background Elements */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-400/20 via-cyan-300/10 to-transparent blur-[80px] rounded-full pointer-events-none transition-opacity duration-700 group-hover/form:opacity-100 opacity-60"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-400/20 to-transparent blur-[60px] rounded-full pointer-events-none opacity-50"></div>
              
              <div className="flex items-center gap-4 mb-8 relative z-10 border-b border-slate-200/50 pb-5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-50 text-blue-600 flex items-center justify-center shadow-inner ring-1 ring-blue-500/10">
                  {isEditingUser ? <UserCog size={20} /> : <Plus size={20} />}
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800 tracking-tight">{isEditingUser ? 'Edit Profil Pengguna' : 'Buat Pengguna Baru'}</h4>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{isEditingUser ? 'Perbarui informasi akun ini.' : 'Isi formulir untuk menambahkan akses baru.'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-8 relative z-10">
                
                {/* Nama Lengkap */}
                <div className="group/input">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1 group-focus-within/input:text-blue-600 transition-colors">Nama Lengkap</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                      <Users size={18} />
                    </div>
                    <input type="text" placeholder="Masukkan nama lengkap" value={newNamaLengkap} onChange={(e) => setNewNamaLengkap(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 font-semibold text-slate-800 text-sm outline-none transition-all shadow-sm hover:border-slate-300 placeholder:text-slate-400 placeholder:font-medium" />
                  </div>
                </div>

                {/* Username */}
                <div className="group/input">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1 group-focus-within/input:text-blue-600 transition-colors">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                      <AtSign size={18} />
                    </div>
                    <input type="text" placeholder="contoh: budi_admin" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} disabled={isEditingUser} className={`w-full pl-11 pr-4 py-3.5 rounded-2xl backdrop-blur-sm border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-semibold text-slate-800 text-sm outline-none transition-all shadow-sm hover:border-slate-300 placeholder:text-slate-400 placeholder:font-medium ${isEditingUser ? 'bg-slate-100/50 text-slate-500 cursor-not-allowed border-slate-200/50 shadow-none' : 'bg-white/70 focus:bg-white'}`} />
                  </div>
                </div>
                
                {/* Password */}
                <div className="group/input">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1 group-focus-within/input:text-blue-600 transition-colors">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                      <Key size={18} />
                    </div>
                    <input type={showPassword ? "text" : "password"} placeholder={isEditingUser ? "(Kosongkan jika tidak diubah)" : "••••••••"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 font-semibold text-slate-800 text-sm outline-none transition-all shadow-sm hover:border-slate-300 placeholder:text-slate-400 placeholder:font-medium" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-all">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Role / Hak Akses */}
                <div className="group/input">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1 group-focus-within/input:text-blue-600 transition-colors">Hak Akses</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                      <ShieldCheck size={18} />
                    </div>
                    <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-800 text-sm outline-none transition-all shadow-sm hover:border-slate-300 appearance-none cursor-pointer">
                      <option value="operator">Operator (Terbatas)</option>
                      <option value="admin">Administrator (Penuh)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-3 relative z-10 border-t border-slate-200/50 mt-2">
                {isEditingUser && (
                  <button type="button" onClick={() => {
                    setNewUsername('');
                    setNewPassword('');
                    setNewNamaLengkap('');
                    setNewRole('operator');
                    setIsEditingUser(false);
                  }} className="px-6 py-3.5 bg-white/50 hover:bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm flex items-center justify-center hover:-translate-y-0.5">
                    Batal Edit
                  </button>
                )}
                <button type="button" onClick={handleAddUser} className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_10px_20px_-10px_rgba(59,130,246,0.6)] flex items-center justify-center gap-2 group/btn">
                  {isEditingUser ? <Save size={18} className="group-hover/btn:scale-110 transition-transform" /> : <Plus size={18} className="group-hover/btn:rotate-90 transition-transform" />}
                  {isEditingUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </button>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Users size={20} className="text-slate-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-800">Daftar Pengguna</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{usersList.length} Akun Terdaftar</p>
                  </div>
                </div>
                {usersList.length > 1 && (
                  <button type="button" onClick={handleClearAllUsers} className="text-sm font-bold px-5 py-2.5 bg-rose-50/80 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl transition-all flex items-center gap-2 border border-rose-100 hover:border-rose-500 shadow-sm hover:shadow-rose-500/20 active:scale-95">
                    <Trash2 size={16} /> Bersihkan Data Operator
                  </button>
                )}
              </div>

              <div className="bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Profil Pengguna</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Username</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Hak Akses</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80">
                      {usersList.map((u, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm ${u.role === 'admin' ? 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/20' : 'bg-gradient-to-br from-blue-400 to-indigo-500 shadow-blue-500/20'}`}>
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-extrabold text-slate-800">{u.nama_lengkap || 'Tanpa Nama'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60">@{u.username}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border shadow-sm ${u.role === 'admin' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                              {u.role === 'admin' ? 'Administrator' : 'Operator'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button type="button" onClick={() => {
                                setDetailUser(u);
                                setShowDetailPassword(false);
                              }} className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100 hover:shadow-md transition-all" title={`Lihat Detail ${u.username}`}>
                                <Eye size={16} />
                              </button>
                              <button type="button" onClick={() => {
                                setNewUsername(u.username);
                                setNewNamaLengkap(u.nama_lengkap || '');
                                setNewPassword('');
                                setNewRole(u.role);
                                setIsEditingUser(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }} className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-100 hover:shadow-md transition-all" title={`Edit ${u.username}`}>
                                <UserCog size={16} />
                              </button>
                              {u.username !== 'admin' && (
                                <button type="button" onClick={() => handleDeleteUser(u.username)} className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-100 hover:shadow-md transition-all" title={`Hapus ${u.username}`}>
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}></div>
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-300 slide-in-from-bottom-8">
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${confirmConfig.type === 'danger' ? 'bg-red-50 text-red-500 shadow-red-500/20' : 'bg-indigo-50 text-indigo-500 shadow-indigo-500/20'} shadow-lg`}>
              {confirmConfig.type === 'danger' ? <AlertTriangle size={32} /> : <Info size={32} />}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmConfig.title}</h3>
            <p className="text-sm font-medium text-slate-500 mb-8">{confirmConfig.desc}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} />
                Batal
              </button>
              <button
                onClick={() => {
                  if (confirmConfig.onConfirm) confirmConfig.onConfirm();
                  setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg transition-colors flex items-center justify-center gap-2 ${confirmConfig.type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'}`}
              >
                {confirmConfig.type === 'danger' ? <Trash size={18} /> : <Check size={18} />}
                {confirmConfig.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

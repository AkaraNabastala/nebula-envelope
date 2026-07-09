const { contextBridge, ipcRenderer } = require('electron');

// Mengekspos API khusus ke dalam global window object di React (window.api)
contextBridge.exposeInMainWorld('api', {
  // ----------------------------------------------------
  // 1. FUNGSI AUTENTIKASI (LOGIN)
  // ----------------------------------------------------
  verifikasiLogin: (credentials) => {
    // credentials berisi { username, password }
    return ipcRenderer.invoke('db:verifikasiLogin', credentials);
  },

  // ----------------------------------------------------
  // 2. FUNGSI MANAJEMEN ENTITAS (MASTER DATA)
  // ----------------------------------------------------
  getEntitas: (kategori) => {
    return ipcRenderer.invoke('db:getEntitas', kategori);
  },
  
  tambahEntitas: (data) => {
    return ipcRenderer.invoke('db:tambahEntitas', data);
  },

  // ----------------------------------------------------
  // 3. FUNGSI SISTEM & FILE
  // ----------------------------------------------------
  pilihFolder: () => {
    return ipcRenderer.invoke('dialog:pilihFolder');
  }, // <--- Koma ini yang sebelumnya tertinggal

  // ----------------------------------------------------
  // 4. FUNGSI ARSIP SURAT MASUK & KATEGORI
  // ----------------------------------------------------
  getKategoriSurat: () => {
    return ipcRenderer.invoke('db:getKategoriSurat');
  },
  
  getSuratMasuk: () => {
    return ipcRenderer.invoke('db:getSuratMasuk');
  },
  
  tambahSuratMasuk: (data) => {
    return ipcRenderer.invoke('db:tambahSuratMasuk', data);
  },

  getSuratKeluar: () => ipcRenderer.invoke('db:getSuratKeluar'),
  tambahSuratKeluar: (data) => ipcRenderer.invoke('db:tambahSuratKeluar', data),

  pilihFileArsip: () => {
    return ipcRenderer.invoke('dialog:pilihFile');
  },

  // ----------------------------------------------------
  // 7. FUNGSI HAPUS DATA
  // ----------------------------------------------------
  hapusEntitas: (id) => ipcRenderer.invoke('db:hapusEntitas', id),
  hapusSurat: (id) => ipcRenderer.invoke('db:hapusSurat', id)
});
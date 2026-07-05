const { app, BrowserWindow } = require('electron/main');
const path = require('node:path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      // Keamanan standar Electron
      nodeIntegration: false,
      contextIsolation: true,
      // preload: path.join(__dirname, 'preload.js') // Buka komentar ini jika nanti butuh preload
    }
  });

  // Logika untuk Development vs Production
  if (process.env.NODE_ENV === 'development') {
    // Saat dev (npm run dev), muat server lokal dari Vite
    win.loadURL('http://localhost:5173');
    
    // Opsional: Buka DevTools (Inspect Element) secara otomatis saat coding
    // win.webContents.openDevTools();
  } else {
    // Saat production (setelah di-build), muat file index.html statis
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

// Menjalankan jendela saat aplikasi siap
app.whenReady().then(() => {
  createWindow();
  
  // Berlaku khusus untuk macOS (membuka ulang jendela jika icon di-klik tapi tidak ada jendela aktif)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Menutup aplikasi sepenuhnya jika semua jendela ditutup (kecuali di macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
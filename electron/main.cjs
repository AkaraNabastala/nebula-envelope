const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    title: 'Sistem Surat Universal',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    autoHideMenuBar: true,
    frame: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers for Native System Integration

// 1. Native Folder Selector Dialog (Windows Directory Picker)
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Pilih Folder Tujuan Penyimpanan Surat'
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// 2. Direct File Writer to Local System Path (e.g., D:\data\surat\keluar\filename.docx)
ipcMain.handle('fs:saveFile', async (event, { folderPath, fileName, fileData, isBase64 }) => {
  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const fullPath = path.join(folderPath, fileName);

    let buffer;
    if (isBase64) {
      buffer = Buffer.from(fileData, 'base64');
    } else {
      buffer = Buffer.from(fileData);
    }

    fs.writeFileSync(fullPath, buffer);
    return { success: true, fullPath };
  } catch (error) {
    console.error('Error writing file:', error);
    return { success: false, error: error.message };
  }
});

// 3. Open Folder or File in Windows
ipcMain.handle('shell:openFolder', async (event, folderPath) => {
  if (fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
    return true;
  }
  return false;
});

ipcMain.handle('shell:openFile', async (event, filePath) => {
  if (fs.existsSync(filePath)) {
    shell.openPath(filePath);
    return true;
  }
  return false;
});

// 4. Window Controls
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});
ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

// 5. Print DOCX Natively via PowerShell (Windows only)
ipcMain.on('print-docx', (event, filePath) => {
    // Memanggil PowerShell di Windows untuk mencetak dokumen secara "Silent"
    // Perintah ini akan menyuruh Windows mencetak menggunakan aplikasi default (MS Word)
    const command = `powershell -command "Start-Process -FilePath '${filePath}' -Verb Print -PassThru | %{sleep 5;$_} | Stop-Process"`;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error printing DOCX: ${error.message}`);
        } else {
            console.log(`Print triggered for: ${filePath}`);
        }
    });
});

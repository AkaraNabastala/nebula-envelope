const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  saveFile: (payload) => ipcRenderer.invoke('fs:saveFile', payload),
  openFolder: (folderPath) => ipcRenderer.invoke('shell:openFolder', folderPath),
  openFile: (filePath) => ipcRenderer.invoke('shell:openFile', filePath),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  printDocx: (filePath) => ipcRenderer.invoke('print-docx', filePath),
  cetakSuratFisik: (filePath) => ipcRenderer.invoke('print-docx', filePath),
  isElectron: true
});

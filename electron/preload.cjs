const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  saveFile: (payload) => ipcRenderer.invoke('fs:saveFile', payload),
  openFolder: (folderPath) => ipcRenderer.invoke('shell:openFolder', folderPath),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isElectron: true
});

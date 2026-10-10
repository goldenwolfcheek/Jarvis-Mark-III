const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  onMaximizedChanged: (callback) => {
    ipcRenderer.on('maximized-changed', (_event, isMaximized) => callback(isMaximized))
  },
  selectFolder: () => ipcRenderer.invoke('selectFolder'),
  readDirectory: (dirPath) => ipcRenderer.invoke('readDirectory', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('readFile', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('writeFile', filePath, content),
  fetchText: (url) => ipcRenderer.invoke('fetch:text', url),
  openExternal: (url) => ipcRenderer.send('openExternal', url),
  getSystemStats: () => ipcRenderer.invoke('getSystemStats'),
  getAppInfo: () => ipcRenderer.invoke('getAppInfo'),
})

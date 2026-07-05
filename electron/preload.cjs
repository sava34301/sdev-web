// Preload bridge — exposes a minimal, safe API to the renderer.
// The web IDE feature-detects `window.sdevDesktop` and, when present,
// unlocks the native-assembly compile path.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sdevDesktop', {
  isDesktop: true,
  platform: () => ipcRenderer.invoke('sdev:platform'),
  openFile: () => ipcRenderer.invoke('sdev:openFile'),
  saveFile: (payload) => ipcRenderer.invoke('sdev:saveFile', payload),
  compileNative: (payload) => ipcRenderer.invoke('sdev:compileNative', payload),
  runNative: (payload) => ipcRenderer.invoke('sdev:runNative', payload),
});

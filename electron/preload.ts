// Preload script for Electron (using CommonJS)
const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded.');

// We can expose APIs here if needed in the future
// contextBridge.exposeInMainWorld('myAPI', {
//   doAThing: () => ipcRenderer.send('do-a-thing'),
// });

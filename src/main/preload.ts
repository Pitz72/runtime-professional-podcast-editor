import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    // Expose safe APIs here
    platform: process.platform,
});

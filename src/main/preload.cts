import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    // Platform info
    platform: process.platform,

    // Native dialogs
    openFileDialog: (options?: any) => ipcRenderer.invoke('dialog:open-file', options),
    saveFileDialog: (options?: any) => ipcRenderer.invoke('dialog:save-file', options),

    // File system
    readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath: string, data: string) => ipcRenderer.invoke('fs:write-file', filePath, data),

    // Menu events (from main process)
    onMenuEvent: (channel: string, callback: (...args: any[]) => void) => {
        const validChannels = [
            'menu:new-project',
            'menu:open-project',
            'menu:save-project',
            'menu:export-audio',
            'menu:undo',
            'menu:redo',
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (_event, ...args) => callback(...args));
        }
    },

    // Cleanup
    removeMenuListener: (channel: string) => {
        ipcRenderer.removeAllListeners(channel);
    },
});

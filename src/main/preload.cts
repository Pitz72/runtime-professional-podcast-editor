import { contextBridge, ipcRenderer, webUtils } from 'electron';

const MENU_CHANNELS = [
    'menu:new-project',
    'menu:open-project',
    'menu:save-project',
    'menu:save-project-as',
    'menu:export-audio',
    'menu:undo',
    'menu:redo',
] as const;

export type MenuChannel = typeof MENU_CHANNELS[number];

contextBridge.exposeInMainWorld('electron', {
    // Platform info
    platform: process.platform,

    // Native dialogs
    openFileDialog: (options?: { title?: string; multiple?: boolean; filters?: { name: string; extensions: string[] }[] }) =>
        ipcRenderer.invoke('dialog:open-file', options),
    saveFileDialog: (options?: { title?: string; defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
        ipcRenderer.invoke('dialog:save-file', options),
    confirm: (options: { title?: string; message: string; detail?: string; confirmLabel?: string }) =>
        ipcRenderer.invoke('dialog:confirm', options),

    // File system (validated in the main process)
    readFile: (filePath: string): Promise<ArrayBuffer> => ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath: string, data: string | ArrayBuffer): Promise<boolean> =>
        ipcRenderer.invoke('fs:write-file', filePath, data),
    fileExists: (filePath: string): Promise<boolean> => ipcRenderer.invoke('fs:file-exists', filePath),

    // Resolve the on-disk path of a File dropped from the OS.
    getFilePath: (file: File): string => webUtils.getPathForFile(file),

    // Unsaved-changes flag for the close-confirmation dialog.
    setDirty: (dirty: boolean) => ipcRenderer.send('project:set-dirty', dirty),

    // Menu events. Returns an unsubscribe function.
    onMenuEvent: (channel: string, callback: () => void): (() => void) => {
        if (!(MENU_CHANNELS as readonly string[]).includes(channel)) {
            return () => undefined;
        }
        const listener = () => callback();
        ipcRenderer.on(channel, listener);
        return () => ipcRenderer.removeListener(channel, listener);
    },
});

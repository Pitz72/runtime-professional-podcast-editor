import { contextBridge, ipcRenderer, webUtils } from 'electron';

const MENU_CHANNELS = [
    'menu:new-project',
    'menu:open-project',
    'menu:open-recent',
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

    // UI language, mirrored to the native menu and dialogs.
    setLocale: (locale: 'it' | 'en') => ipcRenderer.send('settings:set-locale', locale),

    // Recent projects
    getRecentProjects: (): Promise<string[]> => ipcRenderer.invoke('recents:get'),
    addRecentProject: (projectPath: string): Promise<boolean> => ipcRenderer.invoke('recents:add', projectPath),

    // Autosave recovery slot
    autosaveWrite: (payload: { projectPath: string | null; data: string }): Promise<boolean> =>
        ipcRenderer.invoke('autosave:write', payload),
    autosaveRead: (): Promise<{ savedAt: number; projectPath: string | null; data: string } | null> =>
        ipcRenderer.invoke('autosave:read'),
    autosaveClear: (): Promise<boolean> => ipcRenderer.invoke('autosave:clear'),

    // Menu events. Returns an unsubscribe function.
    onMenuEvent: (channel: string, callback: (...args: unknown[]) => void): (() => void) => {
        if (!(MENU_CHANNELS as readonly string[]).includes(channel)) {
            return () => undefined;
        }
        const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
        ipcRenderer.on(channel, listener);
        return () => ipcRenderer.removeListener(channel, listener);
    },
});

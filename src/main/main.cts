import { app, BrowserWindow, Menu, ipcMain, dialog, shell, MenuItemConstructorOptions } from 'electron';
import path from 'path';
import fs from 'fs/promises';

let mainWindow: BrowserWindow | null = null;

// Set by the renderer whenever the project's unsaved-changes state changes.
let hasUnsavedChanges = false;

// Paths the user explicitly granted through native dialogs in this session.
// Writes are only permitted to these paths.
const grantedPaths = new Set<string>();

const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.ogg', '.flac', '.aac', '.m4a', '.mp4', '.webm'];
const READABLE_EXTENSIONS = [...AUDIO_EXTENSIONS, '.json', '.rrproj'];

function isReadablePath(filePath: unknown): filePath is string {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) return false;
    return READABLE_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 1024,
        minHeight: 600,
        show: false, // Show only when ready to prevent flash
        backgroundColor: '#111827', // bg-gray-900
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
        },
    });

    // Show maximized when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow?.maximize();
        mainWindow?.show();
    });

    // Never open new windows; external links go to the OS browser.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://')) shell.openExternal(url);
        return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const isDevServer = !app.isPackaged && url.startsWith('http://localhost:5173');
        if (!isDevServer) event.preventDefault();
    });

    // Confirm before closing with unsaved changes.
    mainWindow.on('close', (event) => {
        if (!hasUnsavedChanges || !mainWindow) return;
        const choice = dialog.showMessageBoxSync(mainWindow, {
            type: 'warning',
            title: 'Unsaved Changes',
            message: 'The project has unsaved changes.',
            detail: 'If you quit now, your changes will be lost.',
            buttons: ['Quit Without Saving', 'Cancel'],
            defaultId: 1,
            cancelId: 1,
        });
        if (choice === 1) event.preventDefault();
    });

    if (!app.isPackaged) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createMenu() {
    const template: MenuItemConstructorOptions[] = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Project',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => mainWindow?.webContents.send('menu:new-project'),
                },
                {
                    label: 'Open Project...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => mainWindow?.webContents.send('menu:open-project'),
                },
                { type: 'separator' },
                {
                    label: 'Save Project',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => mainWindow?.webContents.send('menu:save-project'),
                },
                {
                    label: 'Save Project As...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => mainWindow?.webContents.send('menu:save-project-as'),
                },
                {
                    label: 'Export Audio...',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => mainWindow?.webContents.send('menu:export-audio'),
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => app.quit(),
                },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'CmdOrCtrl+Z',
                    click: () => mainWindow?.webContents.send('menu:undo'),
                },
                {
                    label: 'Redo',
                    accelerator: 'CmdOrCtrl+Y',
                    click: () => mainWindow?.webContents.send('menu:redo'),
                },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' },
            ],
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About Runtime Radio',
                    click: () => {
                        if (!mainWindow) return;
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Runtime Radio Podcast Toolkit',
                            message: `Runtime Radio Podcast Toolkit v${app.getVersion()}`,
                            detail: 'Created by Simone Pizzi\n\nDesktop podcast production toolkit.',
                        });
                    },
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC Handlers
function setupIPC() {
    // Open file dialog. Options are whitelisted; results are granted for read/write.
    ipcMain.handle('dialog:open-file', async (_event, options) => {
        if (!mainWindow) return { canceled: true, filePaths: [] };
        const result = await dialog.showOpenDialog(mainWindow, {
            title: typeof options?.title === 'string' ? options.title : 'Open File',
            filters: Array.isArray(options?.filters) ? options.filters : [
                { name: 'Audio Files', extensions: ['wav', 'mp3', 'ogg', 'flac', 'aac', 'm4a'] },
                { name: 'Project Files', extensions: ['json'] },
            ],
            properties: ['openFile', ...(options?.multiple ? ['multiSelections' as const] : [])],
        });
        result.filePaths.forEach(p => grantedPaths.add(p));
        return result;
    });

    // Save file dialog. The chosen path is granted for writing.
    ipcMain.handle('dialog:save-file', async (_event, options) => {
        if (!mainWindow) return { canceled: true, filePath: undefined };
        const result = await dialog.showSaveDialog(mainWindow, {
            title: typeof options?.title === 'string' ? options.title : 'Save File',
            defaultPath: typeof options?.defaultPath === 'string' ? options.defaultPath : undefined,
            filters: Array.isArray(options?.filters) ? options.filters : [
                { name: 'Project Files', extensions: ['json'] },
            ],
        });
        if (!result.canceled && result.filePath) grantedPaths.add(result.filePath);
        return result;
    });

    // Native confirmation dialog.
    ipcMain.handle('dialog:confirm', async (_event, options) => {
        if (!mainWindow) return false;
        const result = await dialog.showMessageBox(mainWindow, {
            type: 'warning',
            title: typeof options?.title === 'string' ? options.title : 'Confirm',
            message: typeof options?.message === 'string' ? options.message : 'Are you sure?',
            detail: typeof options?.detail === 'string' ? options.detail : undefined,
            buttons: [
                typeof options?.confirmLabel === 'string' ? options.confirmLabel : 'OK',
                'Cancel',
            ],
            defaultId: 1,
            cancelId: 1,
        });
        return result.response === 0;
    });

    // Read a file (audio or project). Restricted to known extensions and absolute paths.
    ipcMain.handle('fs:read-file', async (_event, filePath: unknown) => {
        if (!isReadablePath(filePath)) {
            throw new Error('Read access denied for this path.');
        }
        const buffer = await fs.readFile(filePath);
        // Return an ArrayBuffer sliced to the exact content.
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    });

    ipcMain.handle('fs:file-exists', async (_event, filePath: unknown) => {
        if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) return false;
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    });

    // Write a file. Only paths granted through a native dialog are writable.
    ipcMain.handle('fs:write-file', async (_event, filePath: unknown, data: unknown) => {
        if (typeof filePath !== 'string' || !grantedPaths.has(filePath)) {
            throw new Error('Write access denied: path was not chosen through a file dialog.');
        }
        if (typeof data === 'string') {
            await fs.writeFile(filePath, data, 'utf-8');
        } else if (data instanceof ArrayBuffer) {
            await fs.writeFile(filePath, Buffer.from(data));
        } else if (ArrayBuffer.isView(data)) {
            await fs.writeFile(filePath, Buffer.from(data.buffer, data.byteOffset, data.byteLength));
        } else {
            throw new Error('Unsupported data type for write.');
        }
        return true;
    });

    // Unsaved-changes flag, used by the close handler.
    ipcMain.on('project:set-dirty', (_event, dirty: unknown) => {
        hasUnsavedChanges = dirty === true;
    });
}

// Single instance: focus the existing window instead of opening a second app.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        setupIPC();
        createWindow();
        createMenu();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

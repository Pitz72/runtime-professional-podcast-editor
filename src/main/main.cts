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

const MAX_RECENTS = 10;
let recentProjects: string[] = [];

// ---------------------------------------------------------------------------
// Localization (Italian + US English) for native menu and dialogs.
// ---------------------------------------------------------------------------

type Locale = 'it' | 'en';

const MAIN_STRINGS = {
    en: {
        file: 'File',
        newProject: 'New Project',
        openProject: 'Open Project...',
        openRecent: 'Open Recent',
        noRecents: 'No Recent Projects',
        saveProject: 'Save Project',
        saveProjectAs: 'Save Project As...',
        exportAudio: 'Export Audio...',
        quit: 'Quit',
        edit: 'Edit',
        undo: 'Undo',
        redo: 'Redo',
        view: 'View',
        help: 'Help',
        about: 'About Runtime Radio',
        aboutDetail: 'Created by Simone Pizzi\n\nDesktop podcast production toolkit.',
        unsavedTitle: 'Unsaved Changes',
        unsavedMessage: 'The project has unsaved changes.',
        unsavedDetail: 'If you quit now, your changes will be lost.',
        quitAnyway: 'Quit Without Saving',
        cancel: 'Cancel',
    },
    it: {
        file: 'File',
        newProject: 'Nuovo Progetto',
        openProject: 'Apri Progetto...',
        openRecent: 'Apri Recenti',
        noRecents: 'Nessun Progetto Recente',
        saveProject: 'Salva Progetto',
        saveProjectAs: 'Salva Progetto con Nome...',
        exportAudio: 'Esporta Audio...',
        quit: 'Esci',
        edit: 'Modifica',
        undo: 'Annulla',
        redo: 'Ripeti',
        view: 'Visualizza',
        help: 'Aiuto',
        about: 'Informazioni su Runtime Radio',
        aboutDetail: 'Creato da Simone Pizzi\n\nToolkit desktop per la produzione di podcast.',
        unsavedTitle: 'Modifiche non salvate',
        unsavedMessage: 'Il progetto ha modifiche non salvate.',
        unsavedDetail: 'Se esci adesso, le modifiche andranno perse.',
        quitAnyway: 'Esci senza salvare',
        cancel: 'Annulla',
    },
} as const;

let locale: Locale = 'en';
const L = () => MAIN_STRINGS[locale];

// ---------------------------------------------------------------------------
// Small JSON persistence helpers (window state, recents, autosave slot).
// ---------------------------------------------------------------------------

const userDataFile = (name: string) => path.join(app.getPath('userData'), name);

async function readJson<T>(file: string): Promise<T | null> {
    try {
        return JSON.parse(await fs.readFile(file, 'utf-8')) as T;
    } catch {
        return null;
    }
}

async function writeJson(file: string, data: unknown): Promise<void> {
    try {
        await fs.writeFile(file, JSON.stringify(data), 'utf-8');
    } catch (error) {
        logError('writeJson failed', error);
    }
}

function logError(context: string, error: unknown): void {
    const line = `[${new Date().toISOString()}] ${context}: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`;
    fs.appendFile(userDataFile('error.log'), line).catch(() => undefined);
}

process.on('uncaughtException', (error) => logError('uncaughtException', error));
process.on('unhandledRejection', (reason) => logError('unhandledRejection', reason));

// ---------------------------------------------------------------------------
// Recent projects
// ---------------------------------------------------------------------------

async function loadRecents(): Promise<void> {
    const stored = await readJson<string[]>(userDataFile('recents.json'));
    recentProjects = Array.isArray(stored) ? stored.filter(p => typeof p === 'string').slice(0, MAX_RECENTS) : [];
    // Paths in the recents list are user-chosen project files: grant them
    // so "open recent" → edit → Ctrl+S works without re-prompting a dialog.
    recentProjects.forEach(p => grantedPaths.add(p));
}

async function addRecent(projectPath: string): Promise<void> {
    recentProjects = [projectPath, ...recentProjects.filter(p => p !== projectPath)].slice(0, MAX_RECENTS);
    grantedPaths.add(projectPath);
    await writeJson(userDataFile('recents.json'), recentProjects);
    createMenu();
}

// ---------------------------------------------------------------------------
// Window state persistence
// ---------------------------------------------------------------------------

interface WindowState {
    x?: number;
    y?: number;
    width: number;
    height: number;
    isMaximized: boolean;
}

async function loadWindowState(): Promise<WindowState> {
    const stored = await readJson<WindowState>(userDataFile('window-state.json'));
    if (stored && typeof stored.width === 'number' && typeof stored.height === 'number') {
        return stored;
    }
    return { width: 1280, height: 720, isMaximized: true };
}

function trackWindowState(win: BrowserWindow): void {
    const save = () => {
        if (win.isDestroyed()) return;
        const isMaximized = win.isMaximized();
        const bounds = win.getNormalBounds();
        void writeJson(userDataFile('window-state.json'), {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            isMaximized,
        } satisfies WindowState);
    };
    win.on('close', save);
}

// ---------------------------------------------------------------------------

function isReadablePath(filePath: unknown): filePath is string {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) return false;
    return READABLE_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

async function createWindow() {
    const state = await loadWindowState();

    mainWindow = new BrowserWindow({
        x: state.x,
        y: state.y,
        width: state.width,
        height: state.height,
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

    trackWindowState(mainWindow);

    mainWindow.once('ready-to-show', () => {
        if (state.isMaximized) mainWindow?.maximize();
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
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
        logError('render-process-gone', details.reason);
    });

    // Confirm before closing with unsaved changes.
    mainWindow.on('close', (event) => {
        if (!hasUnsavedChanges || !mainWindow) return;
        const choice = dialog.showMessageBoxSync(mainWindow, {
            type: 'warning',
            title: L().unsavedTitle,
            message: L().unsavedMessage,
            detail: L().unsavedDetail,
            buttons: [L().quitAnyway, L().cancel],
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
    const s = L();

    const recentItems: MenuItemConstructorOptions[] = recentProjects.length > 0
        ? recentProjects.map(projectPath => ({
            label: path.basename(projectPath),
            sublabel: projectPath,
            click: () => mainWindow?.webContents.send('menu:open-recent', projectPath),
        }))
        : [{ label: s.noRecents, enabled: false }];

    const template: MenuItemConstructorOptions[] = [
        {
            label: s.file,
            submenu: [
                {
                    label: s.newProject,
                    accelerator: 'CmdOrCtrl+N',
                    click: () => mainWindow?.webContents.send('menu:new-project'),
                },
                {
                    label: s.openProject,
                    accelerator: 'CmdOrCtrl+O',
                    click: () => mainWindow?.webContents.send('menu:open-project'),
                },
                {
                    label: s.openRecent,
                    submenu: recentItems,
                },
                { type: 'separator' },
                {
                    label: s.saveProject,
                    accelerator: 'CmdOrCtrl+S',
                    click: () => mainWindow?.webContents.send('menu:save-project'),
                },
                {
                    label: s.saveProjectAs,
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => mainWindow?.webContents.send('menu:save-project-as'),
                },
                {
                    label: s.exportAudio,
                    accelerator: 'CmdOrCtrl+E',
                    click: () => mainWindow?.webContents.send('menu:export-audio'),
                },
                { type: 'separator' },
                {
                    label: s.quit,
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => app.quit(),
                },
            ],
        },
        {
            label: s.edit,
            submenu: [
                {
                    label: s.undo,
                    accelerator: 'CmdOrCtrl+Z',
                    click: () => mainWindow?.webContents.send('menu:undo'),
                },
                {
                    label: s.redo,
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
            label: s.view,
            submenu: [
                { role: 'reload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        },
        {
            label: s.help,
            submenu: [
                {
                    label: s.about,
                    click: () => {
                        if (!mainWindow) return;
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: s.about,
                            message: `Runtime Radio Podcast Toolkit v${app.getVersion()}`,
                            detail: s.aboutDetail,
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
            title: typeof options?.title === 'string' ? options.title : undefined,
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
            title: typeof options?.title === 'string' ? options.title : undefined,
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
            title: typeof options?.title === 'string' ? options.title : L().unsavedTitle,
            message: typeof options?.message === 'string' ? options.message : '',
            detail: typeof options?.detail === 'string' ? options.detail : undefined,
            buttons: [
                typeof options?.confirmLabel === 'string' ? options.confirmLabel : 'OK',
                L().cancel,
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

    // Write a file. Only paths previously granted through a native dialog are writable.
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

    // Locale chosen in the renderer: native menu and dialogs follow.
    ipcMain.on('settings:set-locale', (_event, value: unknown) => {
        if (value === 'it' || value === 'en') {
            locale = value;
            createMenu();
        }
    });

    // Recent projects
    ipcMain.handle('recents:get', () => recentProjects);
    ipcMain.handle('recents:add', async (_event, projectPath: unknown) => {
        if (typeof projectPath !== 'string' || !path.isAbsolute(projectPath)) return false;
        await addRecent(projectPath);
        return true;
    });

    // Autosave recovery slot (userData/autosave.json)
    ipcMain.handle('autosave:write', async (_event, payload: unknown) => {
        const data = payload as { projectPath?: string | null; data?: string };
        if (typeof data?.data !== 'string') return false;
        await writeJson(userDataFile('autosave.json'), {
            savedAt: Date.now(),
            projectPath: typeof data.projectPath === 'string' ? data.projectPath : null,
            data: data.data,
        });
        return true;
    });
    ipcMain.handle('autosave:read', async () => {
        return readJson<{ savedAt: number; projectPath: string | null; data: string }>(userDataFile('autosave.json'));
    });
    ipcMain.handle('autosave:clear', async () => {
        try {
            await fs.unlink(userDataFile('autosave.json'));
        } catch { /* nothing to clear */ }
        return true;
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

    app.whenReady().then(async () => {
        locale = app.getLocale().toLowerCase().startsWith('it') ? 'it' : 'en';
        await loadRecents();
        setupIPC();
        await createWindow();
        createMenu();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                void createWindow();
            }
        });
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

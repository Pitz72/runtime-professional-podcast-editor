import { app, BrowserWindow, Menu, ipcMain, dialog, MenuItemConstructorOptions } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

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
            webSecurity: app.isPackaged, // secure when packaged, disabled in dev
        },
    });

    // Enforce 16:9 aspect ratio
    mainWindow.setAspectRatio(16 / 9);

    // Show maximized when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow?.maximize();
        mainWindow?.show();
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
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
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
                        dialog.showMessageBox(mainWindow!, {
                            type: 'info',
                            title: 'About Runtime Radio Podcast Toolkit',
                            message: 'Runtime Radio Podcast Toolkit v0.5.0',
                            detail: '"Il Gran Consolidamento"\nCreated by Simone Pizzi\n\nProfessional podcast production with AI-powered audio enhancement.',
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
    // Open file dialog
    ipcMain.handle('dialog:open-file', async (_event, options) => {
        const result = await dialog.showOpenDialog(mainWindow!, {
            title: options?.title || 'Open File',
            filters: options?.filters || [
                { name: 'Audio Files', extensions: ['wav', 'mp3', 'ogg', 'flac', 'aac', 'm4a'] },
                { name: 'Project Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] },
            ],
            properties: ['openFile', ...(options?.multiple ? ['multiSelections' as const] : [])],
        });
        return result;
    });

    // Save file dialog
    ipcMain.handle('dialog:save-file', async (_event, options) => {
        const result = await dialog.showSaveDialog(mainWindow!, {
            title: options?.title || 'Save File',
            defaultPath: options?.defaultPath,
            filters: options?.filters || [
                { name: 'Project Files', extensions: ['json'] },
            ],
        });
        return result;
    });

    // Read file
    ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
        return fs.readFileSync(filePath);
    });

    // Write file
    ipcMain.handle('fs:write-file', async (_event, filePath: string, data: string) => {
        fs.writeFileSync(filePath, data, 'utf-8');
        return true;
    });
}

app.whenReady().then(() => {
    createWindow();
    createMenu();
    setupIPC();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

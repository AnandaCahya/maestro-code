const { app, BrowserWindow, ipcMain } = require('electron');
const DiscordRPC = require('discord-rpc');
const path = require('path');

// Client ID dari aplikasi Discord Anda
const clientId = '1316648612448440320';
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'renderer.js'), // Preload script
            nodeIntegration: false,
            contextIsolation: true
        },
    });

    mainWindow.loadURL('http://localhost:3000');  // Mengarahkan ke aplikasi React yang berjalan di localhost
}

// Menghubungkan ke Discord RPC
rpc.on('ready', () => {
    console.log('Discord RPC ready!');
    rpc.setActivity({
        details: 'Edit : index.js',
        state: 'Project : maestro-code',
        startTimestamp: new Date(),
        largeImageKey: 'javascript',
        largeImageText: 'Maestro Code - Javascript',
        // smallImageKey: 'status_icon',
        // smallImageText: 'Siap mengedit',
        instance: false,
    });
});

// Login ke Discord menggunakan Client ID
rpc.login({ clientId }).catch(console.error);

app.whenReady().then(() => {
    createWindow();

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

// Mendengarkan update status dari renderer (React)
ipcMain.on('update-status', (event, fileName) => {
    console.log('Mengedit file:', fileName);

    rpc.setActivity({
        details: `Mengedit ${fileName}`,
        state: 'Sedang menulis kode',
        startTimestamp: new Date(),
        largeImageKey: 'editor_icon',
        largeImageText: 'Code Editor',
        smallImageKey: 'js_icon',
        smallImageText: 'File JavaScript',
        instance: false,
    });
});

const { app, BrowserWindow, ipcMain, Menu, MenuItem } = require('electron');
const DiscordRPC = require('discord-rpc');
const path = require('path');
const { selectFolder, listFilesReursively, valueFilesReursively, valueFile } = require('./utils/function');
require('dotenv').config()
const clientId = '1316648612448440320';
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const { exec } = require("node:child_process");

let mainWindow;
let projectPath;

function createWindow() {
    mainWindow = new BrowserWindow({
        minWidth: 800,
        width: 800,
        height: 600,
        webPreferences: { nodeIntegration: true, contextIsolation: false, enableRemoteModule: true, }
    });

    mainWindow.loadURL('http://localhost:3000');  // Mengarahkan ke aplikasi React yang berjalan di localhost
}

const menu = new Menu()
menu.append(new MenuItem({
    label: "File",
    submenu: [
        {
            label: 'Save',
            accelerator: 'Ctrl+S'
        },
        {
            type: 'separator'
        },
        {
            label: "Open Folder",
            accelerator: 'CmdOrCtrl+O',
            click: async () => {
                const folderPath = await selectFolder(mainWindow)
                if (folderPath) {
                    projectPath = folderPath
                    const fileList = listFilesReursively(folderPath);
                    mainWindow.webContents.send('project-opened', { folderPath, fileList })
                }
            }
        }
    ]
}))

menu.append(new MenuItem({
    label: "View",
    submenu: [
        {
            label: 'Open Terminal',
            accelerator: 'Ctrl+`'
        }
    ]
}))

if (process.env.NODE_ENV === 'development') {
    menu.append(new MenuItem({
        label: "Dev Tools",
        submenu: [
            {
                role: "reload",
                label: "Reload",
                accelerator: "CmdOrCtrl+R"
            },
            {
                role: "toggleDevTools",
                label: "Open Dev Tools"
            }
        ]
    }))
}
menu.append(new MenuItem({
    label: 'About',
    submenu: [{
        role: 'help',
        accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Alt+Shift+I',
        click: () => { console.log('Electron rocks!') }
    }]
}))

Menu.setApplicationMenu(menu)

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

ipcMain.on("request-file", (event, data) => {
    console.log("Minta value:", data.filePath)
    const file = valueFile(data.filePath)
    event.reply("receive-file", file)
})

let terminalRunning = false; // Flag untuk mengecek status terminal

ipcMain.on('run-command', (event, command) => {
    if (!projectPath || terminalRunning) return;
    console.log("Posisi:", projectPath);

    // Set terminalRunning menjadi true sebelum eksekusi dimulai
    terminalRunning = true;

    // Kirim status terminal sedang berjalan ke frontend
    event.reply('terminal-status', { running: true });

    exec(`cd "${projectPath}" && ` + command, (error, stdout, stderr) => {
        terminalRunning = false; // Set terminalRunning menjadi false setelah perintah selesai

        if (error) {
            event.reply('command-output', `Error: ${error.message}`);
            event.reply('terminal-status', { running: false }); // Kirim status terminal berhenti
            return;
        }
        if (stderr) {
            event.reply('command-output', `stderr: ${stderr}`);
            event.reply('terminal-status', { running: false });
            return;
        }
        event.reply('command-output', stdout); // Mengirim output kembali ke frontend
        event.reply('terminal-status', { running: false }); // Kirim status terminal berhenti
    });
});
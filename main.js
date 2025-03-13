const { app, BrowserWindow, ipcMain, Menu, MenuItem } = require('electron');
const DiscordRPC = require('discord-rpc');
const { selectFolder, listFilesReursively, valueFile } = require('./utils/function');
require('dotenv').config()
const clientId = '1316648612448440320';
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const { exec } = require("node:child_process");
const Lang = require('./modules/maestDiscordRPC');

let mainWindow;
let projectPath;
let whenOpenProject;

function createWindow() {
    mainWindow = new BrowserWindow({
        minWidth: 800,
        width: 800,
        height: 600,
        webPreferences: { nodeIntegration: true, contextIsolation: false, enableRemoteModule: true }
    });

    mainWindow.loadURL('http://localhost:3000');
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
                    whenOpenProject = new Date()
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

let trySend = false
let waitSend;
ipcMain.on('change-focus', (event, maest) => {
    if (!trySend) {
        trySend = true
        if (rpc.user) rpc.login({ clientId }).catch(console.error);
        const regex = /[^/\\]+(?:\.[^/\\]+)?$/;
        const name = maest.path.match(regex)
        const projectName = projectPath.match(regex)

        console.log(name, projectName)

        const fileExtension = String(name).toLowerCase().split('.').pop();
        const langHandler = Lang.get(`.${fileExtension}`);

        rpc.setActivity({
            details: `Edit : ${name}`,
            state: `Project : ${projectName}`,
            startTimestamp: whenOpenProject,
            largeImageKey: langHandler?.filename ? langHandler?.filename : "file",
            largeImageText: `Maestro Code${langHandler?.nama ? ` - ${langHandler.nama}` : ""}`,
            instance: false,
        });
        waitSend = setTimeout(function() {
            trySend = false
        }, 750)
    }
});

ipcMain.on("request-file", (event, data) => {
    console.log("Minta value:", data.filePath)
    const file = valueFile(data.filePath)
    event.reply("receive-file", file)
})

let terminalRunning = false;

ipcMain.on('run-command', (event, command) => {
    if (!projectPath || terminalRunning) return;
    console.log("Posisi:", projectPath);

    terminalRunning = true;

    event.reply('terminal-status', { running: true });

    exec(`cd "${projectPath}" && ` + command, (error, stdout, stderr) => {
        terminalRunning = false;

        if (error) {
            event.reply('command-output', `${error.message.replace(`cd "${projectPath}" && `, "")}`);
            event.reply('terminal-status', { running: false });
            return;
        }
        if (stderr) {
            event.reply('command-output', `${stderr}`);
            event.reply('terminal-status', { running: false });
            return;
        }
        event.reply('command-output', stdout);
        event.reply('terminal-status', { running: false });
    });
});
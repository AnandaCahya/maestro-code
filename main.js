const { app, BrowserWindow, ipcMain, Menu, MenuItem } = require('electron');
const DiscordRPC = require('discord-rpc');
const { selectFolder, listFilesReursively, valueFile } = require('./utils/function');
require('dotenv').config()
const clientId = '1316648612448440320';
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const { exec, spawn } = require("node:child_process");
const Lang = require('./modules/maestDiscordRPC');
const chokidar = require("chokidar")

let mainWindow;
let projectPath;
let whenOpenProject;
let watcher;

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
            accelerator: 'Ctrl+S',
            click: async () => {
                mainWindow.webContents.send("req-save-file")
            }
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

                    watcher = chokidar.watch(projectPath, {
                        persistent: true,
                        ignoreInitial: false,
                        awaitWriteFinish: {
                            stabilityThreshold: 2000,
                            pollInterval: 100,
                        }
                    });

                    watcher.on('addDir', (filePath) => {
                        const fileList = listFilesReursively(folderPath);
                        console.log(`Directory ${filePath} has been added`)
                        mainWindow.webContents.send('dir-added', { fileList });
                    })
                    watcher.on('unlinkDir', (filePath) => {
                        const fileList = listFilesReursively(folderPath);
                        console.log(`Directory ${filePath} has been removed`)
                        mainWindow.webContents.send('dir-removed', { fileList });
                    })
                    watcher.on('change', (filePath) => {
                        const fileList = listFilesReursively(folderPath);
                        console.log(`File ${filePath} has been changed`);
                        const value = valueFile(filePath)
                        mainWindow.webContents.send('file-changed', { fileList, file: { filePath, value } });
                    });
                    watcher.on('unlink', (filePath) => {
                        const fileList = listFilesReursively(folderPath);
                        console.log(`File ${filePath} has been removed`);
                        mainWindow.webContents.send('file-removed', { fileList, filePath });
                    });
                    watcher.on('add', (filePath) => {
                        const fileList = listFilesReursively(folderPath);
                        console.log(`File ${filePath} has been added`);
                        const value = valueFile(filePath)
                        mainWindow.webContents.send('file-added', { fileList, file: { filePath, value } });
                    });
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

ipcMain.on("res-save-file", async (event, data) => {
    console.log(data)
})

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
        waitSend = setTimeout(function () {
            trySend = false
        }, 750)
    }
});

ipcMain.on("request-file", (event, data) => {
    console.log("Minta value:", data.filePath)
    const file = valueFile(data.filePath)
    event.reply("receive-file", file)
})

let currentCmd = null;
let terminalRunning = false;

ipcMain.on('run-command', (event, command) => {
    if (!projectPath) return;

    if (currentCmd) {
        console.log("Mengirim perintah baru ke terminal yang sedang berjalan.");
        currentCmd.stdin.write(command + '\n');
        return;
    }

    terminalRunning = true;
    event.reply('terminal-status', { running: true });

    const commandParts = command.split(' ');
    currentCmd = spawn(commandParts[0], commandParts.slice(1), { cwd: projectPath, stdio: ['pipe', 'pipe', 'pipe'] });

    currentCmd.stdout.on('data', (data) => {
        event.reply('command-output', data.toString());
    });

    currentCmd.stderr.on('data', (data) => {
        event.reply('command-output', `${data.toString()}`);
    });

    currentCmd.on('close', (code) => {
        if (code !== 0) {
            event.reply('command-output', `Proses berakhir dengan kode error ${code}`);
        }
        terminalRunning = false;
        event.reply('terminal-status', { running: false });
        currentCmd = null;
    });

    currentCmd.on('error', (err) => {
        console.error('Gagal menjalankan perintah:', err);
        event.reply('command-output', `Gagal menjalankan perintah: ${err.message}`);
        terminalRunning = false;
        event.reply('terminal-status', { running: false });
        currentCmd = null;
    });
});

ipcMain.on('terminate-command', (event) => {
    if (currentCmd) {
        console.log('Menghentikan perintah dengan SIGINT...');
        currentCmd.kill('SIGINT'); // Kirim sinyal SIGINT (CTRL+C) untuk menghentikan perintah
        terminalRunning = false;
        currentCmd = null; // Reset currentCmd
        event.reply('terminal-status', { running: false });
        event.reply('command-output', 'Perintah dihentikan dengan CTRL+C');
    } else {
        event.reply('command-output', 'Tidak ada terminal yang berjalan untuk dihentikan');
    }
});
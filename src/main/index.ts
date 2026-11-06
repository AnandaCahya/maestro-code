import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import {
  openDirectoryDialog,
  readDirectory,
  readFileContent,
  writeFileContent,
  createFile,
  createDirectory,
  deletePath,
  renamePath,
  watchWorkspace,
  stopWatchingWorkspace,
  revealInOS
} from './services/fileService'
import {
  getGitStatus,
  getGitDiff,
  gitStageFile,
  gitStageAll,
  gitCommit,
  gitPush,
  gitPull
} from './services/gitService'
import { searchInFiles, replaceInFiles, SearchOptions } from './services/searchService'
import { loadProjectData, saveProjectData } from './services/projectService'
import {
  startLspServer,
  sendLspMessage,
  stopLspServer,
  stopAllLspServers
} from './services/lspService'
import {
  createTerminalSession,
  getAvailableShells,
  writeToTerminal,
  killTerminalSession,
  killAllTerminals
} from './services/terminalService'
import {
  loadWorkspaceSettings,
  saveWorkspaceSettings,
  WorkspaceSettings
} from './services/settingsService'
import type { ProjectMetadata, LspMessage } from '../preload/index.d'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#121318',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // IPC: Window management
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
      return false
    } else {
      mainWindow.maximize()
      return true
    }
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false
  })

  // IPC: File System
  ipcMain.handle('fs:openDirectoryDialog', async () => {
    if (!mainWindow) return null
    return await openDirectoryDialog(mainWindow)
  })

  ipcMain.handle('fs:readDirectory', async (_, dirPath: string) => {
    return await readDirectory(dirPath)
  })

  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    return await readFileContent(filePath)
  })

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    return await writeFileContent(filePath, content)
  })

  ipcMain.handle('fs:createFile', async (_, filePath: string) => {
    return await createFile(filePath)
  })

  ipcMain.handle('fs:createDirectory', async (_, dirPath: string) => {
    return await createDirectory(dirPath)
  })

  ipcMain.handle('fs:deletePath', async (_, targetPath: string) => {
    return await deletePath(targetPath)
  })

  ipcMain.handle('fs:renamePath', async (_, oldPath: string, newPath: string) => {
    return await renamePath(oldPath, newPath)
  })

  ipcMain.handle('fs:watchWorkspace', async (_, workspacePath: string) => {
    if (!mainWindow) return false
    watchWorkspace(workspacePath, mainWindow)
    return true
  })

  ipcMain.handle('fs:stopWatching', async () => {
    stopWatchingWorkspace()
  })

  ipcMain.handle('fs:revealInOS', async (_, targetPath: string) => {
    revealInOS(targetPath)
  })

  // IPC: Git Source Control
  ipcMain.handle('git:status', async (_, workspacePath: string) => {
    return await getGitStatus(workspacePath)
  })

  ipcMain.handle('git:diff', async (_, workspacePath: string, relativePath: string) => {
    return await getGitDiff(workspacePath, relativePath)
  })

  ipcMain.handle('git:stage', async (_, workspacePath: string, filePath: string) => {
    return await gitStageFile(workspacePath, filePath)
  })

  ipcMain.handle('git:stageAll', async (_, workspacePath: string) => {
    return await gitStageAll(workspacePath)
  })

  ipcMain.handle('git:commit', async (_, workspacePath: string, message: string) => {
    return await gitCommit(workspacePath, message)
  })

  ipcMain.handle('git:push', async (_, workspacePath: string) => {
    return await gitPush(workspacePath)
  })

  ipcMain.handle('git:pull', async (_, workspacePath: string) => {
    return await gitPull(workspacePath)
  })

  // IPC: Search in Files
  ipcMain.handle(
    'search:inFiles',
    async (_, workspacePath: string, query: string, options?: SearchOptions) => {
      return await searchInFiles(workspacePath, query, options)
    }
  )

  ipcMain.handle(
    'search:replaceInFiles',
    async (
      _,
      workspacePath: string,
      query: string,
      replaceText: string,
      options?: SearchOptions
    ) => {
      return await replaceInFiles(workspacePath, query, replaceText, options)
    }
  )

  // IPC: Project Management
  ipcMain.handle('project:loadData', async (_, rootPath: string) => {
    return await loadProjectData(rootPath)
  })

  ipcMain.handle('project:saveData', async (_, rootPath: string, data: ProjectMetadata) => {
    return await saveProjectData(rootPath, data)
  })

  // IPC: Settings (.vscode/settings.json)
  ipcMain.handle('settings:load', async (_, workspacePath: string) => {
    return await loadWorkspaceSettings(workspacePath)
  })

  ipcMain.handle('settings:save', async (_, workspacePath: string, settings: WorkspaceSettings) => {
    return await saveWorkspaceSettings(workspacePath, settings)
  })

  // IPC: Terminal
  ipcMain.handle('terminal:getShells', async () => {
    return getAvailableShells()
  })

  ipcMain.handle('terminal:create', async (_, id: string, cwd?: string, shellPath?: string) => {
    if (!mainWindow) return false
    return createTerminalSession(id, cwd, mainWindow, shellPath)
  })

  ipcMain.handle('terminal:write', async (_, id: string, data: string) => {
    writeToTerminal(id, data)
  })

  ipcMain.handle('terminal:resize', async () => {
    // resize
  })

  ipcMain.handle('terminal:kill', async (_, id: string) => {
    killTerminalSession(id)
  })

  // IPC: Language Server Protocol (LSP)
  ipcMain.handle(
    'lsp:start',
    async (_, serverName: string, command: string, args: string[], rootUri?: string) => {
      if (!mainWindow) return { ok: false, message: 'Window not ready' }
      return startLspServer(serverName, command, args, rootUri, mainWindow)
    }
  )

  ipcMain.handle('lsp:stop', async (_, serverName: string) => {
    return stopLspServer(serverName)
  })

  ipcMain.handle('lsp:send', async (_, serverName: string, message: LspMessage) => {
    sendLspMessage(serverName, message)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopWatchingWorkspace()
  stopAllLspServers()
  killAllTerminals()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

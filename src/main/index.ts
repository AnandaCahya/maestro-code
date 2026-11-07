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
  duplicatePath,
  watchWorkspace,
  stopWatchingWorkspace,
  revealInOS,
  openWithExternalApp,
  movePath,
  copyPathTo,
  openWorkspaceFileDialog,
  readFileBase64,
  getFileMetadata
} from './services/fileService'
import {
  getGitStatus,
  getGitDiff,
  getGitStagedDiff,
  gitStageFile,
  gitUnstageFile,
  gitStageAll,
  gitUnstageAll,
  gitDiscardFile,
  gitDiscardAll,
  gitCommit,
  gitCommitAmend,
  gitPush,
  gitPull,
  gitCreateBranch,
  gitCheckoutBranch,
  gitGetBranches,
  gitRenameBranch,
  gitPublishBranch,
  gitDeleteBranch,
  getGitGutterChanges,
  gitAbortMerge,
  gitContinueMerge,
  gitMerge,
  gitRebase,
  gitAbortRebase,
  gitContinueRebase,
  gitCompareBranches,
  gitGetHistory,
  gitGetCommitDetail,
  gitGetFileAtCommit,
  gitGetBlame,
  gitFetch,
  gitGetStashes,
  gitStashSave,
  gitStashPop,
  gitStashApply,
  gitStashDrop,
  gitGetTags,
  gitCreateTag,
  gitDeleteTag,
  gitCheckoutTag,
  gitGetRemotes,
  gitAddRemote,
  gitRemoveRemote,
  gitRevert,
  gitCherryPick,
  gitReset
} from './services/gitService'
import {
  searchInFiles,
  replaceInFiles,
  replaceInFile,
  replaceIndividualMatch,
  SearchOptions
} from './services/searchService'
import {
  loadProjectData,
  saveProjectData,
  createProjectBackup,
  listProjectBackups,
  restoreProjectBackup
} from './services/projectService'
import {
  getRecentWorkspaces,
  addRecentWorkspace,
  removeRecentWorkspace,
  clearRecentWorkspaces,
  isWorkspaceTrusted,
  setWorkspaceTrusted,
  saveWorkspaceSessionState,
  loadWorkspaceSessionState,
  parseCodeWorkspace,
  saveCodeWorkspace,
  WorkspaceSessionState
} from './services/workspaceService'
import {
  startLspServer,
  sendLspMessage,
  cancelLspRequest,
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
  loadTsConfig,
  loadEditorConfig,
  loadLaunchConfig,
  loadExtensionRecommendations,
  WorkspaceSettings
} from './services/settingsService'
import { getWorkspaceTasks } from './services/taskService'
import { getSystemDiagnostics, exportDiagnosticsBundle } from './services/diagnosticsService'
import {
  startDebugSession,
  stopDebugSession,
  restartDebugSession,
  pauseDebugSession,
  continueDebugSession,
  stepNext,
  stepIn,
  stepOut,
  setBreakpoints,
  getBreakpoints,
  getStackTrace,
  getScopes,
  getVariables,
  evaluateExpression,
  stopAllDebugSessions
} from './services/dapService'
import {
  discoverWorkspaceTests,
  runWorkspaceTests,
  cancelTestRun,
  stopAllTests
} from './services/testService'
import {
  loadExtensions,
  toggleExtension,
  installLocalExtension,
  uninstallExtension,
  getContributedCommands,
  executeExtensionCommand
} from './services/extensionService'
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
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Security: deny internal window openings and delegate to external browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Security: restrict arbitrary navigation away from app URL
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow?.webContents.getURL()) {
      event.preventDefault()
      shell.openExternal(url)
    }
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

  ipcMain.handle('window:toggleFullScreen', () => {
    if (!mainWindow) return false
    const next = !mainWindow.isFullScreen()
    mainWindow.setFullScreen(next)
    return next
  })

  // IPC: File System
  ipcMain.handle('fs:openDirectoryDialog', async () => {
    if (!mainWindow) return null
    return await openDirectoryDialog(mainWindow)
  })

  ipcMain.handle('fs:openWorkspaceFileDialog', async () => {
    if (!mainWindow) return null
    return await openWorkspaceFileDialog(mainWindow)
  })

  ipcMain.handle('fs:readDirectory', async (_, dirPath: string) => {
    return await readDirectory(dirPath)
  })

  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    return await readFileContent(filePath)
  })

  ipcMain.handle('fs:readFileBase64', async (_, filePath: string) => {
    return await readFileBase64(filePath)
  })

  ipcMain.handle('fs:getFileMetadata', async (_, filePath: string) => {
    return await getFileMetadata(filePath)
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

  ipcMain.handle('fs:duplicatePath', async (_, sourcePath: string) => {
    return await duplicatePath(sourcePath)
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

  ipcMain.handle('fs:openWithExternalApp', async (_, targetPath: string) => {
    return await openWithExternalApp(targetPath)
  })

  ipcMain.handle('fs:movePath', async (_, sourcePath: string, destinationDir: string) => {
    return await movePath(sourcePath, destinationDir)
  })

  ipcMain.handle('fs:copyPathTo', async (_, sourcePath: string, destinationDir: string) => {
    return await copyPathTo(sourcePath, destinationDir)
  })

  // IPC: Git Source Control
  ipcMain.handle('git:status', async (_, workspacePath: string) => {
    return await getGitStatus(workspacePath)
  })

  ipcMain.handle('git:diff', async (_, workspacePath: string, relativePath: string) => {
    return await getGitDiff(workspacePath, relativePath)
  })

  ipcMain.handle('git:stagedDiff', async (_, workspacePath: string, relativePath: string) => {
    return await getGitStagedDiff(workspacePath, relativePath)
  })

  ipcMain.handle('git:stage', async (_, workspacePath: string, filePath: string) => {
    return await gitStageFile(workspacePath, filePath)
  })

  ipcMain.handle('git:unstage', async (_, workspacePath: string, filePath: string) => {
    return await gitUnstageFile(workspacePath, filePath)
  })

  ipcMain.handle('git:stageAll', async (_, workspacePath: string) => {
    return await gitStageAll(workspacePath)
  })

  ipcMain.handle('git:unstageAll', async (_, workspacePath: string) => {
    return await gitUnstageAll(workspacePath)
  })

  ipcMain.handle('git:discard', async (_, workspacePath: string, filePath: string) => {
    return await gitDiscardFile(workspacePath, filePath)
  })

  ipcMain.handle('git:discardAll', async (_, workspacePath: string) => {
    return await gitDiscardAll(workspacePath)
  })

  ipcMain.handle('git:commit', async (_, workspacePath: string, message: string) => {
    return await gitCommit(workspacePath, message)
  })

  ipcMain.handle('git:commitAmend', async (_, workspacePath: string, message?: string) => {
    return await gitCommitAmend(workspacePath, message)
  })

  ipcMain.handle('git:push', async (_, workspacePath: string) => {
    return await gitPush(workspacePath)
  })

  ipcMain.handle('git:pull', async (_, workspacePath: string) => {
    return await gitPull(workspacePath)
  })

  ipcMain.handle('git:createBranch', async (_, workspacePath: string, branchName: string) => {
    return await gitCreateBranch(workspacePath, branchName)
  })

  ipcMain.handle('git:checkoutBranch', async (_, workspacePath: string, branchName: string) => {
    return await gitCheckoutBranch(workspacePath, branchName)
  })

  ipcMain.handle('git:getBranches', async (_, workspacePath: string) => {
    return await gitGetBranches(workspacePath)
  })

  ipcMain.handle('git:renameBranch', async (_, workspacePath: string, oldName: string, newName: string) => {
    return await gitRenameBranch(workspacePath, oldName, newName)
  })

  ipcMain.handle('git:publishBranch', async (_, workspacePath: string, branchName: string) => {
    return await gitPublishBranch(workspacePath, branchName)
  })

  ipcMain.handle('git:deleteBranch', async (_, workspacePath: string, branchName: string) => {
    return await gitDeleteBranch(workspacePath, branchName)
  })

  ipcMain.handle('git:gutterChanges', async (_, workspacePath: string, relativePath: string) => {
    return await getGitGutterChanges(workspacePath, relativePath)
  })

  ipcMain.handle('git:abortMerge', async (_, workspacePath: string) => {
    return await gitAbortMerge(workspacePath)
  })

  ipcMain.handle('git:continueMerge', async (_, workspacePath: string) => {
    return await gitContinueMerge(workspacePath)
  })

  ipcMain.handle('git:merge', async (_, workspacePath: string, branchName: string) => {
    return await gitMerge(workspacePath, branchName)
  })

  ipcMain.handle('git:rebase', async (_, workspacePath: string, branchName: string) => {
    return await gitRebase(workspacePath, branchName)
  })

  ipcMain.handle('git:abortRebase', async (_, workspacePath: string) => {
    return await gitAbortRebase(workspacePath)
  })

  ipcMain.handle('git:continueRebase', async (_, workspacePath: string) => {
    return await gitContinueRebase(workspacePath)
  })

  ipcMain.handle(
    'git:compareBranches',
    async (_, workspacePath: string, baseBranch: string, targetBranch: string) => {
      return await gitCompareBranches(workspacePath, baseBranch, targetBranch)
    }
  )

  ipcMain.handle(
    'git:getHistory',
    async (_, workspacePath: string, maxCount?: number, filePath?: string) => {
      return await gitGetHistory(workspacePath, maxCount, filePath)
    }
  )

  ipcMain.handle('git:getCommitDetail', async (_, workspacePath: string, hash: string) => {
    return await gitGetCommitDetail(workspacePath, hash)
  })

  ipcMain.handle(
    'git:getFileAtCommit',
    async (_, workspacePath: string, hash: string, filePath: string) => {
      return await gitGetFileAtCommit(workspacePath, hash, filePath)
    }
  )

  ipcMain.handle('git:getBlame', async (_, workspacePath: string, filePath: string) => {
    return await gitGetBlame(workspacePath, filePath)
  })

  ipcMain.handle('git:fetch', async (_, workspacePath: string) => {
    return await gitFetch(workspacePath)
  })

  ipcMain.handle('git:getStashes', async (_, workspacePath: string) => {
    return await gitGetStashes(workspacePath)
  })

  ipcMain.handle('git:stashSave', async (_, workspacePath: string, message?: string) => {
    return await gitStashSave(workspacePath, message)
  })

  ipcMain.handle('git:stashPop', async (_, workspacePath: string, index?: number) => {
    return await gitStashPop(workspacePath, index)
  })

  ipcMain.handle('git:stashApply', async (_, workspacePath: string, index?: number) => {
    return await gitStashApply(workspacePath, index)
  })

  ipcMain.handle('git:stashDrop', async (_, workspacePath: string, index?: number) => {
    return await gitStashDrop(workspacePath, index)
  })

  // IPC: Git Tags
  ipcMain.handle('git:getTags', async (_, workspacePath: string) => {
    return await gitGetTags(workspacePath)
  })

  ipcMain.handle(
    'git:createTag',
    async (_, workspacePath: string, tagName: string, message?: string) => {
      return await gitCreateTag(workspacePath, tagName, message)
    }
  )

  ipcMain.handle('git:deleteTag', async (_, workspacePath: string, tagName: string) => {
    return await gitDeleteTag(workspacePath, tagName)
  })

  ipcMain.handle('git:checkoutTag', async (_, workspacePath: string, tagName: string) => {
    return await gitCheckoutTag(workspacePath, tagName)
  })

  // IPC: Git Remotes
  ipcMain.handle('git:getRemotes', async (_, workspacePath: string) => {
    return await gitGetRemotes(workspacePath)
  })

  ipcMain.handle(
    'git:addRemote',
    async (_, workspacePath: string, name: string, url: string) => {
      return await gitAddRemote(workspacePath, name, url)
    }
  )

  ipcMain.handle('git:removeRemote', async (_, workspacePath: string, name: string) => {
    return await gitRemoveRemote(workspacePath, name)
  })

  // IPC: Git Revert, Cherry Pick, Reset
  ipcMain.handle('git:revert', async (_, workspacePath: string, hash: string) => {
    return await gitRevert(workspacePath, hash)
  })

  ipcMain.handle('git:cherryPick', async (_, workspacePath: string, hash: string) => {
    return await gitCherryPick(workspacePath, hash)
  })

  ipcMain.handle(
    'git:reset',
    async (_, workspacePath: string, mode: 'soft' | 'mixed' | 'hard', target?: string) => {
      return await gitReset(workspacePath, mode, target)
    }
  )

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

  ipcMain.handle(
    'search:replaceInFile',
    async (
      _,
      filePath: string,
      query: string,
      replaceText: string,
      options?: SearchOptions
    ) => {
      return await replaceInFile(filePath, query, replaceText, options)
    }
  )

  ipcMain.handle(
    'search:replaceMatch',
    async (
      _,
      filePath: string,
      line: number,
      column: number,
      matchText: string,
      replaceText: string
    ) => {
      return await replaceIndividualMatch(filePath, line, column, matchText, replaceText)
    }
  )

  // IPC: Project Management
  ipcMain.handle('project:loadData', async (_, rootPath: string) => {
    return await loadProjectData(rootPath)
  })

  ipcMain.handle('project:saveData', async (_, rootPath: string, data: ProjectMetadata) => {
    return await saveProjectData(rootPath, data)
  })

  ipcMain.handle('project:createBackup', async (_, rootPath: string) => {
    return await createProjectBackup(rootPath)
  })

  ipcMain.handle('project:listBackups', async (_, rootPath: string) => {
    return await listProjectBackups(rootPath)
  })

  ipcMain.handle('project:restoreBackup', async (_, rootPath: string, backupFileName: string) => {
    return await restoreProjectBackup(rootPath, backupFileName)
  })

  // IPC: System Diagnostics
  ipcMain.handle('app:getSystemDiagnostics', async (_, workspacePath?: string) => {
    return getSystemDiagnostics(workspacePath)
  })

  ipcMain.handle('app:exportDiagnostics', async (_, workspacePath?: string) => {
    return await exportDiagnosticsBundle(workspacePath)
  })

  // IPC: Settings (.vscode/settings.json)
  ipcMain.handle('settings:load', async (_, workspacePath: string) => {
    return await loadWorkspaceSettings(workspacePath)
  })

  ipcMain.handle('settings:save', async (_, workspacePath: string, settings: WorkspaceSettings) => {
    return await saveWorkspaceSettings(workspacePath, settings)
  })

  ipcMain.handle('settings:loadTsConfig', async (_, workspacePath: string) => {
    return await loadTsConfig(workspacePath)
  })

  ipcMain.handle('settings:loadEditorConfig', async (_, workspacePath: string, targetFilePath?: string) => {
    return await loadEditorConfig(workspacePath, targetFilePath)
  })

  ipcMain.handle('settings:loadLaunchConfig', async (_, workspacePath: string) => {
    return await loadLaunchConfig(workspacePath)
  })

  ipcMain.handle('settings:loadExtensionRecommendations', async (_, workspacePath: string) => {
    return await loadExtensionRecommendations(workspacePath)
  })

  // IPC: Tasks (tasks.json & package.json)
  ipcMain.handle('tasks:get', async (_, workspacePath: string) => {
    return await getWorkspaceTasks(workspacePath)
  })

  // IPC: Terminal
  ipcMain.handle('terminal:getShells', async () => {
    return getAvailableShells()
  })

  ipcMain.handle(
    'terminal:create',
    async (
      _,
      id: string,
      cwd?: string,
      shellPath?: string,
      env?: Record<string, string>,
      shellArgs?: string[]
    ) => {
      if (!mainWindow) return false
      return createTerminalSession(id, cwd, mainWindow, shellPath, env, shellArgs)
    }
  )

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

  ipcMain.handle('lsp:cancel', async (_, serverName: string, requestId: number | string) => {
    cancelLspRequest(serverName, requestId)
  })

  // IPC: Workspaces & Trust & Session State
  ipcMain.handle('workspace:getRecent', async () => {
    return await getRecentWorkspaces()
  })

  ipcMain.handle('workspace:addRecent', async (_, workspacePath: string) => {
    return await addRecentWorkspace(workspacePath)
  })

  ipcMain.handle('workspace:removeRecent', async (_, workspacePath: string) => {
    return await removeRecentWorkspace(workspacePath)
  })

  ipcMain.handle('workspace:clearRecent', async () => {
    return await clearRecentWorkspaces()
  })

  ipcMain.handle('workspace:isTrusted', async (_, workspacePath: string) => {
    return await isWorkspaceTrusted(workspacePath)
  })

  ipcMain.handle('workspace:setTrusted', async (_, workspacePath: string, trusted: boolean) => {
    return await setWorkspaceTrusted(workspacePath, trusted)
  })

  ipcMain.handle('workspace:saveSessionState', async (_, workspacePath: string, state: WorkspaceSessionState) => {
    return await saveWorkspaceSessionState(workspacePath, state)
  })

  ipcMain.handle('workspace:loadSessionState', async (_, workspacePath: string) => {
    return await loadWorkspaceSessionState(workspacePath)
  })

  ipcMain.handle('workspace:parseCodeWorkspace', async (_, filePath: string) => {
    return await parseCodeWorkspace(filePath)
  })

  ipcMain.handle(
    'workspace:saveCodeWorkspace',
    async (_, filePath: string, folders: string[], settings?: Record<string, any>) => {
      return await saveCodeWorkspace(filePath, folders, settings)
    }
  )

  // IPC: Debug Adapter Protocol (DAP)
  ipcMain.handle('dap:startSession', async (_, workspacePath: string, config: any) => {
    return await startDebugSession(workspacePath, config)
  })

  ipcMain.handle('dap:stopSession', async (_, sessionId: string) => {
    return await stopDebugSession(sessionId)
  })

  ipcMain.handle('dap:restartSession', async (_, sessionId: string) => {
    return await restartDebugSession(sessionId)
  })

  ipcMain.handle('dap:pause', async (_, sessionId: string, threadId?: number) => {
    return await pauseDebugSession(sessionId, threadId)
  })

  ipcMain.handle('dap:continue', async (_, sessionId: string, threadId?: number) => {
    return await continueDebugSession(sessionId, threadId)
  })

  ipcMain.handle('dap:next', async (_, sessionId: string, threadId?: number) => {
    return await stepNext(sessionId, threadId)
  })

  ipcMain.handle('dap:stepIn', async (_, sessionId: string, threadId?: number) => {
    return await stepIn(sessionId, threadId)
  })

  ipcMain.handle('dap:stepOut', async (_, sessionId: string, threadId?: number) => {
    return await stepOut(sessionId, threadId)
  })

  ipcMain.handle('dap:setBreakpoints', async (_, filePath: string, breakpoints: any[]) => {
    return await setBreakpoints(filePath, breakpoints)
  })

  ipcMain.handle('dap:getBreakpoints', async (_, filePath?: string) => {
    return getBreakpoints(filePath)
  })

  ipcMain.handle('dap:getStackTrace', async (_, sessionId: string, threadId?: number) => {
    return await getStackTrace(sessionId, threadId)
  })

  ipcMain.handle('dap:getScopes', async (_, sessionId: string, frameId?: number) => {
    return await getScopes(sessionId, frameId)
  })

  ipcMain.handle('dap:getVariables', async (_, sessionId: string, variablesReference: number) => {
    return await getVariables(sessionId, variablesReference)
  })

  ipcMain.handle(
    'dap:evaluate',
    async (_, sessionId: string, expression: string, frameId?: number, context?: string) => {
      return await evaluateExpression(sessionId, expression, frameId, context)
    }
  )

  // IPC: Testing Integration
  ipcMain.handle('test:discover', async (_, workspacePath: string) => {
    return await discoverWorkspaceTests(workspacePath)
  })

  ipcMain.handle(
    'test:run',
    async (_, workspacePath: string, targetFilePaths?: string[], targetTestNames?: string[]) => {
      return await runWorkspaceTests(workspacePath, targetFilePaths, targetTestNames)
    }
  )

  ipcMain.handle('test:cancel', async (_, runId?: string) => {
    return cancelTestRun(runId)
  })

  // IPC: Extension Ecosystem & Extension Host
  ipcMain.handle('extension:load', async (_, workspacePath?: string) => {
    return await loadExtensions(workspacePath)
  })

  ipcMain.handle('extension:toggle', async (_, extensionId: string, enabled: boolean) => {
    return await toggleExtension(extensionId, enabled)
  })

  ipcMain.handle('extension:install', async (_, targetPath: string) => {
    return await installLocalExtension(targetPath)
  })

  ipcMain.handle('extension:uninstall', async (_, extensionId: string) => {
    return await uninstallExtension(extensionId)
  })

  ipcMain.handle('extension:getCommands', async () => {
    return getContributedCommands()
  })

  ipcMain.handle('extension:executeCommand', async (_, commandId: string, ...args: any[]) => {
    return await executeExtensionCommand(commandId, ...args)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  stopWatchingWorkspace()
  stopAllLspServers()
  killAllTerminals()
  stopAllDebugSessions()
  stopAllTests()
})

app.on('window-all-closed', () => {
  stopWatchingWorkspace()
  stopAllLspServers()
  killAllTerminals()
  stopAllDebugSessions()
  stopAllTests()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

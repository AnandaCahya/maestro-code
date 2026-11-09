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
  getFileMetadata,
  isReadOnly,
  detectFileEncoding,
  undoFileOperation,
  redoFileOperation,
  canUndoFileOperation,
  canRedoFileOperation
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
  gitStageHunk,
  gitUnstageHunk,
  gitDiscardHunk,
  getGitHunkAtLine,
  gitCommit,
  gitCommitAll,
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
  gitRenameRemote,
  gitGetLineHistory,
  gitCompareTags,
  gitRevert,
  gitCherryPick,
  gitReset,
  formatCommitMessageWithTask,
  extractTaskIdsFromCommitMessage,
  getTaskGitActivityTimeline,
  previewBranchCleanup,
  gitDeleteMergedTaskBranches,
  verifyTaskBranchesExistence,
  evaluateGitEventTaskTransition
} from './services/gitService'
import {
  searchInFiles,
  searchInWorkspaces,
  replaceInFiles,
  replaceInWorkspaces,
  replaceInFile,
  replaceIndividualMatch,
  cancelSearch,
  getReplacePreview,
  SearchOptions
} from './services/searchService'
import {
  loadProjectData,
  saveProjectData,
  detectPackageManager,
  createProjectBackup,
  listProjectBackups,
  restoreProjectBackup,
  validateTaskCodeLinks,
  filterTasksByLinkedFiles,
  sanitizeProjectMetadataSecrets,
  executeTaskTransaction,
  appendChangeJournal,
  getChangeJournal,
  clearChangeJournal,
  recordSyncHistory,
  getSyncHistory
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
  discoverGitRepositories,
  createWorkspaceBackup,
  listWorkspaceBackups,
  restoreWorkspaceBackup,
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
  validateShellProfile,
  writeToTerminal,
  resizeTerminal,
  interruptTerminal,
  killTerminalSession,
  killAllTerminals
} from './services/terminalService'
import {
  loadWorkspaceSettings,
  saveWorkspaceSettings,
  loadTsConfig,
  discoverTsProjects,
  loadEditorConfig,
  loadLaunchConfig,
  loadExtensionRecommendations,
  getEffectiveSettings,
  loadUserKeybindings,
  updateSettingsSafely,
  loadFolderSettings,
  getEffectiveSetting,
  validateSettingsJsonContent,
  validateEditorConfigContent,
  safeWriteSettingsFile,
  WorkspaceSettings
} from './services/settingsService'
import {
  getWorkspaceTasks,
  resolveTaskExecutionPlan,
  interpolateTaskVariables,
  validateTaskSafety,
  parseTaskProblems,
  recordTaskStart,
  recordTaskEnd,
  cancelTask,
  getTaskHistory,
  clearTaskHistory
} from './services/taskService'
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
  setFunctionBreakpoints,
  getFunctionBreakpoints,
  setExceptionBreakpoints,
  getExceptionBreakpoints,
  getDapTrafficLogs,
  clearDapTrafficLogs,
  getBreakpoints,
  getStackTrace,
  getScopes,
  getVariables,
  evaluateExpression,
  stopAllDebugSessions,
  validateLaunchSecurity,
  getActiveDebugSessions,
  focusDebugSession,
  resolveSourceMapLocation
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

  ipcMain.handle('fs:isReadOnly', async (_, filePath: string) => {
    return await isReadOnly(filePath)
  })

  ipcMain.handle('fs:detectFileEncoding', async (_, filePath: string) => {
    return await detectFileEncoding(filePath)
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

  ipcMain.handle('fs:undoFileOperation', async () => {
    return await undoFileOperation()
  })

  ipcMain.handle('fs:redoFileOperation', async () => {
    return await redoFileOperation()
  })

  ipcMain.handle('fs:canUndoFileOperation', () => {
    return canUndoFileOperation()
  })

  ipcMain.handle('fs:canRedoFileOperation', () => {
    return canRedoFileOperation()
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

  ipcMain.handle('git:stageHunk', async (_, workspacePath: string, patch: string) => {
    return await gitStageHunk(workspacePath, patch)
  })

  ipcMain.handle('git:unstageHunk', async (_, workspacePath: string, patch: string) => {
    return await gitUnstageHunk(workspacePath, patch)
  })

  ipcMain.handle('git:discardHunk', async (_, workspacePath: string, patch: string) => {
    return await gitDiscardHunk(workspacePath, patch)
  })

  ipcMain.handle(
    'git:getHunkAtLine',
    async (_, workspacePath: string, relativePath: string, line: number) => {
      return await getGitHunkAtLine(workspacePath, relativePath, line)
    }
  )

  ipcMain.handle('git:commit', async (_, workspacePath: string, message: string, options?: { all?: boolean }) => {
    return await gitCommit(workspacePath, message, options)
  })

  ipcMain.handle('git:commitAll', async (_, workspacePath: string, message: string) => {
    return await gitCommitAll(workspacePath, message)
  })

  ipcMain.handle('git:commitAmend', async (_, workspacePath: string, message?: string) => {
    return await gitCommitAmend(workspacePath, message)
  })

  ipcMain.handle(
    'git:push',
    async (_, workspacePath: string, remote?: string, branch?: string, setUpstream?: boolean) => {
      return await gitPush(workspacePath, remote, branch, setUpstream)
    }
  )

  ipcMain.handle(
    'git:pull',
    async (
      _,
      workspacePath: string,
      strategy?: 'merge' | 'rebase' | 'ff-only',
      remote?: string,
      branch?: string
    ) => {
      return await gitPull(workspacePath, strategy, remote, branch)
    }
  )

  ipcMain.handle('git:createBranch', async (_, workspacePath: string, branchName: string) => {
    return await gitCreateBranch(workspacePath, branchName)
  })

  ipcMain.handle(
    'git:checkoutBranch',
    async (
      _,
      workspacePath: string,
      branchName: string,
      options?: { trackRemote?: boolean; force?: boolean }
    ) => {
      return await gitCheckoutBranch(workspacePath, branchName, options)
    }
  )

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

  ipcMain.handle(
    'git:renameRemote',
    async (_, workspacePath: string, oldName: string, newName: string) => {
      return await gitRenameRemote(workspacePath, oldName, newName)
    }
  )

  ipcMain.handle(
    'git:getLineHistory',
    async (
      _,
      workspacePath: string,
      filePath: string,
      startLine: number,
      endLine: number
    ) => {
      return await gitGetLineHistory(workspacePath, filePath, startLine, endLine)
    }
  )

  ipcMain.handle(
    'git:compareTags',
    async (_, workspacePath: string, baseTag: string, targetTag: string) => {
      return await gitCompareTags(workspacePath, baseTag, targetTag)
    }
  )

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

  ipcMain.handle(
    'git:formatTaskCommitMessage',
    async (_, template: string, task: any, customMessage: string) => {
      return formatCommitMessageWithTask(template, task, customMessage)
    }
  )

  ipcMain.handle('git:extractTaskIds', async (_, message: string) => {
    return extractTaskIdsFromCommitMessage(message)
  })

  ipcMain.handle('git:getTaskTimeline', async (_, workspacePath: string, taskId: string) => {
    return await getTaskGitActivityTimeline(workspacePath, taskId)
  })

  ipcMain.handle('git:previewBranchCleanup', async (_, workspacePath: string, branchNames: string[]) => {
    return await previewBranchCleanup(workspacePath, branchNames)
  })

  ipcMain.handle('git:deleteMergedBranches', async (_, workspacePath: string, branchNames: string[]) => {
    return await gitDeleteMergedTaskBranches(workspacePath, branchNames)
  })

  ipcMain.handle('git:verifyTaskBranches', async (_, workspacePath: string, branchNames: string[]) => {
    return await verifyTaskBranchesExistence(workspacePath, branchNames)
  })

  ipcMain.handle(
    'git:evaluateTransition',
    async (_, event: 'commit' | 'push' | 'merge', currentStatus: string, commitMessage?: string) => {
      return evaluateGitEventTaskTransition(event, currentStatus, commitMessage)
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
    'search:inWorkspaces',
    async (_, workspacePaths: string[], query: string, options?: SearchOptions) => {
      return await searchInWorkspaces(workspacePaths, query, options)
    }
  )

  ipcMain.handle(
    'search:replaceInWorkspaces',
    async (
      _,
      workspacePaths: string[],
      query: string,
      replaceText: string,
      options?: SearchOptions
    ) => {
      return await replaceInWorkspaces(workspacePaths, query, replaceText, options)
    }
  )

  ipcMain.handle('search:cancel', () => {
    cancelSearch()
    return true
  })

  ipcMain.handle(
    'search:replacePreview',
    async (
      _,
      workspacePath: string,
      query: string,
      replaceText: string,
      options?: SearchOptions
    ) => {
      return await getReplacePreview(workspacePath, query, replaceText, options)
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

  ipcMain.handle('project:detectPackageManager', async (_, rootPath: string) => {
    return await detectPackageManager(rootPath)
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

  ipcMain.handle('project:validateCodeLinks', async (_, workspacePath: string, tasks: any[]) => {
    return await validateTaskCodeLinks(workspacePath, tasks)
  })

  ipcMain.handle('project:filterByFile', async (_, tasks: any[], targetFilePath: string) => {
    return filterTasksByLinkedFiles(tasks, targetFilePath)
  })

  ipcMain.handle('project:executeTransaction', async (_, rootPath: string, operations: any[]) => {
    return await executeTaskTransaction(rootPath, operations)
  })

  ipcMain.handle('project:appendJournal', async (_, rootPath: string, entry: any) => {
    return await appendChangeJournal(rootPath, entry)
  })

  ipcMain.handle('project:getJournal', async (_, rootPath: string) => {
    return await getChangeJournal(rootPath)
  })

  ipcMain.handle('project:clearJournal', async (_, rootPath: string) => {
    return await clearChangeJournal(rootPath)
  })

  ipcMain.handle('project:recordSyncHistory', async (_, rootPath: string, entry: any) => {
    return await recordSyncHistory(rootPath, entry)
  })

  ipcMain.handle('project:getSyncHistory', async (_, rootPath: string) => {
    return await getSyncHistory(rootPath)
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

  ipcMain.handle('settings:loadTsConfig', async (_, workspacePath: string, filePath?: string) => {
    return await loadTsConfig(workspacePath, filePath)
  })

  ipcMain.handle('settings:discoverTsProjects', async (_, workspacePath: string) => {
    return await discoverTsProjects(workspacePath)
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

  ipcMain.handle('settings:getEffective', async (_, workspacePath?: string, languageId?: string) => {
    return await getEffectiveSettings(workspacePath, languageId)
  })

  ipcMain.handle('settings:loadKeybindings', async (_, workspacePath?: string) => {
    return await loadUserKeybindings(workspacePath)
  })

  ipcMain.handle('settings:updateSafely', async (_, filePath: string, updates: Record<string, any>) => {
    return await updateSettingsSafely(filePath, updates)
  })

  ipcMain.handle('settings:loadFolder', async (_, folderPath: string) => {
    return await loadFolderSettings(folderPath)
  })

  ipcMain.handle(
    'settings:getEffectiveInspector',
    async (_, key: string, workspacePath?: string, folderPath?: string, languageId?: string) => {
      return await getEffectiveSetting(key, workspacePath, folderPath, languageId)
    }
  )

  ipcMain.handle('settings:validateJson', async (_, rawJson: string) => {
    return validateSettingsJsonContent(rawJson)
  })

  ipcMain.handle('settings:validateEditorConfig', async (_, rawContent: string) => {
    return validateEditorConfigContent(rawContent)
  })

  ipcMain.handle('settings:safeWrite', async (_, filePath: string, newContent: string, confirmed?: boolean) => {
    return await safeWriteSettingsFile(filePath, newContent, confirmed)
  })

  // IPC: Tasks (tasks.json & package.json)
  ipcMain.handle('tasks:get', async (_, workspacePath: string) => {
    return await getWorkspaceTasks(workspacePath)
  })

  ipcMain.handle('tasks:resolvePlan', async (_, targetTaskLabelOrId: string, tasks: any[]) => {
    return resolveTaskExecutionPlan(targetTaskLabelOrId, tasks)
  })

  ipcMain.handle('tasks:interpolateVariables', async (_, template: string, context?: any) => {
    return interpolateTaskVariables(template, context)
  })

  ipcMain.handle('tasks:validateSafety', async (_, command: string, args?: string[], isWorkspaceTrusted?: boolean) => {
    return validateTaskSafety(command, args, isWorkspaceTrusted)
  })

  ipcMain.handle(
    'tasks:parseProblems',
    async (_, output: string, workspacePath: string, problemMatcher?: string | string[]) => {
      return parseTaskProblems(output, workspacePath, problemMatcher)
    }
  )

  ipcMain.handle(
    'tasks:recordStart',
    async (_, taskId: string, label: string, command: string, sessionId?: string, isBackground?: boolean) => {
      return recordTaskStart(taskId, label, command, sessionId, isBackground)
    }
  )

  ipcMain.handle('tasks:recordEnd', async (_, taskId: string, exitCode: number, error?: string) => {
    return recordTaskEnd(taskId, exitCode, error)
  })

  ipcMain.handle('tasks:cancel', async (_, taskId: string) => {
    return cancelTask(taskId)
  })

  ipcMain.handle('tasks:getHistory', async () => {
    return getTaskHistory()
  })

  ipcMain.handle('tasks:clearHistory', async () => {
    clearTaskHistory()
    return true
  })

  // IPC: Terminal
  ipcMain.handle('terminal:getShells', async () => {
    return getAvailableShells()
  })

  ipcMain.handle('terminal:validateShell', async (_, shellPath: string) => {
    return validateShellProfile(shellPath)
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

  ipcMain.handle('terminal:resize', async (_, id: string, cols: number, rows: number) => {
    resizeTerminal(id, cols, rows)
  })

  ipcMain.handle('terminal:interrupt', async (_, id: string) => {
    return interruptTerminal(id)
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

  ipcMain.handle(
    'workspace:discoverGitRepositories',
    async (_, rootPath: string, maxDepth?: number) => {
      return await discoverGitRepositories(rootPath, maxDepth)
    }
  )

  ipcMain.handle('workspace:createBackup', async (_, workspacePath: string) => {
    return await createWorkspaceBackup(workspacePath)
  })

  ipcMain.handle('workspace:listBackups', async (_, workspacePath: string) => {
    return await listWorkspaceBackups(workspacePath)
  })

  ipcMain.handle(
    'workspace:restoreBackup',
    async (_, workspacePath: string, backupFileName: string) => {
      return await restoreWorkspaceBackup(workspacePath, backupFileName)
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

  ipcMain.handle('dap:setFunctionBreakpoints', async (_, breakpoints: any[]) => {
    return setFunctionBreakpoints(breakpoints)
  })

  ipcMain.handle('dap:getFunctionBreakpoints', async () => {
    return getFunctionBreakpoints()
  })

  ipcMain.handle('dap:setExceptionBreakpoints', async (_, filters: any[]) => {
    return setExceptionBreakpoints(filters)
  })

  ipcMain.handle('dap:getExceptionBreakpoints', async () => {
    return getExceptionBreakpoints()
  })

  ipcMain.handle('dap:getLogs', async () => {
    return getDapTrafficLogs()
  })

  ipcMain.handle('dap:clearLogs', async () => {
    clearDapTrafficLogs()
    return true
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

  ipcMain.handle('dap:validateSecurity', async (_, config: any) => {
    return validateLaunchSecurity(config)
  })

  ipcMain.handle('dap:getActiveSessions', async () => {
    return getActiveDebugSessions()
  })

  ipcMain.handle('dap:focusSession', async (_, sessionId: string) => {
    return focusDebugSession(sessionId)
  })

  ipcMain.handle(
    'dap:resolveSourceMap',
    async (_, filePath: string, line: number, column: number) => {
      return await resolveSourceMapLocation(filePath, line, column)
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

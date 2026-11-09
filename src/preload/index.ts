import { contextBridge, ipcRenderer } from 'electron'
import type { IElectronAPI, ProjectMetadata, LspMessage } from './index.d'

const api: IElectronAPI = {
  // Window
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  toggleFullScreen: () => ipcRenderer.invoke('window:toggleFullScreen'),

  // File System
  openDirectoryDialog: () => ipcRenderer.invoke('fs:openDirectoryDialog'),
  openWorkspaceFileDialog: () => ipcRenderer.invoke('fs:openWorkspaceFileDialog'),
  readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:readDirectory', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  readFileBase64: (filePath: string) => ipcRenderer.invoke('fs:readFileBase64', filePath),
  getFileMetadata: (filePath: string) => ipcRenderer.invoke('fs:getFileMetadata', filePath),
  isReadOnly: (filePath: string) => ipcRenderer.invoke('fs:isReadOnly', filePath),
  detectFileEncoding: (filePath: string) => ipcRenderer.invoke('fs:detectFileEncoding', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  createFile: (filePath: string) => ipcRenderer.invoke('fs:createFile', filePath),
  createDirectory: (dirPath: string) => ipcRenderer.invoke('fs:createDirectory', dirPath),
  deletePath: (targetPath: string) => ipcRenderer.invoke('fs:deletePath', targetPath),
  renamePath: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:renamePath', oldPath, newPath),
  duplicatePath: (sourcePath: string) => ipcRenderer.invoke('fs:duplicatePath', sourcePath),
  watchWorkspace: (workspacePath: string) => ipcRenderer.invoke('fs:watchWorkspace', workspacePath),
  stopWatchingWorkspace: () => ipcRenderer.invoke('fs:stopWatching'),
  revealInOS: (targetPath: string) => ipcRenderer.invoke('fs:revealInOS', targetPath),
  openWithExternalApp: (targetPath: string) =>
    ipcRenderer.invoke('fs:openWithExternalApp', targetPath),
  movePath: (sourcePath: string, destinationDir: string) =>
    ipcRenderer.invoke('fs:movePath', sourcePath, destinationDir),
  copyPathTo: (sourcePath: string, destinationDir: string) =>
    ipcRenderer.invoke('fs:copyPathTo', sourcePath, destinationDir),
  undoFileOperation: () => ipcRenderer.invoke('fs:undoFileOperation'),
  redoFileOperation: () => ipcRenderer.invoke('fs:redoFileOperation'),
  onFileChanged: (callback: (event: any) => void) => {
    const subscription = (_: any, event: any) => callback(event)
    ipcRenderer.on('fs:changed', subscription)
    return () => ipcRenderer.removeListener('fs:changed', subscription)
  },

  // Git
  getGitStatus: (workspacePath: string) => ipcRenderer.invoke('git:status', workspacePath),
  getGitDiff: (workspacePath: string, relativePath: string) => ipcRenderer.invoke('git:diff', workspacePath, relativePath),
  getGitStagedDiff: (workspacePath: string, relativePath: string) =>
    ipcRenderer.invoke('git:stagedDiff', workspacePath, relativePath),
  gitStageFile: (workspacePath: string, filePath: string) => ipcRenderer.invoke('git:stage', workspacePath, filePath),
  gitUnstageFile: (workspacePath: string, filePath: string) => ipcRenderer.invoke('git:unstage', workspacePath, filePath),
  gitStageAll: (workspacePath: string) => ipcRenderer.invoke('git:stageAll', workspacePath),
  gitUnstageAll: (workspacePath: string) => ipcRenderer.invoke('git:unstageAll', workspacePath),
  gitDiscardFile: (workspacePath: string, filePath: string) => ipcRenderer.invoke('git:discard', workspacePath, filePath),
  gitDiscardAll: (workspacePath: string) => ipcRenderer.invoke('git:discardAll', workspacePath),
  gitStageHunk: (workspacePath: string, patch: string) =>
    ipcRenderer.invoke('git:stageHunk', workspacePath, patch),
  gitUnstageHunk: (workspacePath: string, patch: string) =>
    ipcRenderer.invoke('git:unstageHunk', workspacePath, patch),
  gitDiscardHunk: (workspacePath: string, patch: string) =>
    ipcRenderer.invoke('git:discardHunk', workspacePath, patch),
  getGitHunkAtLine: (workspacePath: string, relativePath: string, line: number) =>
    ipcRenderer.invoke('git:getHunkAtLine', workspacePath, relativePath, line),
  gitCommit: (
    workspacePath: string,
    message: string,
    options?: { all?: boolean; noVerify?: boolean }
  ) => ipcRenderer.invoke('git:commit', workspacePath, message, options),
  gitCommitAll: (workspacePath: string, message: string) =>
    ipcRenderer.invoke('git:commitAll', workspacePath, message),
  gitCommitAmend: (workspacePath: string, message?: string) =>
    ipcRenderer.invoke('git:commitAmend', workspacePath, message),
  gitPush: (workspacePath: string, remote?: string, branch?: string, setUpstream?: boolean) =>
    ipcRenderer.invoke('git:push', workspacePath, remote, branch, setUpstream),
  gitPull: (
    workspacePath: string,
    strategy?: 'merge' | 'rebase' | 'ff-only',
    remote?: string,
    branch?: string
  ) => ipcRenderer.invoke('git:pull', workspacePath, strategy, remote, branch),
  gitCreateBranch: (workspacePath: string, branchName: string) =>
    ipcRenderer.invoke('git:createBranch', workspacePath, branchName),
  gitCheckoutBranch: (
    workspacePath: string,
    branchName: string,
    options?: { trackRemote?: boolean; force?: boolean; autostash?: boolean }
  ) => ipcRenderer.invoke('git:checkoutBranch', workspacePath, branchName, options),
  gitGetBranches: (workspacePath: string) => ipcRenderer.invoke('git:getBranches', workspacePath),
  gitRenameBranch: (workspacePath: string, oldName: string, newName: string) =>
    ipcRenderer.invoke('git:renameBranch', workspacePath, oldName, newName),
  gitPublishBranch: (workspacePath: string, branchName: string) =>
    ipcRenderer.invoke('git:publishBranch', workspacePath, branchName),
  gitDeleteBranch: (workspacePath: string, branchName: string) =>
    ipcRenderer.invoke('git:deleteBranch', workspacePath, branchName),
  getGitGutterChanges: (workspacePath: string, relativePath: string) =>
    ipcRenderer.invoke('git:gutterChanges', workspacePath, relativePath),
  gitAbortMerge: (workspacePath: string) => ipcRenderer.invoke('git:abortMerge', workspacePath),
  gitContinueMerge: (workspacePath: string) => ipcRenderer.invoke('git:continueMerge', workspacePath),
  gitMerge: (workspacePath: string, branchName: string) =>
    ipcRenderer.invoke('git:merge', workspacePath, branchName),
  gitRebase: (workspacePath: string, branchName: string) =>
    ipcRenderer.invoke('git:rebase', workspacePath, branchName),
  gitAbortRebase: (workspacePath: string) => ipcRenderer.invoke('git:abortRebase', workspacePath),
  gitContinueRebase: (workspacePath: string) =>
    ipcRenderer.invoke('git:continueRebase', workspacePath),
  gitCompareBranches: (workspacePath: string, baseBranch: string, targetBranch: string) =>
    ipcRenderer.invoke('git:compareBranches', workspacePath, baseBranch, targetBranch),
  gitGetHistory: (workspacePath: string, maxCount?: number, filePath?: string) =>
    ipcRenderer.invoke('git:getHistory', workspacePath, maxCount, filePath),
  gitGetCommitDetail: (workspacePath: string, hash: string) =>
    ipcRenderer.invoke('git:getCommitDetail', workspacePath, hash),
  gitGetFileAtCommit: (workspacePath: string, hash: string, filePath: string) =>
    ipcRenderer.invoke('git:getFileAtCommit', workspacePath, hash, filePath),
  gitGetBlame: (workspacePath: string, filePath: string) =>
    ipcRenderer.invoke('git:getBlame', workspacePath, filePath),
  gitFetch: (workspacePath: string) => ipcRenderer.invoke('git:fetch', workspacePath),
  gitGetStashes: (workspacePath: string) => ipcRenderer.invoke('git:getStashes', workspacePath),
  gitStashSave: (workspacePath: string, message?: string) =>
    ipcRenderer.invoke('git:stashSave', workspacePath, message),
  gitStashPop: (workspacePath: string, index?: number) =>
    ipcRenderer.invoke('git:stashPop', workspacePath, index),
  gitStashApply: (workspacePath: string, index?: number) =>
    ipcRenderer.invoke('git:stashApply', workspacePath, index),
  gitStashDrop: (workspacePath: string, index?: number) =>
    ipcRenderer.invoke('git:stashDrop', workspacePath, index),
  gitGetTags: (workspacePath: string) => ipcRenderer.invoke('git:getTags', workspacePath),
  gitCreateTag: (workspacePath: string, tagName: string, message?: string) =>
    ipcRenderer.invoke('git:createTag', workspacePath, tagName, message),
  gitDeleteTag: (workspacePath: string, tagName: string) =>
    ipcRenderer.invoke('git:deleteTag', workspacePath, tagName),
  gitCheckoutTag: (workspacePath: string, tagName: string) =>
    ipcRenderer.invoke('git:checkoutTag', workspacePath, tagName),
  gitGetRemotes: (workspacePath: string) => ipcRenderer.invoke('git:getRemotes', workspacePath),
  gitAddRemote: (workspacePath: string, name: string, url: string) =>
    ipcRenderer.invoke('git:addRemote', workspacePath, name, url),
  gitRemoveRemote: (workspacePath: string, name: string) =>
    ipcRenderer.invoke('git:removeRemote', workspacePath, name),
  gitRenameRemote: (workspacePath: string, oldName: string, newName: string) =>
    ipcRenderer.invoke('git:renameRemote', workspacePath, oldName, newName),
  gitGetLineHistory: (
    workspacePath: string,
    filePath: string,
    startLine: number,
    endLine: number
  ) =>
    ipcRenderer.invoke('git:getLineHistory', workspacePath, filePath, startLine, endLine),
  gitCompareTags: (workspacePath: string, baseTag: string, targetTag: string) =>
    ipcRenderer.invoke('git:compareTags', workspacePath, baseTag, targetTag),
  gitRevert: (workspacePath: string, hash: string) =>
    ipcRenderer.invoke('git:revert', workspacePath, hash),
  gitCherryPick: (workspacePath: string, hash: string) =>
    ipcRenderer.invoke('git:cherryPick', workspacePath, hash),
  gitReset: (workspacePath: string, mode: 'soft' | 'mixed' | 'hard', target?: string) =>
    ipcRenderer.invoke('git:reset', workspacePath, mode, target),
  gitFormatTaskCommitMessage: (template: string, task: any, customMessage: string) =>
    ipcRenderer.invoke('git:formatTaskCommitMessage', template, task, customMessage),
  gitExtractTaskIds: (message: string) =>
    ipcRenderer.invoke('git:extractTaskIds', message),
  gitGetTaskTimeline: (workspacePath: string, taskId: string) =>
    ipcRenderer.invoke('git:getTaskTimeline', workspacePath, taskId),
  gitPreviewBranchCleanup: (workspacePath: string, branchNames: string[]) =>
    ipcRenderer.invoke('git:previewBranchCleanup', workspacePath, branchNames),
  gitDeleteMergedBranches: (workspacePath: string, branchNames: string[]) =>
    ipcRenderer.invoke('git:deleteMergedBranches', workspacePath, branchNames),
  gitVerifyTaskBranches: (workspacePath: string, branchNames: string[]) =>
    ipcRenderer.invoke('git:verifyTaskBranches', workspacePath, branchNames),
  gitEvaluateTransition: (event: 'commit' | 'push' | 'merge', currentStatus: string, commitMessage?: string) =>
    ipcRenderer.invoke('git:evaluateTransition', event, currentStatus, commitMessage),

  // Search in Files
  searchInFiles: (workspacePath: string, query: string, options?: any) =>
    ipcRenderer.invoke('search:inFiles', workspacePath, query, options),
  searchInWorkspaces: (workspacePaths: string[], query: string, options?: any) =>
    ipcRenderer.invoke('search:inWorkspaces', workspacePaths, query, options),
  cancelSearch: () => ipcRenderer.invoke('search:cancel'),
  getReplacePreview: (workspacePath: string, query: string, replaceText: string, options?: any) =>
    ipcRenderer.invoke('search:replacePreview', workspacePath, query, replaceText, options),
  replaceInFiles: (workspacePath: string, query: string, replaceText: string, options?: any) =>
    ipcRenderer.invoke('search:replaceInFiles', workspacePath, query, replaceText, options),
  replaceInWorkspaces: (
    workspacePaths: string[],
    query: string,
    replaceText: string,
    options?: any
  ) =>
    ipcRenderer.invoke('search:replaceInWorkspaces', workspacePaths, query, replaceText, options),
  replaceInFile: (filePath: string, query: string, replaceText: string, options?: any) =>
    ipcRenderer.invoke('search:replaceInFile', filePath, query, replaceText, options),
  replaceMatch: (filePath: string, line: number, column: number, matchText: string, replaceText: string) =>
    ipcRenderer.invoke('search:replaceMatch', filePath, line, column, matchText, replaceText),

  // Project Management
  loadProjectData: (rootPath: string) => ipcRenderer.invoke('project:loadData', rootPath),
  saveProjectData: (rootPath: string, data: ProjectMetadata) => ipcRenderer.invoke('project:saveData', rootPath, data),
  detectPackageManager: (rootPath: string) => ipcRenderer.invoke('project:detectPackageManager', rootPath),
  createProjectBackup: (rootPath: string) => ipcRenderer.invoke('project:createBackup', rootPath),
  listProjectBackups: (rootPath: string) => ipcRenderer.invoke('project:listBackups', rootPath),
  restoreProjectBackup: (rootPath: string, backupFileName: string) =>
    ipcRenderer.invoke('project:restoreBackup', rootPath, backupFileName),
  validateTaskCodeLinks: (workspacePath: string, tasks: any[]) =>
    ipcRenderer.invoke('project:validateCodeLinks', workspacePath, tasks),
  filterTasksByLinkedFiles: (tasks: any[], targetFilePath: string) =>
    ipcRenderer.invoke('project:filterByFile', tasks, targetFilePath),
  executeTaskTransaction: (rootPath: string, operations: any[]) =>
    ipcRenderer.invoke('project:executeTransaction', rootPath, operations),
  appendChangeJournal: (rootPath: string, entry: any) =>
    ipcRenderer.invoke('project:appendJournal', rootPath, entry),
  getChangeJournal: (rootPath: string) =>
    ipcRenderer.invoke('project:getJournal', rootPath),
  clearChangeJournal: (rootPath: string) =>
    ipcRenderer.invoke('project:clearJournal', rootPath),
  recordSyncHistory: (rootPath: string, entry: any) =>
    ipcRenderer.invoke('project:recordSyncHistory', rootPath, entry),
  getSyncHistory: (rootPath: string) =>
    ipcRenderer.invoke('project:getSyncHistory', rootPath),
  saveTaskAttachment: (rootPath: string, taskId: string, fileName: string, content: any) =>
    ipcRenderer.invoke('project:saveAttachment', rootPath, taskId, fileName, content),
  listTaskAttachments: (rootPath: string, taskId: string) =>
    ipcRenderer.invoke('project:listAttachments', rootPath, taskId),
  deleteTaskAttachment: (rootPath: string, taskId: string, attachmentIdOrFileName: string) =>
    ipcRenderer.invoke('project:deleteAttachment', rootPath, taskId, attachmentIdOrFileName),
  recordTaskTombstone: (rootPath: string, taskId: string) =>
    ipcRenderer.invoke('project:recordTombstone', rootPath, taskId),
  getTaskTombstones: (rootPath: string) =>
    ipcRenderer.invoke('project:getTombstones', rootPath),
  getAutoSyncConfig: (rootPath: string) =>
    ipcRenderer.invoke('project:getAutoSyncConfig', rootPath),
  setAutoSyncConfig: (rootPath: string, config: any) =>
    ipcRenderer.invoke('project:setAutoSyncConfig', rootPath, config),
  saveBufferSnapshot: (rootPath: string, filePath: string, content: string) =>
    ipcRenderer.invoke('project:saveBufferSnapshot', rootPath, filePath, content),
  getBufferSnapshots: (rootPath: string) =>
    ipcRenderer.invoke('project:getBufferSnapshots', rootPath),
  clearBufferSnapshot: (rootPath: string, filePath?: string) =>
    ipcRenderer.invoke('project:clearBufferSnapshot', rootPath, filePath),
  migrateProjectSchema: (raw: any, fallbackName: string) =>
    ipcRenderer.invoke('project:migrateSchema', raw, fallbackName),
  getWorkflowPolicy: (workspacePath: string) =>
    ipcRenderer.invoke('project:getWorkflowPolicy', workspacePath),
  saveWorkflowPolicy: (workspacePath: string, policy: any) =>
    ipcRenderer.invoke('project:saveWorkflowPolicy', workspacePath, policy),
  getTaskTemplates: () =>
    ipcRenderer.invoke('project:getTaskTemplates'),
  createTaskFromTemplate: (templateId: string, overrides: any) =>
    ipcRenderer.invoke('project:createTaskFromTemplate', templateId, overrides),
  bulkUpdateTasks: (workspacePath: string, taskIds: string[], updates: any) =>
    ipcRenderer.invoke('project:bulkUpdateTasks', workspacePath, taskIds, updates),

  // Diagnostics & System
  getSystemDiagnostics: (workspacePath?: string) =>
    ipcRenderer.invoke('app:getSystemDiagnostics', workspacePath),
  exportDiagnostics: (workspacePath?: string) =>
    ipcRenderer.invoke('app:exportDiagnostics', workspacePath),

  // Settings
  loadSettings: (workspacePath: string) => ipcRenderer.invoke('settings:load', workspacePath),
  saveSettings: (workspacePath: string, settings: any) =>
    ipcRenderer.invoke('settings:save', workspacePath, settings),
  loadTsConfig: (workspacePath: string, filePath?: string) =>
    ipcRenderer.invoke('settings:loadTsConfig', workspacePath, filePath),
  discoverTsProjects: (workspacePath: string) =>
    ipcRenderer.invoke('settings:discoverTsProjects', workspacePath),
  loadEditorConfig: (workspacePath: string, targetFilePath?: string) =>
    ipcRenderer.invoke('settings:loadEditorConfig', workspacePath, targetFilePath),
  loadLaunchConfig: (workspacePath: string) =>
    ipcRenderer.invoke('settings:loadLaunchConfig', workspacePath),
  loadExtensionRecommendations: (workspacePath: string) =>
    ipcRenderer.invoke('settings:loadExtensionRecommendations', workspacePath),
  getEffectiveSettings: (workspacePath?: string, languageId?: string) =>
    ipcRenderer.invoke('settings:getEffective', workspacePath, languageId),
  loadUserKeybindings: (workspacePath?: string) =>
    ipcRenderer.invoke('settings:loadKeybindings', workspacePath),
  updateSettingsSafely: (filePath: string, updates: any) =>
    ipcRenderer.invoke('settings:updateSafely', filePath, updates),
  loadFolderSettings: (folderPath: string) =>
    ipcRenderer.invoke('settings:loadFolder', folderPath),
  getEffectiveInspector: (key: string, workspacePath?: string, folderPath?: string, languageId?: string) =>
    ipcRenderer.invoke('settings:getEffectiveInspector', key, workspacePath, folderPath, languageId),
  validateSettingsJson: (rawJson: string) =>
    ipcRenderer.invoke('settings:validateJson', rawJson),
  validateEditorConfig: (rawContent: string) =>
    ipcRenderer.invoke('settings:validateEditorConfig', rawContent),
  safeWriteSettings: (filePath: string, newContent: string, confirmed?: boolean) =>
    ipcRenderer.invoke('settings:safeWrite', filePath, newContent, confirmed),

  // Workspaces & Trust & Session State
  getRecentWorkspaces: () => ipcRenderer.invoke('workspace:getRecent'),
  addRecentWorkspace: (workspacePath: string) => ipcRenderer.invoke('workspace:addRecent', workspacePath),
  removeRecentWorkspace: (workspacePath: string) => ipcRenderer.invoke('workspace:removeRecent', workspacePath),
  clearRecentWorkspaces: () => ipcRenderer.invoke('workspace:clearRecent'),
  isWorkspaceTrusted: (workspacePath: string) => ipcRenderer.invoke('workspace:isTrusted', workspacePath),
  setWorkspaceTrusted: (workspacePath: string, trusted: boolean) =>
    ipcRenderer.invoke('workspace:setTrusted', workspacePath, trusted),
  saveWorkspaceSessionState: (workspacePath: string, state: any) =>
    ipcRenderer.invoke('workspace:saveSessionState', workspacePath, state),
  loadWorkspaceSessionState: (workspacePath: string) =>
    ipcRenderer.invoke('workspace:loadSessionState', workspacePath),
  parseCodeWorkspace: (filePath: string) =>
    ipcRenderer.invoke('workspace:parseCodeWorkspace', filePath),
  saveCodeWorkspace: (filePath: string, folders: string[], settings?: any) =>
    ipcRenderer.invoke('workspace:saveCodeWorkspace', filePath, folders, settings),
  discoverGitRepositories: (rootPath: string, maxDepth?: number) =>
    ipcRenderer.invoke('workspace:discoverGitRepositories', rootPath, maxDepth),
  createWorkspaceBackup: (workspacePath: string) =>
    ipcRenderer.invoke('workspace:createBackup', workspacePath),
  listWorkspaceBackups: (workspacePath: string) =>
    ipcRenderer.invoke('workspace:listBackups', workspacePath),
  restoreWorkspaceBackup: (workspacePath: string, backupFileName: string) =>
    ipcRenderer.invoke('workspace:restoreBackup', workspacePath, backupFileName),

  // Tasks
  getWorkspaceTasks: (workspacePath: string) => ipcRenderer.invoke('tasks:get', workspacePath),
  tasksResolvePlan: (targetTaskLabelOrId: string, tasks: any[]) =>
    ipcRenderer.invoke('tasks:resolvePlan', targetTaskLabelOrId, tasks),
  tasksInterpolateVariables: (template: string, context?: any) =>
    ipcRenderer.invoke('tasks:interpolateVariables', template, context),
  tasksValidateSafety: (command: string, args?: string[], isWorkspaceTrusted?: boolean) =>
    ipcRenderer.invoke('tasks:validateSafety', command, args, isWorkspaceTrusted),
  tasksParseProblems: (output: string, workspacePath: string, problemMatcher?: string | string[]) =>
    ipcRenderer.invoke('tasks:parseProblems', output, workspacePath, problemMatcher),
  tasksRecordStart: (
    taskId: string,
    label: string,
    command: string,
    sessionId?: string,
    isBackground?: boolean
  ) =>
    ipcRenderer.invoke('tasks:recordStart', taskId, label, command, sessionId, isBackground),
  tasksRecordEnd: (taskId: string, exitCode: number, error?: string) =>
    ipcRenderer.invoke('tasks:recordEnd', taskId, exitCode, error),
  tasksCancel: (taskId: string) => ipcRenderer.invoke('tasks:cancel', taskId),
  tasksGetHistory: () => ipcRenderer.invoke('tasks:getHistory'),
  tasksClearHistory: () => ipcRenderer.invoke('tasks:clearHistory'),

  // Terminal
  getAvailableShells: () => ipcRenderer.invoke('terminal:getShells'),
  validateShell: (shellPath: string) => ipcRenderer.invoke('terminal:validateShell', shellPath),
  createTerminal: (
    id: string,
    cwd?: string,
    shellPath?: string,
    env?: Record<string, string>,
    shellArgs?: string[]
  ) => ipcRenderer.invoke('terminal:create', id, cwd, shellPath, env, shellArgs),
  writeTerminal: (id: string, data: string) => ipcRenderer.invoke('terminal:write', id, data),
  interruptTerminal: (id: string) => ipcRenderer.invoke('terminal:interrupt', id),
  resizeTerminal: (id: string, cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
  killTerminal: (id: string) => ipcRenderer.invoke('terminal:kill', id),
  onTerminalData: (callback: (id: string, data: string) => void) => {
    const subscription = (_: any, id: string, data: string) => callback(id, data)
    ipcRenderer.on('terminal:data', subscription)
    return () => ipcRenderer.removeListener('terminal:data', subscription)
  },
  onTerminalExit: (callback: (id: string) => void) => {
    const subscription = (_: any, id: string) => callback(id)
    ipcRenderer.on('terminal:exit', subscription)
    return () => ipcRenderer.removeListener('terminal:exit', subscription)
  },

  // Language Server Protocol
  startLsp: (serverName: string, command: string, args: string[], rootUri?: string) =>
    ipcRenderer.invoke('lsp:start', serverName, command, args, rootUri),
  stopLsp: (serverName: string) => ipcRenderer.invoke('lsp:stop', serverName),
  sendLspMessage: (serverName: string, message: LspMessage) =>
    ipcRenderer.invoke('lsp:send', serverName, message),
  cancelLsp: (serverName: string, requestId: number | string) =>
    ipcRenderer.invoke('lsp:cancel', serverName, requestId),
  onLspMessage: (callback: (serverName: string, message: LspMessage) => void) => {
    const subscription = (_: any, serverName: string, message: LspMessage) =>
      callback(serverName, message)
    ipcRenderer.on('lsp:message', subscription)
    return () => ipcRenderer.removeListener('lsp:message', subscription)
  },
  onLspStatus: (callback: (serverName: string, status: string) => void) => {
    const subscription = (_: any, serverName: string, status: string) =>
      callback(serverName, status)
    ipcRenderer.on('lsp:status', subscription)
    return () => ipcRenderer.removeListener('lsp:status', subscription)
  },
  onOutputAppend: (callback: (channelId: string, line: string) => void) => {
    const subscription = (_: any, channelId: string, line: string) => callback(channelId, line)
    ipcRenderer.on('output:append', subscription)
    return () => ipcRenderer.removeListener('output:append', subscription)
  },

  // Debug Adapter Protocol (DAP)
  dapStartSession: (workspacePath, config) => ipcRenderer.invoke('dap:startSession', workspacePath, config),
  dapStopSession: (sessionId) => ipcRenderer.invoke('dap:stopSession', sessionId),
  dapRestartSession: (sessionId) => ipcRenderer.invoke('dap:restartSession', sessionId),
  dapPause: (sessionId, threadId) => ipcRenderer.invoke('dap:pause', sessionId, threadId),
  dapContinue: (sessionId, threadId) => ipcRenderer.invoke('dap:continue', sessionId, threadId),
  dapNext: (sessionId, threadId) => ipcRenderer.invoke('dap:next', sessionId, threadId),
  dapStepIn: (sessionId, threadId) => ipcRenderer.invoke('dap:stepIn', sessionId, threadId),
  dapStepOut: (sessionId, threadId) => ipcRenderer.invoke('dap:stepOut', sessionId, threadId),
  dapSetBreakpoints: (filePath, breakpoints) => ipcRenderer.invoke('dap:setBreakpoints', filePath, breakpoints),
  dapGetBreakpoints: (filePath) => ipcRenderer.invoke('dap:getBreakpoints', filePath),
  dapSetFunctionBreakpoints: (breakpoints) => ipcRenderer.invoke('dap:setFunctionBreakpoints', breakpoints),
  dapGetFunctionBreakpoints: () => ipcRenderer.invoke('dap:getFunctionBreakpoints'),
  dapSetExceptionBreakpoints: (filters) => ipcRenderer.invoke('dap:setExceptionBreakpoints', filters),
  dapGetExceptionBreakpoints: () => ipcRenderer.invoke('dap:getExceptionBreakpoints'),
  dapGetLogs: () => ipcRenderer.invoke('dap:getLogs'),
  dapClearLogs: () => ipcRenderer.invoke('dap:clearLogs'),
  dapGetStackTrace: (sessionId, threadId) => ipcRenderer.invoke('dap:getStackTrace', sessionId, threadId),
  dapGetScopes: (sessionId, frameId) => ipcRenderer.invoke('dap:getScopes', sessionId, frameId),
  dapGetVariables: (sessionId, variablesReference) => ipcRenderer.invoke('dap:getVariables', sessionId, variablesReference),
  dapEvaluate: (sessionId, expression, frameId, context) =>
    ipcRenderer.invoke('dap:evaluate', sessionId, expression, frameId, context),
  dapValidateSecurity: (config: any) => ipcRenderer.invoke('dap:validateSecurity', config),
  dapGetActiveSessions: () => ipcRenderer.invoke('dap:getActiveSessions'),
  dapFocusSession: (sessionId: string) => ipcRenderer.invoke('dap:focusSession', sessionId),
  dapResolveSourceMap: (filePath: string, line: number, column: number) =>
    ipcRenderer.invoke('dap:resolveSourceMap', filePath, line, column),
  onDapEvent: (callback) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on('dap:event', subscription)
    return () => ipcRenderer.removeListener('dap:event', subscription)
  },

  // Testing Integration
  testDiscover: (workspacePath) => ipcRenderer.invoke('test:discover', workspacePath),
  testRun: (workspacePath, targetFilePaths, targetTestNames) =>
    ipcRenderer.invoke('test:run', workspacePath, targetFilePaths, targetTestNames),
  testCancel: (runId) => ipcRenderer.invoke('test:cancel', runId),
  onTestEvent: (callback) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on('test:event', subscription)
    return () => ipcRenderer.removeListener('test:event', subscription)
  },

  // Extension Ecosystem & Extension Host
  extensionLoad: (workspacePath) => ipcRenderer.invoke('extension:load', workspacePath),
  extensionToggle: (extensionId, enabled) => ipcRenderer.invoke('extension:toggle', extensionId, enabled),
  extensionInstall: (targetPath) => ipcRenderer.invoke('extension:install', targetPath),
  extensionUninstall: (extensionId) => ipcRenderer.invoke('extension:uninstall', extensionId),
  extensionGetCommands: () => ipcRenderer.invoke('extension:getCommands'),
  extensionExecuteCommand: (commandId, ...args) =>
    ipcRenderer.invoke('extension:executeCommand', commandId, ...args),
  extensionValidateCompatibility: (manifest: any) =>
    ipcRenderer.invoke('extension:validateCompatibility', manifest),
  extensionGetSnippets: () =>
    ipcRenderer.invoke('extension:getSnippets'),
  extensionGetLanguages: () =>
    ipcRenderer.invoke('extension:getLanguages'),
  extensionExportInventory: (targetWorkspacePath?: string) =>
    ipcRenderer.invoke('extension:exportInventory', targetWorkspacePath),
  extensionGetStoragePath: (extensionId: string, workspacePath?: string) =>
    ipcRenderer.invoke('extension:getStoragePath', extensionId, workspacePath),
  extensionInstallVsix: (vsixPath: string) =>
    ipcRenderer.invoke('extension:installVsix', vsixPath),
  onExtensionEvent: (callback) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on('extension:event', subscription)
    return () => ipcRenderer.removeListener('extension:event', subscription)
  },

  // Process Manager & Security
  getManagedProcesses: () => ipcRenderer.invoke('process:getManaged'),
  killProcessTree: (pid: number) => ipcRenderer.invoke('process:killTree', pid),
  storeSecureSecret: (key: string, value: string) => ipcRenderer.invoke('security:storeSecret', key, value),
  getSecureSecret: (key: string) => ipcRenderer.invoke('security:getSecret', key),
  deleteSecureSecret: (key: string) => ipcRenderer.invoke('security:deleteSecret', key),
  getStructuredLogs: (limit?: number, category?: string) => ipcRenderer.invoke('security:getLogs', limit, category)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('maestroAPI', api)
  } catch (error) {
    console.error('Failed to expose maestroAPI via contextBridge', error)
  }
} else {
  // @ts-ignore
  window.maestroAPI = api
}

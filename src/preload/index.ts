import { contextBridge, ipcRenderer } from 'electron'
import type { IElectronAPI, ProjectMetadata, LspMessage } from './index.d'

const api: IElectronAPI = {
  // Window
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // File System
  openDirectoryDialog: () => ipcRenderer.invoke('fs:openDirectoryDialog'),
  readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:readDirectory', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  createFile: (filePath: string) => ipcRenderer.invoke('fs:createFile', filePath),
  createDirectory: (dirPath: string) => ipcRenderer.invoke('fs:createDirectory', dirPath),
  deletePath: (targetPath: string) => ipcRenderer.invoke('fs:deletePath', targetPath),
  renamePath: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:renamePath', oldPath, newPath),
  duplicatePath: (sourcePath: string) => ipcRenderer.invoke('fs:duplicatePath', sourcePath),
  watchWorkspace: (workspacePath: string) => ipcRenderer.invoke('fs:watchWorkspace', workspacePath),
  stopWatchingWorkspace: () => ipcRenderer.invoke('fs:stopWatching'),
  revealInOS: (targetPath: string) => ipcRenderer.invoke('fs:revealInOS', targetPath),
  onFileChanged: (callback: (event: any) => void) => {
    const subscription = (_: any, event: any) => callback(event)
    ipcRenderer.on('fs:changed', subscription)
    return () => ipcRenderer.removeListener('fs:changed', subscription)
  },

  // Git
  getGitStatus: (workspacePath: string) => ipcRenderer.invoke('git:status', workspacePath),
  getGitDiff: (workspacePath: string, relativePath: string) => ipcRenderer.invoke('git:diff', workspacePath, relativePath),
  gitStageFile: (workspacePath: string, filePath: string) => ipcRenderer.invoke('git:stage', workspacePath, filePath),
  gitUnstageFile: (workspacePath: string, filePath: string) => ipcRenderer.invoke('git:unstage', workspacePath, filePath),
  gitStageAll: (workspacePath: string) => ipcRenderer.invoke('git:stageAll', workspacePath),
  gitUnstageAll: (workspacePath: string) => ipcRenderer.invoke('git:unstageAll', workspacePath),
  gitDiscardFile: (workspacePath: string, filePath: string) => ipcRenderer.invoke('git:discard', workspacePath, filePath),
  gitCommit: (workspacePath: string, message: string) => ipcRenderer.invoke('git:commit', workspacePath, message),
  gitPush: (workspacePath: string) => ipcRenderer.invoke('git:push', workspacePath),
  gitPull: (workspacePath: string) => ipcRenderer.invoke('git:pull', workspacePath),
  gitCreateBranch: (workspacePath: string, branchName: string) =>
    ipcRenderer.invoke('git:createBranch', workspacePath, branchName),
  gitCheckoutBranch: (workspacePath: string, branchName: string) =>
    ipcRenderer.invoke('git:checkoutBranch', workspacePath, branchName),
  gitGetBranches: (workspacePath: string) => ipcRenderer.invoke('git:getBranches', workspacePath),
  gitDeleteBranch: (workspacePath: string, branchName: string) =>
    ipcRenderer.invoke('git:deleteBranch', workspacePath, branchName),
  getGitGutterChanges: (workspacePath: string, relativePath: string) =>
    ipcRenderer.invoke('git:gutterChanges', workspacePath, relativePath),
  gitAbortMerge: (workspacePath: string) => ipcRenderer.invoke('git:abortMerge', workspacePath),
  gitContinueMerge: (workspacePath: string) => ipcRenderer.invoke('git:continueMerge', workspacePath),
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

  // Search in Files
  searchInFiles: (workspacePath: string, query: string, options?: any) =>
    ipcRenderer.invoke('search:inFiles', workspacePath, query, options),
  replaceInFiles: (workspacePath: string, query: string, replaceText: string, options?: any) =>
    ipcRenderer.invoke('search:replaceInFiles', workspacePath, query, replaceText, options),
  replaceInFile: (filePath: string, query: string, replaceText: string, options?: any) =>
    ipcRenderer.invoke('search:replaceInFile', filePath, query, replaceText, options),
  replaceMatch: (filePath: string, line: number, column: number, matchText: string, replaceText: string) =>
    ipcRenderer.invoke('search:replaceMatch', filePath, line, column, matchText, replaceText),

  // Project Management
  loadProjectData: (rootPath: string) => ipcRenderer.invoke('project:loadData', rootPath),
  saveProjectData: (rootPath: string, data: ProjectMetadata) => ipcRenderer.invoke('project:saveData', rootPath, data),

  // Settings
  loadSettings: (workspacePath: string) => ipcRenderer.invoke('settings:load', workspacePath),
  saveSettings: (workspacePath: string, settings: any) =>
    ipcRenderer.invoke('settings:save', workspacePath, settings),
  loadTsConfig: (workspacePath: string) => ipcRenderer.invoke('settings:loadTsConfig', workspacePath),
  loadEditorConfig: (workspacePath: string, targetFilePath?: string) =>
    ipcRenderer.invoke('settings:loadEditorConfig', workspacePath, targetFilePath),

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

  // Terminal
  getAvailableShells: () => ipcRenderer.invoke('terminal:getShells'),
  createTerminal: (id: string, cwd?: string, shellPath?: string) =>
    ipcRenderer.invoke('terminal:create', id, cwd, shellPath),
  writeTerminal: (id: string, data: string) => ipcRenderer.invoke('terminal:write', id, data),
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
  }
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

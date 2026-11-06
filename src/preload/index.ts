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

  // Git
  getGitStatus: (workspacePath: string) => ipcRenderer.invoke('git:status', workspacePath),
  getGitDiff: (workspacePath: string, relativePath: string) => ipcRenderer.invoke('git:diff', workspacePath, relativePath),
  gitStageFile: (workspacePath: string, filePath: string) => ipcRenderer.invoke('git:stage', workspacePath, filePath),
  gitStageAll: (workspacePath: string) => ipcRenderer.invoke('git:stageAll', workspacePath),
  gitCommit: (workspacePath: string, message: string) => ipcRenderer.invoke('git:commit', workspacePath, message),
  gitPush: (workspacePath: string) => ipcRenderer.invoke('git:push', workspacePath),
  gitPull: (workspacePath: string) => ipcRenderer.invoke('git:pull', workspacePath),

  // Project Management
  loadProjectData: (rootPath: string) => ipcRenderer.invoke('project:loadData', rootPath),
  saveProjectData: (rootPath: string, data: ProjectMetadata) => ipcRenderer.invoke('project:saveData', rootPath, data),

  // Terminal
  createTerminal: (id: string, cwd?: string) => ipcRenderer.invoke('terminal:create', id, cwd),
  writeTerminal: (id: string, data: string) => ipcRenderer.invoke('terminal:write', id, data),
  resizeTerminal: (id: string, cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
  killTerminal: (id: string) => ipcRenderer.invoke('terminal:kill', id),
  onTerminalData: (callback: (id: string, data: string) => void) => {
    const subscription = (_: any, id: string, data: string) => callback(id, data)
    ipcRenderer.on('terminal:data', subscription)
    return () => ipcRenderer.removeListener('terminal:data', subscription)
  },

  // Language Server Protocol
  startLsp: (serverName: string, command: string, args: string[], rootUri?: string) =>
    ipcRenderer.invoke('lsp:start', serverName, command, args, rootUri),
  stopLsp: (serverName: string) => ipcRenderer.invoke('lsp:stop', serverName),
  sendLspMessage: (serverName: string, message: LspMessage) =>
    ipcRenderer.invoke('lsp:send', serverName, message),
  onLspMessage: (callback: (serverName: string, message: LspMessage) => void) => {
    const subscription = (_: any, serverName: string, message: LspMessage) =>
      callback(serverName, message)
    ipcRenderer.on('lsp:message', subscription)
    return () => ipcRenderer.removeListener('lsp:message', subscription)
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

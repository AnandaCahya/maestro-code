export interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  children?: FileItem[]
}

export interface SubtaskItem {
  id: string
  title: string
  completed: boolean
}

export interface TaskItem {
  id: string
  title: string
  description?: string
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  linkedFile?: string
  linkedLine?: number
  subtasks?: SubtaskItem[]
  createdAt: number
  updatedAt: number
}

export interface ProjectMetadata {
  name: string
  description?: string
  version?: string
  tasks: TaskItem[]
}

export interface LspMessage {
  jsonrpc: '2.0'
  id?: number | string
  method?: string
  params?: any
  result?: any
  error?: any
}

export interface GitFileStatus {
  path: string
  status: 'modified' | 'untracked' | 'added' | 'deleted' | 'renamed'
  staged?: boolean
}

export interface GitStatusResult {
  branch: string
  files: GitFileStatus[]
  staged: GitFileStatus[]
  unstaged: GitFileStatus[]
  untracked: GitFileStatus[]
  conflicts: GitFileStatus[]
  isMerging?: boolean
}

export interface GitGutterChange {
  type: 'added' | 'modified' | 'deleted'
  startLine: number
  endLine: number
}

export interface GitCommit {
  hash: string
  shortHash: string
  author: string
  email: string
  date: string
  message: string
}

export interface GitCommitDetail extends GitCommit {
  files: {
    status: 'A' | 'M' | 'D' | 'R'
    path: string
  }[]
}

export interface GitBlameLine {
  line: number
  commitHash: string
  author: string
  date: string
  summary: string
}

export interface GitStashItem {
  index: number
  name: string
  branch: string
  message: string
}

export interface SearchMatch {
  filePath: string
  fileName: string
  line: number
  column: number
  lineText: string
  preview: { before: string; match: string; after: string }
}

export interface FileSearchResult {
  filePath: string
  fileName: string
  matches: SearchMatch[]
}

export interface SearchOptions {
  isCaseSensitive?: boolean
  isWholeWord?: boolean
  isRegex?: boolean
  includePattern?: string
  excludePattern?: string
}

export interface ShellProfile {
  id: string
  name: string
  path: string
}

export interface WorkspaceSettings {
  tabSize: number
  fontSize: number
  wordWrap: 'on' | 'off'
  formatOnSave: boolean
  minimap: boolean
  lineNumbers: 'on' | 'off' | 'relative'
}

export interface FileChangeEvent {
  eventType: string
  filename: string
}

export interface IElectronAPI {
  // Window Controls
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<boolean>
  closeWindow: () => Promise<void>
  isMaximized: () => Promise<boolean>

  // File System
  openDirectoryDialog: () => Promise<string | null>
  readDirectory: (dirPath: string) => Promise<FileItem[]>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<boolean>
  createFile: (filePath: string) => Promise<boolean>
  createDirectory: (dirPath: string) => Promise<boolean>
  deletePath: (targetPath: string) => Promise<boolean>
  renamePath: (oldPath: string, newPath: string) => Promise<boolean>
  duplicatePath: (sourcePath: string) => Promise<string>
  watchWorkspace: (workspacePath: string) => Promise<boolean>
  stopWatchingWorkspace: () => Promise<void>
  revealInOS: (targetPath: string) => Promise<void>
  onFileChanged: (callback: (event: FileChangeEvent) => void) => () => void

  // Git Source Control
  getGitStatus: (workspacePath: string) => Promise<GitStatusResult>
  getGitDiff: (workspacePath: string, relativePath: string) => Promise<{ original: string; modified: string }>
  gitStageFile: (workspacePath: string, filePath: string) => Promise<boolean>
  gitUnstageFile: (workspacePath: string, filePath: string) => Promise<boolean>
  gitStageAll: (workspacePath: string) => Promise<boolean>
  gitUnstageAll: (workspacePath: string) => Promise<boolean>
  gitDiscardFile: (workspacePath: string, filePath: string) => Promise<boolean>
  gitCommit: (workspacePath: string, message: string) => Promise<{ ok: boolean; message: string }>
  gitPush: (workspacePath: string) => Promise<{ ok: boolean; message: string }>
  gitPull: (workspacePath: string) => Promise<{ ok: boolean; message: string }>
  gitCreateBranch: (workspacePath: string, branchName: string) => Promise<{ ok: boolean; message: string }>
  gitCheckoutBranch: (workspacePath: string, branchName: string) => Promise<{ ok: boolean; message: string }>
  gitGetBranches: (workspacePath: string) => Promise<string[]>
  gitDeleteBranch: (workspacePath: string, branchName: string) => Promise<{ ok: boolean; message: string }>
  getGitGutterChanges: (workspacePath: string, relativePath: string) => Promise<GitGutterChange[]>
  gitAbortMerge: (workspacePath: string) => Promise<{ ok: boolean; message: string }>
  gitContinueMerge: (workspacePath: string) => Promise<{ ok: boolean; message: string }>
  gitGetHistory: (workspacePath: string, maxCount?: number, filePath?: string) => Promise<GitCommit[]>
  gitGetCommitDetail: (workspacePath: string, hash: string) => Promise<GitCommitDetail | null>
  gitGetFileAtCommit: (workspacePath: string, hash: string, filePath: string) => Promise<string>
  gitGetBlame: (workspacePath: string, filePath: string) => Promise<GitBlameLine[]>
  gitFetch: (workspacePath: string) => Promise<{ ok: boolean; message: string }>
  gitGetStashes: (workspacePath: string) => Promise<GitStashItem[]>
  gitStashSave: (workspacePath: string, message?: string) => Promise<{ ok: boolean; message: string }>
  gitStashPop: (workspacePath: string, index?: number) => Promise<{ ok: boolean; message: string }>
  gitStashApply: (workspacePath: string, index?: number) => Promise<{ ok: boolean; message: string }>
  gitStashDrop: (workspacePath: string, index?: number) => Promise<{ ok: boolean; message: string }>

  // Search & Replace in Files
  searchInFiles: (workspacePath: string, query: string, options?: SearchOptions) => Promise<FileSearchResult[]>
  replaceInFiles: (workspacePath: string, query: string, replaceText: string, options?: SearchOptions) => Promise<{ replacedCount: number; filesCount: number }>

  // Project Management
  loadProjectData: (rootPath: string) => Promise<ProjectMetadata>
  saveProjectData: (rootPath: string, data: ProjectMetadata) => Promise<boolean>

  // Settings (.vscode/settings.json)
  loadSettings: (workspacePath: string) => Promise<WorkspaceSettings>
  saveSettings: (workspacePath: string, settings: WorkspaceSettings) => Promise<boolean>
  loadTsConfig: (workspacePath: string) => Promise<any>

  // Terminal PTY / Shell
  getAvailableShells: () => Promise<ShellProfile[]>
  createTerminal: (id: string, cwd?: string, shellPath?: string) => Promise<boolean>
  writeTerminal: (id: string, data: string) => Promise<void>
  resizeTerminal: (id: string, cols: number, rows: number) => Promise<void>
  killTerminal: (id: string) => Promise<void>
  onTerminalData: (callback: (id: string, data: string) => void) => () => void
  onTerminalExit: (callback: (id: string) => void) => () => void

  // Language Server Protocol (LSP)
  startLsp: (serverName: string, command: string, args: string[], rootUri?: string) => Promise<{ ok: boolean; message: string }>
  stopLsp: (serverName: string) => Promise<boolean>
  sendLspMessage: (serverName: string, message: LspMessage) => Promise<void>
  cancelLsp: (serverName: string, requestId: number | string) => Promise<void>
  onLspMessage: (callback: (serverName: string, message: LspMessage) => void) => () => void
  onLspStatus: (callback: (serverName: string, status: string) => void) => () => void
}

declare global {
  interface Window {
    maestroAPI: IElectronAPI
  }
}

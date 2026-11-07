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

export type IssueType = 'epic' | 'story' | 'task' | 'bug' | 'subtask'

export interface CodeLinkItem {
  file: string
  line?: number
  endLine?: number
}

export interface TaskComment {
  id: string
  author: string
  content: string
  createdAt: number
}

export interface TaskActivity {
  id: string
  type: 'created' | 'status_changed' | 'priority_changed' | 'comment_added' | 'updated'
  description: string
  timestamp: number
}

export interface SprintItem {
  id: string
  name: string
  goal?: string
  startDate?: string
  endDate?: string
  status: 'planned' | 'active' | 'completed'
}

export interface MilestoneItem {
  id: string
  title: string
  description?: string
  targetDate?: string
  status: 'open' | 'closed'
}

export interface TaskItem {
  id: string
  title: string
  description?: string
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  type?: IssueType
  labels?: string[]
  components?: string[]
  assignee?: string
  reporter?: string
  startDate?: string
  dueDate?: string
  parentId?: string
  blockedBy?: string[]
  sprintId?: string
  milestoneId?: string
  storyPoints?: number
  linkedFile?: string
  linkedLine?: number
  codeLinks?: CodeLinkItem[]
  subtasks?: SubtaskItem[]
  comments?: TaskComment[]
  activities?: TaskActivity[]
  createdAt: number
  updatedAt: number
}

export interface ProjectMetadata {
  name: string
  description?: string
  version?: string
  schemaVersion?: number
  tasks: TaskItem[]
  sprints?: SprintItem[]
  milestones?: MilestoneItem[]
}

export interface ProjectBackupItem {
  filename: string
  timestamp: number
  size: number
}

export interface RecentWorkspace {
  path: string
  name: string
  lastOpened: number
}

export interface WorkspaceSessionState {
  openFiles: { path: string; name: string; isPinned?: boolean; group?: 1 | 2 }[]
  activeFilePath: string | null
  layoutMode?: 'editor' | 'project' | 'split'
  editorSplitMode?: 'none' | 'vertical' | 'horizontal'
  group1FilePaths?: string[]
  group2FilePaths?: string[]
  group1ActiveFilePath?: string | null
  group2ActiveFilePath?: string | null
  activeEditorGroup?: 1 | 2
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
  ahead?: number
  behind?: number
  upstream?: string
}

export interface GitRemote {
  name: string
  fetchUrl: string
  pushUrl: string
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

export interface SystemDiagnostics {
  app: {
    name: string
    version: string
    electron: string
    chrome: string
    node: string
    v8: string
  }
  system: {
    platform: string
    type: string
    release: string
    arch: string
    uptimeSeconds: number
    totalMemoryMB: number
    freeMemoryMB: number
    cpuCount: number
    cpuModel: string
  }
  process: {
    pid: number
    memoryUsageMB: {
      rss: number
      heapTotal: number
      heapUsed: number
      external: number
    }
  }
  workspace?: {
    path: string
  }
  timestamp: number
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
  searchHiddenFiles?: boolean
}

export interface MaestroTask {
  id: string
  label: string
  type: 'shell' | 'process' | 'npm'
  command: string
  args?: string[]
  cwd?: string
  source: 'tasks.json' | 'package.json'
  group?: 'build' | 'test' | 'none'
  isDefault?: boolean
  problemMatcher?: string | string[]
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
  insertSpaces: boolean
  fontLigatures?: boolean
  fontFamily?: string
  filesExclude?: Record<string, boolean>
}

export interface EditorConfigRules {
  indentStyle?: 'tab' | 'space'
  indentSize?: number
  tabWidth?: number
  endOfLine?: 'lf' | 'crlf' | 'cr'
  charset?: string
  trimTrailingWhitespace?: boolean
  insertFinalNewline?: boolean
}

export interface LaunchConfiguration {
  name: string
  type: string
  request: 'launch' | 'attach' | string
  program?: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  runtimeExecutable?: string
  runtimeArgs?: string[]
  stopOnEntry?: boolean
  console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal'
  [key: string]: any
}

export interface LaunchConfigResult {
  version?: string
  configurations: LaunchConfiguration[]
  compounds?: Array<{ name: string; configurations: string[] }>
}

export interface ExtensionRecommendationsResult {
  recommendations: string[]
  unwantedRecommendations?: string[]
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
  toggleFullScreen: () => Promise<boolean>

  // File System
  openDirectoryDialog: () => Promise<string | null>
  openWorkspaceFileDialog: () => Promise<string | null>
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
  openWithExternalApp: (targetPath: string) => Promise<string>
  movePath: (sourcePath: string, destinationDir: string) => Promise<{ ok: boolean; newPath: string; error?: string }>
  copyPathTo: (sourcePath: string, destinationDir: string) => Promise<{ ok: boolean; newPath: string; error?: string }>
  onFileChanged: (callback: (event: FileChangeEvent) => void) => () => void

  // Git Source Control
  getGitStatus: (workspacePath: string) => Promise<GitStatusResult>
  getGitDiff: (workspacePath: string, relativePath: string) => Promise<{ original: string; modified: string }>
  getGitStagedDiff: (workspacePath: string, relativePath: string) => Promise<{ original: string; modified: string }>
  gitStageFile: (workspacePath: string, filePath: string) => Promise<boolean>
  gitUnstageFile: (workspacePath: string, filePath: string) => Promise<boolean>
  gitStageAll: (workspacePath: string) => Promise<boolean>
  gitUnstageAll: (workspacePath: string) => Promise<boolean>
  gitDiscardFile: (workspacePath: string, filePath: string) => Promise<boolean>
  gitDiscardAll: (workspacePath: string) => Promise<boolean>
  gitCommit: (workspacePath: string, message: string) => Promise<{ ok: boolean; message: string }>
  gitCommitAmend: (workspacePath: string, message?: string) => Promise<{ ok: boolean; message: string }>
  gitPush: (workspacePath: string) => Promise<{ ok: boolean; message: string }>
  gitPull: (workspacePath: string) => Promise<{ ok: boolean; message: string }>
  gitCreateBranch: (workspacePath: string, branchName: string) => Promise<{ ok: boolean; message: string }>
  gitCheckoutBranch: (workspacePath: string, branchName: string) => Promise<{ ok: boolean; message: string }>
  gitGetBranches: (workspacePath: string) => Promise<string[]>
  gitRenameBranch: (workspacePath: string, oldName: string, newName: string) => Promise<{ ok: boolean; message: string }>
  gitPublishBranch: (workspacePath: string, branchName: string) => Promise<{ ok: boolean; message: string }>
  gitDeleteBranch: (workspacePath: string, branchName: string) => Promise<{ ok: boolean; message: string }>
  getGitGutterChanges: (workspacePath: string, relativePath: string) => Promise<GitGutterChange[]>
  gitAbortMerge: (workspacePath: string) => Promise<{ ok: boolean; message: string }>
  gitContinueMerge: (workspacePath: string) => Promise<{ ok: boolean; message: string }>
  gitMerge: (workspacePath: string, branchName: string) => Promise<{ ok: boolean; conflict?: boolean; message: string }>
  gitRebase: (workspacePath: string, branchName: string) => Promise<{ ok: boolean; conflict?: boolean; message: string }>
  gitAbortRebase: (workspacePath: string) => Promise<{ ok: boolean; message: string }>
  gitContinueRebase: (workspacePath: string) => Promise<{ ok: boolean; message: string }>
  gitCompareBranches: (workspacePath: string, baseBranch: string, targetBranch: string) => Promise<{ ahead: number; behind: number; diffStat: string }>
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
  gitGetTags: (workspacePath: string) => Promise<string[]>
  gitCreateTag: (workspacePath: string, tagName: string, message?: string) => Promise<{ ok: boolean; message: string }>
  gitDeleteTag: (workspacePath: string, tagName: string) => Promise<{ ok: boolean; message: string }>
  gitCheckoutTag: (workspacePath: string, tagName: string) => Promise<{ ok: boolean; message: string }>
  gitGetRemotes: (workspacePath: string) => Promise<GitRemote[]>
  gitAddRemote: (workspacePath: string, name: string, url: string) => Promise<{ ok: boolean; message: string }>
  gitRemoveRemote: (workspacePath: string, name: string) => Promise<{ ok: boolean; message: string }>
  gitRevert: (workspacePath: string, hash: string) => Promise<{ ok: boolean; message: string }>
  gitCherryPick: (workspacePath: string, hash: string) => Promise<{ ok: boolean; message: string }>
  gitReset: (workspacePath: string, mode: 'soft' | 'mixed' | 'hard', target?: string) => Promise<{ ok: boolean; message: string }>

  // Search & Replace in Files
  searchInFiles: (workspacePath: string, query: string, options?: SearchOptions) => Promise<FileSearchResult[]>
  replaceInFiles: (workspacePath: string, query: string, replaceText: string, options?: SearchOptions) => Promise<{ replacedCount: number; filesCount: number }>
  replaceInFile: (filePath: string, query: string, replaceText: string, options?: SearchOptions) => Promise<boolean>
  replaceMatch: (filePath: string, line: number, column: number, matchText: string, replaceText: string) => Promise<boolean>

  // Project Management
  loadProjectData: (rootPath: string) => Promise<ProjectMetadata>
  saveProjectData: (rootPath: string, data: ProjectMetadata) => Promise<boolean>
  createProjectBackup: (rootPath: string) => Promise<string>
  listProjectBackups: (rootPath: string) => Promise<ProjectBackupItem[]>
  restoreProjectBackup: (rootPath: string, backupFileName: string) => Promise<ProjectMetadata>
  getSystemDiagnostics: (workspacePath?: string) => Promise<SystemDiagnostics>
  exportDiagnostics: (workspacePath?: string) => Promise<{ ok: boolean; path: string; error?: string }>

  // Settings (.vscode/settings.json)
  loadSettings: (workspacePath: string) => Promise<WorkspaceSettings>
  saveSettings: (workspacePath: string, settings: WorkspaceSettings) => Promise<boolean>
  loadTsConfig: (workspacePath: string) => Promise<any>
  loadEditorConfig: (workspacePath: string, targetFilePath?: string) => Promise<EditorConfigRules | null>
  loadLaunchConfig: (workspacePath: string) => Promise<LaunchConfigResult | null>
  loadExtensionRecommendations: (workspacePath: string) => Promise<ExtensionRecommendationsResult | null>

  // Workspaces & Trust & Session State
  getRecentWorkspaces: () => Promise<RecentWorkspace[]>
  addRecentWorkspace: (workspacePath: string) => Promise<RecentWorkspace[]>
  removeRecentWorkspace: (workspacePath: string) => Promise<RecentWorkspace[]>
  clearRecentWorkspaces: () => Promise<boolean>
  isWorkspaceTrusted: (workspacePath: string) => Promise<boolean>
  setWorkspaceTrusted: (workspacePath: string, trusted: boolean) => Promise<boolean>
  saveWorkspaceSessionState: (workspacePath: string, state: WorkspaceSessionState) => Promise<boolean>
  loadWorkspaceSessionState: (workspacePath: string) => Promise<WorkspaceSessionState | null>
  parseCodeWorkspace: (filePath: string) => Promise<{ resolvedFolders: string[]; settings: Record<string, any> } | null>
  saveCodeWorkspace: (filePath: string, folders: string[], settings?: Record<string, any>) => Promise<boolean>

  // Task Runner
  getWorkspaceTasks: (workspacePath: string) => Promise<MaestroTask[]>

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

  // Debug Adapter Protocol (DAP)
  dapStartSession: (workspacePath: string, config: LaunchConfiguration) => Promise<{ ok: boolean; sessionId?: string; message?: string }>
  dapStopSession: (sessionId: string) => Promise<boolean>
  dapRestartSession: (sessionId: string) => Promise<boolean>
  dapPause: (sessionId: string, threadId?: number) => Promise<boolean>
  dapContinue: (sessionId: string, threadId?: number) => Promise<boolean>
  dapNext: (sessionId: string, threadId?: number) => Promise<boolean>
  dapStepIn: (sessionId: string, threadId?: number) => Promise<boolean>
  dapStepOut: (sessionId: string, threadId?: number) => Promise<boolean>
  dapSetBreakpoints: (filePath: string, breakpoints: { line: number; condition?: string; hitCondition?: string; logMessage?: string }[]) => Promise<DapBreakpoint[]>
  dapGetBreakpoints: (filePath?: string) => Promise<DapBreakpoint[]>
  dapGetStackTrace: (sessionId: string, threadId?: number) => Promise<DapStackFrame[]>
  dapGetScopes: (sessionId: string, frameId?: number) => Promise<DapScope[]>
  dapGetVariables: (sessionId: string, variablesReference: number) => Promise<DapVariable[]>
  dapEvaluate: (sessionId: string, expression: string, frameId?: number, context?: string) => Promise<{ result: string; type?: string; variablesReference?: number }>
  onDapEvent: (callback: (data: { event: string; payload: any }) => void) => () => void

  // Testing Integration
  testDiscover: (workspacePath: string) => Promise<TestDiscoveryResult>
  testRun: (workspacePath: string, targetFilePaths?: string[], targetTestNames?: string[]) => Promise<{ runId: string; ok: boolean; message?: string }>
  testCancel: (runId?: string) => Promise<boolean>
  onTestEvent: (callback: (data: { event: string; payload: any }) => void) => () => void

  // Extension Ecosystem & Extension Host
  extensionLoad: (workspacePath?: string) => Promise<MaestroExtension[]>
  extensionToggle: (extensionId: string, enabled: boolean) => Promise<boolean>
  extensionInstall: (targetPath: string) => Promise<{ ok: boolean; extension?: MaestroExtension; message?: string }>
  extensionUninstall: (extensionId: string) => Promise<boolean>
  extensionGetCommands: () => Promise<Array<{ command: string; title: string; category?: string; extensionId: string }>>
  extensionExecuteCommand: (commandId: string, ...args: any[]) => Promise<{ ok: boolean; result?: any; message?: string }>
  onExtensionEvent: (callback: (data: { event: string; payload: any }) => void) => () => void
}

export interface ExtensionCommandContribution {
  command: string
  title: string
  category?: string
  icon?: string
}

export interface ExtensionManifest {
  name: string
  displayName?: string
  version: string
  publisher: string
  description?: string
  main?: string
  engines?: { vscode?: string; maestro?: string }
  activationEvents?: string[]
  contributes?: {
    commands?: ExtensionCommandContribution[]
    configuration?: Record<string, any>
    keybindings?: Array<{ command: string; key: string; when?: string }>
    snippets?: Array<{ language: string; path: string }>
    themes?: Array<{ label: string; uiTheme: string; path: string }>
    languages?: Array<{ id: string; extensions?: string[]; aliases?: string[] }>
  }
}

export interface MaestroExtension {
  id: string
  name: string
  displayName: string
  version: string
  publisher: string
  description: string
  path: string
  manifest: ExtensionManifest
  isEnabled: boolean
  isBuiltin: boolean
  state: 'unactivated' | 'activated' | 'error'
  error?: string
}

export interface TestCaseItem {
  id: string
  name: string
  suiteName?: string
  filePath: string
  line: number
  status: 'idle' | 'running' | 'passed' | 'failed' | 'skipped'
  duration?: number
  error?: {
    message: string
    stack?: string
    expected?: string
    actual?: string
  }
}

export interface TestSuiteItem {
  id: string
  name: string
  filePath: string
  line: number
  tests: TestCaseItem[]
  status: 'idle' | 'running' | 'passed' | 'failed' | 'skipped'
  duration?: number
}

export interface TestFileItem {
  id: string
  filePath: string
  fileName: string
  suites: TestSuiteItem[]
  isolatedTests: TestCaseItem[]
  status: 'idle' | 'running' | 'passed' | 'failed' | 'skipped'
  duration?: number
}

export interface TestDiscoveryResult {
  framework: 'vitest' | 'jest' | 'node' | 'pytest' | 'custom'
  files: TestFileItem[]
  totalCount: number
}

export interface TestRunSummary {
  runId: string
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number
  timestamp: number
}

export interface DapBreakpoint {
  id: string
  verified: boolean
  filePath: string
  line: number
  column?: number
  condition?: string
  hitCondition?: string
  logMessage?: string
  message?: string
}

export interface DapStackFrame {
  id: number
  name: string
  source?: {
    name?: string
    path?: string
  }
  line: number
  column: number
  presentationHint?: string
}

export interface DapThread {
  id: number
  name: string
}

export interface DapVariable {
  name: string
  value: string
  type?: string
  variablesReference?: number
  evaluateName?: string
}

export interface DapScope {
  name: string
  variablesReference: number
  expensive: boolean
  variables?: DapVariable[]
}

declare global {
  interface Window {
    maestroAPI: IElectronAPI
  }
}

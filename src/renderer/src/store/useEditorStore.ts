import { create } from 'zustand'
import type {
  FileItem,
  GitStatusResult,
  GitCommit,
  GitCommitDetail,
  GitBlameLine,
  GitStashItem,
  FileSearchResult,
  SearchOptions,
  ShellProfile,
  WorkspaceSettings,
  RecentWorkspace,
  WorkspaceSessionState,
  MaestroTask
} from '../../../preload/index.d'

export interface TerminalSessionInfo {
  id: string
  title: string
  shell?: string
  shellArgs?: string[]
  cwd?: string
  env?: Record<string, string>
  isExited?: boolean
}

export interface OutputChannel {
  id: string
  name: string
  lines: string[]
}

export interface EditorFile {
  path: string
  name: string
  content: string
  isDirty?: boolean
  language?: string
  isPinned?: boolean
  isPreview?: boolean
}

export interface DiagnosticItem {
  id: string
  filePath: string
  fileName: string
  message: string
  severity: 'error' | 'warning' | 'info' | 'hint'
  source?: string
  code?: string | number
  line: number
  column: number
  tags?: number[]
}

export interface LspProgressItem {
  token: string | number
  title: string
  message?: string
  percentage?: number
}

export interface DocumentSymbolItem {
  id: string
  name: string
  detail?: string
  kind: 'class' | 'interface' | 'function' | 'method' | 'variable' | 'constant' | 'enum' | 'struct' | 'property' | 'type'
  range: {
    startLine: number
    startCol: number
    endLine: number
    endCol: number
  }
  children?: DocumentSymbolItem[]
}

export interface DiffSession {
  path: string
  name: string
  original: string
  modified: string
}

export interface ExternalFileConflict {
  filePath: string
  fileName: string
  diskContent: string
}

export interface NavHistoryEntry {
  filePath: string
  line: number
  column: number
}

export type LayoutMode = 'editor' | 'project' | 'split'

export interface WorkspaceEditFileItem {
  uri: string
  filePath: string
  fileName: string
  editsCount: number
  kind?: 'edit' | 'create' | 'delete' | 'rename'
  diffPreview?: string
}

export interface WorkspaceEditPendingSession {
  edit: any
  summary: {
    filesCount: number
    totalEdits: number
    hasDeletions: boolean
    hasCreations: boolean
    affectedFiles: WorkspaceEditFileItem[]
  }
  resolve: (applied: boolean) => void
}

export interface ThreeWayMergeSession {
  filePath: string
  fileName: string
  content: string
}

interface EditorState {
  workspacePath: string | null
  fileTree: FileItem[]
  openFiles: EditorFile[]
  activeFilePath: string | null
  layoutMode: LayoutMode
  isZenMode: boolean
  isSidebarOpen: boolean
  activeSidebarTab: 'files' | 'search' | 'git' | 'debug' | 'tests' | 'extensions'
  cursorPosition: { line: number; col: number }
  statusMessage: string
  lspStatus: 'idle' | 'ready' | 'syncing'
  lspProgress: LspProgressItem | null
  setLspProgress: (progress: LspProgressItem | null) => void
  focusTask: { id: string; title: string } | null
  diagnostics: DiagnosticItem[]
  diagnosticFilter: 'all' | 'error' | 'warning' | 'info'
  diagnosticSearchQuery: string
  activeBottomTab: 'terminal' | 'problems' | 'output' | 'history' | 'debug' | 'tests'
  outputChannels: OutputChannel[]
  activeOutputChannelId: string
  appendOutput: (channelId: string, line: string) => void
  clearOutput: (channelId: string) => void
  setActiveOutputChannelId: (channelId: string) => void
  isBottomDeckOpen: boolean

  // Document Symbols & Outline
  documentSymbols: DocumentSymbolItem[]
  activeSymbol: DocumentSymbolItem | null
  setDocumentSymbols: (symbols: DocumentSymbolItem[]) => void
  updateActiveSymbolForPosition: (line: number, col: number) => void

  // Git state
  gitStatus: GitStatusResult
  availableBranches: string[]
  diffSession: DiffSession | null
  gitHistory: GitCommit[]
  activeCommitDetail: GitCommitDetail | null
  gitStashes: GitStashItem[]
  fileBlames: Record<string, GitBlameLine[]>
  activeBlameInfo: GitBlameLine | null
  isHistoryLoading: boolean
  historySearchQuery: string

  // Git granular actions
  stageFile: (filePath: string) => Promise<void>
  unstageFile: (filePath: string) => Promise<void>
  stageAllFiles: () => Promise<void>
  unstageAllFiles: () => Promise<void>
  discardFileChanges: (filePath: string) => Promise<void>
  discardAllChanges: () => Promise<boolean>
  fetchAvailableBranches: () => Promise<void>
  checkoutBranch: (branchName: string, options?: { force?: boolean; autostash?: boolean }) => Promise<void>
  renameBranch: (oldName: string, newName: string) => Promise<{ ok: boolean; message: string }>
  publishBranch: (branchName: string) => Promise<{ ok: boolean; message: string }>
  abortMerge: () => Promise<void>
  continueMerge: () => Promise<void>
  mergeBranch: (branchName: string) => Promise<{ ok: boolean; conflict?: boolean; message: string }>
  rebaseBranch: (branchName: string) => Promise<{ ok: boolean; conflict?: boolean; message: string }>
  fetchGitHistory: (filePath?: string) => Promise<void>
  fetchCommitDetail: (hash: string) => Promise<void>
  closeCommitDetail: () => void
  setHistorySearchQuery: (query: string) => void
  fetchGitStashes: () => Promise<void>
  gitStashSave: (message?: string) => Promise<boolean>
  gitStashPop: (index?: number) => Promise<boolean>
  gitStashApply: (index?: number) => Promise<boolean>
  gitStashDrop: (index?: number) => Promise<boolean>
  gitFetch: () => Promise<boolean>
  gitTags: string[]
  fetchGitTags: () => Promise<void>
  gitCreateTag: (tagName: string, message?: string) => Promise<boolean>
  gitDeleteTag: (tagName: string) => Promise<boolean>
  gitCheckoutTag: (tagName: string) => Promise<boolean>
  gitRevert: (hash: string) => Promise<boolean>
  gitCherryPick: (hash: string) => Promise<boolean>
  gitReset: (mode: 'soft' | 'mixed' | 'hard', target?: string) => Promise<boolean>
  fetchGitBlame: (filePath: string) => Promise<void>
  updateActiveBlame: (line: number) => void
  loadTsConfig: () => Promise<void>

  // External File Conflict
  externalFileConflict: ExternalFileConflict | null
  setExternalFileConflict: (conflict: ExternalFileConflict | null) => void
  reloadFileFromDisk: (filePath: string) => Promise<void>
  compareFileWithDisk: (filePath: string) => Promise<void>
  dismissExternalFileConflict: () => void

  // Global Search state
  globalSearchQuery: string
  globalReplaceQuery: string
  globalSearchResults: FileSearchResult[]
  isSearching: boolean
  searchOptions: SearchOptions
  replaceInFile: (filePath: string) => Promise<void>
  replaceMatch: (filePath: string, line: number, column: number, matchText: string) => Promise<void>
  jumpToNextSearchResult: () => void
  jumpToPrevSearchResult: () => void

  // Settings state (.vscode/settings.json)
  editorSettings: WorkspaceSettings
  isSettingsModalOpen: boolean
  toggleSettingsModal: () => void
  setSettingsModalOpen: (open: boolean) => void
  isKeyboardShortcutsOpen: boolean
  toggleKeyboardShortcuts: () => void
  setKeyboardShortcutsOpen: (open: boolean) => void
  pendingWorkspaceEdit: WorkspaceEditPendingSession | null
  setPendingWorkspaceEdit: (session: WorkspaceEditPendingSession | null) => void
  confirmPendingWorkspaceEdit: () => void
  cancelPendingWorkspaceEdit: () => void
  threeWayMergeSession: ThreeWayMergeSession | null
  openThreeWayMerge: (filePath: string) => Promise<void>
  closeThreeWayMerge: () => void
  loadWorkspaceSettings: (workspacePath: string) => Promise<void>
  updateEditorSettings: (settings: Partial<WorkspaceSettings>) => Promise<void>

  // Navigation History (Go Back / Go Forward)
  navHistory: NavHistoryEntry[]
  navHistoryIndex: number
  pushNavHistory: (entry: NavHistoryEntry) => void
  navigateBack: () => Promise<void>
  navigateForward: () => Promise<void>

  // Terminal multi-session state
  terminalSessions: TerminalSessionInfo[]
  activeTerminalId: string
  availableShells: ShellProfile[]

  fetchAvailableShells: () => Promise<void>
  addTerminalSession: (
    shellProfile?: ShellProfile,
    cwd?: string,
    env?: Record<string, string>,
    shellArgs?: string[]
  ) => string
  closeTerminalSession: (id: string) => void
  renameTerminalSession: (id: string, newTitle: string) => void
  restartTerminalSession: (id: string) => void
  setTerminalSessionExited: (id: string, isExited: boolean) => void
  setActiveTerminalId: (id: string) => void
  terminalSplitMode: 'none' | 'horizontal' | 'vertical'
  splitTerminalId: string | null
  toggleTerminalSplit: (direction?: 'horizontal' | 'vertical') => void
  closeTerminalSplit: () => void
  setSplitTerminalId: (id: string | null) => void
  moveTerminalToGroup: (targetId: string, group: 'primary' | 'secondary') => void
  isTerminalSearchOpen: boolean
  toggleTerminalSearch: (open?: boolean) => void

  // Editor Groups and Split Editor
  editorSplitMode: 'none' | 'vertical' | 'horizontal'
  activeEditorGroup: 1 | 2
  group1FilePaths: string[]
  group2FilePaths: string[]
  group1ActiveFilePath: string | null
  group2ActiveFilePath: string | null
  splitEditor: (direction: 'vertical' | 'horizontal') => void
  closeEditorSplit: () => void
  focusEditorGroup: (group: 1 | 2) => void
  setActiveFileInGroup: (group: 1 | 2, filePath: string) => void
  closeFileInGroup: (group: 1 | 2, filePath: string) => void
  closeOtherFilesInGroup: (group: 1 | 2, filePath: string) => void
  closeFilesToRightInGroup: (group: 1 | 2, filePath: string) => void
  closeSavedFilesInGroup: (group: 1 | 2) => void
  closeAllFilesInGroup: (group: 1 | 2) => void
  moveActiveEditorToOtherGroup: () => void
  moveTabToGroup: (filePath: string, targetGroup: 1 | 2) => void
  reorderFilesInGroup: (group: 1 | 2, fromIndex: number, toIndex: number) => void

  // Tasks
  workspaceTasks: MaestroTask[]
  fetchWorkspaceTasks: () => Promise<MaestroTask[]>
  runTask: (task: MaestroTask) => Promise<void>
  runBuildTask: () => Promise<void>
  runTestTask: () => Promise<void>

  setWorkspacePath: (path: string | null) => void
  openWorkspace: (path: string) => Promise<void>
  openWorkspaceFile: (filePath: string) => Promise<void>
  saveWorkspaceAsFile: (filePath: string) => Promise<void>
  recentWorkspaces: RecentWorkspace[]
  recentFiles: string[]
  searchHistory: string[]
  closedFilesHistory: EditorFile[]
  isWorkspaceTrusted: boolean
  workspaceFolders: Array<{ path: string; name: string }>
  fetchRecentWorkspaces: () => Promise<void>
  removeRecentWorkspace: (path: string) => Promise<void>
  clearRecentWorkspaces: () => Promise<void>
  toggleWorkspaceTrust: () => Promise<void>
  addWorkspaceFolder: (folderPath: string) => Promise<void>
  removeWorkspaceFolder: (folderPath: string) => Promise<void>
  createWorkspaceBackup: () => Promise<string | null>
  restoreWorkspaceBackup: (backupFileName: string) => Promise<boolean>
  saveSessionState: () => Promise<void>
  restoreSessionState: (path: string) => Promise<void>
  reopenClosedFile: () => Promise<void>
  addToSearchHistory: (query: string) => void
  makeFilePermanent: (filePath: string) => void
  setFileTree: (tree: FileItem[]) => void
  openFile: (file: { path: string; name: string; content: string; isPreview?: boolean }) => void
  closeFile: (filePath: string) => void
  closeOtherFiles: (filePath: string) => void
  closeFilesToRight: (filePath: string) => void
  closeSavedFiles: () => void
  closeAllFiles: () => void
  togglePinFile: (filePath: string) => void
  nextEditor: () => void
  previousEditor: () => void
  reorderOpenFiles: (fromIndex: number, toIndex: number) => void
  setActiveFile: (filePath: string) => void
  updateFileContent: (filePath: string, content: string) => void
  markFileSaved: (filePath: string) => void
  setLayoutMode: (mode: LayoutMode) => void
  toggleZenMode: () => void
  toggleSidebar: () => void
  setActiveSidebarTab: (tab: 'files' | 'search' | 'git' | 'debug' | 'tests' | 'extensions') => void
  setCursorPosition: (line: number, col: number) => void
  setStatusMessage: (msg: string) => void
  setLspStatus: (status: 'idle' | 'ready' | 'syncing') => void
  setFocusTask: (task: { id: string; title: string } | null) => void
  setDiagnostics: (items: DiagnosticItem[]) => void
  setDiagnosticFilter: (filter: 'all' | 'error' | 'warning' | 'info') => void
  setDiagnosticSearchQuery: (query: string) => void
  jumpToNextProblem: () => Promise<void>
  jumpToPrevProblem: () => Promise<void>
  setActiveBottomTab: (tab: 'terminal' | 'problems' | 'output' | 'history' | 'debug' | 'tests') => void
  toggleBottomDeck: () => void
  setBottomDeckOpen: (open: boolean) => void

  // Git actions
  setGitStatus: (status: GitStatusResult) => void
  openDiff: (diff: DiffSession) => void
  closeDiff: () => void
  refreshGitStatus: () => Promise<void>

  // Global Search actions
  setGlobalSearchQuery: (query: string) => void
  setGlobalReplaceQuery: (query: string) => void
  setSearchOptions: (options: Partial<SearchOptions>) => void
  executeGlobalSearch: () => Promise<void>
  cancelGlobalSearch: () => Promise<void>
  executeGlobalReplace: () => Promise<void>
}

function findSymbolAtPosition(
  symbols: DocumentSymbolItem[],
  line: number
): DocumentSymbolItem | null {
  for (const sym of symbols) {
    if (line >= sym.range.startLine && line <= sym.range.endLine) {
      if (sym.children && sym.children.length > 0) {
        const deeper = findSymbolAtPosition(sym.children, line)
        if (deeper) return deeper
      }
      return sym
    }
  }
  return null
}

function detectLanguage(fileName: string, associations?: Record<string, string>): string {
  if (associations && typeof associations === 'object') {
    const baseName = fileName.split(/[\\/]/).pop() || fileName
    for (const [pattern, lang] of Object.entries(associations)) {
      if (!pattern || !lang) continue
      if (pattern === baseName) return lang
      if (pattern.includes('*')) {
        const regexStr = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
        try {
          if (new RegExp(regexStr, 'i').test(baseName)) {
            return lang
          }
        } catch {
          // ignore invalid pattern
        }
      }
    }
  }

  const base = (fileName.split(/[\\/]/).pop() || fileName).toLowerCase()
  if (base === 'dockerfile') return 'dockerfile'
  if (base.startsWith('.env')) return 'ini'

  const ext = base.split('.').pop() || ''
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'cts':
    case 'mts':
      return 'typescript'
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript'
    case 'json':
    case 'jsonc':
    case 'json5':
      return 'json'
    case 'html':
    case 'htm':
      return 'html'
    case 'css':
      return 'css'
    case 'scss':
    case 'sass':
      return 'scss'
    case 'less':
      return 'less'
    case 'md':
    case 'markdown':
      return 'markdown'
    case 'py':
    case 'pyw':
    case 'pyi':
      return 'python'
    case 'go':
      return 'go'
    case 'rs':
      return 'rust'
    case 'c':
    case 'h':
      return 'c'
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'hh':
    case 'hxx':
      return 'cpp'
    case 'cs':
      return 'csharp'
    case 'java':
      return 'java'
    case 'kt':
    case 'kts':
      return 'kotlin'
    case 'swift':
      return 'swift'
    case 'php':
      return 'php'
    case 'rb':
      return 'ruby'
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'shell'
    case 'ps1':
    case 'psm1':
      return 'powershell'
    case 'yaml':
    case 'yml':
      return 'yaml'
    case 'xml':
    case 'svg':
      return 'xml'
    case 'sql':
      return 'sql'
    case 'lua':
      return 'lua'
    case 'ini':
    case 'conf':
    case 'properties':
      return 'ini'
    case 'graphql':
    case 'gql':
      return 'graphql'
    case 'diff':
    case 'patch':
      return 'diff'
    default:
      return 'plaintext'
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  workspacePath: null,
  workspaceFolders: [],
  fileTree: [],
  openFiles: [],
  activeFilePath: null,
  layoutMode: 'split',
  isZenMode: false,
  isSidebarOpen: true,
  activeSidebarTab: 'files',
  cursorPosition: { line: 1, col: 1 },
  statusMessage: 'Workspace initialized',
  lspStatus: 'ready',
  lspProgress: null,
  focusTask: null,
  diagnostics: [],
  diagnosticFilter: 'all',
  diagnosticSearchQuery: '',
  activeBottomTab: 'terminal',
  isBottomDeckOpen: false,
  outputChannels: [
    { id: 'tasks', name: 'Tasks', lines: ['[Tasks Output Channel Initialized]'] },
    { id: 'git', name: 'Git', lines: ['[Git Output Channel Initialized]'] },
    { id: 'lsp', name: 'Language Server (LSP)', lines: ['[LSP Output Channel Initialized]'] },
    { id: 'general', name: 'General', lines: ['[Maestro General Diagnostics Channel Initialized]'] }
  ],
  activeOutputChannelId: 'tasks',

  appendOutput: (channelId: string, line: string) => {
    set((state) => ({
      outputChannels: state.outputChannels.map((c) =>
        c.id === channelId ? { ...c, lines: [...c.lines, line] } : c
      )
    }))
  },

  clearOutput: (channelId: string) => {
    set((state) => ({
      outputChannels: state.outputChannels.map((c) =>
        c.id === channelId ? { ...c, lines: [] } : c
      )
    }))
  },

  setActiveOutputChannelId: (activeOutputChannelId: string) => set({ activeOutputChannelId }),

  // Editor Groups and Split Editor
  editorSplitMode: 'none',
  activeEditorGroup: 1,
  group1FilePaths: [],
  group2FilePaths: [],
  group1ActiveFilePath: null,
  group2ActiveFilePath: null,

  // Multi-terminal sessions
  terminalSessions: [
    { id: 'term-1', title: 'Terminal 1', shell: undefined }
  ],
  activeTerminalId: 'term-1',
  availableShells: [],
  terminalSplitMode: 'none',
  splitTerminalId: null,
  isTerminalSearchOpen: false,
  workspaceTasks: [],

  // Settings
  editorSettings: {
    tabSize: 2,
    fontSize: 14,
    wordWrap: 'on',
    formatOnSave: true,
    minimap: false,
    lineNumbers: 'on',
    insertSpaces: true,
    filesExclude: {
      '**/.git': true,
      '**/node_modules': true,
      '**/dist': true,
      '**/out': true
    }
  },
  isSettingsModalOpen: false,
  isKeyboardShortcutsOpen: false,
  pendingWorkspaceEdit: null,
  threeWayMergeSession: null,

  documentSymbols: [],
  activeSymbol: null,

  gitStatus: { branch: 'main', files: [], staged: [], unstaged: [], untracked: [], conflicts: [], isMerging: false },
  availableBranches: ['main'],
  diffSession: null,
  gitHistory: [],
  activeCommitDetail: null,
  gitStashes: [],
  gitTags: [],
  fileBlames: {},
  activeBlameInfo: null,
  isHistoryLoading: false,
  historySearchQuery: '',
  externalFileConflict: null,

  globalSearchQuery: '',
  globalReplaceQuery: '',
  globalSearchResults: [],
  isSearching: false,
  searchOptions: {
    isCaseSensitive: false,
    isWholeWord: false,
    isRegex: false
  },

  recentWorkspaces: [],
  recentFiles: [],
  searchHistory: [],
  closedFilesHistory: [],
  isWorkspaceTrusted: true,
  navHistory: [],
  navHistoryIndex: -1,

  pushNavHistory: (entry) => {
    const { navHistory, navHistoryIndex } = get()
    if (navHistoryIndex >= 0 && navHistory[navHistoryIndex]) {
      const current = navHistory[navHistoryIndex]
      if (
        current.filePath === entry.filePath &&
        Math.abs(current.line - entry.line) <= 2
      ) {
        return
      }
    }

    const trimmed = navHistory.slice(0, navHistoryIndex + 1)
    const nextList = [...trimmed, entry].slice(-50)
    set({
      navHistory: nextList,
      navHistoryIndex: nextList.length - 1
    })
  },

  navigateBack: async () => {
    const { navHistory, navHistoryIndex, openFiles, openFile, setActiveFile, setCursorPosition, setStatusMessage } = get()
    if (navHistoryIndex <= 0) {
      setStatusMessage('At earliest navigation point')
      setTimeout(() => setStatusMessage('Ready'), 1500)
      return
    }
    const prevIndex = navHistoryIndex - 1
    const target = navHistory[prevIndex]
    if (!target) return

    const isAlreadyOpen = openFiles.some((f) => f.path === target.filePath)
    if (!isAlreadyOpen) {
      try {
        const content = await window.maestroAPI.readFile(target.filePath)
        const name = target.filePath.split(/[\\/]/).pop() || 'file'
        openFile({ path: target.filePath, name, content })
      } catch (err) {
        console.error('Failed to open file on nav back:', err)
        return
      }
    } else {
      setActiveFile(target.filePath)
    }

    setCursorPosition(target.line, target.column)
    set({ navHistoryIndex: prevIndex })
    window.dispatchEvent(
      new CustomEvent('editor-reveal-line', {
        detail: { line: target.line, col: target.column }
      })
    )
  },

  navigateForward: async () => {
    const { navHistory, navHistoryIndex, openFiles, openFile, setActiveFile, setCursorPosition, setStatusMessage } = get()
    if (navHistoryIndex >= navHistory.length - 1) {
      setStatusMessage('At latest navigation point')
      setTimeout(() => setStatusMessage('Ready'), 1500)
      return
    }
    const nextIndex = navHistoryIndex + 1
    const target = navHistory[nextIndex]
    if (!target) return

    const isAlreadyOpen = openFiles.some((f) => f.path === target.filePath)
    if (!isAlreadyOpen) {
      try {
        const content = await window.maestroAPI.readFile(target.filePath)
        const name = target.filePath.split(/[\\/]/).pop() || 'file'
        openFile({ path: target.filePath, name, content })
      } catch (err) {
        console.error('Failed to open file on nav forward:', err)
        return
      }
    } else {
      setActiveFile(target.filePath)
    }

    setCursorPosition(target.line, target.column)
    set({ navHistoryIndex: nextIndex })
    window.dispatchEvent(
      new CustomEvent('editor-reveal-line', {
        detail: { line: target.line, col: target.column }
      })
    )
  },

  fetchRecentWorkspaces: async () => {
    try {
      const recents = await window.maestroAPI.getRecentWorkspaces()
      set({ recentWorkspaces: recents || [] })
    } catch {
      // ignore
    }
  },

  openWorkspace: async (path: string) => {
    if (!path) return
    set({ workspacePath: path })
    try {
      const entries = await window.maestroAPI.readDirectory(path)
      set({ fileTree: entries })
      const recents = await window.maestroAPI.addRecentWorkspace(path)
      set({ recentWorkspaces: recents || [] })
      const trusted = await window.maestroAPI.isWorkspaceTrusted(path)
      set({ isWorkspaceTrusted: trusted })
      get().refreshGitStatus()
      get().loadWorkspaceSettings(path)
      get().fetchWorkspaceTasks()

      // Synchronize project metadata for opened workspace
      try {
        const { useProjectStore } = await import('./useProjectStore')
        const proj = await window.maestroAPI.loadProjectData(path)
        if (proj) {
          useProjectStore.getState().setProjectData(proj)
        }
      } catch (projErr) {
        console.warn('Failed to load project metadata on openWorkspace:', projErr)
      }

      await get().restoreSessionState(path)

      // Start TypeScript Language Server for opened workspace
      import('../services/lspClient')
        .then(({ lspClient }) => {
          lspClient.startServer('ts-server', 'npx', ['typescript-language-server', '--stdio'], path)
        })
        .catch(() => {})
    } catch (e) {
      console.error('Failed to open workspace:', e)
    }
  },

  openWorkspaceFile: async (filePath: string) => {
    if (!filePath) return
    try {
      const data = await window.maestroAPI.parseCodeWorkspace(filePath)
      if (data && data.resolvedFolders && data.resolvedFolders.length > 0) {
        await get().openWorkspace(data.resolvedFolders[0])
        if (data.settings && Object.keys(data.settings).length > 0) {
          await get().updateEditorSettings(data.settings)
        }
        get().setStatusMessage(`Opened workspace from ${filePath.split(/[\\/]/).pop()}`)
      }
    } catch (e: any) {
      console.error('Failed to open code-workspace:', e)
      get().setStatusMessage(`Failed to open workspace: ${e?.message || e}`)
    }
  },

  saveWorkspaceAsFile: async (filePath: string) => {
    const { workspacePath, editorSettings } = get()
    if (!workspacePath) return
    try {
      const ok = await window.maestroAPI.saveCodeWorkspace(filePath, [workspacePath], editorSettings)
      if (ok) {
        get().setStatusMessage(`Saved workspace to ${filePath.split(/[\\/]/).pop()}`)
      }
    } catch (e: any) {
      get().setStatusMessage(`Failed to save workspace file: ${e?.message || e}`)
    }
  },

  removeRecentWorkspace: async (path: string) => {
    try {
      const updated = await window.maestroAPI.removeRecentWorkspace(path)
      set({ recentWorkspaces: updated || [] })
    } catch {
      // ignore
    }
  },

  clearRecentWorkspaces: async () => {
    try {
      await window.maestroAPI.clearRecentWorkspaces()
      set({ recentWorkspaces: [] })
    } catch {
      // ignore
    }
  },

  toggleWorkspaceTrust: async () => {
    const { workspacePath, isWorkspaceTrusted } = get()
    if (!workspacePath) return
    const next = !isWorkspaceTrusted
    await window.maestroAPI.setWorkspaceTrusted(workspacePath, next)
    set({ isWorkspaceTrusted: next })
  },

  addWorkspaceFolder: async (folderPath: string) => {
    const { workspaceFolders, workspacePath } = get()
    const folderName = folderPath.split(/[\\/]/).pop() || folderPath
    if (workspaceFolders.some((f) => f.path.toLowerCase() === folderPath.toLowerCase())) {
      return
    }
    const updated = [...workspaceFolders, { path: folderPath, name: folderName }]
    set({ workspaceFolders: updated })
    import('../services/lspClient')
      .then(({ lspClient }) => {
        lspClient.updateWorkspaceFolders([{ uri: folderPath, name: folderName }], [])
      })
      .catch(() => {})
    if (workspacePath) {
      await get().saveSessionState()
    }
    get().setStatusMessage(`Added workspace folder: ${folderName}`)
    setTimeout(() => get().setStatusMessage('Ready'), 2000)
  },

  removeWorkspaceFolder: async (folderPath: string) => {
    const { workspaceFolders, workspacePath } = get()
    const target = workspaceFolders.find(
      (f) => f.path.toLowerCase() === folderPath.toLowerCase()
    )
    if (!target) return
    const updated = workspaceFolders.filter(
      (f) => f.path.toLowerCase() !== folderPath.toLowerCase()
    )
    set({ workspaceFolders: updated })
    import('../services/lspClient')
      .then(({ lspClient }) => {
        lspClient.updateWorkspaceFolders([], [{ uri: target.path, name: target.name }])
      })
      .catch(() => {})
    if (workspacePath) {
      await get().saveSessionState()
    }
    get().setStatusMessage(`Removed workspace folder: ${target.name}`)
    setTimeout(() => get().setStatusMessage('Ready'), 2000)
  },

  createWorkspaceBackup: async () => {
    const { workspacePath } = get()
    if (!workspacePath) return null
    try {
      const backupName = await window.maestroAPI.createWorkspaceBackup(workspacePath)
      get().setStatusMessage(`Created workspace backup: ${backupName}`)
      setTimeout(() => get().setStatusMessage('Ready'), 3000)
      return backupName
    } catch (err: any) {
      get().setStatusMessage(`Backup failed: ${err?.message || err}`)
      return null
    }
  },

  restoreWorkspaceBackup: async (backupFileName: string) => {
    const { workspacePath } = get()
    if (!workspacePath) return false
    try {
      const ok = await window.maestroAPI.restoreWorkspaceBackup(workspacePath, backupFileName)
      if (ok) {
        await get().restoreSessionState(workspacePath)
        get().setStatusMessage(`Restored workspace backup: ${backupFileName}`)
        setTimeout(() => get().setStatusMessage('Ready'), 3000)
      }
      return ok
    } catch (err: any) {
      get().setStatusMessage(`Restore failed: ${err?.message || err}`)
      return false
    }
  },

  saveSessionState: async () => {
    const {
      workspacePath,
      openFiles,
      activeFilePath,
      layoutMode,
      editorSplitMode,
      group1FilePaths,
      group2FilePaths,
      group1ActiveFilePath,
      group2ActiveFilePath,
      activeEditorGroup
    } = get()
    if (!workspacePath) return
    try {
      await window.maestroAPI.saveWorkspaceSessionState(workspacePath, {
        openFiles: openFiles.map((f) => ({ path: f.path, name: f.name, isPinned: f.isPinned })),
        activeFilePath,
        layoutMode,
        editorSplitMode,
        group1FilePaths,
        group2FilePaths,
        group1ActiveFilePath,
        group2ActiveFilePath,
        activeEditorGroup,
        workspaceFolders: get().workspaceFolders,
        terminalTabs: get().terminalSessions.map((s) => ({
          id: s.id,
          title: s.title,
          shell: s.shell,
          cwd: s.cwd
        })),
        activeTerminalId: get().activeTerminalId,
        terminalSplitMode: get().terminalSplitMode
      })
    } catch {
      // ignore
    }
  },

  restoreSessionState: async (path: string) => {
    try {
      const state = await window.maestroAPI.loadWorkspaceSessionState(path)
      if (state && Array.isArray(state.terminalTabs) && state.terminalTabs.length > 0) {
        set({
          terminalSessions: state.terminalTabs.map((t) => ({
            id: t.id,
            title: t.title,
            shell: t.shell,
            cwd: t.cwd
          })),
          activeTerminalId: state.activeTerminalId || state.terminalTabs[0].id,
          terminalSplitMode: state.terminalSplitMode || 'none'
        })
      }
      if (state && Array.isArray(state.workspaceFolders)) {
        set({ workspaceFolders: state.workspaceFolders })
        import('../services/lspClient')
          .then(({ lspClient }) => {
            lspClient.updateWorkspaceFolders(
              state.workspaceFolders!.map((f) => ({ uri: f.path, name: f.name })),
              []
            )
          })
          .catch(() => {})
      }
      if (state && Array.isArray(state.openFiles) && state.openFiles.length > 0) {
        const loadedFiles: EditorFile[] = []
        for (const f of state.openFiles) {
          try {
            const content = await window.maestroAPI.readFile(f.path)
            loadedFiles.push({
              path: f.path,
              name: f.name,
              content,
              isDirty: false,
              isPinned: !!f.isPinned,
              language: detectLanguage(f.name, state.settings?.filesAssociations)
            })
          } catch {
            // ignore
          }
        }
        if (loadedFiles.length > 0) {
          const loadedPaths = loadedFiles.map((f) => f.path)
          const g1Paths =
            state.group1FilePaths && state.group1FilePaths.length > 0
              ? state.group1FilePaths.filter((p) => loadedPaths.includes(p))
              : loadedPaths
          const g2Paths =
            state.group2FilePaths && state.group2FilePaths.length > 0
              ? state.group2FilePaths.filter((p) => loadedPaths.includes(p))
              : []
          const splitMode =
            state.editorSplitMode && g2Paths.length > 0 ? state.editorSplitMode : 'none'
          const activeGroup = state.activeEditorGroup || 1
          const g1Active =
            state.group1ActiveFilePath && loadedPaths.includes(state.group1ActiveFilePath)
              ? state.group1ActiveFilePath
              : g1Paths[0] || loadedPaths[0]
          const g2Active =
            state.group2ActiveFilePath && loadedPaths.includes(state.group2ActiveFilePath)
              ? state.group2ActiveFilePath
              : g2Paths[0] || null

          set({
            openFiles: loadedFiles,
            group1FilePaths: g1Paths,
            group2FilePaths: g2Paths,
            editorSplitMode: splitMode,
            activeEditorGroup: activeGroup,
            group1ActiveFilePath: g1Active,
            group2ActiveFilePath: g2Active,
            activeFilePath: activeGroup === 2 && g2Active ? g2Active : g1Active,
            layoutMode: state.layoutMode || get().layoutMode
          })
        }
      }
    } catch {
      // ignore
    }
  },

  setWorkspacePath: (path) => {
    set({ workspacePath: path })
    if (path) {
      window.maestroAPI?.addRecentWorkspace(path).then((recents) => set({ recentWorkspaces: recents || [] }))
      window.maestroAPI?.isWorkspaceTrusted(path).then((trusted) => set({ isWorkspaceTrusted: trusted }))
      get().refreshGitStatus()
      get().loadWorkspaceSettings(path)
      get().restoreSessionState(path)
    }
  },
  setFileTree: (tree) => set({ fileTree: tree }),

  openFile: ({ path, name, content, isPreview }) => {
    const {
      openFiles,
      layoutMode,
      recentFiles,
      editorSplitMode,
      activeEditorGroup,
      group1FilePaths,
      group2FilePaths,
      group1ActiveFilePath,
      group2ActiveFilePath
    } = get()
    const existingIndex = openFiles.findIndex((f) => f.path === path)
    const updatedRecents = [path, ...recentFiles.filter((p) => p !== path)].slice(0, 30)

    let updatedFiles = [...openFiles]
    if (existingIndex >= 0) {
      const existing = openFiles[existingIndex]
      if (!isPreview && existing.isPreview) {
        updatedFiles[existingIndex] = { ...existing, isPreview: false }
      }
    } else {
      const newFile: EditorFile = {
        path,
        name,
        content,
        isDirty: false,
        isPreview: !!isPreview,
        language: detectLanguage(name, get().settings?.filesAssociations)
      }

      if (isPreview) {
        const previewIdx = updatedFiles.findIndex((f) => f.isPreview && !f.isDirty && !f.isPinned)
        if (previewIdx >= 0) {
          updatedFiles[previewIdx] = newFile
        } else {
          updatedFiles.push(newFile)
        }
      } else {
        updatedFiles.push(newFile)
      }
    }

    const targetGroup = editorSplitMode !== 'none' ? activeEditorGroup : 1
    const nextGroup1 =
      targetGroup === 1
        ? group1FilePaths.includes(path)
          ? group1FilePaths
          : [...group1FilePaths, path]
        : group1FilePaths.length === 0
        ? [path]
        : group1FilePaths
    const nextGroup2 =
      targetGroup === 2
        ? group2FilePaths.includes(path)
          ? group2FilePaths
          : [...group2FilePaths, path]
        : group2FilePaths

    set({
      openFiles: updatedFiles,
      group1FilePaths: nextGroup1,
      group2FilePaths: nextGroup2,
      group1ActiveFilePath: targetGroup === 1 ? path : group1ActiveFilePath || path,
      group2ActiveFilePath: targetGroup === 2 ? path : group2ActiveFilePath,
      activeFilePath: path,
      diffSession: null,
      recentFiles: updatedRecents,
      layoutMode: layoutMode === 'project' ? 'split' : layoutMode
    })

    const lang = detectLanguage(name, get().settings?.filesAssociations)
    import('../services/lspClient')
      .then(async ({ lspClient }) => {
        await lspClient.ensureServerForFile(path, lang).catch(() => {})
        lspClient.notifyDocOpen('ts-server', path, lang, content, 1)
      })
      .catch(() => {})

    setTimeout(() => get().saveSessionState(), 100)
  },

  makeFilePermanent: (filePath: string) => {
    const { openFiles } = get()
    set({
      openFiles: openFiles.map((f) =>
        f.path === filePath ? { ...f, isPreview: false } : f
      )
    })
    setTimeout(() => get().saveSessionState(), 100)
  },

  closeFile: (filePath) => {
    const { activeEditorGroup, editorSplitMode } = get()
    if (editorSplitMode !== 'none' && activeEditorGroup === 2) {
      get().closeFileInGroup(2, filePath)
    } else {
      get().closeFileInGroup(1, filePath)
    }
  },

  splitEditor: (direction: 'vertical' | 'horizontal') => {
    const {
      editorSplitMode,
      activeFilePath,
      group1FilePaths,
      group2FilePaths,
      group1ActiveFilePath
    } = get()
    if (editorSplitMode === 'none') {
      const currentPath = activeFilePath || group1ActiveFilePath || group1FilePaths[0] || null
      const nextG2 = currentPath ? [currentPath] : []
      set({
        editorSplitMode: direction,
        group2FilePaths: nextG2,
        group2ActiveFilePath: currentPath,
        activeEditorGroup: 2,
        activeFilePath: currentPath
      })
    } else {
      if (editorSplitMode !== direction) {
        set({ editorSplitMode: direction })
      } else {
        const nextGroup = get().activeEditorGroup === 1 ? 2 : 1
        get().focusEditorGroup(nextGroup)
      }
    }
    setTimeout(() => get().saveSessionState(), 100)
  },

  closeEditorSplit: () => {
    const { group1FilePaths, group2FilePaths, group1ActiveFilePath } = get()
    const mergedG1 = [...group1FilePaths]
    for (const p of group2FilePaths) {
      if (!mergedG1.includes(p)) {
        mergedG1.push(p)
      }
    }
    set({
      editorSplitMode: 'none',
      group1FilePaths: mergedG1,
      group2FilePaths: [],
      group2ActiveFilePath: null,
      activeEditorGroup: 1,
      activeFilePath: group1ActiveFilePath || mergedG1[0] || null
    })
    setTimeout(() => get().saveSessionState(), 100)
  },

  focusEditorGroup: (group: 1 | 2) => {
    const { group1ActiveFilePath, group2ActiveFilePath } = get()
    const targetActive = group === 1 ? group1ActiveFilePath : group2ActiveFilePath
    set({
      activeEditorGroup: group,
      activeFilePath: targetActive
    })
    if (targetActive) {
      get().fetchGitBlame(targetActive)
    }
  },

  setActiveFileInGroup: (group: 1 | 2, filePath: string) => {
    const { recentFiles } = get()
    const updatedRecents = [filePath, ...recentFiles.filter((p) => p !== filePath)].slice(0, 30)
    if (group === 1) {
      set({
        activeEditorGroup: 1,
        group1ActiveFilePath: filePath,
        activeFilePath: filePath,
        diffSession: null,
        recentFiles: updatedRecents
      })
    } else {
      set({
        activeEditorGroup: 2,
        group2ActiveFilePath: filePath,
        activeFilePath: filePath,
        diffSession: null,
        recentFiles: updatedRecents
      })
    }
    get().fetchGitBlame(filePath)
    setTimeout(() => get().saveSessionState(), 100)
  },

  closeFileInGroup: (group: 1 | 2, filePath: string) => {
    const {
      openFiles,
      group1FilePaths,
      group2FilePaths,
      group1ActiveFilePath,
      group2ActiveFilePath,
      closedFilesHistory
    } = get()

    const targetFile = openFiles.find((f) => f.path === filePath)
    const updatedClosed = targetFile
      ? [targetFile, ...closedFilesHistory.filter((f) => f.path !== filePath)].slice(0, 20)
      : closedFilesHistory

    if (group === 1) {
      const nextG1 = group1FilePaths.filter((p) => p !== filePath)
      let nextG1Active = group1ActiveFilePath
      if (group1ActiveFilePath === filePath) {
        nextG1Active = nextG1.length > 0 ? nextG1[nextG1.length - 1] : null
      }

      const stillInG2 = group2FilePaths.includes(filePath)
      const nextOpen = stillInG2 ? openFiles : openFiles.filter((f) => f.path !== filePath)

      if (!stillInG2) {
        import('../services/lspClient')
          .then(({ lspClient }) => lspClient.notifyDocClose('ts-server', filePath))
          .catch(() => {})
      }

      set({
        group1FilePaths: nextG1,
        group1ActiveFilePath: nextG1Active,
        activeFilePath: get().activeEditorGroup === 1 ? nextG1Active : group2ActiveFilePath,
        openFiles: nextOpen,
        closedFilesHistory: updatedClosed,
        diagnostics: stillInG2 ? get().diagnostics : get().diagnostics.filter((d) => d.filePath !== filePath)
      })
    } else {
      const nextG2 = group2FilePaths.filter((p) => p !== filePath)
      let nextG2Active = group2ActiveFilePath
      if (group2ActiveFilePath === filePath) {
        nextG2Active = nextG2.length > 0 ? nextG2[nextG2.length - 1] : null
      }

      const stillInG1 = group1FilePaths.includes(filePath)
      const nextOpen = stillInG1 ? openFiles : openFiles.filter((f) => f.path !== filePath)

      if (!stillInG1) {
        import('../services/lspClient')
          .then(({ lspClient }) => lspClient.notifyDocClose('ts-server', filePath))
          .catch(() => {})
      }

      if (nextG2.length === 0) {
        set({
          editorSplitMode: 'none',
          group2FilePaths: [],
          group2ActiveFilePath: null,
          activeEditorGroup: 1,
          activeFilePath: group1ActiveFilePath,
          openFiles: nextOpen,
          closedFilesHistory: updatedClosed,
          diagnostics: stillInG1 ? get().diagnostics : get().diagnostics.filter((d) => d.filePath !== filePath)
        })
      } else {
        set({
          group2FilePaths: nextG2,
          group2ActiveFilePath: nextG2Active,
          activeFilePath: get().activeEditorGroup === 2 ? nextG2Active : group1ActiveFilePath,
          openFiles: nextOpen,
          closedFilesHistory: updatedClosed,
          diagnostics: stillInG1 ? get().diagnostics : get().diagnostics.filter((d) => d.filePath !== filePath)
        })
      }
    }
    setTimeout(() => get().saveSessionState(), 100)
  },

  closeOtherFilesInGroup: (group: 1 | 2, filePath: string) => {
    const { openFiles, group1FilePaths, group2FilePaths } = get()
    const targetList = group === 1 ? group1FilePaths : group2FilePaths
    const nextList = targetList.filter((p) => {
      if (p === filePath) return true
      const f = openFiles.find((file) => file.path === p)
      return f?.isPinned
    })
    if (group === 1) {
      set({
        group1FilePaths: nextList,
        group1ActiveFilePath: filePath,
        activeFilePath: get().activeEditorGroup === 1 ? filePath : get().activeFilePath
      })
    } else {
      set({
        group2FilePaths: nextList,
        group2ActiveFilePath: filePath,
        activeFilePath: get().activeEditorGroup === 2 ? filePath : get().activeFilePath
      })
    }
    const remainingPaths = new Set([
      ...(group === 1 ? nextList : group1FilePaths),
      ...(group === 2 ? nextList : group2FilePaths)
    ])
    set({ openFiles: openFiles.filter((f) => remainingPaths.has(f.path)) })
    setTimeout(() => get().saveSessionState(), 100)
  },

  closeFilesToRightInGroup: (group: 1 | 2, filePath: string) => {
    const {
      openFiles,
      group1FilePaths,
      group2FilePaths,
      group1ActiveFilePath,
      group2ActiveFilePath
    } = get()
    const targetList = group === 1 ? group1FilePaths : group2FilePaths
    const targetIdx = targetList.indexOf(filePath)
    if (targetIdx === -1) return
    const nextList = targetList.filter((p, idx) => {
      if (idx <= targetIdx) return true
      const f = openFiles.find((file) => file.path === p)
      return f?.isPinned
    })
    if (group === 1) {
      let nextActive = group1ActiveFilePath
      if (nextActive && !nextList.includes(nextActive)) nextActive = filePath
      set({
        group1FilePaths: nextList,
        group1ActiveFilePath: nextActive,
        activeFilePath: get().activeEditorGroup === 1 ? nextActive : get().activeFilePath
      })
    } else {
      let nextActive = group2ActiveFilePath
      if (nextActive && !nextList.includes(nextActive)) nextActive = filePath
      set({
        group2FilePaths: nextList,
        group2ActiveFilePath: nextActive,
        activeFilePath: get().activeEditorGroup === 2 ? nextActive : get().activeFilePath
      })
    }
    const remainingPaths = new Set([
      ...(group === 1 ? nextList : group1FilePaths),
      ...(group === 2 ? nextList : group2FilePaths)
    ])
    set({ openFiles: openFiles.filter((f) => remainingPaths.has(f.path)) })
    setTimeout(() => get().saveSessionState(), 100)
  },

  closeSavedFilesInGroup: (group: 1 | 2) => {
    const {
      openFiles,
      group1FilePaths,
      group2FilePaths,
      group1ActiveFilePath,
      group2ActiveFilePath
    } = get()
    const targetList = group === 1 ? group1FilePaths : group2FilePaths
    const nextList = targetList.filter((p) => {
      const f = openFiles.find((file) => file.path === p)
      return f?.isDirty || f?.isPinned
    })
    if (group === 1) {
      let nextActive = group1ActiveFilePath
      if (nextActive && !nextList.includes(nextActive)) {
        nextActive = nextList.length > 0 ? nextList[nextList.length - 1] : null
      }
      set({
        group1FilePaths: nextList,
        group1ActiveFilePath: nextActive,
        activeFilePath: get().activeEditorGroup === 1 ? nextActive : get().activeFilePath
      })
    } else {
      if (nextList.length === 0) {
        set({
          editorSplitMode: 'none',
          group2FilePaths: [],
          group2ActiveFilePath: null,
          activeEditorGroup: 1,
          activeFilePath: group1ActiveFilePath
        })
      } else {
        let nextActive = group2ActiveFilePath
        if (nextActive && !nextList.includes(nextActive)) {
          nextActive = nextList.length > 0 ? nextList[nextList.length - 1] : null
        }
        set({
          group2FilePaths: nextList,
          group2ActiveFilePath: nextActive,
          activeFilePath: get().activeEditorGroup === 2 ? nextActive : get().activeFilePath
        })
      }
    }
    const remainingPaths = new Set([
      ...(group === 1 ? nextList : group1FilePaths),
      ...(group === 2 ? nextList : group2FilePaths)
    ])
    set({ openFiles: openFiles.filter((f) => remainingPaths.has(f.path)) })
    setTimeout(() => get().saveSessionState(), 100)
  },

  closeAllFilesInGroup: (group: 1 | 2) => {
    const { openFiles, group1FilePaths, group2FilePaths, group1ActiveFilePath } = get()
    const targetList = group === 1 ? group1FilePaths : group2FilePaths
    const nextList = targetList.filter((p) => {
      const f = openFiles.find((file) => file.path === p)
      return f?.isPinned
    })
    if (group === 1) {
      set({
        group1FilePaths: nextList,
        group1ActiveFilePath: nextList.length > 0 ? nextList[0] : null,
        activeFilePath: get().activeEditorGroup === 1 ? nextList[0] ?? null : get().activeFilePath
      })
    } else {
      if (nextList.length === 0) {
        set({
          editorSplitMode: 'none',
          group2FilePaths: [],
          group2ActiveFilePath: null,
          activeEditorGroup: 1,
          activeFilePath: group1ActiveFilePath
        })
      } else {
        set({
          group2FilePaths: nextList,
          group2ActiveFilePath: nextList[0] ?? null,
          activeFilePath: get().activeEditorGroup === 2 ? nextList[0] ?? null : get().activeFilePath
        })
      }
    }
    const remainingPaths = new Set([
      ...(group === 1 ? nextList : group1FilePaths),
      ...(group === 2 ? nextList : group2FilePaths)
    ])
    set({ openFiles: openFiles.filter((f) => remainingPaths.has(f.path)) })
    setTimeout(() => get().saveSessionState(), 100)
  },

  moveActiveEditorToOtherGroup: () => {
    const {
      activeEditorGroup,
      editorSplitMode,
      group1FilePaths,
      group2FilePaths,
      group1ActiveFilePath,
      group2ActiveFilePath
    } = get()

    if (activeEditorGroup === 1) {
      const fileToMove = group1ActiveFilePath
      if (!fileToMove) return

      const nextG1 = group1FilePaths.filter((p) => p !== fileToMove)
      const nextG1Active = nextG1.length > 0 ? nextG1[nextG1.length - 1] : null
      const nextG2 = group2FilePaths.includes(fileToMove)
        ? group2FilePaths
        : [...group2FilePaths, fileToMove]

      set({
        editorSplitMode: editorSplitMode === 'none' ? 'vertical' : editorSplitMode,
        group1FilePaths: nextG1,
        group1ActiveFilePath: nextG1Active,
        group2FilePaths: nextG2,
        group2ActiveFilePath: fileToMove,
        activeEditorGroup: 2,
        activeFilePath: fileToMove
      })
    } else {
      const fileToMove = group2ActiveFilePath
      if (!fileToMove) return

      const nextG2 = group2FilePaths.filter((p) => p !== fileToMove)
      const nextG2Active = nextG2.length > 0 ? nextG2[nextG2.length - 1] : null
      const nextG1 = group1FilePaths.includes(fileToMove)
        ? group1FilePaths
        : [...group1FilePaths, fileToMove]

      if (nextG2.length === 0) {
        set({
          editorSplitMode: 'none',
          group1FilePaths: nextG1,
          group1ActiveFilePath: fileToMove,
          group2FilePaths: [],
          group2ActiveFilePath: null,
          activeEditorGroup: 1,
          activeFilePath: fileToMove
        })
      } else {
        set({
          group2FilePaths: nextG2,
          group2ActiveFilePath: nextG2Active,
          group1FilePaths: nextG1,
          group1ActiveFilePath: fileToMove,
          activeEditorGroup: 1,
          activeFilePath: fileToMove
        })
      }
    }
    setTimeout(() => get().saveSessionState(), 100)
  },

  moveTabToGroup: (filePath: string, targetGroup: 1 | 2) => {
    const { group1FilePaths, group2FilePaths, editorSplitMode } = get()
    if (targetGroup === 2) {
      if (editorSplitMode === 'none') {
        set({ editorSplitMode: 'vertical' })
      }
      const nextG1 = group1FilePaths.filter((p) => p !== filePath)
      const nextG2 = group2FilePaths.includes(filePath)
        ? group2FilePaths
        : [...group2FilePaths, filePath]
      set({
        group1FilePaths: nextG1,
        group2FilePaths: nextG2,
        group2ActiveFilePath: filePath,
        activeEditorGroup: 2,
        activeFilePath: filePath
      })
    } else {
      const nextG2 = group2FilePaths.filter((p) => p !== filePath)
      const nextG1 = group1FilePaths.includes(filePath)
        ? group1FilePaths
        : [...group1FilePaths, filePath]
      if (nextG2.length === 0) {
        set({
          editorSplitMode: 'none',
          group1FilePaths: nextG1,
          group2FilePaths: [],
          group2ActiveFilePath: null,
          group1ActiveFilePath: filePath,
          activeEditorGroup: 1,
          activeFilePath: filePath
        })
      } else {
        set({
          group1FilePaths: nextG1,
          group2FilePaths: nextG2,
          group1ActiveFilePath: filePath,
          activeEditorGroup: 1,
          activeFilePath: filePath
        })
      }
    }
    setTimeout(() => get().saveSessionState(), 100)
  },

  reorderFilesInGroup: (group: 1 | 2, fromIndex: number, toIndex: number) => {
    const { group1FilePaths, group2FilePaths } = get()
    const list = group === 1 ? [...group1FilePaths] : [...group2FilePaths]
    if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return
    const [moved] = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, moved)
    if (group === 1) {
      set({ group1FilePaths: list })
    } else {
      set({ group2FilePaths: list })
    }
    setTimeout(() => get().saveSessionState(), 100)
  },

  reopenClosedFile: async () => {
    const { closedFilesHistory, setStatusMessage } = get()
    if (closedFilesHistory.length === 0) {
      setStatusMessage('No recently closed editors to reopen')
      setTimeout(() => setStatusMessage('Ready'), 1500)
      return
    }

    const [lastClosed, ...rest] = closedFilesHistory
    set({ closedFilesHistory: rest })

    try {
      const content = await window.maestroAPI.readFile(lastClosed.path)
      get().openFile({
        path: lastClosed.path,
        name: lastClosed.name,
        content,
        isPreview: false
      })
      setStatusMessage(`Reopened ${lastClosed.name}`)
      setTimeout(() => setStatusMessage('Ready'), 2000)
    } catch {
      setStatusMessage(`Could not reopen ${lastClosed.name}`)
    }
  },

  addToSearchHistory: (query: string) => {
    if (!query || !query.trim()) return
    const { searchHistory } = get()
    const trimmed = query.trim()
    const filtered = searchHistory.filter((q) => q !== trimmed)
    set({ searchHistory: [trimmed, ...filtered].slice(0, 25) })
  },

  closeOtherFiles: (filePath: string) => {
    const { activeEditorGroup } = get()
    get().closeOtherFilesInGroup(activeEditorGroup, filePath)
  },

  closeFilesToRight: (filePath: string) => {
    const { activeEditorGroup } = get()
    get().closeFilesToRightInGroup(activeEditorGroup, filePath)
  },

  closeSavedFiles: () => {
    const { activeEditorGroup } = get()
    get().closeSavedFilesInGroup(activeEditorGroup)
  },

  closeAllFiles: () => {
    const { activeEditorGroup } = get()
    get().closeAllFilesInGroup(activeEditorGroup)
  },

  togglePinFile: (filePath: string) => {
    const { openFiles } = get()
    const updated = openFiles.map((f) =>
      f.path === filePath ? { ...f, isPinned: !f.isPinned } : f
    )
    const pinned = updated.filter((f) => f.isPinned)
    const unpinned = updated.filter((f) => !f.isPinned)
    set({ openFiles: [...pinned, ...unpinned] })
  },

  nextEditor: () => {
    const {
      activeEditorGroup,
      group1FilePaths,
      group2FilePaths,
      group1ActiveFilePath,
      group2ActiveFilePath
    } = get()
    const paths = activeEditorGroup === 1 ? group1FilePaths : group2FilePaths
    const active = activeEditorGroup === 1 ? group1ActiveFilePath : group2ActiveFilePath
    if (paths.length <= 1) return
    const curIdx = paths.findIndex((p) => p === active)
    const nextIdx = (curIdx + 1) % paths.length
    get().setActiveFileInGroup(activeEditorGroup, paths[nextIdx])
  },

  previousEditor: () => {
    const {
      activeEditorGroup,
      group1FilePaths,
      group2FilePaths,
      group1ActiveFilePath,
      group2ActiveFilePath
    } = get()
    const paths = activeEditorGroup === 1 ? group1FilePaths : group2FilePaths
    const active = activeEditorGroup === 1 ? group1ActiveFilePath : group2ActiveFilePath
    if (paths.length <= 1) return
    const curIdx = paths.findIndex((p) => p === active)
    const prevIdx = (curIdx - 1 + paths.length) % paths.length
    get().setActiveFileInGroup(activeEditorGroup, paths[prevIdx])
  },

  reorderOpenFiles: (fromIndex: number, toIndex: number) => {
    const { activeEditorGroup } = get()
    get().reorderFilesInGroup(activeEditorGroup, fromIndex, toIndex)
  },

  setActiveFile: (filePath) => {
    const { recentFiles, activeEditorGroup, editorSplitMode } = get()
    const updatedRecents = [filePath, ...recentFiles.filter((p) => p !== filePath)].slice(0, 30)
    if (editorSplitMode === 'none' || activeEditorGroup === 1) {
      set({
        activeFilePath: filePath,
        group1ActiveFilePath: filePath,
        diffSession: null,
        recentFiles: updatedRecents
      })
    } else {
      set({
        activeFilePath: filePath,
        group2ActiveFilePath: filePath,
        diffSession: null,
        recentFiles: updatedRecents
      })
    }
    get().fetchGitBlame(filePath)
    setTimeout(() => get().saveSessionState(), 100)
  },

  updateFileContent: (filePath, content) => {
    const { openFiles } = get()
    set({
      openFiles: openFiles.map((file) =>
        file.path === filePath ? { ...file, content, isDirty: true, isPreview: false } : file
      )
    })
    import('../services/lspClient')
      .then(({ lspClient }) => {
        const ver = ((lspClient as any).documentVersions?.get(filePath) || 1) + 1
        lspClient.notifyDocChange('ts-server', filePath, ver, content)
      })
      .catch(() => {})
  },

  markFileSaved: (filePath) => {
    const { openFiles } = get()
    set({
      openFiles: openFiles.map((file) =>
        file.path === filePath ? { ...file, isDirty: false } : file
      )
    })
    import('../services/lspClient')
      .then(({ lspClient }) => {
        lspClient.notifyDocSave('ts-server', filePath)
      })
      .catch(() => {})
    get().refreshGitStatus()
  },

  setLayoutMode: (mode) => set({ layoutMode: mode }),
  toggleZenMode: () => {
    const { isZenMode } = get()
    if (!isZenMode) {
      set({
        isZenMode: true,
        isSidebarOpen: false,
        isBottomDeckOpen: false
      })
      get().setStatusMessage('Zen Mode enabled (Press Ctrl+K Z to exit)')
      setTimeout(() => get().setStatusMessage('Ready'), 2000)
    } else {
      set({
        isZenMode: false,
        isSidebarOpen: true
      })
      get().setStatusMessage('Zen Mode disabled')
      setTimeout(() => get().setStatusMessage('Ready'), 2000)
    }
  },
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab, isSidebarOpen: true }),
  setCursorPosition: (line, col) => {
    set({ cursorPosition: { line, col } })
    get().updateActiveSymbolForPosition(line, col)
    get().updateActiveBlame(line)
  },
  setDocumentSymbols: (documentSymbols) => {
    set({ documentSymbols })
    const { cursorPosition } = get()
    const active = findSymbolAtPosition(documentSymbols, cursorPosition.line)
    set({ activeSymbol: active })
  },
  updateActiveSymbolForPosition: (line, _col) => {
    const { documentSymbols } = get()
    const active = findSymbolAtPosition(documentSymbols, line)
    set({ activeSymbol: active })
  },
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setLspStatus: (lspStatus) => set({ lspStatus }),
  setLspProgress: (lspProgress) => set({ lspProgress }),
  setFocusTask: (focusTask) => set({ focusTask }),
  setDiagnostics: (diagnostics) => set({ diagnostics }),
  setDiagnosticFilter: (diagnosticFilter) => set({ diagnosticFilter }),
  setDiagnosticSearchQuery: (diagnosticSearchQuery) => set({ diagnosticSearchQuery }),

  jumpToNextProblem: async () => {
    const { diagnostics, activeFilePath, cursorPosition, openFile, setActiveFile, setCursorPosition, setBottomDeckOpen, setActiveBottomTab } = get()
    if (diagnostics.length === 0) return

    let nextIndex = diagnostics.findIndex(
      (d) =>
        d.filePath === activeFilePath &&
        (d.line > cursorPosition.line || (d.line === cursorPosition.line && d.column > cursorPosition.col))
    )

    if (nextIndex === -1) {
      nextIndex = 0
    }

    const target = diagnostics[nextIndex]
    try {
      const content = await window.maestroAPI.readFile(target.filePath)
      openFile({ path: target.filePath, name: target.fileName, content })
    } catch {
      setActiveFile(target.filePath)
    }
    setCursorPosition(target.line, target.column)
    setBottomDeckOpen(true)
    setActiveBottomTab('problems')
  },

  jumpToPrevProblem: async () => {
    const { diagnostics, activeFilePath, cursorPosition, openFile, setActiveFile, setCursorPosition, setBottomDeckOpen, setActiveBottomTab } = get()
    if (diagnostics.length === 0) return

    let prevIndex = -1
    for (let i = diagnostics.length - 1; i >= 0; i--) {
      const d = diagnostics[i]
      if (
        d.filePath === activeFilePath &&
        (d.line < cursorPosition.line || (d.line === cursorPosition.line && d.column < cursorPosition.col))
      ) {
        prevIndex = i
        break
      }
    }

    if (prevIndex === -1) {
      prevIndex = diagnostics.length - 1
    }

    const target = diagnostics[prevIndex]
    try {
      const content = await window.maestroAPI.readFile(target.filePath)
      openFile({ path: target.filePath, name: target.fileName, content })
    } catch {
      setActiveFile(target.filePath)
    }
    setCursorPosition(target.line, target.column)
    setBottomDeckOpen(true)
    setActiveBottomTab('problems')
  },

  setActiveBottomTab: (activeBottomTab) => set({ activeBottomTab, isBottomDeckOpen: true }),
  toggleBottomDeck: () => set((state) => ({ isBottomDeckOpen: !state.isBottomDeckOpen })),
  setBottomDeckOpen: (isBottomDeckOpen) => set({ isBottomDeckOpen }),

  setGitStatus: (gitStatus) => set({ gitStatus }),
  openDiff: (diffSession) =>
    set({
      diffSession,
      layoutMode: get().layoutMode === 'project' ? 'split' : get().layoutMode
    }),
  closeDiff: () => set({ diffSession: null }),

  refreshGitStatus: async () => {
    const { workspacePath, activeFilePath } = get()
    if (!workspacePath) return
    try {
      const status = await window.maestroAPI.getGitStatus(workspacePath)
      set({ gitStatus: status })
      await get().fetchAvailableBranches()
      await get().fetchGitStashes()
      await get().fetchGitTags()
      if (activeFilePath) {
        await get().fetchGitBlame(activeFilePath)
      }
    } catch {
      // ignore
    }
  },

  fetchAvailableBranches: async () => {
    const { workspacePath } = get()
    if (!workspacePath) return
    try {
      const branches = await window.maestroAPI.gitGetBranches(workspacePath)
      set({ availableBranches: branches })
    } catch {
      // ignore
    }
  },

  checkoutBranch: async (branchName: string, options?: { force?: boolean; autostash?: boolean }) => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return
    try {
      const res = await window.maestroAPI.gitCheckoutBranch(workspacePath, branchName, options)
      if (res.ok) {
        setStatusMessage(res.message || `Switched to branch '${branchName}'`)
        await refreshGitStatus()
      } else {
        if (res.message.includes('Branch switch blocked')) {
          const autoStash = window.confirm(
            `${res.message}\n\nWould you like Maestro to automatically stash your local changes, switch to '${branchName}', and reapply them?`
          )
          if (autoStash) {
            const stashRes = await window.maestroAPI.gitCheckoutBranch(workspacePath, branchName, { autostash: true })
            setStatusMessage(stashRes.message)
            await refreshGitStatus()
            return
          }
        }
        setStatusMessage(`Checkout error: ${res.message}`)
      }
    } catch (e: any) {
      setStatusMessage(`Failed to checkout: ${e.message}`)
    }
  },

  renameBranch: async (oldName: string, newName: string) => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return { ok: false, message: 'No workspace' }
    try {
      const res = await window.maestroAPI.gitRenameBranch(workspacePath, oldName, newName)
      setStatusMessage(res.message)
      await refreshGitStatus()
      return res
    } catch (e: any) {
      const msg = `Failed to rename branch: ${e?.message || e}`
      setStatusMessage(msg)
      return { ok: false, message: msg }
    }
  },

  publishBranch: async (branchName: string) => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return { ok: false, message: 'No workspace' }
    try {
      const res = await window.maestroAPI.gitPublishBranch(workspacePath, branchName)
      setStatusMessage(res.message)
      await refreshGitStatus()
      return res
    } catch (e: any) {
      const msg = `Failed to publish branch: ${e?.message || e}`
      setStatusMessage(msg)
      return { ok: false, message: msg }
    }
  },

  abortMerge: async () => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return
    try {
      const res = await window.maestroAPI.gitAbortMerge(workspacePath)
      setStatusMessage(res.message)
      await refreshGitStatus()
    } catch (e: any) {
      setStatusMessage(`Failed to abort merge: ${e.message}`)
    }
  },

  continueMerge: async () => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return
    try {
      const res = await window.maestroAPI.gitContinueMerge(workspacePath)
      setStatusMessage(res.message)
      await refreshGitStatus()
    } catch (e: any) {
      setStatusMessage(`Failed to continue merge: ${e.message}`)
    }
  },

  mergeBranch: async (branchName: string) => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return { ok: false, message: 'No workspace' }
    try {
      const res = await window.maestroAPI.gitMerge(workspacePath, branchName)
      setStatusMessage(res.message)
      await refreshGitStatus()
      return res
    } catch (e: any) {
      const msg = `Merge failed: ${e?.message || e}`
      setStatusMessage(msg)
      return { ok: false, message: msg }
    }
  },

  rebaseBranch: async (branchName: string) => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return { ok: false, message: 'No workspace' }
    try {
      const res = await window.maestroAPI.gitRebase(workspacePath, branchName)
      setStatusMessage(res.message)
      await refreshGitStatus()
      return res
    } catch (e: any) {
      const msg = `Rebase failed: ${e?.message || e}`
      setStatusMessage(msg)
      return { ok: false, message: msg }
    }
  },

  stageFile: async (filePath: string) => {
    const { workspacePath, refreshGitStatus } = get()
    if (!workspacePath) return
    await window.maestroAPI.gitStageFile(workspacePath, filePath)
    await refreshGitStatus()
  },

  unstageFile: async (filePath: string) => {
    const { workspacePath, refreshGitStatus } = get()
    if (!workspacePath) return
    await window.maestroAPI.gitUnstageFile(workspacePath, filePath)
    await refreshGitStatus()
  },

  stageAllFiles: async () => {
    const { workspacePath, refreshGitStatus } = get()
    if (!workspacePath) return
    await window.maestroAPI.gitStageAll(workspacePath)
    await refreshGitStatus()
  },

  unstageAllFiles: async () => {
    const { workspacePath, refreshGitStatus } = get()
    if (!workspacePath) return
    await window.maestroAPI.gitUnstageAll(workspacePath)
    await refreshGitStatus()
  },

  discardFileChanges: async (filePath: string) => {
    const { workspacePath, refreshGitStatus } = get()
    if (!workspacePath) return
    await window.maestroAPI.gitDiscardFile(workspacePath, filePath)
    await refreshGitStatus()
  },

  discardAllChanges: async () => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return false
    try {
      const ok = await window.maestroAPI.gitDiscardAll(workspacePath)
      if (ok) {
        setStatusMessage('Discarded all changes')
        await refreshGitStatus()
      } else {
        setStatusMessage('Failed to discard all changes')
      }
      return ok
    } catch (e: any) {
      setStatusMessage(`Failed to discard: ${e?.message || e}`)
      return false
    }
  },

  fetchGitHistory: async (filePath?: string) => {
    const { workspacePath } = get()
    if (!workspacePath) return
    set({ isHistoryLoading: true })
    try {
      const history = await window.maestroAPI.gitGetHistory(workspacePath, 50, filePath)
      set({ gitHistory: history })
    } catch {
      set({ gitHistory: [] })
    } finally {
      set({ isHistoryLoading: false })
    }
  },

  fetchCommitDetail: async (hash: string) => {
    const { workspacePath } = get()
    if (!workspacePath) return
    try {
      const detail = await window.maestroAPI.gitGetCommitDetail(workspacePath, hash)
      set({ activeCommitDetail: detail })
    } catch {
      set({ activeCommitDetail: null })
    }
  },

  closeCommitDetail: () => set({ activeCommitDetail: null }),

  setHistorySearchQuery: (historySearchQuery: string) => set({ historySearchQuery }),

  fetchGitStashes: async () => {
    const { workspacePath } = get()
    if (!workspacePath) return
    try {
      const stashes = await window.maestroAPI.gitGetStashes(workspacePath)
      set({ gitStashes: stashes })
    } catch {
      set({ gitStashes: [] })
    }
  },

  gitStashSave: async (message?: string) => {
    const { workspacePath, refreshGitStatus, fetchGitStashes, setStatusMessage } = get()
    if (!workspacePath) return false
    try {
      const res = await window.maestroAPI.gitStashSave(workspacePath, message)
      setStatusMessage(res.message)
      await refreshGitStatus()
      await fetchGitStashes()
      return res.ok
    } catch (e: any) {
      setStatusMessage(`Stash failed: ${e.message}`)
      return false
    }
  },

  gitStashPop: async (index = 0) => {
    const { workspacePath, refreshGitStatus, fetchGitStashes, setStatusMessage } = get()
    if (!workspacePath) return false
    try {
      const res = await window.maestroAPI.gitStashPop(workspacePath, index)
      setStatusMessage(res.message)
      await refreshGitStatus()
      await fetchGitStashes()
      return res.ok
    } catch (e: any) {
      setStatusMessage(`Stash pop failed: ${e.message}`)
      return false
    }
  },

  gitStashApply: async (index = 0) => {
    const { workspacePath, refreshGitStatus, fetchGitStashes, setStatusMessage } = get()
    if (!workspacePath) return false
    try {
      const res = await window.maestroAPI.gitStashApply(workspacePath, index)
      setStatusMessage(res.message)
      await refreshGitStatus()
      await fetchGitStashes()
      return res.ok
    } catch (e: any) {
      setStatusMessage(`Stash apply failed: ${e.message}`)
      return false
    }
  },

  gitStashDrop: async (index = 0) => {
    const { workspacePath, fetchGitStashes, setStatusMessage } = get()
    if (!workspacePath) return false
    try {
      const res = await window.maestroAPI.gitStashDrop(workspacePath, index)
      setStatusMessage(res.message)
      await fetchGitStashes()
      return res.ok
    } catch (e: any) {
      setStatusMessage(`Stash drop failed: ${e.message}`)
      return false
    }
  },

  gitFetch: async () => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return false
    try {
      setStatusMessage('Fetching git remotes...')
      const res = await window.maestroAPI.gitFetch(workspacePath)
      setStatusMessage(res.message)
      await refreshGitStatus()
      return res.ok
    } catch (e: any) {
      setStatusMessage(`Fetch failed: ${e.message}`)
      return false
    }
  },

  fetchGitTags: async () => {
    const { workspacePath } = get()
    if (!workspacePath) return
    try {
      const tags = await window.maestroAPI.gitGetTags(workspacePath)
      set({ gitTags: tags })
    } catch {
      set({ gitTags: [] })
    }
  },

  gitCreateTag: async (tagName: string, message?: string) => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return false
    try {
      const res = await window.maestroAPI.gitCreateTag(workspacePath, tagName, message)
      setStatusMessage(res.message)
      await refreshGitStatus()
      return res.ok
    } catch (e: any) {
      setStatusMessage(`Create tag failed: ${e.message}`)
      return false
    }
  },

  gitDeleteTag: async (tagName: string) => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return false
    try {
      const res = await window.maestroAPI.gitDeleteTag(workspacePath, tagName)
      setStatusMessage(res.message)
      await refreshGitStatus()
      return res.ok
    } catch (e: any) {
      setStatusMessage(`Delete tag failed: ${e.message}`)
      return false
    }
  },

  gitCheckoutTag: async (tagName: string) => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return false
    try {
      const res = await window.maestroAPI.gitCheckoutTag(workspacePath, tagName)
      setStatusMessage(res.message)
      await refreshGitStatus()
      return res.ok
    } catch (e: any) {
      setStatusMessage(`Checkout tag failed: ${e.message}`)
      return false
    }
  },

  gitRevert: async (hash: string) => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return false
    try {
      const res = await window.maestroAPI.gitRevert(workspacePath, hash)
      setStatusMessage(res.message)
      await refreshGitStatus()
      return res.ok
    } catch (e: any) {
      setStatusMessage(`Revert failed: ${e.message}`)
      return false
    }
  },

  gitCherryPick: async (hash: string) => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return false
    try {
      const res = await window.maestroAPI.gitCherryPick(workspacePath, hash)
      setStatusMessage(res.message)
      await refreshGitStatus()
      return res.ok
    } catch (e: any) {
      setStatusMessage(`Cherry-pick failed: ${e.message}`)
      return false
    }
  },

  gitReset: async (mode: 'soft' | 'mixed' | 'hard', target?: string) => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return false
    try {
      const res = await window.maestroAPI.gitReset(workspacePath, mode, target)
      setStatusMessage(res.message)
      await refreshGitStatus()
      return res.ok
    } catch (e: any) {
      setStatusMessage(`Reset failed: ${e.message}`)
      return false
    }
  },

  fetchGitBlame: async (filePath: string) => {
    const { workspacePath, fileBlames, cursorPosition } = get()
    if (!workspacePath) return
    try {
      const relPath = filePath.replace(workspacePath, '').replace(/^[/\\]/, '')
      const blameLines = await window.maestroAPI.gitGetBlame(workspacePath, relPath)
      set({
        fileBlames: { ...fileBlames, [filePath]: blameLines },
        activeBlameInfo: blameLines.find((b) => b.line === cursorPosition.line) || null
      })
    } catch {
      // ignore
    }
  },

  updateActiveBlame: (line: number) => {
    const { activeFilePath, fileBlames } = get()
    if (!activeFilePath || !fileBlames[activeFilePath]) {
      set({ activeBlameInfo: null })
      return
    }
    const blame = fileBlames[activeFilePath].find((b) => b.line === line) || null
    set({ activeBlameInfo: blame })
  },

  loadTsConfig: async () => {
    const { workspacePath } = get()
    if (!workspacePath) return
    try {
      const config = await window.maestroAPI.loadTsConfig(workspacePath)
      if (config && config.compilerOptions) {
        // Will be applied via lspClient
        const { lspClient } = await import('../services/lspClient')
        lspClient.applyTsConfig(config.compilerOptions)
      }
    } catch {
      // ignore
    }
  },

  setExternalFileConflict: (conflict) => set({ externalFileConflict: conflict }),

  reloadFileFromDisk: async (filePath) => {
    const { externalFileConflict, updateFileContent, markFileSaved, setStatusMessage } = get()
    try {
      const fresh =
        externalFileConflict?.filePath === filePath
          ? externalFileConflict.diskContent
          : await window.maestroAPI.readFile(filePath)
      updateFileContent(filePath, fresh)
      markFileSaved(filePath)
      set({ externalFileConflict: null })
      setStatusMessage('File reloaded from disk')
      setTimeout(() => setStatusMessage('Ready'), 2000)
    } catch (e: any) {
      setStatusMessage(`Reload failed: ${e.message}`)
    }
  },

  compareFileWithDisk: async (filePath) => {
    const { openFiles, externalFileConflict, openDiff } = get()
    const current = openFiles.find((f) => f.path === filePath)
    if (!current) return
    const disk =
      externalFileConflict?.filePath === filePath
        ? externalFileConflict.diskContent
        : await window.maestroAPI.readFile(filePath)
    openDiff({
      path: filePath,
      name: `${current.name} (Disk vs Buffer)`,
      original: disk,
      modified: current.content
    })
  },

  dismissExternalFileConflict: () => set({ externalFileConflict: null }),

  setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
  setGlobalReplaceQuery: (query) => set({ globalReplaceQuery: query }),
  setSearchOptions: (options) =>
    set((state) => ({ searchOptions: { ...state.searchOptions, ...options } })),

  executeGlobalSearch: async () => {
    const { workspacePath, workspaceFolders, globalSearchQuery, searchOptions } = get()
    if (!workspacePath || !globalSearchQuery.trim()) {
      set({ globalSearchResults: [] })
      return
    }

    set({ isSearching: true })
    try {
      const allRoots = [workspacePath]
      if (workspaceFolders && workspaceFolders.length > 0) {
        for (const f of workspaceFolders) {
          if (!allRoots.includes(f.path)) {
            allRoots.push(f.path)
          }
        }
      }

      const results =
        allRoots.length > 1
          ? await window.maestroAPI.searchInWorkspaces(allRoots, globalSearchQuery, searchOptions)
          : await window.maestroAPI.searchInFiles(workspacePath, globalSearchQuery, searchOptions)

      set({ globalSearchResults: results })
    } catch (err) {
      console.error('Search failed:', err)
      set({ globalSearchResults: [] })
    } finally {
      set({ isSearching: false })
    }
  },

  cancelGlobalSearch: async () => {
    try {
      await window.maestroAPI.cancelSearch()
      set({ isSearching: false })
      get().setStatusMessage('Search cancelled')
    } catch {
      // ignore
    }
  },

  executeGlobalReplace: async () => {
    const { workspacePath, globalSearchQuery, globalReplaceQuery, searchOptions, executeGlobalSearch } = get()
    if (!workspacePath || !globalSearchQuery.trim()) return

    set({ isSearching: true })
    try {
      const res = await window.maestroAPI.replaceInFiles(
        workspacePath,
        globalSearchQuery,
        globalReplaceQuery,
        searchOptions
      )
      set({ statusMessage: `Replaced ${res.replacedCount} occurrences across ${res.filesCount} files` })
      await executeGlobalSearch()
    } catch (err) {
      console.error('Replace failed:', err)
    } finally {
      set({ isSearching: false })
    }
  },

  replaceInFile: async (filePath: string) => {
    const { globalSearchQuery, globalReplaceQuery, searchOptions, executeGlobalSearch, setStatusMessage } = get()
    if (!filePath || !globalSearchQuery.trim()) return

    try {
      const ok = await window.maestroAPI.replaceInFile(filePath, globalSearchQuery, globalReplaceQuery, searchOptions)
      if (ok) {
        setStatusMessage(`Replaced in ${filePath.split(/[\\/]/).pop()}`)
        const openFileObj = get().openFiles.find((f) => f.path === filePath)
        if (openFileObj) {
          const fresh = await window.maestroAPI.readFile(filePath)
          get().updateFileContent(filePath, fresh)
        }
        await executeGlobalSearch()
      }
    } catch (err) {
      console.error('replaceInFile failed:', err)
    }
  },

  replaceMatch: async (filePath: string, line: number, column: number, matchText: string) => {
    const { globalReplaceQuery, executeGlobalSearch, setStatusMessage } = get()
    if (!filePath) return

    try {
      const ok = await window.maestroAPI.replaceMatch(filePath, line, column, matchText, globalReplaceQuery)
      if (ok) {
        setStatusMessage(`Replaced match at line ${line}`)
        const openFileObj = get().openFiles.find((f) => f.path === filePath)
        if (openFileObj) {
          const fresh = await window.maestroAPI.readFile(filePath)
          get().updateFileContent(filePath, fresh)
        }
        await executeGlobalSearch()
      }
    } catch (err) {
      console.error('replaceMatch failed:', err)
    }
  },

  jumpToNextSearchResult: () => {
    const { globalSearchResults, activeFilePath, cursorPosition, openFile, setActiveFile, setCursorPosition } = get()
    const allMatches: SearchMatch[] = []
    for (const res of globalSearchResults) {
      allMatches.push(...res.matches)
    }
    if (allMatches.length === 0) return

    let nextIdx = allMatches.findIndex(
      (m) =>
        m.filePath === activeFilePath &&
        (m.line > cursorPosition.line || (m.line === cursorPosition.line && m.column > cursorPosition.col))
    )
    if (nextIdx === -1) {
      const fileIdx = allMatches.findIndex((m) => m.filePath !== activeFilePath)
      nextIdx = fileIdx !== -1 ? fileIdx : 0
    }

    const target = allMatches[nextIdx]
    const openFiles = get().openFiles
    if (!openFiles.some((f) => f.path === target.filePath)) {
      window.maestroAPI.readFile(target.filePath).then((content) => {
        openFile({ path: target.filePath, name: target.fileName, content })
        setCursorPosition(target.line, target.column)
        window.dispatchEvent(new CustomEvent('editor-reveal-line', { detail: { line: target.line, col: target.column } }))
      })
    } else {
      setActiveFile(target.filePath)
      setCursorPosition(target.line, target.column)
      window.dispatchEvent(new CustomEvent('editor-reveal-line', { detail: { line: target.line, col: target.column } }))
    }
  },

  jumpToPrevSearchResult: () => {
    const { globalSearchResults, activeFilePath, cursorPosition, openFile, setActiveFile, setCursorPosition } = get()
    const allMatches: SearchMatch[] = []
    for (const res of globalSearchResults) {
      allMatches.push(...res.matches)
    }
    if (allMatches.length === 0) return

    let prevIdx = -1
    for (let i = allMatches.length - 1; i >= 0; i--) {
      const m = allMatches[i]
      if (
        m.filePath === activeFilePath &&
        (m.line < cursorPosition.line || (m.line === cursorPosition.line && m.column < cursorPosition.col))
      ) {
        prevIdx = i
        break
      }
    }
    if (prevIdx === -1) {
      prevIdx = allMatches.length - 1
    }

    const target = allMatches[prevIdx]
    const openFiles = get().openFiles
    if (!openFiles.some((f) => f.path === target.filePath)) {
      window.maestroAPI.readFile(target.filePath).then((content) => {
        openFile({ path: target.filePath, name: target.fileName, content })
        setCursorPosition(target.line, target.column)
        window.dispatchEvent(new CustomEvent('editor-reveal-line', { detail: { line: target.line, col: target.column } }))
      })
    } else {
      setActiveFile(target.filePath)
      setCursorPosition(target.line, target.column)
      window.dispatchEvent(new CustomEvent('editor-reveal-line', { detail: { line: target.line, col: target.column } }))
    }
  },

  fetchAvailableShells: async () => {
    try {
      const shells = await window.maestroAPI.getAvailableShells()
      set({ availableShells: shells })
    } catch (err) {
      console.error('Failed to load shells:', err)
    }
  },

  addTerminalSession: (
    shellProfile?: ShellProfile,
    cwd?: string,
    env?: Record<string, string>,
    shellArgs?: string[]
  ) => {
    const { terminalSessions, workspacePath, editorSettings } = get()
    const nextIndex = terminalSessions.length + 1
    const newId = `term-${Date.now()}`
    const resolvedShell = shellProfile?.path || editorSettings.defaultProfile
    const title = shellProfile ? `${shellProfile.name} ${nextIndex}` : `Terminal ${nextIndex}`

    const newSession: TerminalSessionInfo = {
      id: newId,
      title,
      shell: resolvedShell,
      shellArgs,
      cwd: cwd || workspacePath || undefined,
      env,
      isExited: false
    }

    set({
      terminalSessions: [...terminalSessions, newSession],
      activeTerminalId: newId,
      activeBottomTab: 'terminal',
      isBottomDeckOpen: true
    })

    // Spawn process in backend
    window.maestroAPI?.createTerminal(
      newId,
      cwd || workspacePath || undefined,
      resolvedShell,
      env,
      shellArgs
    )
    return newId
  },

  renameTerminalSession: (id: string, newTitle: string) => {
    const { terminalSessions } = get()
    set({
      terminalSessions: terminalSessions.map((s) =>
        s.id === id ? { ...s, title: newTitle.trim() || s.title } : s
      )
    })
  },

  restartTerminalSession: (id: string) => {
    const { terminalSessions, workspacePath } = get()
    const session = terminalSessions.find((s) => s.id === id)
    if (!session) return

    window.maestroAPI?.killTerminal(id)
    set({
      terminalSessions: terminalSessions.map((s) =>
        s.id === id ? { ...s, isExited: false } : s
      )
    })
    window.dispatchEvent(new CustomEvent('terminal-restart', { detail: { id } }))
    window.maestroAPI?.createTerminal(
      id,
      session.cwd || workspacePath || undefined,
      session.shell,
      session.env,
      session.shellArgs
    )
  },

  setTerminalSessionExited: (id: string, isExited: boolean) => {
    const { terminalSessions } = get()
    set({
      terminalSessions: terminalSessions.map((s) =>
        s.id === id ? { ...s, isExited } : s
      )
    })
  },

  closeTerminalSession: (id: string) => {
    const { terminalSessions, activeTerminalId, splitTerminalId, terminalSplitMode, workspacePath } = get()
    window.maestroAPI?.killTerminal(id)

    const remaining = terminalSessions.filter((t) => t.id !== id)
    if (remaining.length === 0) {
      const defaultId = `term-${Date.now()}`
      set({
        terminalSessions: [{ id: defaultId, title: 'Terminal 1', shell: undefined }],
        activeTerminalId: defaultId,
        terminalSplitMode: 'none',
        splitTerminalId: null
      })
      window.maestroAPI?.createTerminal(defaultId, workspacePath || undefined)
      return
    }

    let nextActiveId = activeTerminalId
    let nextSplitId = splitTerminalId
    let nextSplitMode = terminalSplitMode

    if (activeTerminalId === id) {
      nextActiveId = splitTerminalId && splitTerminalId !== id
        ? splitTerminalId
        : remaining[remaining.length - 1].id
      if (nextSplitId === nextActiveId) {
        nextSplitId = remaining.find((s) => s.id !== nextActiveId)?.id || null
      }
    } else if (splitTerminalId === id) {
      nextSplitId = remaining.find((s) => s.id !== activeTerminalId)?.id || null
    }

    if (!nextSplitId || remaining.length < 2) {
      nextSplitMode = 'none'
      nextSplitId = null
    }

    set({
      terminalSessions: remaining,
      activeTerminalId: nextActiveId,
      splitTerminalId: nextSplitId,
      terminalSplitMode: nextSplitMode
    })
  },

  setActiveTerminalId: (id: string) => {
    set({ activeTerminalId: id })
  },

  toggleTerminalSplit: (direction = 'horizontal') => {
    const { terminalSplitMode, terminalSessions, activeTerminalId, addTerminalSession } = get()
    if (terminalSplitMode !== 'none' && terminalSplitMode === direction) {
      set({ terminalSplitMode: 'none', splitTerminalId: null })
      return
    }

    let secondaryId = terminalSessions.find((s) => s.id !== activeTerminalId)?.id
    if (!secondaryId) {
      secondaryId = addTerminalSession()
    }

    set({
      terminalSplitMode: direction,
      splitTerminalId: secondaryId,
      isBottomDeckOpen: true,
      activeBottomTab: 'terminal'
    })
  },

  closeTerminalSplit: () => {
    set({ terminalSplitMode: 'none', splitTerminalId: null })
  },

  setSplitTerminalId: (id: string | null) => {
    set({ splitTerminalId: id })
  },

  moveTerminalToGroup: (targetId: string, group: 'primary' | 'secondary') => {
    const { activeTerminalId, splitTerminalId, terminalSplitMode } = get()
    if (group === 'primary') {
      if (activeTerminalId !== targetId) {
        set({ activeTerminalId: targetId })
      }
    } else {
      if (splitTerminalId !== targetId) {
        set({
          splitTerminalId: targetId,
          terminalSplitMode: terminalSplitMode === 'none' ? 'horizontal' : terminalSplitMode
        })
      }
    }
  },

  toggleTerminalSearch: (open?: boolean) => {
    set((state) => ({
      isTerminalSearchOpen: open !== undefined ? open : !state.isTerminalSearchOpen
    }))
  },

  toggleSettingsModal: () => set((state) => ({ isSettingsModalOpen: !state.isSettingsModalOpen })),
  setSettingsModalOpen: (open: boolean) => set({ isSettingsModalOpen: open }),

  toggleKeyboardShortcuts: () =>
    set((state) => ({ isKeyboardShortcutsOpen: !state.isKeyboardShortcutsOpen })),
  setKeyboardShortcutsOpen: (open: boolean) => set({ isKeyboardShortcutsOpen: open }),

  setPendingWorkspaceEdit: (session) => set({ pendingWorkspaceEdit: session }),
  confirmPendingWorkspaceEdit: () => {
    const session = get().pendingWorkspaceEdit
    if (session) {
      session.resolve(true)
      set({ pendingWorkspaceEdit: null })
    }
  },
  cancelPendingWorkspaceEdit: () => {
    const session = get().pendingWorkspaceEdit
    if (session) {
      session.resolve(false)
      set({ pendingWorkspaceEdit: null })
    }
  },

  openThreeWayMerge: async (filePath: string) => {
    try {
      const file = get().openFiles.find((f) => f.path === filePath)
      let content = file ? file.content : ''
      if (!content) {
        content = await window.maestroAPI.readFile(filePath)
      }
      const fileName = filePath.split(/[/\\]/).pop() || 'Conflicted File'
      set({ threeWayMergeSession: { filePath, fileName, content } })
    } catch (err) {
      console.error('Failed to open 3-way merge session:', err)
    }
  },
  closeThreeWayMerge: () => set({ threeWayMergeSession: null }),

  loadWorkspaceSettings: async (workspacePath: string) => {
    try {
      const settings = await window.maestroAPI.loadSettings(workspacePath)
      if (settings) {
        set({ editorSettings: settings })
      }
      await get().loadTsConfig()
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  },

  updateEditorSettings: async (newSettings: Partial<WorkspaceSettings>) => {
    const { editorSettings, workspacePath } = get()
    const merged = { ...editorSettings, ...newSettings }
    set({ editorSettings: merged })
    if (workspacePath) {
      try {
        await window.maestroAPI.saveSettings(workspacePath, merged)
      } catch (err) {
        console.error('Failed to save settings:', err)
      }
    }
  },

  fetchWorkspaceTasks: async () => {
    const { workspacePath } = get()
    if (!workspacePath) return []
    try {
      const tasks = await window.maestroAPI.getWorkspaceTasks(workspacePath)
      set({ workspaceTasks: tasks || [] })
      return tasks || []
    } catch (err) {
      console.error('Failed to fetch workspace tasks:', err)
      return []
    }
  },

  runTask: async (task: MaestroTask) => {
    const {
      terminalSessions,
      addTerminalSession,
      setActiveTerminalId,
      setBottomDeckOpen,
      setActiveBottomTab,
      setStatusMessage
    } = get()

    const taskSessionTitle = `Task: ${task.label}`
    const existing = terminalSessions.find((s) => s.title === taskSessionTitle)
    let sessionId: string

    if (!existing) {
      sessionId = addTerminalSession(undefined, task.cwd)
      get().renameTerminalSession(sessionId, taskSessionTitle)
    } else {
      sessionId = existing.id
      setActiveTerminalId(sessionId)
    }

    setBottomDeckOpen(true)
    setActiveBottomTab('terminal')
    setStatusMessage(`Running task: ${task.label}`)

    const fullCmd =
      task.args && task.args.length > 0 ? `${task.command} ${task.args.join(' ')}` : task.command

    get().appendOutput('tasks', `[${new Date().toLocaleTimeString()}] Executing task: ${task.label}`)
    get().appendOutput('tasks', `> ${fullCmd}`)

    setTimeout(() => {
      window.maestroAPI?.writeTerminal(sessionId, `${fullCmd}\r\n`)
    }, 250)
  },

  runBuildTask: async () => {
    const { workspaceTasks, fetchWorkspaceTasks, runTask, setStatusMessage } = get()
    let tasks = workspaceTasks
    if (tasks.length === 0) {
      tasks = await fetchWorkspaceTasks()
    }
    const buildTask =
      tasks.find((t) => t.group === 'build' && t.isDefault) ||
      tasks.find((t) => t.group === 'build') ||
      tasks[0]

    if (buildTask) {
      await runTask(buildTask)
    } else {
      setStatusMessage('No build task found in .vscode/tasks.json or package.json')
      setTimeout(() => get().setStatusMessage('Ready'), 2500)
    }
  },

  runTestTask: async () => {
    const { workspaceTasks, fetchWorkspaceTasks, runTask, setStatusMessage } = get()
    let tasks = workspaceTasks
    if (tasks.length === 0) {
      tasks = await fetchWorkspaceTasks()
    }
    const testTask =
      tasks.find((t) => t.group === 'test' && t.isDefault) ||
      tasks.find((t) => t.group === 'test')

    if (testTask) {
      await runTask(testTask)
    } else {
      setStatusMessage('No test task found in .vscode/tasks.json or package.json')
      setTimeout(() => get().setStatusMessage('Ready'), 2500)
    }
  }
}))

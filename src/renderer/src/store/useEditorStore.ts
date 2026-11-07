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
  cwd?: string
  isExited?: boolean
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

interface EditorState {
  workspacePath: string | null
  fileTree: FileItem[]
  openFiles: EditorFile[]
  activeFilePath: string | null
  layoutMode: LayoutMode
  isZenMode: boolean
  isSidebarOpen: boolean
  activeSidebarTab: 'files' | 'search' | 'git' | 'debug'
  cursorPosition: { line: number; col: number }
  statusMessage: string
  lspStatus: 'idle' | 'ready' | 'syncing'
  focusTask: { id: string; title: string } | null
  diagnostics: DiagnosticItem[]
  diagnosticFilter: 'all' | 'error' | 'warning' | 'info'
  diagnosticSearchQuery: string
  activeBottomTab: 'terminal' | 'problems' | 'history' | 'debug'
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
  checkoutBranch: (branchName: string) => Promise<void>
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
  addTerminalSession: (shellProfile?: ShellProfile, cwd?: string) => string
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
  isTerminalSearchOpen: boolean
  toggleTerminalSearch: (open?: boolean) => void

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
  fetchRecentWorkspaces: () => Promise<void>
  removeRecentWorkspace: (path: string) => Promise<void>
  clearRecentWorkspaces: () => Promise<void>
  toggleWorkspaceTrust: () => Promise<void>
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
  setActiveSidebarTab: (tab: 'files' | 'search' | 'git' | 'debug') => void
  setCursorPosition: (line: number, col: number) => void
  setStatusMessage: (msg: string) => void
  setLspStatus: (status: 'idle' | 'ready' | 'syncing') => void
  setFocusTask: (task: { id: string; title: string } | null) => void
  setDiagnostics: (items: DiagnosticItem[]) => void
  setDiagnosticFilter: (filter: 'all' | 'error' | 'warning' | 'info') => void
  setDiagnosticSearchQuery: (query: string) => void
  jumpToNextProblem: () => Promise<void>
  jumpToPrevProblem: () => Promise<void>
  setActiveBottomTab: (tab: 'terminal' | 'problems' | 'history' | 'debug') => void
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

function detectLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'json':
      return 'json'
    case 'html':
      return 'html'
    case 'css':
      return 'css'
    case 'md':
      return 'markdown'
    case 'py':
      return 'python'
    case 'go':
      return 'go'
    case 'rs':
      return 'rust'
    default:
      return 'plaintext'
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  workspacePath: null,
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
  focusTask: null,
  diagnostics: [],
  diagnosticFilter: 'all',
  diagnosticSearchQuery: '',
  activeBottomTab: 'terminal',
  isBottomDeckOpen: false,

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
      await get().restoreSessionState(path)
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

  saveSessionState: async () => {
    const { workspacePath, openFiles, activeFilePath, layoutMode } = get()
    if (!workspacePath) return
    try {
      await window.maestroAPI.saveWorkspaceSessionState(workspacePath, {
        openFiles: openFiles.map((f) => ({ path: f.path, name: f.name, isPinned: f.isPinned })),
        activeFilePath,
        layoutMode
      })
    } catch {
      // ignore
    }
  },

  restoreSessionState: async (path: string) => {
    try {
      const state = await window.maestroAPI.loadWorkspaceSessionState(path)
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
              language: detectLanguage(f.name)
            })
          } catch {
            // ignore
          }
        }
        if (loadedFiles.length > 0) {
          set({
            openFiles: loadedFiles,
            activeFilePath: state.activeFilePath || loadedFiles[0].path,
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
    const { openFiles, layoutMode, recentFiles } = get()
    const existingIndex = openFiles.findIndex((f) => f.path === path)
    const updatedRecents = [path, ...recentFiles.filter((p) => p !== path)].slice(0, 30)

    if (existingIndex >= 0) {
      const existing = openFiles[existingIndex]
      const updatedFiles = [...openFiles]
      if (!isPreview && existing.isPreview) {
        updatedFiles[existingIndex] = { ...existing, isPreview: false }
      }
      set({
        openFiles: updatedFiles,
        activeFilePath: path,
        diffSession: null,
        recentFiles: updatedRecents,
        layoutMode: layoutMode === 'project' ? 'split' : layoutMode
      })
    } else {
      const newFile: EditorFile = {
        path,
        name,
        content,
        isDirty: false,
        isPreview: !!isPreview,
        language: detectLanguage(name)
      }

      let updatedFiles = [...openFiles]
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

      set({
        openFiles: updatedFiles,
        activeFilePath: path,
        diffSession: null,
        recentFiles: updatedRecents,
        layoutMode: layoutMode === 'project' ? 'split' : layoutMode
      })
    }
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
    const { openFiles, activeFilePath, closedFilesHistory } = get()
    const targetFile = openFiles.find((f) => f.path === filePath)
    const nextFiles = openFiles.filter((f) => f.path !== filePath)
    let nextActive = activeFilePath

    if (activeFilePath === filePath) {
      if (nextFiles.length > 0) {
        nextActive = nextFiles[nextFiles.length - 1].path
      } else {
        nextActive = null
      }
    }

    const updatedClosed = targetFile
      ? [targetFile, ...closedFilesHistory.filter((f) => f.path !== filePath)].slice(0, 20)
      : closedFilesHistory

    set({
      openFiles: nextFiles,
      activeFilePath: nextActive,
      closedFilesHistory: updatedClosed
    })
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
    const { openFiles } = get()
    const nextFiles = openFiles.filter((f) => f.path === filePath || f.isPinned)
    set({
      openFiles: nextFiles,
      activeFilePath: filePath
    })
  },

  closeFilesToRight: (filePath: string) => {
    const { openFiles, activeFilePath } = get()
    const targetIdx = openFiles.findIndex((f) => f.path === filePath)
    if (targetIdx === -1) return

    const nextFiles = openFiles.filter((f, idx) => idx <= targetIdx || f.isPinned)
    let nextActive = activeFilePath
    if (!nextFiles.some((f) => f.path === activeFilePath)) {
      nextActive = filePath
    }
    set({
      openFiles: nextFiles,
      activeFilePath: nextActive
    })
  },

  closeSavedFiles: () => {
    const { openFiles, activeFilePath } = get()
    const nextFiles = openFiles.filter((f) => f.isDirty || f.isPinned)
    let nextActive = activeFilePath
    if (!nextFiles.some((f) => f.path === activeFilePath)) {
      nextActive = nextFiles.length > 0 ? nextFiles[nextFiles.length - 1].path : null
    }
    set({
      openFiles: nextFiles,
      activeFilePath: nextActive
    })
  },

  closeAllFiles: () => {
    const { openFiles } = get()
    const nextFiles = openFiles.filter((f) => f.isPinned)
    set({
      openFiles: nextFiles,
      activeFilePath: nextFiles.length > 0 ? nextFiles[0].path : null
    })
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
    const { openFiles, activeFilePath } = get()
    if (openFiles.length <= 1) return
    const currentIndex = openFiles.findIndex((f) => f.path === activeFilePath)
    const nextIndex = (currentIndex + 1) % openFiles.length
    get().setActiveFile(openFiles[nextIndex].path)
  },

  previousEditor: () => {
    const { openFiles, activeFilePath } = get()
    if (openFiles.length <= 1) return
    const currentIndex = openFiles.findIndex((f) => f.path === activeFilePath)
    const prevIndex = (currentIndex - 1 + openFiles.length) % openFiles.length
    get().setActiveFile(openFiles[prevIndex].path)
  },

  reorderOpenFiles: (fromIndex: number, toIndex: number) => {
    const { openFiles } = get()
    if (fromIndex < 0 || fromIndex >= openFiles.length || toIndex < 0 || toIndex >= openFiles.length) return
    const updated = [...openFiles]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    set({ openFiles: updated })
    setTimeout(() => get().saveSessionState(), 100)
  },

  setActiveFile: (filePath) => {
    const { recentFiles } = get()
    const updatedRecents = [filePath, ...recentFiles.filter((p) => p !== filePath)].slice(0, 30)
    set({ activeFilePath: filePath, diffSession: null, recentFiles: updatedRecents })
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
  },

  markFileSaved: (filePath) => {
    const { openFiles } = get()
    set({
      openFiles: openFiles.map((file) =>
        file.path === filePath ? { ...file, isDirty: false } : file
      )
    })
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

  checkoutBranch: async (branchName: string) => {
    const { workspacePath, refreshGitStatus, setStatusMessage } = get()
    if (!workspacePath) return
    try {
      const res = await window.maestroAPI.gitCheckoutBranch(workspacePath, branchName)
      if (res.ok) {
        setStatusMessage(`Switched to branch '${branchName}'`)
        await refreshGitStatus()
      } else {
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
    const { workspacePath, globalSearchQuery, searchOptions } = get()
    if (!workspacePath || !globalSearchQuery.trim()) {
      set({ globalSearchResults: [] })
      return
    }

    set({ isSearching: true })
    try {
      const results = await window.maestroAPI.searchInFiles(
        workspacePath,
        globalSearchQuery,
        searchOptions
      )
      set({ globalSearchResults: results })
    } catch (err) {
      console.error('Search failed:', err)
      set({ globalSearchResults: [] })
    } finally {
      set({ isSearching: false })
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

  addTerminalSession: (shellProfile?: ShellProfile, cwd?: string) => {
    const { terminalSessions, workspacePath } = get()
    const nextIndex = terminalSessions.length + 1
    const newId = `term-${Date.now()}`
    const title = shellProfile ? `${shellProfile.name} ${nextIndex}` : `Terminal ${nextIndex}`

    const newSession: TerminalSessionInfo = {
      id: newId,
      title,
      shell: shellProfile?.path,
      cwd: cwd || workspacePath || undefined,
      isExited: false
    }

    set({
      terminalSessions: [...terminalSessions, newSession],
      activeTerminalId: newId,
      activeBottomTab: 'terminal',
      isBottomDeckOpen: true
    })

    // Spawn process in backend
    window.maestroAPI?.createTerminal(newId, cwd || workspacePath || undefined, shellProfile?.path)
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
    window.maestroAPI?.createTerminal(id, session.cwd || workspacePath || undefined, session.shell)
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

import { create } from 'zustand'
import type {
  FileItem,
  GitStatusResult,
  FileSearchResult,
  SearchOptions,
  ShellProfile,
  WorkspaceSettings
} from '../../../preload/index.d'

export interface TerminalSessionInfo {
  id: string
  title: string
  shell?: string
}

export interface EditorFile {
  path: string
  name: string
  content: string
  isDirty?: boolean
  language?: string
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

export interface DiffSession {
  path: string
  name: string
  original: string
  modified: string
}

export type LayoutMode = 'editor' | 'project' | 'split'

interface EditorState {
  workspacePath: string | null
  fileTree: FileItem[]
  openFiles: EditorFile[]
  activeFilePath: string | null
  layoutMode: LayoutMode
  isSidebarOpen: boolean
  activeSidebarTab: 'files' | 'search' | 'git'
  cursorPosition: { line: number; col: number }
  statusMessage: string
  lspStatus: 'idle' | 'ready' | 'syncing'
  focusTask: { id: string; title: string } | null
  diagnostics: DiagnosticItem[]
  diagnosticFilter: 'all' | 'error' | 'warning' | 'info'
  diagnosticSearchQuery: string
  activeBottomTab: 'terminal' | 'problems'
  isBottomDeckOpen: boolean

  // Git state
  gitStatus: GitStatusResult
  diffSession: DiffSession | null

  // Global Search state
  globalSearchQuery: string
  globalReplaceQuery: string
  globalSearchResults: FileSearchResult[]
  isSearching: boolean
  searchOptions: SearchOptions

  // Settings state (.vscode/settings.json)
  editorSettings: WorkspaceSettings
  isSettingsModalOpen: boolean
  toggleSettingsModal: () => void
  setSettingsModalOpen: (open: boolean) => void
  loadWorkspaceSettings: (workspacePath: string) => Promise<void>
  updateEditorSettings: (settings: Partial<WorkspaceSettings>) => Promise<void>

  // Terminal multi-session state
  terminalSessions: TerminalSessionInfo[]
  activeTerminalId: string
  availableShells: ShellProfile[]

  fetchAvailableShells: () => Promise<void>
  addTerminalSession: (shellProfile?: ShellProfile) => string
  closeTerminalSession: (id: string) => void
  setActiveTerminalId: (id: string) => void

  setWorkspacePath: (path: string | null) => void
  setFileTree: (tree: FileItem[]) => void
  openFile: (file: { path: string; name: string; content: string }) => void
  closeFile: (filePath: string) => void
  setActiveFile: (filePath: string) => void
  updateFileContent: (filePath: string, content: string) => void
  markFileSaved: (filePath: string) => void
  setLayoutMode: (mode: LayoutMode) => void
  toggleSidebar: () => void
  setActiveSidebarTab: (tab: 'files' | 'search' | 'git') => void
  setCursorPosition: (line: number, col: number) => void
  setStatusMessage: (msg: string) => void
  setLspStatus: (status: 'idle' | 'ready' | 'syncing') => void
  setFocusTask: (task: { id: string; title: string } | null) => void
  setDiagnostics: (items: DiagnosticItem[]) => void
  setDiagnosticFilter: (filter: 'all' | 'error' | 'warning' | 'info') => void
  setDiagnosticSearchQuery: (query: string) => void
  jumpToNextProblem: () => Promise<void>
  jumpToPrevProblem: () => Promise<void>
  setActiveBottomTab: (tab: 'terminal' | 'problems') => void
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

  // Settings
  editorSettings: {
    tabSize: 2,
    fontSize: 14,
    wordWrap: 'on',
    formatOnSave: true,
    minimap: false,
    lineNumbers: 'on'
  },
  isSettingsModalOpen: false,

  gitStatus: { branch: 'main', files: [] },
  diffSession: null,

  globalSearchQuery: '',
  globalReplaceQuery: '',
  globalSearchResults: [],
  isSearching: false,
  searchOptions: {
    isCaseSensitive: false,
    isWholeWord: false,
    isRegex: false
  },

  setWorkspacePath: (path) => {
    set({ workspacePath: path })
    if (path) {
      get().refreshGitStatus()
      get().loadWorkspaceSettings(path)
    }
  },
  setFileTree: (tree) => set({ fileTree: tree }),

  openFile: ({ path, name, content }) => {
    const { openFiles, layoutMode } = get()
    const existing = openFiles.find((f) => f.path === path)
    if (!existing) {
      const newFile: EditorFile = {
        path,
        name,
        content,
        isDirty: false,
        language: detectLanguage(name)
      }
      set({
        openFiles: [...openFiles, newFile],
        activeFilePath: path,
        diffSession: null,
        layoutMode: layoutMode === 'project' ? 'split' : layoutMode
      })
    } else {
      set({
        activeFilePath: path,
        diffSession: null,
        layoutMode: layoutMode === 'project' ? 'split' : layoutMode
      })
    }
  },

  closeFile: (filePath) => {
    const { openFiles, activeFilePath } = get()
    const nextFiles = openFiles.filter((f) => f.path !== filePath)
    let nextActive = activeFilePath

    if (activeFilePath === filePath) {
      if (nextFiles.length > 0) {
        nextActive = nextFiles[nextFiles.length - 1].path
      } else {
        nextActive = null
      }
    }

    set({
      openFiles: nextFiles,
      activeFilePath: nextActive
    })
  },

  setActiveFile: (filePath) => set({ activeFilePath: filePath, diffSession: null }),

  updateFileContent: (filePath, content) => {
    const { openFiles } = get()
    set({
      openFiles: openFiles.map((file) =>
        file.path === filePath ? { ...file, content, isDirty: true } : file
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
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab, isSidebarOpen: true }),
  setCursorPosition: (line, col) => set({ cursorPosition: { line, col } }),
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
    const { workspacePath } = get()
    if (!workspacePath) return
    try {
      const status = await window.maestroAPI.getGitStatus(workspacePath)
      set({ gitStatus: status })
    } catch {
      // ignore
    }
  },

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

  fetchAvailableShells: async () => {
    try {
      const shells = await window.maestroAPI.getAvailableShells()
      set({ availableShells: shells })
    } catch (err) {
      console.error('Failed to load shells:', err)
    }
  },

  addTerminalSession: (shellProfile?: ShellProfile) => {
    const { terminalSessions, workspacePath } = get()
    const nextIndex = terminalSessions.length + 1
    const newId = `term-${Date.now()}`
    const title = shellProfile ? `${shellProfile.name} ${nextIndex}` : `Terminal ${nextIndex}`

    const newSession: TerminalSessionInfo = {
      id: newId,
      title,
      shell: shellProfile?.path
    }

    set({
      terminalSessions: [...terminalSessions, newSession],
      activeTerminalId: newId,
      activeBottomTab: 'terminal',
      isBottomDeckOpen: true
    })

    // Spawn process in backend
    window.maestroAPI?.createTerminal(newId, workspacePath || undefined, shellProfile?.path)
    return newId
  },

  closeTerminalSession: (id: string) => {
    const { terminalSessions, activeTerminalId, workspacePath } = get()
    window.maestroAPI?.killTerminal(id)

    const remaining = terminalSessions.filter((t) => t.id !== id)
    if (remaining.length === 0) {
      const defaultId = `term-${Date.now()}`
      set({
        terminalSessions: [{ id: defaultId, title: 'Terminal 1', shell: undefined }],
        activeTerminalId: defaultId
      })
      window.maestroAPI?.createTerminal(defaultId, workspacePath || undefined)
      return
    }

    let nextActiveId = activeTerminalId
    if (activeTerminalId === id) {
      nextActiveId = remaining[remaining.length - 1].id
    }

    set({
      terminalSessions: remaining,
      activeTerminalId: nextActiveId
    })
  },

  setActiveTerminalId: (id: string) => {
    set({ activeTerminalId: id })
  },

  toggleSettingsModal: () => set((state) => ({ isSettingsModalOpen: !state.isSettingsModalOpen })),
  setSettingsModalOpen: (open: boolean) => set({ isSettingsModalOpen: open }),

  loadWorkspaceSettings: async (workspacePath: string) => {
    try {
      const settings = await window.maestroAPI.loadSettings(workspacePath)
      if (settings) {
        set({ editorSettings: settings })
      }
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
  }
}))

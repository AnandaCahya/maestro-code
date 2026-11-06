import { create } from 'zustand'
import type { FileItem, GitStatusResult, GitFileStatus } from '../../../preload/index.d'

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
  severity: 'error' | 'warning' | 'info'
  line: number
  column: number
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
  activeSidebarTab: 'files' | 'git'
  cursorPosition: { line: number; col: number }
  statusMessage: string
  lspStatus: 'idle' | 'ready' | 'syncing'
  focusTask: { id: string; title: string } | null
  diagnostics: DiagnosticItem[]
  activeBottomTab: 'terminal' | 'problems'
  isBottomDeckOpen: boolean

  // Git state
  gitStatus: GitStatusResult
  diffSession: DiffSession | null

  setWorkspacePath: (path: string | null) => void
  setFileTree: (tree: FileItem[]) => void
  openFile: (file: { path: string; name: string; content: string }) => void
  closeFile: (filePath: string) => void
  setActiveFile: (filePath: string) => void
  updateFileContent: (filePath: string, content: string) => void
  markFileSaved: (filePath: string) => void
  setLayoutMode: (mode: LayoutMode) => void
  toggleSidebar: () => void
  setActiveSidebarTab: (tab: 'files' | 'git') => void
  setCursorPosition: (line: number, col: number) => void
  setStatusMessage: (msg: string) => void
  setLspStatus: (status: 'idle' | 'ready' | 'syncing') => void
  setFocusTask: (task: { id: string; title: string } | null) => void
  setDiagnostics: (items: DiagnosticItem[]) => void
  setActiveBottomTab: (tab: 'terminal' | 'problems') => void
  toggleBottomDeck: () => void
  setBottomDeckOpen: (open: boolean) => void

  // Git actions
  setGitStatus: (status: GitStatusResult) => void
  openDiff: (diff: DiffSession) => void
  closeDiff: () => void
  refreshGitStatus: () => Promise<void>
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
  activeBottomTab: 'terminal',
  isBottomDeckOpen: false,

  gitStatus: { branch: 'main', files: [] },
  diffSession: null,

  setWorkspacePath: (path) => {
    set({ workspacePath: path })
    if (path) {
      get().refreshGitStatus()
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
        diffSession: null, // Tutup diff jika membuka file biasa
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
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
  setCursorPosition: (line, col) => set({ cursorPosition: { line, col } }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setLspStatus: (lspStatus) => set({ lspStatus }),
  setFocusTask: (focusTask) => set({ focusTask }),
  setDiagnostics: (diagnostics) => set({ diagnostics }),
  setActiveBottomTab: (activeBottomTab) => set({ activeBottomTab, isBottomDeckOpen: true }),
  toggleBottomDeck: () => set((state) => ({ isBottomDeckOpen: !state.isBottomDeckOpen })),
  setBottomDeckOpen: (isBottomDeckOpen) => set({ isBottomDeckOpen }),

  setGitStatus: (gitStatus) => set({ gitStatus }),
  openDiff: (diffSession) => set({ diffSession, layoutMode: get().layoutMode === 'project' ? 'split' : get().layoutMode }),
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
  }
}))

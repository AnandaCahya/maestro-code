import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  FileCode2,
  KanbanSquare,
  ArrowRight,
  Terminal,
  Settings,
  Layout,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  FileText,
  Trash2,
  FolderPlus,
  FilePlus,
  Command,
  Code,
  Box,
  Layers,
  Sparkles,
  History,
  Folder,
  RotateCcw,
  FolderOpen,
  Save,
  Keyboard,
  Play,
  Hammer,
  Bug,
  Puzzle,
  Maximize2,
  Eye,
  FlaskConical
} from 'lucide-react'
import { useEditorStore, DocumentSymbolItem } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import { useDebugStore } from '../../store/useDebugStore'
import { useTestStore } from '../../store/useTestStore'
import { useExtensionStore } from '../../store/useExtensionStore'
import { lspClient } from '../../services/lspClient'
import type { FileItem } from '../../../../preload/index.d'

interface CommandItem {
  id: string
  title: string
  category: string
  shortcut?: string
  icon: React.ReactNode
  action: () => void
}

interface OmniJumpModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'files' | 'commands' | 'symbols' | 'line' | 'workspace-symbols'
}

function fuzzyFileScore(target: string, query: string): number {
  const t = target.toLowerCase()
  const q = query.toLowerCase()
  let tIdx = 0
  let qIdx = 0
  let score = 0
  let consecutive = 0

  while (tIdx < t.length && qIdx < q.length) {
    if (t[tIdx] === q[qIdx]) {
      score += 10
      if (consecutive > 0) score += consecutive * 5
      if (
        tIdx === 0 ||
        t[tIdx - 1] === '/' ||
        t[tIdx - 1] === '\\' ||
        t[tIdx - 1] === '.' ||
        t[tIdx - 1] === '-' ||
        t[tIdx - 1] === '_'
      ) {
        score += 25
      }
      consecutive++
      qIdx++
    } else {
      consecutive = 0
    }
    tIdx++
  }

  if (qIdx < q.length) return -1
  if (t === q) score += 100
  if (t.startsWith(q)) score += 50
  return score
}

export const OmniJumpModal: React.FC<OmniJumpModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'files'
}) => {
  const {
    fileTree,
    openFile,
    closeFile,
    activeFilePath,
    setLayoutMode,
    toggleSidebar,
    setActiveSidebarTab,
    toggleBottomDeck,
    setActiveBottomTab,
    toggleSettingsModal,
    toggleKeyboardShortcuts,
    addTerminalSession,
    activeTerminalId,
    workspacePath,
    openWorkspace,
    recentWorkspaces,
    fetchRecentWorkspaces,
    toggleWorkspaceTrust,
    refreshGitStatus,
    documentSymbols,
    setCursorPosition,
    pushNavHistory,
    recentFiles,
    reopenClosedFile,
    nextEditor,
    previousEditor,
    openWorkspaceFile,
    saveWorkspaceAsFile,
    workspaceTasks,
    runTask,
    runBuildTask,
    runTestTask,
    toggleZenMode
  } = useEditorStore()

  const { projectData } = useProjectStore()
  const [workspaceSymbols, setWorkspaceSymbols] = useState<
    Array<{
      name: string
      kind: string
      containerName?: string
      filePath: string
      line: number
      col: number
    }>
  >([])
  const [isSearchingWsSymbols, setIsSearchingWsSymbols] = useState(false)

  const [query, setQuery] = useState(
    initialMode === 'commands'
      ? '> '
      : initialMode === 'symbols'
        ? '@ '
        : initialMode === 'line'
          ? ': '
          : initialMode === 'workspace-symbols'
            ? '# '
            : ''
  )

  useEffect(() => {
    if (isOpen) {
      fetchRecentWorkspaces()
      setQuery(
        initialMode === 'commands'
          ? '> '
          : initialMode === 'symbols'
            ? '@ '
            : initialMode === 'line'
              ? ': '
              : initialMode === 'workspace-symbols'
                ? '# '
                : ''
      )
    }
  }, [isOpen, initialMode])

  const getAllFiles = (items: FileItem[]): FileItem[] => {
    let result: FileItem[] = []
    for (const item of items) {
      if (!item.isDirectory) {
        result.push(item)
      }
      if (item.children) {
        result = result.concat(getAllFiles(item.children))
      }
    }
    return result
  }

  const allFiles = useMemo(() => getAllFiles(fileTree), [fileTree])

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'cmd-open-recent',
        title: 'File: Open Recent Project...',
        category: 'Workspace',
        icon: <History className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => setQuery('recents ')
      },
      {
        id: 'cmd-reopen-closed-editor',
        title: 'View: Reopen Closed Editor',
        category: 'View',
        shortcut: 'Ctrl+Shift+T',
        icon: <RotateCcw className="w-3.5 h-3.5 text-studio-cyan" />,
        action: async () => {
          await reopenClosedFile()
          onClose()
        }
      },
      {
        id: 'cmd-next-editor',
        title: 'View: Open Next Editor',
        category: 'View',
        shortcut: 'Ctrl+Tab',
        icon: <ArrowRight className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          nextEditor()
          onClose()
        }
      },
      {
        id: 'cmd-prev-editor',
        title: 'View: Open Previous Editor',
        category: 'View',
        shortcut: 'Ctrl+Shift+Tab',
        icon: <ArrowRight className="w-3.5 h-3.5 rotate-180 text-studio-amber" />,
        action: () => {
          previousEditor()
          onClose()
        }
      },
      {
        id: 'cmd-trust-toggle',
        title: 'Workspace: Toggle Workspace Trust (Trusted / Restricted)',
        category: 'Workspace',
        icon: <Sparkles className="w-3.5 h-3.5 text-studio-emerald" />,
        action: () => toggleWorkspaceTrust()
      },
      {
        id: 'cmd-open-workspace-file',
        title: 'File: Open Workspace from File... (.code-workspace)',
        category: 'Workspace',
        icon: <FolderOpen className="w-3.5 h-3.5 text-studio-amber" />,
        action: async () => {
          onClose()
          const file = await window.maestroAPI.openWorkspaceFileDialog()
          if (file) {
            await openWorkspaceFile(file)
          }
        }
      },
      {
        id: 'cmd-save-workspace-file',
        title: 'File: Save Workspace As Configuration... (.code-workspace)',
        category: 'Workspace',
        icon: <Save className="w-3.5 h-3.5 text-studio-emerald" />,
        action: async () => {
          onClose()
          if (!workspacePath) return
          const defaultPath = `${workspacePath}/workspace.code-workspace`
          const target = window.prompt('Enter path to save .code-workspace file:', defaultPath)
          if (target && target.trim()) {
            await saveWorkspaceAsFile(target.trim())
          }
        }
      },
      {
        id: 'cmd-workspace-symbols',
        title: 'Preferences: Go to Symbol in Workspace...',
        category: 'Navigation',
        shortcut: 'Ctrl+T',
        icon: <Box className="w-3.5 h-3.5 text-studio-cyan" />,
        action: () => setQuery('# ')
      },
      {
        id: 'cmd-settings',
        title: 'Preferences: Open Settings & .vscode Configuration',
        category: 'Preferences',
        shortcut: 'Ctrl+,',
        icon: <Settings className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => toggleSettingsModal()
      },
      {
        id: 'cmd-keyboard-shortcuts',
        title: 'Preferences: Open Keyboard Shortcuts',
        category: 'Preferences',
        shortcut: 'Ctrl+K Ctrl+S',
        icon: <Keyboard className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => toggleKeyboardShortcuts()
      },
      {
        id: 'cmd-view-zen-mode',
        title: 'View: Toggle Zen Mode',
        category: 'View',
        shortcut: 'Ctrl+K Z',
        icon: <Eye className="w-3.5 h-3.5 text-studio-cyan" />,
        action: () => toggleZenMode()
      },
      {
        id: 'cmd-view-full-screen',
        title: 'View: Toggle Full Screen',
        category: 'View',
        shortcut: 'F11',
        icon: <Maximize2 className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => window.maestroAPI?.toggleFullScreen?.()
      },
      {
        id: 'cmd-tasks-build',
        title: 'Tasks: Run Build Task',
        category: 'Tasks',
        shortcut: 'Ctrl+Shift+B',
        icon: <Hammer className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => runBuildTask()
      },
      {
        id: 'cmd-tasks-test',
        title: 'Tasks: Run Test Task',
        category: 'Tasks',
        icon: <Play className="w-3.5 h-3.5 text-studio-emerald" />,
        action: () => runTestTask()
      },
      ...workspaceTasks.map((t) => ({
        id: `cmd-task-${t.id}`,
        title: `Tasks: Run Task: ${t.label}`,
        category: 'Tasks',
        icon: <Play className="w-3.5 h-3.5 text-studio-cyan" />,
        action: () => runTask(t)
      })),
      {
        id: 'cmd-debug-start',
        title: 'Debug: Start / Continue Debugging',
        category: 'Debug',
        shortcut: 'F5',
        icon: <Play className="w-3.5 h-3.5 text-studio-accent" />,
        action: () => {
          useDebugStore.getState().startDebugging()
          onClose()
        }
      },
      {
        id: 'cmd-debug-stop',
        title: 'Debug: Stop Debugging',
        category: 'Debug',
        shortcut: 'Shift+F5',
        icon: <Bug className="w-3.5 h-3.5 text-studio-rose" />,
        action: () => {
          useDebugStore.getState().stopDebugging()
          onClose()
        }
      },
      {
        id: 'cmd-debug-restart',
        title: 'Debug: Restart Debugging',
        category: 'Debug',
        shortcut: 'Ctrl+Shift+F5',
        icon: <RotateCcw className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          useDebugStore.getState().restartDebugging()
          onClose()
        }
      },
      {
        id: 'cmd-debug-step-over',
        title: 'Debug: Step Over',
        category: 'Debug',
        shortcut: 'F10',
        icon: <ArrowRight className="w-3.5 h-3.5 text-studio-cyan" />,
        action: () => {
          useDebugStore.getState().stepOver()
          onClose()
        }
      },
      {
        id: 'cmd-debug-step-into',
        title: 'Debug: Step Into',
        category: 'Debug',
        shortcut: 'F11',
        icon: <ArrowRight className="w-3.5 h-3.5 text-studio-cyan" />,
        action: () => {
          useDebugStore.getState().stepInto()
          onClose()
        }
      },
      {
        id: 'cmd-debug-toggle-bp',
        title: 'Debug: Toggle Breakpoint',
        category: 'Debug',
        shortcut: 'F9',
        icon: <Bug className="w-3.5 h-3.5 text-studio-rose" />,
        action: () => {
          const activeFile = useEditorStore.getState().activeFilePath
          const cursor = useEditorStore.getState().cursorPosition
          if (activeFile) {
            useDebugStore.getState().toggleBreakpoint(activeFile, cursor.line)
          }
          onClose()
        }
      },
      {
        id: 'cmd-view-debug-panel',
        title: 'View: Show Run and Debug Sidebar',
        category: 'View',
        shortcut: 'Ctrl+Shift+D',
        icon: <Bug className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          setActiveSidebarTab('debug')
          onClose()
        }
      },
      {
        id: 'cmd-view-debug-console',
        title: 'View: Show Debug Console',
        category: 'View',
        icon: <Terminal className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          setActiveBottomTab('debug')
          setBottomDeckOpen(true)
          onClose()
        }
      },
      {
        id: 'cmd-testing-run-all',
        title: 'Testing: Run All Tests',
        category: 'Testing',
        icon: <Play className="w-3.5 h-3.5 text-studio-accent" />,
        action: () => {
          useTestStore.getState().runAllTests()
          onClose()
        }
      },
      {
        id: 'cmd-testing-run-failed',
        title: 'Testing: Rerun Failed Tests',
        category: 'Testing',
        icon: <RotateCcw className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          useTestStore.getState().runFailedTests()
          onClose()
        }
      },
      {
        id: 'cmd-testing-refresh',
        title: 'Testing: Refresh Test Discovery',
        category: 'Testing',
        icon: <FlaskConical className="w-3.5 h-3.5 text-studio-cyan" />,
        action: () => {
          if (workspacePath) useTestStore.getState().discoverTests(workspacePath)
          onClose()
        }
      },
      {
        id: 'cmd-view-test-explorer',
        title: 'View: Show Test Explorer',
        category: 'View',
        icon: <FlaskConical className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          setActiveSidebarTab('tests')
          onClose()
        }
      },
      {
        id: 'cmd-view-test-results',
        title: 'View: Show Test Results Panel',
        category: 'View',
        icon: <FlaskConical className="w-3.5 h-3.5 text-studio-emerald" />,
        action: () => {
          setActiveBottomTab('tests')
          setBottomDeckOpen(true)
          onClose()
        }
      },
      {
        id: 'cmd-view-extensions',
        title: 'View: Show Extensions Sidebar',
        category: 'View',
        shortcut: 'Ctrl+Shift+X',
        icon: <Puzzle className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          setActiveSidebarTab('extensions')
          onClose()
        }
      },
      {
        id: 'cmd-extensions-install-folder',
        title: 'Extensions: Install Extension from Local Folder...',
        category: 'Extensions',
        icon: <FolderPlus className="w-3.5 h-3.5 text-studio-cyan" />,
        action: async () => {
          if (!window.maestroAPI) return
          const target = await window.maestroAPI.openDirectoryDialog()
          if (target) {
            await useExtensionStore.getState().installLocalExtension(target)
          }
          onClose()
        }
      },
      ...useExtensionStore.getState().contributedCommands.map((c) => ({
        id: `cmd-ext-${c.command}`,
        title: `${c.category || 'Extensions'}: ${c.title}`,
        category: c.category || 'Extensions',
        icon: <Puzzle className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          useExtensionStore.getState().executeCommand(c.command)
          onClose()
        }
      })),
      {
        id: 'cmd-debug-launch-config',
        title: 'Debug: Inspect Launch Configurations (.vscode/launch.json)',
        category: 'Debug',
        icon: <Bug className="w-3.5 h-3.5 text-studio-rose" />,
        action: async () => {
          if (!workspacePath) return
          const res = await window.maestroAPI.loadLaunchConfig(workspacePath)
          if (res && res.configurations.length > 0) {
            useEditorStore.getState().setStatusMessage(
              `Launch Configurations: ${res.configurations.map((c) => c.name).join(', ')}`
            )
          } else {
            useEditorStore.getState().setStatusMessage('No launch configurations in .vscode/launch.json')
          }
          setTimeout(() => useEditorStore.getState().setStatusMessage('Ready'), 3500)
          onClose()
        }
      },
      {
        id: 'cmd-extensions-recommendations',
        title: 'Extensions: Show Recommended Extensions (.vscode/extensions.json)',
        category: 'Extensions',
        icon: <Puzzle className="w-3.5 h-3.5 text-studio-amber" />,
        action: async () => {
          if (!workspacePath) return
          const res = await window.maestroAPI.loadExtensionRecommendations(workspacePath)
          if (res && res.recommendations.length > 0) {
            useEditorStore.getState().setStatusMessage(
              `Recommended: ${res.recommendations.join(', ')}`
            )
          } else {
            useEditorStore.getState().setStatusMessage('No recommended extensions in .vscode/extensions.json')
          }
          setTimeout(() => useEditorStore.getState().setStatusMessage('Ready'), 3500)
          onClose()
        }
      },
      {
        id: 'cmd-organize-imports',
        title: 'Source Action: Organize Imports',
        category: 'Source Actions',
        shortcut: 'Shift+Alt+O',
        icon: <Sparkles className="w-3.5 h-3.5 text-studio-emerald" />,
        action: async () => {
          if (activeFilePath) {
            const success = await lspClient.organizeImports(activeFilePath)
            if (success) {
              useEditorStore.getState().setStatusMessage('Organized imports')
              setTimeout(() => useEditorStore.getState().setStatusMessage('Ready'), 1500)
            }
          }
          onClose()
        }
      },
      {
        id: 'cmd-edit-trim-ws',
        title: 'Edit: Trim Trailing Whitespace',
        category: 'Edit',
        icon: <Code className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          window.dispatchEvent(new CustomEvent('editor-run-command', { detail: { command: 'trim-trailing-whitespace' } }))
        }
      },
      {
        id: 'cmd-edit-uppercase',
        title: 'Edit: Transform to Uppercase',
        category: 'Edit',
        icon: <Code className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          window.dispatchEvent(new CustomEvent('editor-run-command', { detail: { command: 'transform-uppercase' } }))
        }
      },
      {
        id: 'cmd-edit-lowercase',
        title: 'Edit: Transform to Lowercase',
        category: 'Edit',
        icon: <Code className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          window.dispatchEvent(new CustomEvent('editor-run-command', { detail: { command: 'transform-lowercase' } }))
        }
      },
      {
        id: 'cmd-edit-titlecase',
        title: 'Edit: Transform to Title Case',
        category: 'Edit',
        icon: <Code className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          window.dispatchEvent(new CustomEvent('editor-run-command', { detail: { command: 'transform-titlecase' } }))
        }
      },
      {
        id: 'cmd-edit-surround-quotes',
        title: 'Edit: Surround Selection with Double Quotes ("")',
        category: 'Edit',
        icon: <Code className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          window.dispatchEvent(new CustomEvent('editor-run-command', { detail: { command: 'surround-quotes' } }))
        }
      },
      {
        id: 'cmd-edit-surround-parens',
        title: 'Edit: Surround Selection with Parentheses ( )',
        category: 'Edit',
        icon: <Code className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          window.dispatchEvent(new CustomEvent('editor-run-command', { detail: { command: 'surround-parentheses' } }))
        }
      },
      {
        id: 'cmd-edit-surround-braces',
        title: 'Edit: Surround Selection with Curly Braces { }',
        category: 'Edit',
        icon: <Code className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          window.dispatchEvent(new CustomEvent('editor-run-command', { detail: { command: 'surround-braces' } }))
        }
      },
      {
        id: 'cmd-term-toggle',
        title: 'View: Toggle Terminal Deck',
        category: 'Terminal',
        shortcut: 'Ctrl+`',
        icon: <Terminal className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => {
          setActiveBottomTab('terminal')
          toggleBottomDeck()
        }
      },
      {
        id: 'cmd-problems-toggle',
        title: 'View: Toggle Problems & LSP Diagnostics Deck',
        category: 'Diagnostics',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-studio-emerald" />,
        action: () => {
          setActiveBottomTab('problems')
          toggleBottomDeck()
        }
      },
      {
        id: 'cmd-term-new',
        title: 'Terminal: Create New Terminal Session',
        category: 'Terminal',
        icon: <Terminal className="w-3.5 h-3.5 text-studio-cyan" />,
        action: () => addTerminalSession()
      },
      {
        id: 'cmd-term-clear',
        title: 'Terminal: Clear Active Terminal Screen',
        category: 'Terminal',
        shortcut: 'Ctrl+L',
        icon: <Trash2 className="w-3.5 h-3.5 text-studio-muted" />,
        action: () => {
          if (activeTerminalId) {
            window.maestroAPI?.writeTerminal(activeTerminalId, '\x0c')
          }
        }
      },
      {
        id: 'cmd-sidebar-toggle',
        title: 'View: Toggle Primary Workspace Sidebar',
        category: 'View',
        shortcut: 'Ctrl+B',
        icon: <Layout className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => toggleSidebar()
      },
      {
        id: 'cmd-search-files',
        title: 'View: Search in Files (Global Search & Replace)',
        category: 'Search',
        shortcut: 'Ctrl+Shift+F',
        icon: <Search className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => setActiveSidebarTab('search')
      },
      {
        id: 'cmd-view-files',
        title: 'View: Explorer File Tree',
        category: 'Explorer',
        icon: <FileCode2 className="w-3.5 h-3.5 text-studio-muted" />,
        action: () => setActiveSidebarTab('files')
      },
      {
        id: 'cmd-view-git',
        title: 'View: Source Control Git Panel',
        category: 'Git',
        icon: <GitCommit className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => setActiveSidebarTab('git')
      },
      {
        id: 'cmd-layout-dual',
        title: 'Layout: Switch to Dual Deck (Split View 50:50)',
        category: 'Layout',
        icon: <Layout className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => setLayoutMode('split')
      },
      {
        id: 'cmd-layout-editor',
        title: 'Layout: Switch to Code Canvas (Editor Only)',
        category: 'Layout',
        icon: <FileText className="w-3.5 h-3.5 text-studio-muted" />,
        action: () => setLayoutMode('editor')
      },
      {
        id: 'cmd-layout-project',
        title: 'Layout: Switch to Project Deck (Kanban Tasks)',
        category: 'Layout',
        icon: <KanbanSquare className="w-3.5 h-3.5 text-studio-emerald" />,
        action: () => setLayoutMode('project')
      },
      {
        id: 'cmd-file-close',
        title: 'File: Close Active Tab',
        category: 'File',
        shortcut: 'Ctrl+W',
        icon: <FileCode2 className="w-3.5 h-3.5 text-studio-rose" />,
        action: () => {
          if (activeFilePath) closeFile(activeFilePath)
        }
      },
      {
        id: 'cmd-git-pull',
        title: 'Git: Pull Remote Changes',
        category: 'Git',
        icon: <GitPullRequest className="w-3.5 h-3.5 text-studio-cyan" />,
        action: async () => {
          if (workspacePath) {
            await window.maestroAPI.gitPull(workspacePath)
            await refreshGitStatus()
          }
        }
      },
      {
        id: 'cmd-goto-symbol',
        title: 'Go to Symbol in Active Editor...',
        category: 'Navigation',
        shortcut: 'Ctrl+Shift+O',
        icon: <Code className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => setQuery('@ ')
      },
      {
        id: 'cmd-git-push',
        title: 'Git: Push Commits to Remote',
        category: 'Git',
        icon: <GitPullRequest className="w-3.5 h-3.5 text-studio-emerald" />,
        action: async () => {
          if (workspacePath) {
            await window.maestroAPI.gitPush(workspacePath)
            await refreshGitStatus()
          }
        }
      }
    ],
    [
      toggleSettingsModal,
      toggleKeyboardShortcuts,
      setActiveBottomTab,
      toggleBottomDeck,
      addTerminalSession,
      activeTerminalId,
      toggleSidebar,
      setActiveSidebarTab,
      setLayoutMode,
      activeFilePath,
      closeFile,
      workspacePath,
      workspaceTasks,
      runTask,
      runBuildTask,
      runTestTask,
      toggleZenMode,
      refreshGitStatus,
      reopenClosedFile,
      onClose
    ]
  )

  const isCommandMode = query.startsWith('>')
  const isSymbolMode = query.startsWith('@')
  const isWorkspaceSymbolMode = query.startsWith('#')
  const isLineMode = query.startsWith(':')
  const isProjectsMode =
    query.startsWith('recents ') ||
    query.startsWith('recent ') ||
    query.startsWith('p ')
  const cleanCmdQuery = isCommandMode ? query.slice(1).trim().toLowerCase() : ''
  const cleanSymbolQuery = isSymbolMode ? query.slice(1).trim().toLowerCase() : ''
  const cleanWorkspaceSymbolQuery = isWorkspaceSymbolMode ? query.slice(1).trim() : ''
  const cleanLineQuery = isLineMode ? query.slice(1).trim() : ''
  const cleanProjectQuery = isProjectsMode
    ? query.replace(/^(recents|recent|p)\s*/i, '').trim().toLowerCase()
    : ''

  useEffect(() => {
    if (isWorkspaceSymbolMode && isOpen) {
      setIsSearchingWsSymbols(true)
      const timeout = setTimeout(async () => {
        try {
          const syms = await lspClient.getWorkspaceSymbols(cleanWorkspaceSymbolQuery)
          setWorkspaceSymbols(syms)
        } catch {
          setWorkspaceSymbols([])
        } finally {
          setIsSearchingWsSymbols(false)
        }
      }, 150)
      return () => clearTimeout(timeout)
    }
  }, [isWorkspaceSymbolMode, cleanWorkspaceSymbolQuery, isOpen])

  const lineTarget = useMemo(() => {
    if (!isLineMode) return null
    const match = cleanLineQuery.match(/^(\d+)(?::(\d+))?$/)
    if (!match) return null
    return {
      line: parseInt(match[1], 10),
      column: match[2] ? parseInt(match[2], 10) : 1
    }
  }, [isLineMode, cleanLineQuery])

  const filteredCommands = useMemo(() => {
    if (!isCommandMode) return []
    if (!cleanCmdQuery) return commands
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(cleanCmdQuery) ||
        c.category.toLowerCase().includes(cleanCmdQuery)
    )
  }, [isCommandMode, cleanCmdQuery, commands])

  const flatSymbols = useMemo(() => {
    const list: DocumentSymbolItem[] = []
    const recurse = (items: DocumentSymbolItem[]) => {
      for (const item of items) {
        list.push(item)
        if (item.children) recurse(item.children)
      }
    }
    recurse(documentSymbols)
    return list
  }, [documentSymbols])

  const filteredSymbols = useMemo(() => {
    if (!isSymbolMode) return []
    if (!cleanSymbolQuery) return flatSymbols.slice(0, 40)
    return flatSymbols
      .filter(
        (s) =>
          s.name.toLowerCase().includes(cleanSymbolQuery) ||
          s.kind.toLowerCase().includes(cleanSymbolQuery)
      )
      .slice(0, 40)
  }, [isSymbolMode, cleanSymbolQuery, flatSymbols])

  const filteredFiles = useMemo(() => {
    if (isCommandMode || isSymbolMode || isWorkspaceSymbolMode || isLineMode || isProjectsMode) return []
    const q = query.toLowerCase().trim()
    if (!q) {
      if (recentFiles && recentFiles.length > 0) {
        const fileMap = new Map<string, FileItem>()
        for (const f of allFiles) {
          fileMap.set(f.path, f)
        }
        const recents: FileItem[] = []
        for (const p of recentFiles) {
          const found = fileMap.get(p)
          if (found) {
            recents.push(found)
          } else {
            const name = p.split(/[\\/]/).pop() || p
            recents.push({ path: p, name, isDirectory: false })
          }
        }
        return recents.slice(0, 8)
      }
      return allFiles.slice(0, 8)
    }

    const scored: Array<{ file: FileItem; score: number }> = []
    for (const f of allFiles) {
      const nameScore = fuzzyFileScore(f.name, q)
      const pathScore = fuzzyFileScore(f.path, q)
      const bestScore = Math.max(nameScore, pathScore)
      if (bestScore >= 0) {
        scored.push({ file: f, score: bestScore })
      }
    }
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 8).map((s) => s.file)
  }, [allFiles, query, recentFiles, isCommandMode, isSymbolMode, isWorkspaceSymbolMode, isLineMode, isProjectsMode])

  const filteredTasks = useMemo(() => {
    if (isCommandMode || isSymbolMode || isWorkspaceSymbolMode || isLineMode || isProjectsMode) return []
    const q = query.toLowerCase()
    return projectData.tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      )
      .slice(0, 4)
  }, [projectData.tasks, query, isCommandMode, isSymbolMode, isWorkspaceSymbolMode, isLineMode, isProjectsMode])

  const filteredProjects = useMemo(() => {
    if (isCommandMode || isSymbolMode || isWorkspaceSymbolMode || isLineMode) return []
    const q = isProjectsMode ? cleanProjectQuery : query.toLowerCase().trim()
    if (!isProjectsMode && allFiles.length > 0 && q) return []
    return recentWorkspaces
      .filter(
        (rw) =>
          !q ||
          rw.name.toLowerCase().includes(q) ||
          rw.path.toLowerCase().includes(q)
      )
      .slice(0, 5)
  }, [
    isCommandMode,
    isSymbolMode,
    isWorkspaceSymbolMode,
    isLineMode,
    isProjectsMode,
    cleanProjectQuery,
    query,
    allFiles.length,
    recentWorkspaces
  ])

  const handleSelectProject = async (projectPath: string) => {
    await openWorkspace(projectPath)
    onClose()
  }

  const handleSelectWorkspaceSymbol = async (sym: { filePath: string; line: number; col: number }) => {
    const isAlreadyOpen = useEditorStore.getState().openFiles.some((f) => f.path === sym.filePath)
    if (!isAlreadyOpen) {
      try {
        const content = await window.maestroAPI.readFile(sym.filePath)
        const name = sym.filePath.split(/[\\/]/).pop() || 'file'
        openFile({ path: sym.filePath, name, content })
      } catch (err) {
        console.error('Failed to open workspace symbol file:', err)
        return
      }
    } else {
      setActiveFile(sym.filePath)
    }

    setCursorPosition(sym.line, sym.col)
    pushNavHistory({ filePath: sym.filePath, line: sym.line, column: sym.col })
    window.dispatchEvent(
      new CustomEvent('editor-reveal-line', {
        detail: { line: sym.line, col: sym.col }
      })
    )
    onClose()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSelectFile = async (filePath: string, name: string) => {
    try {
      const content = await window.maestroAPI.readFile(filePath)
      openFile({ path: filePath, name, content })
      onClose()
    } catch (err) {
      console.error('Failed to open file via jump:', err)
    }
  }

  const handleSelectSymbol = (sym: DocumentSymbolItem) => {
    setCursorPosition(sym.range.startLine, sym.range.startCol)
    window.dispatchEvent(
      new CustomEvent('editor-reveal-line', {
        detail: { line: sym.range.startLine, column: sym.range.startCol }
      })
    )
    onClose()
  }

  const handleJumpToLine = (line: number, col = 1) => {
    setCursorPosition(line, col)
    window.dispatchEvent(
      new CustomEvent('editor-reveal-line', {
        detail: { line, column: col }
      })
    )
    onClose()
  }

  const handleSelectTask = () => {
    setLayoutMode('project')
    onClose()
  }

  const handleExecuteCommand = (cmd: CommandItem) => {
    cmd.action()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4 z-50 select-none animate-fade-in">
      <div
        className="glass-panel border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden flex flex-col shadow-studio-card bg-studio-card/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-white/[0.04] flex items-center gap-2.5">
          {isCommandMode ? (
            <Command className="w-4 h-4 text-studio-amber shrink-0" />
          ) : isSymbolMode ? (
            <Code className="w-4 h-4 text-studio-cyan shrink-0" />
          ) : isWorkspaceSymbolMode ? (
            <Box className="w-4 h-4 text-studio-cyan shrink-0" />
          ) : isLineMode ? (
            <ArrowRight className="w-4 h-4 text-studio-amber shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-studio-amber shrink-0" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (isLineMode && lineTarget) {
                  e.preventDefault()
                  handleJumpToLine(lineTarget.line, lineTarget.column)
                }
              }
            }}
            placeholder={
              isCommandMode
                ? 'Type a command to run...'
                : isSymbolMode
                  ? 'Type symbol name to jump in current file...'
                  : isWorkspaceSymbolMode
                    ? 'Type symbol name to search across entire workspace...'
                    : isLineMode
                      ? 'Type line:col to jump to (e.g. 42 or 42:5)...'
                      : 'Type file name, ">" commands, "@" symbols, "#" workspace, ":" line...'
            }
            className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted font-sans"
            autoFocus
          />
          <div className="flex items-center gap-1.5 shrink-0">
            {!isCommandMode && !isSymbolMode && !isWorkspaceSymbolMode && !isLineMode && (
              <>
                <button
                  onClick={() => setQuery(': ')}
                  className="text-[10px] text-studio-muted hover:text-studio-amber font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] cursor-pointer"
                  title="Go to Line Mode (Ctrl+G)"
                >
                  : Line
                </button>
                <button
                  onClick={() => setQuery('@ ')}
                  className="text-[10px] text-studio-muted hover:text-studio-cyan font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] cursor-pointer"
                  title="Current File Symbols (Ctrl+Shift+O)"
                >
                  @ Symbols
                </button>
                <button
                  onClick={() => setQuery('# ')}
                  className="text-[10px] text-studio-muted hover:text-studio-cyan font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] cursor-pointer"
                  title="Workspace Symbols (Ctrl+T)"
                >
                  # Workspace
                </button>
                <button
                  onClick={() => setQuery('> ')}
                  className="text-[10px] text-studio-muted hover:text-studio-amber font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] cursor-pointer"
                  title="Switch to Command Mode (Ctrl+Shift+P)"
                >
                  &gt; Commands
                </button>
              </>
            )}
            <kbd className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-studio-muted font-mono">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results Area */}
        <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
          {/* Symbol Mode Listing */}
          {isSymbolMode && (
            <div className="flex flex-col gap-0.5">
              <div className="px-2 py-1 text-[9px] font-semibold tracking-wider text-studio-muted uppercase font-mono flex items-center justify-between">
                <span>Symbols in Document ({filteredSymbols.length})</span>
                <span className="text-studio-subtle text-[8px] lowercase">jump to line</span>
              </div>
              {filteredSymbols.length > 0 ? (
                filteredSymbols.map((sym) => (
                  <div
                    key={sym.id}
                    onClick={() => handleSelectSymbol(sym)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-studio-cyan/10 hover:border-studio-cyan/20 border border-transparent cursor-pointer text-xs group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1 rounded bg-white/[0.04] group-hover:bg-studio-cyan/20 transition-colors shrink-0 text-studio-cyan">
                        {sym.kind === 'class' ? (
                          <Box className="w-3.5 h-3.5" />
                        ) : sym.kind === 'interface' ? (
                          <Layers className="w-3.5 h-3.5" />
                        ) : (
                          <Code className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="font-normal text-white group-hover:text-studio-cyan transition-colors truncate">
                        {sym.name}
                      </span>
                      <span className="text-[9px] text-studio-muted uppercase font-mono px-1.5 py-0.2 rounded bg-white/5">
                        {sym.kind}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <kbd className="text-[10px] font-mono bg-white/[0.05] border border-white/10 px-1.5 py-0.5 rounded text-studio-muted group-hover:text-studio-text">
                        line {sym.range.startLine}
                      </kbd>
                      <ArrowRight className="w-3 h-3 text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-studio-muted font-mono">
                  No symbols found in current document
                </div>
              )}
            </div>
          )}

          {/* Workspace Symbol Mode Listing */}
          {isWorkspaceSymbolMode && (
            <div className="flex flex-col gap-0.5">
              <div className="px-2 py-1 text-[9px] font-semibold tracking-wider text-studio-muted uppercase font-mono flex items-center justify-between">
                <span>
                  Workspace Symbols {isSearchingWsSymbols ? '(searching...)' : `(${workspaceSymbols.length})`}
                </span>
                <span className="text-studio-subtle text-[8px] lowercase">jump to symbol</span>
              </div>
              {workspaceSymbols.length > 0 ? (
                workspaceSymbols.map((sym, idx) => (
                  <div
                    key={`${sym.filePath}-${sym.name}-${idx}`}
                    onClick={() => handleSelectWorkspaceSymbol(sym)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-studio-cyan/10 hover:border-studio-cyan/20 border border-transparent cursor-pointer text-xs group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1 rounded bg-white/[0.04] group-hover:bg-studio-cyan/20 transition-colors shrink-0 text-studio-cyan">
                        {sym.kind === 'class' ? (
                          <Box className="w-3.5 h-3.5" />
                        ) : sym.kind === 'interface' ? (
                          <Layers className="w-3.5 h-3.5" />
                        ) : (
                          <Code className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="font-normal text-white group-hover:text-studio-cyan transition-colors truncate">
                        {sym.name}
                      </span>
                      <span className="text-[9px] text-studio-muted uppercase font-mono px-1.5 py-0.2 rounded bg-white/5 shrink-0">
                        {sym.kind}
                      </span>
                      {sym.containerName && (
                        <span className="text-[10px] text-studio-muted font-mono truncate max-w-[120px]">
                          in {sym.containerName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-studio-muted truncate max-w-[150px]">
                        {sym.filePath.split(/[\\/]/).pop()} [{sym.line}, {sym.col}]
                      </span>
                      <ArrowRight className="w-3 h-3 text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-studio-muted font-mono">
                  {isSearchingWsSymbols ? 'Searching workspace symbols...' : 'No workspace symbols found'}
                </div>
              )}
            </div>
          )}

          {/* Command Mode Listing */}
          {isCommandMode && (
            <div className="flex flex-col gap-0.5">
              <div className="px-2 py-1 text-[9px] font-semibold tracking-wider text-studio-muted uppercase font-mono">
                Commands
              </div>
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    onClick={() => handleExecuteCommand(cmd)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-studio-amber/10 hover:border-studio-amber/20 border border-transparent cursor-pointer text-xs group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1 rounded bg-white/[0.04] group-hover:bg-studio-amber/20 transition-colors shrink-0">
                        {cmd.icon}
                      </div>
                      <span className="font-normal text-white group-hover:text-studio-amber transition-colors truncate">
                        {cmd.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {cmd.shortcut && (
                        <kbd className="text-[10px] font-mono bg-white/[0.05] border border-white/10 px-1.5 py-0.5 rounded text-studio-muted group-hover:text-studio-text">
                          {cmd.shortcut}
                        </kbd>
                      )}
                      <ArrowRight className="w-3 h-3 text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-studio-muted font-mono">
                  No matching commands found
                </div>
              )}
            </div>
          )}

          {/* Go to Line Mode Listing */}
          {isLineMode && (
            <div className="flex flex-col gap-1 p-2">
              <div className="px-2 py-1 text-[9px] font-semibold tracking-wider text-studio-muted uppercase font-mono">
                Go to Line in Current File
              </div>
              {lineTarget ? (
                <div
                  onClick={() => handleJumpToLine(lineTarget.line, lineTarget.column)}
                  className="flex items-center justify-between p-3 rounded-xl bg-studio-amber/15 border border-studio-amber/30 text-white cursor-pointer hover:bg-studio-amber/25 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <ArrowRight className="w-4 h-4 text-studio-amber" />
                    <span className="text-xs font-mono">
                      Jump to line <strong className="text-studio-amber">{lineTarget.line}</strong>
                      {lineTarget.column > 1 ? `, column ${lineTarget.column}` : ''}
                    </span>
                  </div>
                  <kbd className="text-[10px] bg-studio-amber/20 px-2 py-0.5 rounded font-mono text-studio-amber border border-studio-amber/30">
                    Press Enter ↵
                  </kbd>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-studio-muted font-mono">
                  Type a line number between 1 and document length (e.g. :42 or :42:10)
                </div>
              )}
            </div>
          )}

          {/* Recent Projects Mode Listing */}
          {isProjectsMode && (
            <div className="flex flex-col gap-0.5">
              <div className="px-2 py-1 text-[9px] font-semibold tracking-wider text-studio-muted uppercase font-mono flex items-center justify-between">
                <span>Recent Projects ({filteredProjects.length})</span>
                <span className="text-studio-subtle text-[8px] lowercase">open workspace</span>
              </div>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((proj) => (
                  <div
                    key={proj.path}
                    onClick={() => handleSelectProject(proj.path)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-studio-amber/10 hover:border-studio-amber/20 border border-transparent cursor-pointer text-xs group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1 rounded bg-white/[0.04] group-hover:bg-studio-amber/20 transition-colors shrink-0 text-studio-amber">
                        <Folder className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-normal text-white group-hover:text-studio-amber transition-colors truncate">
                        {proj.name}
                      </span>
                      <span className="text-[10px] text-studio-muted font-mono truncate max-w-[200px]">
                        {proj.path}
                      </span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-studio-muted font-mono">
                  No recent projects found
                </div>
              )}
            </div>
          )}

          {/* Regular Files, Tasks, and Projects Mode */}
          {!isCommandMode && !isSymbolMode && !isLineMode && !isProjectsMode && (
            <>
              {filteredFiles.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[9px] font-semibold tracking-wider text-studio-muted uppercase font-mono flex items-center justify-between">
                    <span>{!query.trim() && recentFiles.length > 0 ? 'Recent Files' : 'Files'}</span>
                    {!query.trim() && recentFiles.length > 0 && (
                      <span className="text-studio-subtle text-[8px] lowercase">recently opened</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.path}
                        onClick={() => handleSelectFile(file.path, file.name)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs group transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCode2 className="w-3.5 h-3.5 text-studio-muted group-hover:text-studio-text transition-colors shrink-0" />
                          <span className="font-normal text-white truncate">{file.name}</span>
                          <span className="text-[10px] text-studio-muted font-mono truncate max-w-[180px]">
                            {file.path}
                          </span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredTasks.length > 0 && (
                <div className="mt-1 pt-1 border-t border-white/[0.04]">
                  <div className="px-2 py-1 text-[9px] font-semibold tracking-wider text-studio-muted uppercase font-mono">
                    Tasks
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={handleSelectTask}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs group transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <KanbanSquare className="w-3.5 h-3.5 text-studio-amber shrink-0" />
                          <span className="font-normal text-white truncate">{task.title}</span>
                          <span className="text-[9px] text-studio-muted uppercase font-mono px-1 py-0.2 rounded bg-white/5">
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredProjects.length > 0 && (
                <div className="mt-1 pt-1 border-t border-white/[0.04]">
                  <div className="px-2 py-1 text-[9px] font-semibold tracking-wider text-studio-muted uppercase font-mono">
                    Recent Projects
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {filteredProjects.map((proj) => (
                      <div
                        key={proj.path}
                        onClick={() => handleSelectProject(proj.path)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs group transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Folder className="w-3.5 h-3.5 text-studio-amber shrink-0" />
                          <span className="font-normal text-white truncate">{proj.name}</span>
                          <span className="text-[10px] text-studio-muted font-mono truncate max-w-[180px]">
                            {proj.path}
                          </span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredFiles.length === 0 &&
                filteredTasks.length === 0 &&
                filteredProjects.length === 0 && (
                  <div className="p-4 text-center text-xs text-studio-muted font-mono flex flex-col items-center gap-1.5">
                    <span>No matching files, tasks, or projects found</span>
                    <span className="text-[10px] text-studio-subtle">
                      Tip: Type <kbd className="text-studio-amber">&gt;</kbd> to view commands,{' '}
                      <kbd className="text-studio-amber">recents</kbd> for projects
                    </span>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

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
  Sparkles
} from 'lucide-react'
import { useEditorStore, DocumentSymbolItem } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
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
  initialMode?: 'files' | 'commands' | 'symbols' | 'line'
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
    addTerminalSession,
    activeTerminalId,
    workspacePath,
    refreshGitStatus,
    documentSymbols,
    setCursorPosition
  } = useEditorStore()

  const { projectData } = useProjectStore()
  const [query, setQuery] = useState(
    initialMode === 'commands'
      ? '> '
      : initialMode === 'symbols'
        ? '@ '
        : initialMode === 'line'
          ? ': '
          : ''
  )

  useEffect(() => {
    if (isOpen) {
      setQuery(
        initialMode === 'commands'
          ? '> '
          : initialMode === 'symbols'
            ? '@ '
            : initialMode === 'line'
              ? ': '
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
        id: 'cmd-settings',
        title: 'Preferences: Open Settings & .vscode Configuration',
        category: 'Preferences',
        shortcut: 'Ctrl+,',
        icon: <Settings className="w-3.5 h-3.5 text-studio-amber" />,
        action: () => toggleSettingsModal()
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
      refreshGitStatus
    ]
  )

  const isCommandMode = query.startsWith('>')
  const isSymbolMode = query.startsWith('@')
  const isLineMode = query.startsWith(':')
  const cleanCmdQuery = isCommandMode ? query.slice(1).trim().toLowerCase() : ''
  const cleanSymbolQuery = isSymbolMode ? query.slice(1).trim().toLowerCase() : ''
  const cleanLineQuery = isLineMode ? query.slice(1).trim() : ''

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
    if (isCommandMode || isSymbolMode || isLineMode) return []
    const q = query.toLowerCase()
    return allFiles.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 6)
  }, [allFiles, query, isCommandMode, isSymbolMode, isLineMode])

  const filteredTasks = useMemo(() => {
    if (isCommandMode || isSymbolMode || isLineMode) return []
    const q = query.toLowerCase()
    return projectData.tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      )
      .slice(0, 4)
  }, [projectData.tasks, query, isCommandMode, isSymbolMode])

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
                  ? 'Type symbol name to jump (e.g. function, class)...'
                  : isLineMode
                    ? 'Type line:col to jump to (e.g. 42 or 42:5)...'
                    : 'Type file or task name, ">" for commands, "@" for symbols, ":" for line...'
            }
            className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted font-sans"
            autoFocus
          />
          <div className="flex items-center gap-1.5 shrink-0">
            {!isCommandMode && !isSymbolMode && !isLineMode && (
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
                  title="Switch to Symbol Mode"
                >
                  @ Symbols
                </button>
                <button
                  onClick={() => setQuery('> ')}
                  className="text-[10px] text-studio-muted hover:text-studio-amber font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] cursor-pointer"
                  title="Switch to Command Mode"
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

          {/* Regular Files & Tasks Mode */}
          {!isCommandMode && !isSymbolMode && !isLineMode && (
            <>
              {filteredFiles.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[9px] font-semibold tracking-wider text-studio-muted uppercase font-mono">
                    Files
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

              {filteredFiles.length === 0 && filteredTasks.length === 0 && (
                <div className="p-4 text-center text-xs text-studio-muted font-mono flex flex-col items-center gap-1.5">
                  <span>No matching files or tasks found</span>
                  <span className="text-[10px] text-studio-subtle">
                    Tip: Type <kbd className="text-studio-amber">&gt;</kbd> to view all editor commands
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

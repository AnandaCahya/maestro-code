import React, { useState, useEffect, useRef } from 'react'
import {
  Terminal as TerminalIcon,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Trash2,
  Plus,
  ChevronDown,
  ExternalLink,
  SquareTerminal,
  Search,
  ArrowUp,
  ArrowDown,
  GitCommit,
  RefreshCw,
  Copy,
  Check,
  FileDiff,
  User,
  Calendar,
  RotateCcw,
  Zap,
  Columns2,
  Rows2,
  Bug
} from 'lucide-react'
import { CyberTerminal } from './CyberTerminal'
import { DebugConsole } from '../debug/DebugConsole'
import { useEditorStore, DiagnosticItem } from '../../store/useEditorStore'
import { lspClient } from '../../services/lspClient'
import type { ShellProfile } from '../../../../preload/index.d'

interface BottomDeckProps {
  onClose: () => void
}

export const BottomDeck: React.FC<BottomDeckProps> = ({ onClose }) => {
  const {
    activeBottomTab,
    setActiveBottomTab,
    diagnostics,
    diagnosticFilter,
    setDiagnosticFilter,
    diagnosticSearchQuery,
    setDiagnosticSearchQuery,
    jumpToNextProblem,
    jumpToPrevProblem,
    openFile,
    setActiveFile,
    setCursorPosition,
    terminalSessions,
    activeTerminalId,
    setActiveTerminalId,
    terminalSplitMode,
    toggleTerminalSplit,
    closeTerminalSplit,
    isTerminalSearchOpen,
    toggleTerminalSearch,
    addTerminalSession,
    closeTerminalSession,
    renameTerminalSession,
    restartTerminalSession,
    availableShells,
    fetchAvailableShells,
    gitHistory,
    activeCommitDetail,
    isHistoryLoading,
    historySearchQuery,
    setHistorySearchQuery,
    fetchGitHistory,
    fetchCommitDetail,
    closeCommitDetail,
    workspacePath,
    activeFilePath,
    openDiff,
    setStatusMessage,
    gitRevert,
    gitCherryPick,
    gitReset
  } = useEditorStore()

  const [isShellMenuOpen, setIsShellMenuOpen] = useState(false)
  const [filterByCurrentFile, setFilterByCurrentFile] = useState(false)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null)
  const [editingTerminalTitle, setEditingTerminalTitle] = useState('')
  const [quickFixMenu, setQuickFixMenu] = useState<{
    diag: DiagnosticItem
    actions: Array<{ title: string; kind?: string; edit?: any; isPreferred?: boolean }>
    x: number
    y: number
  } | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleCloseQuickFix = () => setQuickFixMenu(null)
    if (quickFixMenu) {
      window.addEventListener('click', handleCloseQuickFix)
    }
    return () => {
      window.removeEventListener('click', handleCloseQuickFix)
    }
  }, [quickFixMenu])

  const handleOpenQuickFix = async (e: React.MouseEvent, diag: DiagnosticItem) => {
    e.stopPropagation()
    setStatusMessage('Checking available quick fixes...')
    const actions = await lspClient.getCodeActionsForDiagnostic(diag)
    if (actions.length === 0) {
      setStatusMessage('No automated quick fixes available for this diagnostic')
      setTimeout(() => setStatusMessage('Ready'), 2000)
      return
    }

    if (actions.length === 1 && actions[0].edit) {
      await lspClient.applyWorkspaceEdit(actions[0].edit)
      setStatusMessage(`Applied fix: ${actions[0].title}`)
      setTimeout(() => setStatusMessage('Ready'), 2500)
      return
    }

    setQuickFixMenu({
      diag,
      actions,
      x: Math.min(e.clientX, window.innerWidth - 260),
      y: Math.max(e.clientY - 120, 20)
    })
    setStatusMessage('Ready')
  }

  useEffect(() => {
    fetchAvailableShells()
  }, [])

  useEffect(() => {
    if (activeBottomTab === 'history') {
      fetchGitHistory(filterByCurrentFile && activeFilePath ? activeFilePath : undefined)
    }
  }, [activeBottomTab, filterByCurrentFile, activeFilePath])

  // Close shell dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsShellMenuOpen(false)
      }
    }
    if (isShellMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isShellMenuOpen])

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length
  const infoCount = diagnostics.filter((d) => d.severity === 'info' || d.severity === 'hint').length

  const filteredDiagnostics = diagnostics.filter((d) => {
    // 1. Severity filter
    if (diagnosticFilter === 'error' && d.severity !== 'error') return false
    if (diagnosticFilter === 'warning' && d.severity !== 'warning') return false
    if (diagnosticFilter === 'info' && d.severity !== 'info' && d.severity !== 'hint') return false

    // 2. Query filter
    if (diagnosticSearchQuery.trim()) {
      const q = diagnosticSearchQuery.toLowerCase()
      const matchMsg = d.message.toLowerCase().includes(q)
      const matchFile = d.fileName.toLowerCase().includes(q)
      const matchSource = (d.source || '').toLowerCase().includes(q)
      if (!matchMsg && !matchFile && !matchSource) return false
    }

    return true
  })

  const handleJumpToProblem = async (item: DiagnosticItem) => {
    try {
      const content = await window.maestroAPI.readFile(item.filePath)
      openFile({
        path: item.filePath,
        name: item.fileName,
        content
      })
      setActiveFile(item.filePath)
      setCursorPosition(item.line, item.column)
    } catch {
      setActiveFile(item.filePath)
      setCursorPosition(item.line, item.column)
    }
  }

  const handleCreateTerminal = (shell?: ShellProfile) => {
    addTerminalSession(shell)
    setIsShellMenuOpen(false)
  }

  const handleClearActiveTerminal = () => {
    if (activeTerminalId) {
      window.maestroAPI?.writeTerminal(activeTerminalId, '\x0c') // FormFeed / Ctrl+L
    }
  }

  const handleCopyHash = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 1800)
  }

  const handleViewCommitFileDiff = async (file: { path: string; status: string }) => {
    if (!workspacePath || !activeCommitDetail) return
    try {
      const original = await window.maestroAPI.gitGetFileAtCommit(
        workspacePath,
        `${activeCommitDetail.hash}~1`,
        file.path
      )
      const modified = await window.maestroAPI.gitGetFileAtCommit(
        workspacePath,
        activeCommitDetail.hash,
        file.path
      )
      openDiff({
        path: file.path,
        name: `${file.path.split(/[/\\]/).pop()} (${activeCommitDetail.shortHash})`,
        original,
        modified
      })
    } catch (err) {
      console.error('Failed to view diff:', err)
    }
  }

  const handleOpenFileAtCommit = async (file: { path: string; status: string }, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!workspacePath || !activeCommitDetail) return
    try {
      const content = await window.maestroAPI.gitGetFileAtCommit(
        workspacePath,
        activeCommitDetail.hash,
        file.path
      )
      const fileName = file.path.split(/[/\\]/).pop() || file.path
      openFile({
        path: `${file.path}@${activeCommitDetail.shortHash}`,
        name: `${fileName} (${activeCommitDetail.shortHash})`,
        content
      })
      setStatusMessage(`Opened ${fileName} at ${activeCommitDetail.shortHash}`)
    } catch (err: any) {
      console.error('Failed to open file at commit:', err)
      setStatusMessage(`Failed to open file: ${err?.message || err}`)
    }
  }

  const handleRevertCommit = async () => {
    if (!activeCommitDetail) return
    if (window.confirm(`Revert commit ${activeCommitDetail.shortHash} ("${activeCommitDetail.message}")?`)) {
      await gitRevert(activeCommitDetail.hash)
    }
  }

  const handleCherryPickCommit = async () => {
    if (!activeCommitDetail) return
    if (window.confirm(`Cherry-pick commit ${activeCommitDetail.shortHash} into current branch?`)) {
      await gitCherryPick(activeCommitDetail.hash)
    }
  }

  const handleResetToCommit = async (mode: 'soft' | 'mixed' | 'hard') => {
    if (!activeCommitDetail) return
    if (
      window.confirm(
        `Reset (${mode.toUpperCase()}) to commit ${activeCommitDetail.shortHash}? ${
          mode === 'hard' ? 'WARNING: All local uncommitted changes will be lost!' : ''
        }`
      )
    ) {
      await gitReset(mode, activeCommitDetail.hash)
    }
  }

  const filteredCommits = gitHistory.filter((c) => {
    if (!historySearchQuery.trim()) return true
    const q = historySearchQuery.toLowerCase()
    return (
      c.message.toLowerCase().includes(q) ||
      c.author.toLowerCase().includes(q) ||
      c.shortHash.toLowerCase().includes(q)
    )
  })

  return (
    <div className="h-64 glass-panel m-2.5 mt-0 rounded-2xl flex flex-col overflow-hidden border border-white/[0.05] select-none shadow-studio-card z-20">
      {/* Deck Tabs Bar */}
      <div className="h-9 px-3 border-b border-white/[0.04] flex items-center justify-between bg-studio-card/80 backdrop-blur-md">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {/* Main Deck Tab: Terminal */}
          <button
            onClick={() => setActiveBottomTab('terminal')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeBottomTab === 'terminal'
                ? 'bg-white/10 text-white'
                : 'text-studio-muted hover:text-white'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5 text-studio-amber" />
            <span>Terminal</span>
          </button>

          {/* Main Deck Tab: Problems / Diagnostics */}
          <button
            onClick={() => setActiveBottomTab('problems')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeBottomTab === 'problems'
                ? 'bg-white/10 text-white'
                : 'text-studio-muted hover:text-white'
            }`}
          >
            <AlertCircle className={`w-3.5 h-3.5 ${errorCount > 0 ? 'text-studio-rose' : 'text-studio-muted'}`} />
            <span>Problems</span>
            {(errorCount > 0 || warningCount > 0) && (
              <span className="flex items-center gap-1 ml-1 text-[10px] font-mono">
                {errorCount > 0 && (
                  <span className="px-1 py-0.2 rounded bg-studio-rose/20 text-studio-rose">
                    {errorCount}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="px-1 py-0.2 rounded bg-studio-amber/20 text-studio-amber">
                    {warningCount}
                  </span>
                )}
              </span>
            )}
          </button>

          {/* Main Deck Tab: Git History */}
          <button
            onClick={() => setActiveBottomTab('history')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeBottomTab === 'history'
                ? 'bg-white/10 text-white'
                : 'text-studio-muted hover:text-white'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5 text-studio-amber" />
            <span>History</span>
            {gitHistory.length > 0 && (
              <span className="ml-1 text-[10px] font-mono px-1 py-0.2 rounded bg-studio-amber/20 text-studio-amber">
                {gitHistory.length}
              </span>
            )}
          </button>

          {/* Main Deck Tab: Debug Console */}
          <button
            onClick={() => setActiveBottomTab('debug')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeBottomTab === 'debug'
                ? 'bg-white/10 text-white'
                : 'text-studio-muted hover:text-white'
            }`}
          >
            <Bug className="w-3.5 h-3.5 text-studio-amber" />
            <span>Debug Console</span>
          </button>

          {/* Terminal Session Sub-Tabs */}
          {activeBottomTab === 'terminal' && (
            <>
              <div className="h-4 w-px bg-white/10 mx-1.5" />

              <div className="flex items-center gap-1 overflow-x-auto max-w-[45vw] no-scrollbar">
                {terminalSessions.map((session) => {
                  const isActive = session.id === activeTerminalId
                  const isEditing = editingTerminalId === session.id

                  return (
                    <div
                      key={session.id}
                      onClick={() => setActiveTerminalId(session.id)}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        setEditingTerminalId(session.id)
                        setEditingTerminalTitle(session.title)
                      }}
                      className={`group flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
                        isActive
                          ? 'bg-studio-amber/15 text-studio-amber border border-studio-amber/30'
                          : 'bg-white/[0.03] text-studio-muted hover:text-studio-text hover:bg-white/[0.06] border border-transparent'
                      }`}
                    >
                      <SquareTerminal className="w-3 h-3 shrink-0" />
                      {session.isExited && (
                        <span className="w-1.5 h-1.5 rounded-full bg-studio-rose shrink-0" title="Process exited" />
                      )}
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTerminalTitle}
                          onChange={(e) => setEditingTerminalTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameTerminalSession(session.id, editingTerminalTitle)
                              setEditingTerminalId(null)
                            } else if (e.key === 'Escape') {
                              setEditingTerminalId(null)
                            }
                          }}
                          onBlur={() => {
                            renameTerminalSession(session.id, editingTerminalTitle)
                            setEditingTerminalId(null)
                          }}
                          autoFocus
                          className="bg-black/40 border border-studio-amber/50 rounded px-1 text-[11px] text-white outline-none w-20"
                        />
                      ) : (
                        <span className="truncate max-w-[100px] text-[11px]" title="Double click to rename">
                          {session.title}
                          {session.isExited && <span className="text-[9px] text-studio-rose/80 ml-1">(exited)</span>}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          closeTerminalSession(session.id)
                        }}
                        className="p-0.5 rounded hover:bg-white/10 text-studio-muted group-hover:text-studio-text hover:!text-studio-rose transition-colors cursor-pointer"
                        title="Close Session"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Add Terminal & Shell Selector */}
              <div className="relative flex items-center" ref={menuRef}>
                <div className="flex items-center bg-white/[0.04] hover:bg-white/[0.08] rounded-md border border-white/[0.06] overflow-hidden">
                  <button
                    onClick={() => handleCreateTerminal()}
                    className="p-1 text-studio-muted hover:text-white transition-colors cursor-pointer"
                    title="New Terminal (Default)"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setIsShellMenuOpen(!isShellMenuOpen)}
                    className="p-1 border-l border-white/[0.06] text-studio-muted hover:text-white transition-colors cursor-pointer"
                    title="Select Shell Profile"
                  >
                    <ChevronDown className="w-2.5 h-2.5" />
                  </button>
                </div>

                {isShellMenuOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-44 bg-studio-card/95 border border-white/10 rounded-xl shadow-2xl p-1 z-50 backdrop-blur-xl animate-fade-in">
                    <div className="px-2 py-1 text-[10px] font-semibold text-studio-muted uppercase tracking-wider">
                      Shell Profiles
                    </div>
                    {availableShells.length > 0 ? (
                      availableShells.map((shell) => (
                        <button
                          key={shell.id}
                          onClick={() => handleCreateTerminal(shell)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left text-studio-text hover:bg-studio-amber/15 hover:text-studio-amber transition-colors cursor-pointer"
                        >
                          <TerminalIcon className="w-3 h-3 text-studio-amber shrink-0" />
                          <span className="truncate">{shell.name}</span>
                        </button>
                      ))
                    ) : (
                      <button
                        onClick={() => handleCreateTerminal()}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left text-studio-text hover:bg-studio-amber/15 hover:text-studio-amber transition-colors cursor-pointer"
                      >
                        <TerminalIcon className="w-3 h-3 text-studio-amber shrink-0" />
                        <span>Default Shell</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Problems Severity Filters & Search */}
          {activeBottomTab === 'problems' && (
            <>
              <div className="h-4 w-px bg-white/10 mx-1" />

              <div className="flex items-center gap-1 text-[11px] font-mono">
                <button
                  onClick={() => setDiagnosticFilter('all')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    diagnosticFilter === 'all'
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-studio-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  All ({diagnostics.length})
                </button>
                <button
                  onClick={() => setDiagnosticFilter('error')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    diagnosticFilter === 'error'
                      ? 'bg-studio-rose/25 text-studio-rose font-medium'
                      : 'text-studio-muted hover:text-studio-rose hover:bg-white/5'
                  }`}
                >
                  Errors ({errorCount})
                </button>
                <button
                  onClick={() => setDiagnosticFilter('warning')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    diagnosticFilter === 'warning'
                      ? 'bg-studio-amber/25 text-studio-amber font-medium'
                      : 'text-studio-muted hover:text-studio-amber hover:bg-white/5'
                  }`}
                >
                  Warnings ({warningCount})
                </button>
                <button
                  onClick={() => setDiagnosticFilter('info')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    diagnosticFilter === 'info'
                      ? 'bg-studio-cyan/25 text-studio-cyan font-medium'
                      : 'text-studio-muted hover:text-studio-cyan hover:bg-white/5'
                  }`}
                >
                  Info ({infoCount})
                </button>
              </div>

              {/* Filter search box */}
              <div className="flex items-center gap-1 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06] ml-1">
                <Search className="w-3 h-3 text-studio-muted shrink-0" />
                <input
                  type="text"
                  value={diagnosticSearchQuery}
                  onChange={(e) => setDiagnosticSearchQuery(e.target.value)}
                  placeholder="Filter problems..."
                  className="bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted w-28 font-sans"
                />
              </div>

              {/* Problem navigation (Next / Prev) */}
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  onClick={jumpToPrevProblem}
                  className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                  title="Previous Problem (Shift+F8)"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={jumpToNextProblem}
                  className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                  title="Next Problem (F8)"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            </>
          )}

          {/* Git History Filters */}
          {activeBottomTab === 'history' && (
            <>
              <div className="h-4 w-px bg-white/10 mx-1" />

              <div className="flex items-center gap-1 text-[11px] font-mono">
                <button
                  onClick={() => setFilterByCurrentFile(false)}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    !filterByCurrentFile
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-studio-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  All Commits
                </button>
                <button
                  onClick={() => setFilterByCurrentFile(true)}
                  disabled={!activeFilePath}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    filterByCurrentFile
                      ? 'bg-studio-amber/25 text-studio-amber font-medium'
                      : 'text-studio-muted hover:text-studio-amber hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent'
                  }`}
                  title={activeFilePath ? `History for ${activeFilePath.split(/[/\\]/).pop()}` : 'Open a file to view file history'}
                >
                  Current File
                </button>
              </div>

              {/* Filter search box */}
              <div className="flex items-center gap-1 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06] ml-1">
                <Search className="w-3 h-3 text-studio-muted shrink-0" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Filter commits by message or author..."
                  className="bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted w-44 font-sans"
                />
              </div>

              <button
                onClick={() => fetchGitHistory(filterByCurrentFile && activeFilePath ? activeFilePath : undefined)}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer ml-1"
                title="Refresh Git History"
              >
                <RefreshCw className={`w-3 h-3 ${isHistoryLoading ? 'animate-spin text-studio-amber' : ''}`} />
              </button>
            </>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5">
          {activeBottomTab === 'terminal' && (
            <>
              {/* Terminal Search */}
              <button
                onClick={() => toggleTerminalSearch()}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  isTerminalSearchOpen
                    ? 'bg-studio-amber/20 text-studio-amber'
                    : 'hover:bg-white/10 text-studio-muted hover:text-white'
                }`}
                title="Search Terminal Output (Ctrl+F)"
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              {/* Terminal Split Horizontal (Side-by-side) */}
              <button
                onClick={() => toggleTerminalSplit('horizontal')}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  terminalSplitMode === 'horizontal'
                    ? 'bg-studio-amber/20 text-studio-amber'
                    : 'hover:bg-white/10 text-studio-muted hover:text-white'
                }`}
                title={
                  terminalSplitMode === 'horizontal'
                    ? 'Close Split'
                    : 'Split Terminal Side-by-Side'
                }
              >
                <Columns2 className="w-3.5 h-3.5" />
              </button>

              {/* Terminal Split Vertical (Stacked) */}
              <button
                onClick={() => toggleTerminalSplit('vertical')}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  terminalSplitMode === 'vertical'
                    ? 'bg-studio-amber/20 text-studio-amber'
                    : 'hover:bg-white/10 text-studio-muted hover:text-white'
                }`}
                title={
                  terminalSplitMode === 'vertical'
                    ? 'Close Split'
                    : 'Split Terminal Stacked'
                }
              >
                <Rows2 className="w-3.5 h-3.5" />
              </button>

              <div className="h-3 w-px bg-white/10 mx-0.5" />

              <button
                onClick={() => restartTerminalSession(activeTerminalId)}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-studio-amber transition-colors cursor-pointer"
                title="Restart Active Terminal Session"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleClearActiveTerminal}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                title="Clear Terminal (Ctrl+L)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
            title="Close Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeBottomTab === 'terminal' ? (
          <div className="w-full h-full">
            <CyberTerminal onClose={onClose} />
          </div>
        ) : activeBottomTab === 'problems' ? (
          <div className="w-full h-full overflow-y-auto p-3 flex flex-col gap-1.5">
            {filteredDiagnostics.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-2 text-studio-muted">
                <CheckCircle2 className="w-6 h-6 text-studio-emerald/80" />
                <p className="text-xs">
                  {diagnostics.length === 0
                    ? 'No errors or warnings detected in workspace'
                    : 'No problems match the current filter'}
                </p>
              </div>
            ) : (
              filteredDiagnostics.map((diag) => {
                const isDeprecated = diag.tags?.includes(2)
                const isUnnecessary = diag.tags?.includes(1)

                return (
                  <div
                    key={diag.id}
                    onClick={() => handleJumpToProblem(diag)}
                    className="flex items-start justify-between p-2 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs transition-colors group"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {diag.severity === 'error' && (
                        <AlertCircle className="w-3.5 h-3.5 text-studio-rose mt-0.5 shrink-0" />
                      )}
                      {diag.severity === 'warning' && (
                        <AlertTriangle className="w-3.5 h-3.5 text-studio-amber mt-0.5 shrink-0" />
                      )}
                      {(diag.severity === 'info' || diag.severity === 'hint') && (
                        <Info className="w-3.5 h-3.5 text-studio-cyan mt-0.5 shrink-0" />
                      )}

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`leading-tight ${
                              isDeprecated
                                ? 'line-through text-studio-muted'
                                : isUnnecessary
                                  ? 'opacity-60 text-studio-text'
                                  : 'text-studio-text'
                            }`}
                          >
                            {diag.message}
                          </span>

                          {diag.source && (
                            <span className="text-[10px] font-mono text-studio-muted px-1 rounded bg-white/[0.04] border border-white/[0.06]">
                              {diag.source}
                            </span>
                          )}

                          {diag.code && (
                            <span className="text-[10px] font-mono text-studio-muted">
                              ({diag.code})
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-studio-muted font-mono mt-0.5">
                          {diag.fileName} [{diag.line}, {diag.column}]
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={(e) => handleOpenQuickFix(e, diag)}
                        className="px-1.5 py-0.5 rounded hover:bg-studio-amber/20 text-studio-amber/80 hover:text-studio-amber opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-mono cursor-pointer border border-studio-amber/20"
                        title="Quick Fix"
                      >
                        <Zap className="w-2.5 h-2.5 text-studio-amber" />
                        <span>Fix</span>
                      </button>
                      <ExternalLink className="w-3 h-3 text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : activeBottomTab === 'debug' ? (
          <div className="w-full h-full">
            <DebugConsole />
          </div>
        ) : (
          /* Git History Master-Detail View */
          <div className="w-full h-full flex overflow-hidden">
            {/* Left: Commit List */}
            <div className="flex-1 h-full overflow-y-auto p-2.5 flex flex-col gap-1">
              {filteredCommits.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-2 text-studio-muted">
                  <GitCommit className="w-6 h-6 text-studio-muted/70" />
                  <p className="text-xs">
                    {gitHistory.length === 0
                      ? 'No commit history found in this repository'
                      : 'No commits match the search filter'}
                  </p>
                </div>
              ) : (
                filteredCommits.map((commit, idx) => {
                  const isSelected = activeCommitDetail?.hash === commit.hash
                  return (
                    <div
                      key={commit.hash}
                      onClick={() => fetchCommitDetail(commit.hash)}
                      className={`relative flex items-start gap-3 p-2 rounded-xl transition-all cursor-pointer group select-none ${
                        isSelected
                          ? 'bg-studio-amber/15 border border-studio-amber/30 text-white'
                          : 'hover:bg-white/[0.04] text-studio-text border border-transparent'
                      }`}
                    >
                      {/* Timeline Node & Line */}
                      <div className="flex flex-col items-center self-stretch shrink-0 pt-1">
                        <div
                          className={`w-2.5 h-2.5 rounded-full border-2 transition-all ${
                            isSelected
                              ? 'bg-studio-amber border-studio-amber scale-110 shadow-[0_0_8px_rgba(224,169,109,0.5)]'
                              : 'bg-studio-card border-studio-muted/60 group-hover:border-studio-amber'
                          }`}
                        />
                        {idx < filteredCommits.length - 1 && (
                          <div className="w-0.5 flex-1 bg-white/[0.08] my-1" />
                        )}
                      </div>

                      {/* Commit Info */}
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium truncate leading-tight group-hover:text-studio-amber transition-colors">
                            {commit.message}
                          </span>
                          <button
                            onClick={(e) => handleCopyHash(commit.hash, e)}
                            className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/[0.05] hover:bg-white/10 text-studio-muted hover:text-white transition-colors shrink-0"
                            title={`Full hash: ${commit.hash} - Click to copy`}
                          >
                            {copiedHash === commit.hash ? (
                              <Check className="w-2.5 h-2.5 text-studio-emerald" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 text-studio-muted opacity-60" />
                            )}
                            <span>{commit.shortHash}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-studio-muted font-mono">
                          <div className="flex items-center gap-1 truncate max-w-[150px]">
                            <User className="w-3 h-3 text-studio-subtle shrink-0" />
                            <span className="truncate">{commit.author}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Calendar className="w-3 h-3 text-studio-subtle shrink-0" />
                            <span>{commit.date}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Right: Selected Commit Detail Inspector */}
            {activeCommitDetail && (
              <div className="w-96 h-full border-l border-white/[0.06] bg-studio-card/70 backdrop-blur-md p-3 flex flex-col gap-2.5 overflow-y-auto animate-fade-in shadow-xl">
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <GitCommit className="w-3.5 h-3.5 text-studio-amber" />
                    <span>Commit Details</span>
                  </div>
                  <button
                    onClick={closeCommitDetail}
                    className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                    title="Close Details"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-white font-medium leading-relaxed select-text">
                    {activeCommitDetail.message}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={(e) => handleCopyHash(activeCommitDetail.hash, e)}
                      className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/10 text-studio-amber transition-colors"
                      title="Click to copy full commit hash"
                    >
                      {copiedHash === activeCommitDetail.hash ? (
                        <Check className="w-3 h-3 text-studio-emerald" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-70" />
                      )}
                      <span>{activeCommitDetail.shortHash}</span>
                    </button>
                    <span className="text-[11px] text-studio-muted font-mono">{activeCommitDetail.date}</span>
                  </div>
                  <div className="text-[11px] text-studio-muted truncate">
                    Author: <span className="text-studio-text">{activeCommitDetail.author}</span> {activeCommitDetail.email && `<${activeCommitDetail.email}>`}
                  </div>

                  {/* Commit Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-white/[0.04] text-[11px] font-mono">
                    <button
                      onClick={handleCherryPickCommit}
                      className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                      title="Cherry-pick this commit into current branch"
                    >
                      Cherry-pick
                    </button>
                    <button
                      onClick={handleRevertCommit}
                      className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/10 text-studio-muted hover:text-studio-rose transition-colors cursor-pointer"
                      title="Revert this commit"
                    >
                      Revert
                    </button>
                    <button
                      onClick={() => handleResetToCommit('mixed')}
                      className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/10 text-studio-muted hover:text-studio-amber transition-colors cursor-pointer"
                      title="Reset HEAD to this commit (mixed)"
                    >
                      Reset (mixed)
                    </button>
                  </div>
                </div>

                {/* Changed Files */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="text-[11px] font-mono font-semibold text-studio-muted uppercase tracking-wider">
                    Changed Files ({activeCommitDetail.files.length})
                  </div>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {activeCommitDetail.files.map((file) => (
                      <div
                        key={file.path}
                        onClick={() => handleViewCommitFileDiff(file)}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/[0.05] cursor-pointer text-xs group transition-colors select-none"
                        title="Click to view diff at this commit"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileDiff className="w-3.5 h-3.5 text-studio-amber shrink-0" />
                          <span className="text-studio-text truncate group-hover:text-white">{file.path}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => handleOpenFileAtCommit(file, e)}
                            className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Open file at this commit"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                              file.status === 'A'
                                ? 'text-studio-emerald bg-studio-emerald/10'
                                : file.status === 'D'
                                  ? 'text-studio-rose bg-studio-rose/10'
                                  : 'text-studio-amber bg-studio-amber/10'
                            }`}
                          >
                            {file.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Quick Fix Popover */}
      {quickFixMenu && (
        <div
          style={{ top: `${quickFixMenu.y}px`, left: `${quickFixMenu.x}px` }}
          className="fixed z-50 min-w-[220px] max-w-[320px] bg-studio-card/95 backdrop-blur-md border border-studio-amber/30 rounded-xl shadow-2xl p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] font-mono text-studio-amber px-2 py-1 border-b border-white/[0.06] flex items-center gap-1.5 mb-1">
            <Zap className="w-3 h-3 text-studio-amber shrink-0" />
            <span>Available Quick Fixes</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {quickFixMenu.actions.map((action, i) => (
              <button
                key={i}
                onClick={async () => {
                  if (action.edit) {
                    await lspClient.applyWorkspaceEdit(action.edit)
                    setStatusMessage(`Applied fix: ${action.title}`)
                    setTimeout(() => setStatusMessage('Ready'), 2500)
                  }
                  setQuickFixMenu(null)
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/90 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors"
              >
                <span className="truncate">{action.title}</span>
                {action.isPreferred && (
                  <span className="text-[9px] font-mono text-studio-emerald px-1 rounded bg-studio-emerald/15">
                    preferred
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

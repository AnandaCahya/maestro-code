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
  ArrowDown
} from 'lucide-react'
import { CyberTerminal } from './CyberTerminal'
import { useEditorStore, DiagnosticItem } from '../../store/useEditorStore'
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
    addTerminalSession,
    closeTerminalSession,
    availableShells,
    fetchAvailableShells
  } = useEditorStore()

  const [isShellMenuOpen, setIsShellMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchAvailableShells()
  }, [])

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

          {/* Terminal Session Sub-Tabs */}
          {activeBottomTab === 'terminal' && (
            <>
              <div className="h-4 w-px bg-white/10 mx-1.5" />

              <div className="flex items-center gap-1 overflow-x-auto max-w-[45vw] no-scrollbar">
                {terminalSessions.map((session) => {
                  const isActive = session.id === activeTerminalId
                  return (
                    <div
                      key={session.id}
                      onClick={() => setActiveTerminalId(session.id)}
                      className={`group flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
                        isActive
                          ? 'bg-studio-amber/15 text-studio-amber border border-studio-amber/30'
                          : 'bg-white/[0.03] text-studio-muted hover:text-studio-text hover:bg-white/[0.06] border border-transparent'
                      }`}
                    >
                      <SquareTerminal className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[100px] text-[11px]">{session.title}</span>
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
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5">
          {activeBottomTab === 'terminal' && (
            <button
              onClick={handleClearActiveTerminal}
              className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
              title="Clear Terminal (Ctrl+L)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
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
        ) : (
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

                    <ExternalLink className="w-3 h-3 text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

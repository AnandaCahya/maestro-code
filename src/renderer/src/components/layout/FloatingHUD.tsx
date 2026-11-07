import React, { useState, useRef, useEffect } from 'react'
import {
  GitBranch,
  GitCommit,
  Terminal,
  AlertCircle,
  AlertTriangle,
  Settings,
  Check,
  Plus,
  ArrowLeft,
  ArrowRight,
  Target
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

export const FloatingHUD: React.FC = () => {
  const {
    cursorPosition,
    openFiles,
    activeFilePath,
    focusTask,
    setLayoutMode,
    lspStatus,
    statusMessage,
    diagnostics,
    isBottomDeckOpen,
    activeBottomTab,
    setActiveBottomTab,
    toggleBottomDeck,
    editorSettings,
    toggleSettingsModal,
    gitStatus,
    availableBranches,
    checkoutBranch,
    fetchAvailableBranches,
    activeBlameInfo,
    workspacePath,
    navigateBack,
    navigateForward,
    navHistory,
    navHistoryIndex
  } = useEditorStore()

  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false)
  const branchMenuRef = useRef<HTMLDivElement>(null)

  const currentFile = openFiles.find((f) => f.path === activeFilePath)
  const errorCount = diagnostics.filter((d) => d.severity === 'error').length
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length
  const eol = currentFile?.content?.includes('\r\n') ? 'CRLF' : 'LF'

  const handleToggleEol = () => {
    if (!currentFile || !activeFilePath) return
    const nextContent =
      eol === 'CRLF'
        ? currentFile.content.replace(/\r\n/g, '\n')
        : currentFile.content.replace(/\n/g, '\r\n')
    useEditorStore.getState().updateFileContent(activeFilePath, nextContent)
    useEditorStore.getState().setStatusMessage(`Converted line sequence to ${eol === 'CRLF' ? 'LF' : 'CRLF'}`)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (branchMenuRef.current && !branchMenuRef.current.contains(e.target as Node)) {
        setIsBranchMenuOpen(false)
      }
    }
    if (isBranchMenuOpen) {
      window.addEventListener('mousedown', handleClickOutside)
    }
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [isBranchMenuOpen])

  const handleToggleBranchMenu = () => {
    if (!isBranchMenuOpen) {
      fetchAvailableBranches()
    }
    setIsBranchMenuOpen(!isBranchMenuOpen)
  }

  const handleCreateBranchPrompt = async () => {
    if (!workspacePath) return
    const name = window.prompt('Enter new branch name (e.g. feat/my-feature):')
    if (name && name.trim()) {
      await window.maestroAPI.gitCreateBranch(workspacePath, name.trim())
      await useEditorStore.getState().refreshGitStatus()
      setIsBranchMenuOpen(false)
    }
  }

  const handleOpenProblems = () => {
    if (isBottomDeckOpen && activeBottomTab === 'problems') {
      toggleBottomDeck()
    } else {
      setActiveBottomTab('problems')
    }
  }

  const handleOpenTerminal = () => {
    if (isBottomDeckOpen && activeBottomTab === 'terminal') {
      toggleBottomDeck()
    } else {
      setActiveBottomTab('terminal')
    }
  }

  return (
    <div className="h-8 px-4 flex items-center justify-between text-xs select-none z-30 font-mono border-t border-white/[0.03]">
      {/* Left Chips */}
      <div className="flex items-center gap-2">
        {/* Git Branch Selector Chip & Menu */}
        <div className="relative" ref={branchMenuRef}>
          <button
            onClick={handleToggleBranchMenu}
            className="flex items-center gap-1.5 text-studio-muted hover:text-white px-2 py-0.5 rounded text-[11px] hover:bg-white/5 transition-colors cursor-pointer"
            title="Switch Git Branch"
          >
            <GitBranch className="w-3 h-3 text-studio-amber shrink-0" />
            <span className="truncate max-w-[140px]">{gitStatus.branch || 'main'}</span>
          </button>

          {isBranchMenuOpen && (
            <div className="absolute bottom-8 left-0 w-52 glass-panel border border-white/10 rounded-xl shadow-2xl p-1 z-50 flex flex-col gap-0.5 animate-fade-in bg-studio-card/95">
              <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-studio-muted font-bold flex items-center justify-between border-b border-white/[0.04] mb-0.5">
                <span>Branches</span>
                <button
                  onClick={handleCreateBranchPrompt}
                  className="hover:text-studio-amber transition-colors flex items-center gap-0.5 lowercase text-[10px]"
                  title="Create new branch"
                >
                  <Plus className="w-2.5 h-2.5" /> new
                </button>
              </div>

              <div className="max-h-44 overflow-y-auto flex flex-col gap-0.5">
                {availableBranches.map((branch) => {
                  const isActive = branch === gitStatus.branch
                  return (
                    <button
                      key={branch}
                      onClick={() => {
                        if (!isActive) {
                          checkoutBranch(branch)
                        }
                        setIsBranchMenuOpen(false)
                      }}
                      className={`flex items-center justify-between px-2 py-1 rounded-lg text-[11px] text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-studio-amber/15 text-studio-amber font-semibold'
                          : 'text-studio-text hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{branch}</span>
                      {isActive && <Check className="w-3 h-3 text-studio-amber shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* LSP */}
        <div className="flex items-center gap-1.5 text-[11px] text-studio-muted px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-studio-emerald" />
          <span>lsp: {lspStatus}</span>
        </div>

        {/* Problems Counter Button */}
        <button
          onClick={handleOpenProblems}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
            isBottomDeckOpen && activeBottomTab === 'problems'
              ? 'text-white bg-white/10'
              : 'text-studio-muted hover:text-white'
          }`}
          title="Toggle Problems Deck"
        >
          <AlertCircle className={`w-3 h-3 ${errorCount > 0 ? 'text-studio-rose' : 'text-studio-muted'}`} />
          <span>{errorCount}</span>
          <AlertTriangle className={`w-3 h-3 ml-0.5 ${warningCount > 0 ? 'text-studio-amber' : 'text-studio-muted'}`} />
          <span>{warningCount}</span>
        </button>

        {/* Terminal Toggle Button */}
        <button
          onClick={handleOpenTerminal}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
            isBottomDeckOpen && activeBottomTab === 'terminal'
              ? 'text-studio-amber font-medium bg-white/5'
              : 'text-studio-muted hover:text-white'
          }`}
          title="Toggle Terminal (Ctrl+`)"
        >
          <Terminal className="w-3 h-3" />
          <span>terminal</span>
        </button>

        {/* Git Blame Line Annotation */}
        {activeBlameInfo && (
          <button
            onClick={() => {
              setActiveBottomTab('history')
              useEditorStore.getState().fetchCommitDetail(activeBlameInfo.commitHash)
            }}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.03] hover:bg-white/[0.08] text-studio-muted hover:text-white transition-colors cursor-pointer max-w-[260px] truncate group border border-white/[0.04]"
            title={`Commit ${activeBlameInfo.commitHash} by ${activeBlameInfo.author} (${activeBlameInfo.date}): ${activeBlameInfo.summary} - Click to view in History`}
          >
            <GitCommit className="w-3 h-3 text-studio-amber shrink-0" />
            <span className="text-studio-amber font-medium truncate shrink-0 max-w-[70px]">
              {activeBlameInfo.author}
            </span>
            <span className="text-studio-subtle shrink-0">•</span>
            <span className="truncate text-studio-text/80 group-hover:text-white">
              {activeBlameInfo.summary}
            </span>
            <span className="text-studio-subtle text-[10px] shrink-0 font-mono">
              {activeBlameInfo.date}
            </span>
          </button>
        )}

        {/* Active Focus Task indicator */}
        {focusTask && (
          <button
            onClick={() => setLayoutMode('project')}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-studio-amber/15 hover:bg-studio-amber/25 text-studio-amber border border-studio-amber/30 text-[11px] font-mono transition-colors cursor-pointer"
            title={`Active Task: #${focusTask.id} (${focusTask.title}) - Click to view in Project Deck`}
          >
            <Target className="w-3 h-3 text-studio-amber shrink-0" />
            <span className="font-semibold">#{focusTask.id}</span>
            <span className="text-studio-subtle">•</span>
            <span className="truncate max-w-[120px]">{focusTask.title}</span>
          </button>
        )}

        {/* Status Message */}
        <span className="text-[11px] text-studio-subtle ml-2 truncate max-w-xs">
          {statusMessage}
        </span>
      </div>

      {/* Right Chips */}
      <div className="flex items-center gap-2.5 text-studio-muted text-[11px]">
        {/* Navigation History (Go Back / Go Forward) */}
        <div className="flex items-center gap-0.5 border-r border-white/10 pr-2">
          <button
            onClick={navigateBack}
            disabled={navHistoryIndex <= 0}
            className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Navigate Back (Alt+LeftArrow)"
          >
            <ArrowLeft className="w-3 h-3" />
          </button>
          <button
            onClick={navigateForward}
            disabled={navHistoryIndex >= navHistory.length - 1}
            className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Navigate Forward (Alt+RightArrow)"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {currentFile && (
          <div>
            <span>Ln {cursorPosition.line}, Col {cursorPosition.col}</span>
          </div>
        )}

        <div>
          <span>Spaces: {editorSettings.tabSize}</span>
        </div>

        <div className="uppercase">
          {currentFile?.language || 'Plain Text'}
        </div>

        <button
          onClick={handleToggleEol}
          className="text-[10px] hover:text-white px-1 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
          title={`Line sequence: ${eol} - Click to switch to ${eol === 'CRLF' ? 'LF' : 'CRLF'}`}
        >
          {eol}
        </button>

        <div className="text-[10px]">
          UTF-8
        </div>

        <button
          onClick={toggleSettingsModal}
          className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-studio-amber transition-colors cursor-pointer"
          title="Preferences & .vscode Settings (Ctrl+,)"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

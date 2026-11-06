import React from 'react'
import {
  GitBranch,
  Terminal,
  AlertCircle,
  AlertTriangle
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

export const FloatingHUD: React.FC = () => {
  const {
    cursorPosition,
    openFiles,
    activeFilePath,
    lspStatus,
    statusMessage,
    diagnostics,
    isBottomDeckOpen,
    activeBottomTab,
    setActiveBottomTab,
    toggleBottomDeck
  } = useEditorStore()

  const currentFile = openFiles.find((f) => f.path === activeFilePath)
  const errorCount = diagnostics.filter((d) => d.severity === 'error').length
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length

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
        {/* Git */}
        <div className="flex items-center gap-1.5 text-studio-muted hover:text-white px-2 py-0.5 rounded text-[11px] transition-colors">
          <GitBranch className="w-3 h-3 text-studio-amber" />
          <span>main</span>
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

        {/* Status Message */}
        <span className="text-[11px] text-studio-subtle ml-2 truncate max-w-xs">
          {statusMessage}
        </span>
      </div>

      {/* Right Chips */}
      <div className="flex items-center gap-2.5 text-studio-muted text-[11px]">
        {currentFile && (
          <div>
            <span>Ln {cursorPosition.line}, Col {cursorPosition.col}</span>
          </div>
        )}

        <div className="uppercase">
          {currentFile?.language || 'Plain Text'}
        </div>

        <div className="text-[10px]">
          UTF-8
        </div>
      </div>
    </div>
  )
}

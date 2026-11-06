import React from 'react'
import {
  Terminal as TerminalIcon,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  X,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { CyberTerminal } from './CyberTerminal'
import { useEditorStore, DiagnosticItem } from '../../store/useEditorStore'

interface BottomDeckProps {
  onClose: () => void
}

export const BottomDeck: React.FC<BottomDeckProps> = ({ onClose }) => {
  const {
    activeBottomTab,
    setActiveBottomTab,
    diagnostics,
    openFile,
    setActiveFile,
    setCursorPosition
  } = useEditorStore()

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length

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
      // Jika file path berupa URI internal monaco
      setActiveFile(item.filePath)
      setCursorPosition(item.line, item.column)
    }
  }

  return (
    <div className="h-60 glass-panel m-2.5 mt-0 rounded-2xl flex flex-col overflow-hidden border border-white/[0.05] select-none shadow-studio-card z-20">
      {/* Deck Tabs Bar */}
      <div className="h-8 px-3 border-b border-white/[0.04] flex items-center justify-between bg-studio-card/70">
        <div className="flex items-center gap-1">
          {/* Terminal Tab */}
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

          {/* Problems / Diagnostics Tab */}
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
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/5 text-studio-muted hover:text-white transition-colors cursor-pointer"
          title="Close Panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeBottomTab === 'terminal' ? (
          <div className="w-full h-full">
            <CyberTerminal onClose={onClose} />
          </div>
        ) : (
          <div className="w-full h-full overflow-y-auto p-3 flex flex-col gap-1.5">
            {diagnostics.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-2 text-studio-muted">
                <CheckCircle2 className="w-6 h-6 text-studio-emerald/80" />
                <p className="text-xs">No errors or warnings detected in workspace</p>
              </div>
            ) : (
              diagnostics.map((diag) => (
                <div
                  key={diag.id}
                  onClick={() => handleJumpToProblem(diag)}
                  className="flex items-start justify-between p-2 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs transition-colors group"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {diag.severity === 'error' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-studio-rose mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-studio-amber mt-0.5 shrink-0" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-studio-text leading-tight">{diag.message}</span>
                      <span className="text-[10px] text-studio-muted font-mono mt-0.5">
                        {diag.fileName} ({diag.line}:{diag.column})
                      </span>
                    </div>
                  </div>

                  <ExternalLink className="w-3 h-3 text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

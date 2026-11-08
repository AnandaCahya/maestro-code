import React, { useEffect, useState } from 'react'
import {
  GitMerge,
  AlertTriangle,
  FileCode2,
  ChevronDown,
  ChevronRight,
  Trash2,
  Plus,
  FileEdit,
  Check,
  X
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

export const WorkspaceEditPreviewModal: React.FC = () => {
  const {
    pendingWorkspaceEdit,
    confirmPendingWorkspaceEdit,
    cancelPendingWorkspaceEdit
  } = useEditorStore()

  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!pendingWorkspaceEdit) return
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelPendingWorkspaceEdit()
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        confirmPendingWorkspaceEdit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pendingWorkspaceEdit, confirmPendingWorkspaceEdit, cancelPendingWorkspaceEdit])

  if (!pendingWorkspaceEdit) return null

  const { summary } = pendingWorkspaceEdit

  const toggleExpand = (uri: string) => {
    setExpandedFiles((prev) => ({ ...prev, [uri]: !prev[uri] }))
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={cancelPendingWorkspaceEdit}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#191b22] border border-white/10 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-studio-card/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-studio-accent/15 border border-studio-accent/30 flex items-center justify-center text-studio-accent">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">
                Preview Workspace Changes
              </h2>
              <p className="text-[11px] text-studio-muted">
                Review pending transaction before applying changes to disk.
              </p>
            </div>
          </div>

          <button
            onClick={cancelPendingWorkspaceEdit}
            className="p-1 rounded-lg text-studio-muted hover:text-white hover:bg-white/10 transition-colors"
            title="Cancel (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning & Stats Banner */}
        <div className="px-5 py-3 border-b border-white/[0.06] bg-studio-bg/60 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-studio-accent/15 border border-studio-accent/30 text-studio-accent">
              {summary.filesCount} {summary.filesCount === 1 ? 'file' : 'files'}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#88c096]/15 border border-[#88c096]/30 text-[#88c096]">
              {summary.totalEdits} {summary.totalEdits === 1 ? 'edit' : 'edits'}
            </span>
          </div>

          {summary.hasDeletions && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 font-sans text-xs">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Contains file deletion</span>
            </div>
          )}
        </div>

        {/* File Changes List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {summary.affectedFiles.map((file) => {
            const isExpanded = !!expandedFiles[file.uri]
            return (
              <div
                key={file.uri}
                className="rounded-xl border border-white/[0.06] bg-studio-card/40 overflow-hidden transition-all"
              >
                <div
                  onClick={() => toggleExpand(file.uri)}
                  className="px-3 py-2 flex items-center justify-between hover:bg-white/[0.03] cursor-pointer text-xs select-none"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-studio-muted shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-studio-muted shrink-0" />
                    )}

                    {file.kind === 'delete' ? (
                      <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : file.kind === 'create' ? (
                      <Plus className="w-3.5 h-3.5 text-[#88c096] shrink-0" />
                    ) : (
                      <FileCode2 className="w-3.5 h-3.5 text-studio-accent shrink-0" />
                    )}

                    <span className="font-mono text-white truncate" title={file.filePath}>
                      {file.fileName}
                    </span>
                    <span className="text-[10px] text-studio-muted font-mono truncate max-w-[200px]">
                      {file.filePath}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {file.kind === 'delete' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        delete
                      </span>
                    ) : file.kind === 'create' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#88c096]/15 text-[#88c096] border border-[#88c096]/30">
                        create
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-studio-muted border border-white/10">
                        {file.editsCount} edits
                      </span>
                    )}
                  </div>
                </div>

                {isExpanded && file.diffPreview && (
                  <div className="p-3 bg-black/40 border-t border-white/[0.04] text-[11px] font-mono text-zinc-300 whitespace-pre-wrap overflow-x-auto max-h-48">
                    {file.diffPreview}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-white/[0.08] bg-studio-card/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-studio-muted font-mono">
            Ctrl+Enter to Apply • Esc to Cancel
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelPendingWorkspaceEdit}
              className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-studio-muted hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={confirmPendingWorkspaceEdit}
              className="px-4 py-1.5 rounded-lg bg-studio-accent hover:bg-studio-accent/90 text-studio-bg font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-studio-accent/20 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

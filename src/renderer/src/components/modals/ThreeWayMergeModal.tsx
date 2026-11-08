import React, { useState, useEffect, useMemo } from 'react'
import Editor from '@monaco-editor/react'
import {
  GitMerge,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import {
  parseConflictBlocks,
  resolveConflict,
  extractThreeWayBuffers,
  resolveAllConflicts,
  type ConflictBlock
} from '../../services/conflictResolver'
import { registerAndApplyCozyTheme } from '../../theme/monacoTheme'

export const ThreeWayMergeModal: React.FC = () => {
  const {
    threeWayMergeSession,
    closeThreeWayMerge,
    updateFileContent,
    workspacePath,
    refreshGitStatus,
    setStatusMessage
  } = useEditorStore()

  const [mergedContent, setMergedContent] = useState('')
  const [activeBlockIndex, setActiveBlockIndex] = useState(0)

  useEffect(() => {
    if (threeWayMergeSession) {
      setMergedContent(threeWayMergeSession.content)
      setActiveBlockIndex(0)
    }
  }, [threeWayMergeSession])

  const conflictBlocks: ConflictBlock[] = useMemo(() => {
    return parseConflictBlocks(mergedContent)
  }, [mergedContent])

  const activeBlock = conflictBlocks[activeBlockIndex] || conflictBlocks[0] || null

  const threeWayBuffers = useMemo(() => {
    if (!threeWayMergeSession) {
      return { currentBuffer: '', incomingBuffer: '', cleanBaseBuffer: '' }
    }
    return extractThreeWayBuffers(threeWayMergeSession.content)
  }, [threeWayMergeSession])

  if (!threeWayMergeSession) return null

  const { fileName, filePath } = threeWayMergeSession

  const handleResolveActive = (resolution: 'current' | 'incoming' | 'both') => {
    if (!activeBlock) return
    const next = resolveConflict(mergedContent, activeBlock, resolution)
    setMergedContent(next)
    setStatusMessage(`Accepted ${resolution} for conflict block`)
    if (activeBlockIndex >= conflictBlocks.length - 1) {
      setActiveBlockIndex(Math.max(0, conflictBlocks.length - 2))
    }
  }

  const handleResolveAll = (resolution: 'current' | 'incoming' | 'both') => {
    const next = resolveAllConflicts(mergedContent, resolution)
    setMergedContent(next)
    setStatusMessage(`Resolved all conflicts as ${resolution}`)
    setActiveBlockIndex(0)
  }

  const handleReset = () => {
    setMergedContent(threeWayMergeSession.content)
    setActiveBlockIndex(0)
    setStatusMessage('Reset merge buffer to original conflict state')
  }

  const handleSaveAndStage = async () => {
    try {
      await window.maestroAPI.writeFile(filePath, mergedContent)
      updateFileContent(filePath, mergedContent)

      if (workspacePath) {
        const relPath = filePath.replace(workspacePath, '').replace(/^[/\\]/, '')
        await window.maestroAPI.gitStage(workspacePath, relPath)
        await refreshGitStatus()
      }

      setStatusMessage(`Resolved and staged ${fileName}`)
      closeThreeWayMerge()
    } catch (err: any) {
      setStatusMessage(`Failed to save merge: ${err?.message || err}`)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md animate-fade-in"
    >
      <div className="w-[96vw] h-[94vh] rounded-2xl bg-[#191b22] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3 border-b border-white/[0.08] flex items-center justify-between bg-studio-card/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-studio-rose/15 border border-studio-rose/30 flex items-center justify-center text-studio-rose">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white tracking-wide">
                  3-Way Merge Editor
                </h2>
                <span className="font-mono text-xs text-studio-amber px-2 py-0.5 rounded bg-studio-amber/10 border border-studio-amber/20">
                  {fileName}
                </span>
              </div>
              <p className="text-[11px] text-studio-muted">
                Compare Current vs Incoming changes and review final merged document.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/5 text-studio-muted hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset to initial conflict markers"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleSaveAndStage}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg cursor-pointer ${
                conflictBlocks.length === 0
                  ? 'bg-studio-emerald hover:bg-studio-emerald/90 text-studio-bg shadow-studio-emerald/20'
                  : 'bg-studio-amber hover:bg-studio-amber/90 text-studio-bg shadow-studio-amber/20'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {conflictBlocks.length === 0 ? 'Mark Resolved & Stage' : 'Save Merged Result'}
              </span>
            </button>

            <button
              onClick={closeThreeWayMerge}
              className="p-1.5 rounded-lg text-studio-muted hover:text-white hover:bg-white/10 transition-colors ml-1 cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conflict Navigation and Quick Actions Bar */}
        <div className="px-5 py-2 border-b border-white/[0.06] bg-studio-bg/60 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            {conflictBlocks.length > 0 ? (
              <>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-xs bg-studio-rose/15 text-studio-rose border border-studio-rose/30">
                  <AlertTriangle className="w-3 h-3" />
                  <span>
                    Conflict {activeBlockIndex + 1} of {conflictBlocks.length}
                  </span>
                </span>

                <button
                  onClick={() => setActiveBlockIndex((prev) => Math.max(0, prev - 1))}
                  disabled={activeBlockIndex === 0}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 text-studio-muted hover:text-white transition-colors cursor-pointer"
                  title="Previous Conflict"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() =>
                    setActiveBlockIndex((prev) => Math.min(conflictBlocks.length - 1, prev + 1))
                  }
                  disabled={activeBlockIndex >= conflictBlocks.length - 1}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 text-studio-muted hover:text-white transition-colors cursor-pointer"
                  title="Next Conflict"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded font-mono text-xs bg-studio-emerald/15 text-studio-emerald border border-studio-emerald/30">
                <Check className="w-3 h-3" />
                <span>All conflicts resolved! Ready to stage.</span>
              </span>
            )}
          </div>

          {activeBlock && (
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <button
                onClick={() => handleResolveActive('current')}
                className="px-2.5 py-1 rounded bg-studio-amber/20 hover:bg-studio-amber/30 text-studio-amber border border-studio-amber/30 transition-colors cursor-pointer"
              >
                Accept Current (Ours)
              </button>
              <button
                onClick={() => handleResolveActive('incoming')}
                className="px-2.5 py-1 rounded bg-studio-emerald/20 hover:bg-studio-emerald/30 text-studio-emerald border border-studio-emerald/30 transition-colors cursor-pointer"
              >
                Accept Incoming (Theirs)
              </button>
              <button
                onClick={() => handleResolveActive('both')}
                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors cursor-pointer"
              >
                Accept Both
              </button>
            </div>
          )}

          {conflictBlocks.length > 1 && (
            <div className="flex items-center gap-1 font-mono text-[10px] text-studio-muted">
              <span>All:</span>
              <button
                onClick={() => handleResolveAll('current')}
                className="hover:text-studio-amber underline cursor-pointer"
              >
                Ours
              </button>
              <span>•</span>
              <button
                onClick={() => handleResolveAll('incoming')}
                className="hover:text-studio-emerald underline cursor-pointer"
              >
                Theirs
              </button>
              <span>•</span>
              <button
                onClick={() => handleResolveAll('both')}
                className="hover:text-white underline cursor-pointer"
              >
                Both
              </button>
            </div>
          )}
        </div>

        {/* 3-Way Split Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Top Half: Current (Ours) vs Incoming (Theirs) */}
          <div className="h-1/2 flex border-b border-white/[0.08] overflow-hidden">
            {/* Top Left: Current (Ours / Local) */}
            <div className="flex-1 flex flex-col border-r border-white/[0.08] overflow-hidden">
              <div className="px-3 py-1.5 border-b border-white/[0.04] bg-studio-card/40 flex items-center justify-between text-xs font-mono shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-studio-amber" />
                  <span className="font-semibold text-studio-amber">
                    {activeBlock?.currentLabel || 'Current Change (Ours / HEAD)'}
                  </span>
                </div>
                <span className="text-[10px] text-studio-muted">Read-only reference</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language="typescript"
                  theme="cozy-dark"
                  beforeMount={registerAndApplyCozyTheme}
                  value={threeWayBuffers.currentBuffer}
                  options={{
                    readOnly: true,
                    fontSize: 12,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all'
                  }}
                />
              </div>
            </div>

            {/* Top Right: Incoming (Theirs / Remote) */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 border-b border-white/[0.04] bg-studio-card/40 flex items-center justify-between text-xs font-mono shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-studio-emerald" />
                  <span className="font-semibold text-studio-emerald">
                    {activeBlock?.incomingLabel || 'Incoming Change (Theirs / Remote)'}
                  </span>
                </div>
                <span className="text-[10px] text-studio-muted">Read-only reference</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language="typescript"
                  theme="cozy-dark"
                  beforeMount={registerAndApplyCozyTheme}
                  value={threeWayBuffers.incomingBuffer}
                  options={{
                    readOnly: true,
                    fontSize: 12,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Half: Merged Result Buffer (Editable) */}
          <div className="h-1/2 flex flex-col overflow-hidden">
            <div className="px-3 py-1.5 border-b border-white/[0.04] bg-studio-card/60 flex items-center justify-between text-xs font-mono shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-studio-accent" />
                <span className="font-semibold text-white">
                  Result (Merged Document Output — Live Editable)
                </span>
              </div>
              <span className="text-[10px] text-studio-muted">
                Edit directly or click actions above to resolve blocks
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                language="typescript"
                theme="cozy-dark"
                beforeMount={registerAndApplyCozyTheme}
                value={mergedContent}
                onChange={(val) => setMergedContent(val || '')}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  wordWrap: 'on'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default ThreeWayMergeModal

import React, { useState, useEffect } from 'react'
import {
  Play,
  Square,
  RotateCcw,
  Pause,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Bug,
  RefreshCw,
  Code2,
  Layers,
  Terminal,
  Eye,
  Settings2,
  Edit2,
  MessageSquare,
  Filter
} from 'lucide-react'
import { useDebugStore, WatchExpression } from '../../store/useDebugStore'
import { useEditorStore } from '../../store/useEditorStore'
import type { DapBreakpoint, DapStackFrame } from '../../../../preload/index.d'

export const DebugDeck: React.FC = () => {
  const {
    configurations,
    selectedConfigIndex,
    setSelectedConfigIndex,
    loadConfigurations,
    activeSessionId,
    status,
    stopReason,
    currentFrame,
    stackFrames,
    scopes,
    variables,
    breakpoints,
    watchExpressions,
    startDebugging,
    stopDebugging,
    restartDebugging,
    pauseDebugging,
    continueDebugging,
    stepOver,
    stepInto,
    stepOut,
    toggleBreakpoint,
    updateBreakpoint,
    toggleBreakpointEnabled,
    removeBreakpoint,
    removeAllBreakpoints,
    addWatchExpression,
    removeWatchExpression,
    evaluateWatchExpressions,
    selectStackFrame
  } = useDebugStore()

  const { workspacePath, openFile, setActiveFile, setCursorPosition, setBottomDeckOpen, setActiveBottomTab } =
    useEditorStore()

  const [isVariablesOpen, setIsVariablesOpen] = useState(true)
  const [isWatchOpen, setIsWatchOpen] = useState(true)
  const [isCallStackOpen, setIsCallStackOpen] = useState(true)
  const [isBreakpointsOpen, setIsBreakpointsOpen] = useState(true)

  // Breakpoint condition & logpoint editing state
  const [editingBpId, setEditingBpId] = useState<string | null>(null)
  const [bpConditionInput, setBpConditionInput] = useState('')
  const [bpHitConditionInput, setBpHitConditionInput] = useState('')
  const [bpLogMessageInput, setBpLogMessageInput] = useState('')

  const [watchInput, setWatchInput] = useState('')
  const [isAddingWatch, setIsAddingWatch] = useState(false)

  useEffect(() => {
    if (workspacePath) {
      loadConfigurations(workspacePath)
    }
  }, [workspacePath])

  const handleStart = async () => {
    await startDebugging()
  }

  const handleAddWatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (watchInput.trim()) {
      await addWatchExpression(watchInput.trim())
      setWatchInput('')
      setIsAddingWatch(false)
    }
  }

  const handleJumpToBreakpoint = async (bp: DapBreakpoint) => {
    try {
      const content = await window.maestroAPI.readFile(bp.filePath)
      const fileName = bp.filePath.split(/[\\/]/).pop() || bp.filePath
      openFile({
        path: bp.filePath,
        name: fileName,
        content
      })
      setActiveFile(bp.filePath)
      setCursorPosition(bp.line, bp.column || 1)
      window.dispatchEvent(
        new CustomEvent('editor-reveal-line', {
          detail: { line: bp.line, column: bp.column || 1 }
        })
      )
    } catch (err) {
      console.error('Failed to jump to breakpoint:', err)
    }
  }

  const isDebugging = status === 'running' || status === 'stopped'

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs select-none">
      {/* Top Configuration & Control Bar */}
      <div className="p-2.5 border-b border-white/[0.04] flex flex-col gap-2.5 bg-black/20">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="w-5 h-5 rounded-md bg-studio-accent/20 flex items-center justify-center text-studio-accent shrink-0">
              <Bug className="w-3.5 h-3.5" />
            </div>
            <select
              value={selectedConfigIndex}
              onChange={(e) => setSelectedConfigIndex(Number(e.target.value))}
              disabled={isDebugging}
              className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] focus:bg-white/[0.08] text-white text-[11px] font-medium rounded-lg px-2 py-1 outline-none border border-white/[0.06] cursor-pointer truncate transition-colors"
            >
              {configurations.map((cfg, idx) => (
                <option key={idx} value={idx} className="bg-studio-card text-white">
                  {cfg.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {!isDebugging ? (
              <button
                onClick={handleStart}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-studio-accent/20 hover:bg-studio-accent/30 text-studio-accent font-medium border border-studio-accent/30 cursor-pointer transition-all shadow-sm active:scale-95"
                title="Start Debugging (F5)"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Start</span>
              </button>
            ) : (
              <div className="flex items-center gap-0.5 bg-white/[0.06] p-0.5 rounded-lg border border-white/[0.08]">
                {status === 'stopped' ? (
                  <button
                    onClick={continueDebugging}
                    className="p-1 rounded hover:bg-white/10 text-studio-accent cursor-pointer transition-colors"
                    title="Continue (F5)"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={pauseDebugging}
                    className="p-1 rounded hover:bg-white/10 text-studio-amber cursor-pointer transition-colors"
                    title="Pause"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  </button>
                )}

                <button
                  onClick={stepOver}
                  disabled={status !== 'stopped'}
                  className={`p-1 rounded transition-colors ${
                    status === 'stopped'
                      ? 'hover:bg-white/10 text-white cursor-pointer'
                      : 'text-studio-muted opacity-40 cursor-not-allowed'
                  }`}
                  title="Step Over (F10)"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={stepInto}
                  disabled={status !== 'stopped'}
                  className={`p-1 rounded transition-colors ${
                    status === 'stopped'
                      ? 'hover:bg-white/10 text-white cursor-pointer'
                      : 'text-studio-muted opacity-40 cursor-not-allowed'
                  }`}
                  title="Step Into (F11)"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={stepOut}
                  disabled={status !== 'stopped'}
                  className={`p-1 rounded transition-colors ${
                    status === 'stopped'
                      ? 'hover:bg-white/10 text-white cursor-pointer'
                      : 'text-studio-muted opacity-40 cursor-not-allowed'
                  }`}
                  title="Step Out (Shift+F11)"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={restartDebugging}
                  className="p-1 rounded hover:bg-white/10 text-studio-amber cursor-pointer transition-colors"
                  title="Restart (Ctrl+Shift+F5)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={stopDebugging}
                  className="p-1 rounded hover:bg-white/10 text-studio-rose cursor-pointer transition-colors"
                  title="Stop (Shift+F5)"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-between text-[11px] px-1 font-mono">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'running'
                  ? 'bg-studio-accent animate-pulse'
                  : status === 'stopped'
                  ? 'bg-studio-amber'
                  : 'bg-studio-muted/40'
              }`}
            />
            <span className="capitalize text-studio-muted">
              {status === 'stopped' ? `Paused (${stopReason || 'step'})` : status}
            </span>
          </div>

          <button
            onClick={() => {
              setActiveBottomTab('debug')
              setBottomDeckOpen(true)
            }}
            className="flex items-center gap-1 text-studio-muted hover:text-white transition-colors cursor-pointer"
            title="Open Debug Console"
          >
            <Terminal className="w-3 h-3 text-studio-amber" />
            <span>Console</span>
          </button>
        </div>
      </div>

      {/* Accordions Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
        {/* Accordion 1: Variables */}
        <div>
          <button
            onClick={() => setIsVariablesOpen(!isVariablesOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 font-medium text-studio-muted hover:text-white hover:bg-white/[0.02] cursor-pointer"
          >
            <div className="flex items-center gap-1">
              {isVariablesOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="uppercase tracking-wider text-[10px] font-semibold text-white/70">Variables</span>
            </div>
          </button>

          {isVariablesOpen && (
            <div className="px-2.5 py-1 pb-2">
              {scopes.length === 0 ? (
                <div className="text-[11px] text-studio-muted/60 italic py-1 px-2">
                  {status === 'stopped' ? 'No variables in current scope' : 'Not paused at a frame'}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {scopes.map((scope, scIdx) => {
                    const vars = variables[scope.variablesReference] || []
                    return (
                      <div key={scIdx} className="flex flex-col gap-0.5">
                        <div className="text-[10px] uppercase font-mono tracking-wider text-studio-amber font-semibold px-1">
                          {scope.name}
                        </div>
                        {vars.length === 0 ? (
                          <div className="text-[10px] text-studio-muted px-2 py-0.5">Empty scope</div>
                        ) : (
                          vars.map((v, vIdx) => (
                            <div
                              key={vIdx}
                              className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/[0.04] font-mono text-[11px]"
                            >
                              <span className="text-white/80 truncate mr-2">{v.name}:</span>
                              <span
                                className={`truncate max-w-[140px] text-right ${
                                  v.type === 'string'
                                    ? 'text-studio-accent'
                                    : v.type === 'number'
                                    ? 'text-studio-amber'
                                    : 'text-studio-muted'
                                }`}
                              >
                                {v.value}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accordion 2: Watch Expressions */}
        <div>
          <div className="w-full flex items-center justify-between px-2.5 py-1.5 font-medium text-studio-muted hover:text-white hover:bg-white/[0.02]">
            <button
              onClick={() => setIsWatchOpen(!isWatchOpen)}
              className="flex items-center gap-1 flex-1 text-left cursor-pointer"
            >
              {isWatchOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="uppercase tracking-wider text-[10px] font-semibold text-white/70">Watch</span>
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={evaluateWatchExpressions}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white cursor-pointer"
                title="Refresh Watch Expressions"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <button
                onClick={() => setIsAddingWatch(true)}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white cursor-pointer"
                title="Add Expression"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {isWatchOpen && (
            <div className="px-2.5 py-1 pb-2">
              {isAddingWatch && (
                <form onSubmit={handleAddWatchSubmit} className="mb-2">
                  <input
                    type="text"
                    value={watchInput}
                    onChange={(e) => setWatchInput(e.target.value)}
                    placeholder="Expression to watch..."
                    autoFocus
                    onBlur={() => {
                      if (!watchInput.trim()) setIsAddingWatch(false)
                    }}
                    className="w-full bg-white/[0.06] border border-studio-accent/40 rounded px-2 py-1 text-white font-mono text-[11px] outline-none"
                  />
                </form>
              )}

              {watchExpressions.length === 0 && !isAddingWatch ? (
                <div className="text-[11px] text-studio-muted/60 italic py-1 px-2">
                  No watch expressions. Click + to add.
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {watchExpressions.map((w) => (
                    <div
                      key={w.id}
                      className="group flex items-center justify-between px-2 py-1 rounded hover:bg-white/[0.04] font-mono text-[11px]"
                    >
                      <div className="flex items-center gap-1 min-w-0 mr-2">
                        <span className="text-white truncate">{w.expression}:</span>
                        <span
                          className={`truncate ${
                            w.error
                              ? 'text-studio-rose'
                              : w.result !== undefined
                              ? 'text-studio-amber'
                              : 'text-studio-muted'
                          }`}
                        >
                          {w.result !== undefined ? w.result : 'not available'}
                        </span>
                      </div>
                      <button
                        onClick={() => removeWatchExpression(w.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-studio-muted hover:text-studio-rose cursor-pointer transition-opacity"
                        title="Remove Expression"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accordion 3: Call Stack */}
        <div>
          <button
            onClick={() => setIsCallStackOpen(!isCallStackOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 font-medium text-studio-muted hover:text-white hover:bg-white/[0.02] cursor-pointer"
          >
            <div className="flex items-center gap-1">
              {isCallStackOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="uppercase tracking-wider text-[10px] font-semibold text-white/70">Call Stack</span>
            </div>
          </button>

          {isCallStackOpen && (
            <div className="px-2.5 py-1 pb-2">
              {stackFrames.length === 0 ? (
                <div className="text-[11px] text-studio-muted/60 italic py-1 px-2">
                  {status === 'stopped' ? 'No call stack available' : 'Not paused'}
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {stackFrames.map((frame) => {
                    const isSelected = currentFrame?.id === frame.id
                    return (
                      <button
                        key={frame.id}
                        onClick={() => selectStackFrame(frame)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors cursor-pointer ${
                          isSelected ? 'bg-studio-accent/20 text-white font-medium' : 'hover:bg-white/[0.04] text-studio-muted hover:text-white'
                        }`}
                      >
                        <div className="min-w-0 truncate">
                          <div className="font-mono text-[11px] truncate">{frame.name}</div>
                          {frame.source && (
                            <div className="text-[10px] text-studio-muted truncate">
                              {frame.source.name || frame.source.path?.split(/[\\/]/).pop()}:{frame.line}
                            </div>
                          )}
                        </div>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-studio-accent shrink-0 ml-1" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accordion 4: Breakpoints */}
        <div>
          <div className="w-full flex items-center justify-between px-2.5 py-1.5 font-medium text-studio-muted hover:text-white hover:bg-white/[0.02]">
            <button
              onClick={() => setIsBreakpointsOpen(!isBreakpointsOpen)}
              className="flex items-center gap-1 flex-1 text-left cursor-pointer"
            >
              {isBreakpointsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="uppercase tracking-wider text-[10px] font-semibold text-white/70">Breakpoints</span>
              {breakpoints.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono ml-1">
                  {breakpoints.length}
                </span>
              )}
            </button>
            {breakpoints.length > 0 && (
              <button
                onClick={removeAllBreakpoints}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-studio-rose cursor-pointer"
                title="Remove All Breakpoints"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {isBreakpointsOpen && (
            <div className="px-2.5 py-1 pb-2">
              {breakpoints.length === 0 ? (
                <div className="text-[11px] text-studio-muted/60 italic py-1 px-2">
                  No breakpoints set. Click line gutter or press F9.
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {breakpoints.map((bp) => {
                    const fileName = bp.filePath.split(/[\\/]/).pop() || bp.filePath
                    const isEditing = editingBpId === bp.id

                    return (
                      <div key={bp.id} className="flex flex-col rounded bg-white/[0.02] border border-white/[0.04] p-1">
                        <div className="group flex items-center justify-between px-1 py-0.5">
                          <div
                            onClick={() => handleJumpToBreakpoint(bp)}
                            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleBreakpointEnabled(bp.id)
                              }}
                              className="cursor-pointer"
                            >
                              {bp.verified ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-studio-rose fill-studio-rose/20" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-studio-muted" />
                              )}
                            </button>
                            <span className="text-white font-mono text-[11px] truncate">{fileName}</span>
                            <span className="text-studio-amber font-mono text-[11px]">:{bp.line}</span>

                            {/* Breakpoint Badges */}
                            {bp.condition && (
                              <span
                                className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px]"
                                title={`Condition: ${bp.condition}`}
                              >
                                COND
                              </span>
                            )}
                            {bp.hitCondition && (
                              <span
                                className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px]"
                                title={`Hit Condition: ${bp.hitCondition}`}
                              >
                                HIT
                              </span>
                            )}
                            {bp.logMessage && (
                              <span
                                className="px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[9px]"
                                title={`Log: ${bp.logMessage}`}
                              >
                                LOG
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isEditing) {
                                  setEditingBpId(null)
                                } else {
                                  setEditingBpId(bp.id)
                                  setBpConditionInput(bp.condition || '')
                                  setBpHitConditionInput(bp.hitCondition || '')
                                  setBpLogMessageInput(bp.logMessage || '')
                                }
                              }}
                              className="p-0.5 rounded text-studio-muted hover:text-white cursor-pointer"
                              title="Edit Breakpoint Conditions / Log Message"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeBreakpoint(bp.id)
                              }}
                              className="p-0.5 rounded text-studio-muted hover:text-studio-rose cursor-pointer"
                              title="Remove Breakpoint"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Breakpoint Configuration Editor */}
                        {isEditing && (
                          <div className="mt-1.5 p-2 bg-black/40 border border-white/10 rounded flex flex-col gap-1.5 text-[11px]">
                            <div>
                              <div className="text-[10px] text-studio-muted font-medium mb-0.5">Expression Condition:</div>
                              <input
                                type="text"
                                value={bpConditionInput}
                                onChange={(e) => setBpConditionInput(e.target.value)}
                                placeholder="e.g. x > 10 || count === 0"
                                className="w-full px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white font-mono text-[11px] focus:outline-none focus:border-studio-amber"
                              />
                            </div>
                            <div>
                              <div className="text-[10px] text-studio-muted font-medium mb-0.5">Hit Count Condition:</div>
                              <input
                                type="text"
                                value={bpHitConditionInput}
                                onChange={(e) => setBpHitConditionInput(e.target.value)}
                                placeholder="e.g. >= 5, 10, % 2 == 0"
                                className="w-full px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white font-mono text-[11px] focus:outline-none focus:border-studio-amber"
                              />
                            </div>
                            <div>
                              <div className="text-[10px] text-studio-muted font-medium mb-0.5">Log Message (Logpoint):</div>
                              <input
                                type="text"
                                value={bpLogMessageInput}
                                onChange={(e) => setBpLogMessageInput(e.target.value)}
                                placeholder="e.g. Processing item {item.id} with status {item.status}"
                                className="w-full px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white font-mono text-[11px] focus:outline-none focus:border-studio-amber"
                              />
                            </div>
                            <div className="flex justify-end gap-1.5 mt-1">
                              <button
                                onClick={() => setEditingBpId(null)}
                                className="px-2 py-0.5 rounded text-studio-muted hover:text-white bg-white/5 text-[10px]"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  updateBreakpoint(bp.id, {
                                    condition: bpConditionInput.trim() || undefined,
                                    hitCondition: bpHitConditionInput.trim() || undefined,
                                    logMessage: bpLogMessageInput.trim() || undefined
                                  })
                                  setEditingBpId(null)
                                }}
                                className="px-2 py-0.5 rounded bg-studio-amber text-black font-semibold text-[10px] hover:brightness-110"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

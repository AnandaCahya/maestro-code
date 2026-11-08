import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Send,
  Square,
  RotateCcw,
  Plus,
  History,
  Settings,
  Paperclip,
  FileCode,
  FileText,
  AlertCircle,
  GitBranch,
  Terminal,
  ChevronDown,
  X,
  Download,
  Trash2,
  Search,
  CheckCircle2,
  FileDiff,
  HelpCircle,
  Wand2,
  Users,
  CheckCircle,
  Clock,
  ChevronUp,
  Layers,
  Zap,
  Activity
} from 'lucide-react'
import { useAiStore, BUILTIN_PROMPT_TEMPLATES } from '../../store/useAiStore'
import { useEditorStore } from '../../store/useEditorStore'
import { AiMessageItem } from './AiMessageItem'
import { AiSettingsModal } from './AiSettingsModal'
import { AiAgentManagerModal } from './AiAgentManagerModal'
import type { AiContextItem } from '../../../preload/index.d'

export const AiChatDeck: React.FC = () => {
  const {
    providers,
    models,
    selectedProviderId,
    selectedModelId,
    selectProvider,
    selectModel,
    chatMode,
    setChatMode,
    sessionUsage,
    messages,
    isStreaming,
    streamingText,
    activeAgentSteps,
    activeStepTitle,
    errorMessage,
    attachedContext,
    addContextItem,
    removeContextItem,
    clearContext,
    newConversation,
    openConversation,
    conversations,
    deleteConversation,
    exportConversation,
    sendMessage,
    stopGeneration,
    retryLastMessage,
    proposedDiffs,
    acceptDiff,
    rejectDiff,
    activeOrchestrationSession,
    startOrchestration,
    approveGate,
    roleWarnings,
    isOrchestrationDrawerOpen,
    setOrchestrationDrawerOpen,
    isAiSettingsOpen,
    setAiSettingsOpen,
    isHistoryOpen,
    setHistoryOpen,
    initialize
  } = useAiStore()

  const { activeFilePath, openFiles, diagnostics, gitStatus, applyWorkspaceEdit } = useEditorStore()

  const [inputText, setInputText] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    initialize()
  }, [])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const handleSend = () => {
    if (!inputText.trim() || isStreaming) return
    sendMessage(inputText)
    setInputText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Quick Context Attach Handlers
  const handleAttachActiveFile = () => {
    if (!activeFilePath) return
    const file = openFiles.find((f) => f.path === activeFilePath)
    if (!file) return
    const fileName = activeFilePath.split(/[\\/]/).pop() || activeFilePath
    addContextItem({
      id: `file_${activeFilePath}`,
      type: 'file',
      label: fileName,
      filePath: activeFilePath,
      content: file.content || '',
      language: file.language
    })
  }

  const handleAttachDiagnostics = () => {
    if (!diagnostics || diagnostics.length === 0) return
    const errorsText = diagnostics
      .map((d) => `[${d.severity.toUpperCase()}] line ${d.line}: ${d.message}`)
      .join('\n')
    addContextItem({
      id: `diag_${Date.now()}`,
      type: 'diagnostics',
      label: `LSP Diagnostics (${diagnostics.length})`,
      content: errorsText
    })
  }

  const handleAttachGitDiff = async () => {
    if (!window.maestroAPI || !useEditorStore.getState().workspacePath) return
    const ws = useEditorStore.getState().workspacePath!
    try {
      const status = await window.maestroAPI.getGitStatus(ws)
      const diffSummary = `Branch: ${status.currentBranch}\nModified files: ${status.modified.join(', ')}\nUntracked: ${status.untracked.join(', ')}`
      addContextItem({
        id: `git_${Date.now()}`,
        type: 'git',
        label: `Git Status (${status.currentBranch})`,
        content: diffSummary
      })
    } catch {}
  }

  const handleExport = async () => {
    const md = await exportConversation('markdown')
    if (!md) return
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `maestro-ai-conversation-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalContextTokens = attachedContext.reduce((sum, c) => sum + (c.estimatedTokens || 0), 0)
  const selectedProvider = providers.find((p) => p.id === selectedProviderId)
  const activeModels = models.filter((m) => m.providerId === selectedProviderId)
  const selectedModel = models.find((m) => m.id === selectedModelId)
  const contextWindowSize = selectedModel?.capabilities.contextWindow || 1_000_000
  const usedTokens = sessionUsage.promptTokens || 0
  const usedPercent = Math.min(100, Math.max(0, (usedTokens / contextWindowSize) * 100))
  const remainingPercent = Math.max(0, 100 - usedPercent)
  const remainingTokens = Math.max(0, contextWindowSize - usedTokens)

  return (
    <div className="flex flex-col h-full bg-studio-bg border-r border-studio-border text-xs text-studio-text select-text overflow-hidden relative">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-studio-border bg-studio-surface/60 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-studio-accent/15 text-studio-accent border border-studio-accent/30 shadow-glow-accent">
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          {/* Active Provider Pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-studio-card/80 border border-studio-border/70 text-xs font-mono select-none"
            title={`Active AI Engine: ${selectedProvider?.name || 'Google Antigravity'} (Local)`}
          >
            <Zap className="w-3.5 h-3.5 text-studio-accent" />
            <span className="font-semibold text-studio-text">
              {selectedProviderId === 'antigravity' ? 'Antigravity' : selectedProvider?.name || selectedProviderId}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-studio-emerald animate-pulse" />
          </div>

          {/* Model Selector Dropdown (Filtered to Active Provider) */}
          <div className="relative">
            <button
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-studio-card border border-studio-border/70 text-studio-text font-medium text-xs cursor-pointer transition-colors"
              title="Select Model for active provider"
            >
              <span className="truncate max-w-[130px] font-mono">{selectedModelId}</span>
              <ChevronDown className="w-3.5 h-3.5 text-studio-muted" />
            </button>

            {showModelMenu && (
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-studio-card border border-studio-border rounded-xl shadow-2xl py-1.5 z-30 animate-in fade-in-50">
                <div className="px-3 py-1 text-[10px] uppercase font-semibold text-studio-muted tracking-wider">
                  {selectedProvider?.name || 'Antigravity'} Models
                </div>
                {activeModels.length > 0 ? (
                  activeModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        selectModel(m.id)
                        setShowModelMenu(false)
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-studio-surface text-xs cursor-pointer ${
                        m.id === selectedModelId ? 'text-studio-accent font-semibold bg-studio-accent/5' : 'text-studio-text'
                      }`}
                    >
                      <span className="truncate">{m.name.replace(' (Antigravity)', '')}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-studio-surface text-studio-muted border border-studio-border">
                        {m.capabilities.contextWindow >= 1000000 ? '1M' : `${Math.round(m.capabilities.contextWindow / 1000)}k`}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-studio-muted italic">No models found</div>
                )}
              </div>
            )}
          </div>

          {/* Mode Switcher: Ask / Edit / Orchestrate */}
          <div className="flex rounded-lg p-1 bg-studio-bg border border-studio-border/70 text-xs gap-0.5">
            <button
              onClick={() => setChatMode('ask')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors font-medium ${
                chatMode === 'ask'
                  ? 'bg-studio-accent text-studio-bg font-semibold shadow-sm'
                  : 'text-studio-muted hover:text-studio-text'
              }`}
              title="Ask Mode: Safe code consultation without modifying files"
            >
              Ask
            </button>
            <button
              onClick={() => setChatMode('edit')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors font-medium ${
                chatMode === 'edit'
                  ? 'bg-studio-cyan text-studio-bg font-semibold shadow-sm'
                  : 'text-studio-muted hover:text-studio-text'
              }`}
              title="Edit Mode: Proposes inline diffs to workspace files"
            >
              Edit
            </button>
            <button
              onClick={() => setChatMode('orchestration')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors font-medium ${
                chatMode === 'orchestration'
                  ? 'bg-studio-violet text-studio-bg font-semibold shadow-sm'
                  : 'text-studio-muted hover:text-studio-text'
              }`}
              title="Orchestration Mode: Requirement discovery, multi-role planning and execution"
            >
              Orchestrate
            </button>
          </div>

          {/* Token Remaining / Context Quota Meter (VSCode style) */}
          <div
            className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-studio-bg border border-studio-border/70 text-[11px] font-mono select-none"
            title={`Antigravity Context Window Quota:\n• Total Window: ${contextWindowSize.toLocaleString()} tokens\n• Context In-Use: ${usedTokens.toLocaleString()} tokens (${usedPercent.toFixed(1)}%)\n• Remaining Available: ${remainingTokens.toLocaleString()} tokens (${remainingPercent.toFixed(1)}%)`}
          >
            <div className="w-12 h-1.5 rounded-full bg-studio-surface border border-studio-border/50 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  usedPercent > 80
                    ? 'bg-studio-rose'
                    : usedPercent > 50
                    ? 'bg-studio-amber'
                    : 'bg-studio-accent'
                }`}
                style={{ width: `${Math.max(usedPercent, 3)}%` }}
              />
            </div>
            <span className="text-studio-accent font-semibold">
              {remainingPercent.toFixed(0)}%
            </span>
            <span className="text-studio-muted text-[10px]">
              left ({remainingTokens >= 1_000_000 ? `${(remainingTokens / 1_000_000).toFixed(1)}M` : remainingTokens >= 1000 ? `${Math.round(remainingTokens / 1000)}k` : remainingTokens})
            </span>
          </div>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => newConversation(chatMode === 'orchestration' ? 'orchestration' : 'chat')}
            title="New Conversation"
            className="p-1.5 rounded-lg hover:bg-studio-card text-studio-muted hover:text-studio-text cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setHistoryOpen(!isHistoryOpen)}
            title="Conversation History"
            className={`p-1.5 rounded-lg hover:bg-studio-card transition-colors cursor-pointer ${
              isHistoryOpen ? 'text-studio-accent' : 'text-studio-muted hover:text-studio-text'
            }`}
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => setOrchestrationDrawerOpen(true)}
            title="Agent Manager & Workflow Studio"
            className={`p-1.5 rounded-lg hover:bg-studio-card transition-colors cursor-pointer ${
              isOrchestrationDrawerOpen ? 'text-studio-violet' : 'text-studio-muted hover:text-studio-text'
            }`}
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            title="Export Conversation to Markdown"
            className="p-1.5 rounded-lg hover:bg-studio-card text-studio-muted hover:text-studio-text cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAiSettingsOpen(true)}
            title="AI Configuration & Privacy"
            className="p-1.5 rounded-lg hover:bg-studio-card text-studio-muted hover:text-studio-text cursor-pointer transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* History Slide-over Drawer */}
      {isHistoryOpen && (
        <div className="absolute inset-y-0 left-0 w-64 bg-studio-card border-r border-studio-border z-20 flex flex-col shadow-2xl animate-in slide-in-from-left duration-150">
          <div className="p-2.5 border-b border-studio-border flex items-center justify-between">
            <span className="font-semibold text-xs text-studio-text">History</span>
            <button
              onClick={() => setHistoryOpen(false)}
              className="text-studio-muted hover:text-studio-text cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-2 border-b border-studio-border/60">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-studio-surface rounded border border-studio-border">
              <Search className="w-3 h-3 text-studio-muted" />
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="bg-transparent border-none outline-none text-[11px] text-studio-text w-full"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations
              .filter((c) => !historySearch || c.title.toLowerCase().includes(historySearch.toLowerCase()))
              .map((c) => (
                <div
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className="group flex items-center justify-between p-2 rounded hover:bg-studio-surface cursor-pointer transition-colors text-[11.5px]"
                >
                  <div className="truncate flex-1">
                    <div className="font-medium text-studio-text truncate">{c.title}</div>
                    <div className="text-[10px] text-studio-muted">
                      {new Date(c.updatedAt).toLocaleDateString()} • {c.modelId}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConversation(c.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-studio-muted hover:text-studio-rose transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Orchestration Team & Task Board (Visible in Orchestration Mode) */}
      {chatMode === 'orchestration' && (
        <div className="border-b border-studio-border bg-studio-card/95 p-4 space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-xs text-studio-violet flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>Software House Team</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono uppercase bg-studio-violet/15 text-studio-violet border border-studio-violet/30">
                Stage: {activeOrchestrationSession?.stage || 'Discovery'}
              </span>
            </div>

            {!activeOrchestrationSession ? (
              <button
                onClick={() => {
                  const goal = inputText || 'Plan and orchestrate feature development'
                  startOrchestration(goal)
                }}
                className="px-3.5 py-1.5 rounded-lg bg-studio-violet text-studio-bg font-semibold hover:bg-studio-violet/90 text-xs cursor-pointer transition-all shadow-sm active:scale-95"
              >
                Assemble Team & Plan
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {!activeOrchestrationSession.approvalGates?.planApproved && (
                  <button
                    onClick={() => approveGate('planApproved')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-studio-emerald text-studio-bg font-semibold hover:bg-studio-emerald/90 text-xs cursor-pointer transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve Plan</span>
                  </button>
                )}
                {activeOrchestrationSession.approvalGates?.planApproved &&
                  !activeOrchestrationSession.approvalGates?.executionApproved && (
                    <button
                      onClick={() => approveGate('executionApproved')}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-studio-accent text-studio-bg font-semibold hover:bg-studio-accentHover text-xs cursor-pointer transition-colors shadow-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve Result</span>
                    </button>
                  )}
                <button
                  onClick={() => setOrchestrationDrawerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-surface hover:bg-studio-card border border-studio-border text-studio-text hover:text-studio-violet text-xs font-medium cursor-pointer transition-colors"
                  title="Open full Agent Manager modal with workflow graph, artifacts, and audit trace"
                >
                  <Users className="w-3.5 h-3.5 text-studio-violet" />
                  <span>Agent Manager</span>
                </button>
              </div>
            )}
          </div>

          {/* Active Assigned Specialists */}
          {activeOrchestrationSession && (
            <div className="space-y-3 pt-2 border-t border-studio-border/50">
              <div className="flex flex-wrap gap-2">
                {activeOrchestrationSession.activeRoles?.map((role: any) => (
                  <div
                    key={role.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-studio-surface border border-studio-border text-xs"
                  >
                    <span className="text-sm">{role.avatar}</span>
                    <span className="font-medium text-studio-text">{role.name}</span>
                    <span className="text-xs text-studio-muted">({role.title.split(' ')[0]})</span>
                  </div>
                ))}
              </div>

              {/* Role Coverage Warnings */}
              {roleWarnings.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-studio-amber bg-studio-amber/10 px-3 py-2 rounded-lg border border-studio-amber/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{roleWarnings.join(' ')}</span>
                </div>
              )}

              {/* Task Graph Breakdown */}
              {activeOrchestrationSession.tasks?.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {activeOrchestrationSession.tasks.map((task: any) => {
                    let statusBadge = 'bg-studio-surface text-studio-muted'
                    if (task.status === 'completed') statusBadge = 'bg-studio-emerald/15 text-studio-emerald'
                    if (task.status === 'running') statusBadge = 'bg-studio-accent/20 text-studio-accent animate-pulse'
                    if (task.status === 'failed') statusBadge = 'bg-studio-rose/15 text-studio-rose'

                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-studio-bg border border-studio-border/60 text-xs hover:border-studio-border transition-colors"
                      >
                        <div className="truncate flex-1 mr-3">
                          <span className="font-mono text-studio-muted text-xs mr-2">{task.id}</span>
                          <span className="text-studio-text">{task.title}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10.5px] uppercase font-mono font-medium ${statusBadge}`}>
                          {task.status}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3 select-none">
            <div className="p-3 rounded-full bg-studio-accent/10 border border-studio-accent/20 text-studio-accent shadow-glow-accent">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-studio-text">Maestro AI Assistant</h3>
              <p className="text-[11px] text-studio-muted max-w-[260px] mt-1">
                Context-aware pair programming and orchestration. Select code or attach context to start.
              </p>
            </div>

            {/* Quick Prompt Starters */}
            <div className="w-full max-w-[280px] space-y-1.5 pt-2">
              {BUILTIN_PROMPT_TEMPLATES.slice(0, 3).map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    handleAttachActiveFile()
                    setInputText(tmpl.prompt)
                    textareaRef.current?.focus()
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md bg-studio-surface/50 border border-studio-border/70 hover:border-studio-accent/50 text-[11px] text-studio-text flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>{tmpl.label}</span>
                  <Wand2 className="w-3 h-3 text-studio-accent" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages List */}
        {messages.map((msg, index) => (
          <AiMessageItem
            key={`msg-${index}`}
            message={msg}
            isLast={index === messages.length - 1}
            onRetry={retryLastMessage}
          />
        ))}

        {/* Streaming Bubble */}
        {isStreaming && (
          <div className="flex gap-3 px-3.5 py-3 rounded-xl bg-studio-card/95 border border-studio-border mr-2 shadow-md animate-in fade-in space-y-2">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-7 h-7 rounded-xl bg-studio-accent/15 border border-studio-accent/30 flex items-center justify-center text-studio-accent animate-pulse shadow-glow-accent">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="flex-1 text-xs text-studio-text space-y-2 min-w-0">
              <div className="flex items-center justify-between text-xs text-studio-muted">
                <div className="flex items-center gap-2 font-medium text-studio-accent">
                  <span className="w-2 h-2 rounded-full bg-studio-accent animate-ping" />
                  <span>Maestro AI</span>
                  <span className="text-studio-muted text-[11px] font-mono">
                    [{activeStepTitle || 'Thinking & Analyzing...'}]
                  </span>
                </div>
                <button
                  onClick={stopGeneration}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-studio-surface border border-studio-border text-studio-rose hover:bg-studio-rose/10 cursor-pointer text-xs"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>Stop</span>
                </button>
              </div>

              {/* Live Activity Step Timeline / Log */}
              {activeAgentSteps.length > 0 && (
                <div className="rounded-lg bg-studio-surface/60 border border-studio-border/50 p-2 space-y-1.5 text-[11px] font-mono">
                  {activeAgentSteps.map((st) => (
                    <div key={st.id} className="flex items-center gap-2 text-studio-muted">
                      {st.state === 'DONE' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-studio-emerald flex-shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-studio-accent border-t-transparent animate-spin flex-shrink-0" />
                      )}
                      <span className={st.state === 'DONE' ? 'text-studio-text/90' : 'text-studio-accent font-medium'}>
                        {st.title}
                      </span>
                      {typeof st.durationSeconds === 'number' && (
                        <span className="text-studio-muted/60 text-[10px]">
                          ({st.durationSeconds.toFixed(1)}s)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Streaming Output Text */}
              {streamingText ? (
                <div className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans text-studio-text pt-1 selection:bg-studio-accent/20">
                  {streamingText}
                  <span className="inline-block w-1.5 h-3.5 bg-studio-accent ml-0.5 animate-pulse" />
                </div>
              ) : (
                <div className="text-[11.5px] italic text-studio-muted flex items-center gap-2 pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-studio-accent animate-pulse" />
                  <span>Working on your request...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-studio-rose/10 border border-studio-rose/30 text-studio-rose flex items-start gap-2 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">{errorMessage}</div>
            <button
              onClick={retryLastMessage}
              className="text-[10px] underline hover:text-studio-text cursor-pointer flex-shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Proposed Diffs Review Banner in Edit Mode */}
        {proposedDiffs.some((d) => d.status === 'pending') && (
          <div className="p-3 rounded-lg bg-studio-card border border-studio-cyan/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-studio-cyan">
                <FileDiff className="w-3.5 h-3.5" />
                <span>Proposed Edits ({proposedDiffs.filter((d) => d.status === 'pending').length})</span>
              </div>
            </div>
            {proposedDiffs
              .filter((d) => d.status === 'pending')
              .map((d) => (
                <div
                  key={d.id}
                  className="p-2 rounded bg-studio-surface border border-studio-border flex items-center justify-between text-[11px]"
                >
                  <span className="font-mono text-studio-text truncate">{d.filePath}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => acceptDiff(d.id)}
                      className="px-2 py-0.5 rounded bg-studio-emerald text-studio-bg font-medium hover:bg-studio-emerald/90 cursor-pointer"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => rejectDiff(d.id)}
                      className="px-2 py-0.5 rounded bg-studio-surface border border-studio-border text-studio-muted hover:text-studio-rose cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Context Attachment Bar */}
      <div className="px-3 py-1.5 bg-studio-surface/40 border-t border-studio-border/70 space-y-1.5">
        {/* Context Pills */}
        {attachedContext.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center pb-1">
            {attachedContext.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-studio-card border border-studio-border text-[10px] text-studio-text font-mono"
              >
                <span className="text-studio-accent uppercase font-bold">{item.type}</span>
                <span className="truncate max-w-[120px]">{item.label}</span>
                <span className="text-studio-muted text-[9px]">~{item.estimatedTokens}t</span>
                <button
                  onClick={() => removeContextItem(item.id)}
                  className="text-studio-muted hover:text-studio-rose cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <button
              onClick={clearContext}
              className="text-[10px] text-studio-muted hover:text-studio-rose underline ml-1 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Quick Context Selectors */}
        <div className="flex items-center justify-between text-[10px] text-studio-muted select-none">
          <div className="flex items-center gap-1">
            <span className="font-medium text-studio-muted">Attach:</span>
            <button
              onClick={handleAttachActiveFile}
              disabled={!activeFilePath}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-studio-card text-studio-muted hover:text-studio-text border border-transparent hover:border-studio-border disabled:opacity-40 cursor-pointer transition-colors"
              title="Attach currently active file"
            >
              <FileCode className="w-3.5 h-3.5 text-studio-accent" />
              <span>@file</span>
            </button>
            <button
              onClick={handleAttachDiagnostics}
              disabled={!diagnostics || diagnostics.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-studio-card text-studio-muted hover:text-studio-text border border-transparent hover:border-studio-border disabled:opacity-40 cursor-pointer transition-colors"
              title="Attach LSP errors and warnings"
            >
              <AlertCircle className="w-3.5 h-3.5 text-studio-rose" />
              <span>@problems</span>
            </button>
            <button
              onClick={handleAttachGitDiff}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-studio-card text-studio-muted hover:text-studio-text border border-transparent hover:border-studio-border cursor-pointer transition-colors"
              title="Attach Git status and changed files"
            >
              <GitBranch className="w-3.5 h-3.5 text-studio-cyan" />
              <span>@git</span>
            </button>
          </div>

          {/* Prompt Templates Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-studio-muted hover:text-studio-accent hover:bg-studio-surface cursor-pointer transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Prompts</span>
            </button>

            {showTemplatesMenu && (
              <div className="absolute bottom-full right-0 mb-1.5 w-52 bg-studio-card border border-studio-border rounded-xl shadow-2xl py-1.5 z-30 animate-in fade-in-50">
                {BUILTIN_PROMPT_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      setInputText(tmpl.prompt)
                      setShowTemplatesMenu(false)
                      textareaRef.current?.focus()
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-studio-surface text-xs text-studio-text flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>{tmpl.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Box */}
      <div className="p-3.5 bg-studio-surface/80 border-t border-studio-border">
        <div className="relative bg-studio-bg border border-studio-border rounded-xl focus-within:border-studio-accent/80 transition-all shadow-sm">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              chatMode === 'edit'
                ? 'Describe edits to propose (e.g. "Add error handling to fetchUsers")...'
                : chatMode === 'orchestration'
                ? 'Specify requirement to orchestrate (e.g. "Implement user authentication flow")...'
                : 'Ask Maestro AI a question or request assistance...'
            }
            rows={3}
            className="w-full bg-transparent p-3 text-xs text-studio-text placeholder:text-studio-muted/70 outline-none resize-none font-sans leading-relaxed"
          />

          <div className="flex items-center justify-between px-3 py-2 border-t border-studio-border/40 text-xs text-studio-muted">
            <div className="flex items-center gap-2 font-mono text-[11px] overflow-hidden">
              <span className="truncate">{totalContextTokens > 0 ? `Context: ~${totalContextTokens}t` : 'No context attached'}</span>
              <span
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-studio-surface border border-studio-border/60 text-studio-muted cursor-help"
                title={`Model: ${selectedModel?.name || selectedModelId}\n• Context Window: ${contextWindowSize.toLocaleString()} tokens\n• Context Used: ${usedTokens.toLocaleString()} tokens (${usedPercent.toFixed(1)}%)\n• Remaining Available: ${remainingTokens.toLocaleString()} tokens (${remainingPercent.toFixed(1)}%)`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-studio-emerald" />
                <span className="font-semibold text-studio-text/90">{remainingPercent.toFixed(0)}%</span>
                <span className="text-studio-muted/70 text-[10px]">left</span>
              </span>
              {sessionUsage && sessionUsage.totalTokens > 0 && (
                <span
                  className="flex items-center gap-1 text-studio-accent font-medium px-2 py-0.5 rounded bg-studio-surface border border-studio-border/60 cursor-help"
                  title={`Antigravity Engine Session Usage:\nPrompt: ${sessionUsage.promptTokens.toLocaleString()} tokens\nCompletion: ${sessionUsage.completionTokens.toLocaleString()} tokens${sessionUsage.thinkingTokens ? `\nThinking: ${sessionUsage.thinkingTokens.toLocaleString()} tokens` : ''}\nTotal: ${sessionUsage.totalTokens.toLocaleString()} tokens`}
                >
                  <Zap className="w-3 h-3 text-studio-accent" />
                  <span>Usage: {sessionUsage.totalTokens >= 1000 ? `${(sessionUsage.totalTokens / 1000).toFixed(1)}k` : sessionUsage.totalTokens}t</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-studio-muted/70 mr-1 hidden sm:inline">Shift+Enter for newline</span>
              {isStreaming ? (
                <button
                  onClick={stopGeneration}
                  className="px-3 py-1.5 rounded-lg bg-studio-rose text-studio-bg font-medium hover:bg-studio-rose/90 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95 text-xs"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="p-2 rounded-lg bg-studio-accent text-studio-bg font-medium hover:bg-studio-accentHover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <AiSettingsModal
        isOpen={isAiSettingsOpen}
        onClose={() => setAiSettingsOpen(false)}
      />

      {/* Agent Manager Modal */}
      <AiAgentManagerModal
        isOpen={isOrchestrationDrawerOpen}
        onClose={() => setOrchestrationDrawerOpen(false)}
      />
    </div>
  )
}

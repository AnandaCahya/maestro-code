import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Users,
  GitBranch,
  FileCode,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Copy,
  Check,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  Kanban,
  FileText,
  Clock,
  Layers,
  Sparkles,
  Terminal,
  ExternalLink,
  Sliders,
  Trash2
} from 'lucide-react'
import { useAiStore } from '../../store/useAiStore'
import { useEditorStore } from '../../store/useEditorStore'

interface AiAgentManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

type ActiveTab = 'team' | 'graph' | 'artifacts' | 'audit' | 'templates'

export const AiAgentManagerModal: React.FC<AiAgentManagerModalProps> = ({ isOpen, onClose }) => {
  const {
    activeOrchestrationSession,
    roleTemplates,
    roleWarnings,
    toolAuditLog,
    workflowTemplates,
    loadToolAuditLog,
    clearToolAuditLog,
    loadWorkflowTemplates,
    approveGate,
    updateOrchestrationTask,
    pushPlanToProjectDeck,
    exportArtifactToFile,
    startOrchestration
  } = useAiStore()

  const workspaceRoot = useEditorStore((s) => s.workspaceRoot)

  const [activeTab, setActiveTab] = useState<ActiveTab>('team')
  const [roleSearch, setRoleSearch] = useState<string>('')
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null)
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null)
  const [artifactTypeFilter, setArtifactTypeFilter] = useState<string>('all')
  const [auditTierFilter, setAuditTierFilter] = useState<string>('all')
  const [auditSearch, setAuditSearch] = useState<string>('')
  const [copiedArtifact, setCopiedArtifact] = useState<boolean>(false)
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const [pmSyncNotice, setPmSyncNotice] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadToolAuditLog()
      loadWorkflowTemplates()
    }
  }, [isOpen])

  // Select first artifact if none selected
  useEffect(() => {
    if (activeOrchestrationSession?.artifacts?.length && !selectedArtifactId) {
      setSelectedArtifactId(activeOrchestrationSession.artifacts[0].id)
    }
  }, [activeOrchestrationSession, selectedArtifactId])

  if (!isOpen) return null

  const activeRoles = activeOrchestrationSession?.activeRoles || []
  const allRoles = roleTemplates.length > 0 ? roleTemplates : activeRoles

  const filteredRoles = allRoles.filter((r) => {
    if (!roleSearch.trim()) return true
    const q = roleSearch.toLowerCase()
    return (
      r.name.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.expertise?.some((e: string) => e.toLowerCase().includes(q))
    )
  })

  const artifacts = activeOrchestrationSession?.artifacts || []
  const filteredArtifacts = artifacts.filter((a: any) => {
    if (artifactTypeFilter === 'all') return true
    return a.type === artifactTypeFilter
  })

  const currentArtifact = artifacts.find((a: any) => a.id === selectedArtifactId) || filteredArtifacts[0]

  const filteredAuditLog = toolAuditLog.filter((log: any) => {
    if (auditTierFilter !== 'all' && log.tier !== auditTierFilter) return false
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase()
      const matchTool = log.toolName?.toLowerCase().includes(q)
      const matchError = log.error?.toLowerCase().includes(q)
      if (!matchTool && !matchError) return false
    }
    return true
  })

  const handleCopyArtifact = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedArtifact(true)
      setTimeout(() => setCopiedArtifact(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const handleExportArtifact = async (artifact: any) => {
    if (!workspaceRoot) {
      setExportNotice('No active workspace open to export to.')
      setTimeout(() => setExportNotice(null), 3000)
      return
    }
    const ext = artifact.type === 'plan' ? 'json' : 'md'
    const defaultRelPath = `docs/ai/${artifact.id}.${ext}`
    const result = await exportArtifactToFile(artifact, workspaceRoot, defaultRelPath)
    if (result.success) {
      setExportNotice(`Exported to ${result.path}`)
    } else {
      setExportNotice(`Failed: ${result.error}`)
    }
    setTimeout(() => setExportNotice(null), 4000)
  }

  const handlePushPlanToProject = async () => {
    const res = await pushPlanToProjectDeck(workspaceRoot || undefined)
    setPmSyncNotice(res.message)
    setTimeout(() => setPmSyncNotice(null), 4000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-studio-card border border-studio-border rounded-xl shadow-2xl flex flex-col overflow-hidden h-[88vh] max-h-[850px]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-studio-border bg-studio-surface/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-studio-violet/15 text-studio-violet border border-studio-violet/30 shadow-glow-accent">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-studio-text tracking-tight">
                  Agent Manager & Software House Studio
                </h2>
                {activeOrchestrationSession && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-studio-violet/15 text-studio-violet border border-studio-violet/30">
                    Stage: {activeOrchestrationSession.stage}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-studio-muted">
                Role specialization profiles, execution task graphs, generated deliverables, and tool security audit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-studio-muted hover:text-studio-text hover:bg-studio-surface transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Notifications */}
        {pmSyncNotice && (
          <div className="bg-studio-emerald/15 border-b border-studio-emerald/30 text-studio-emerald px-6 py-2 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{pmSyncNotice}</span>
            </div>
            <button onClick={() => setPmSyncNotice(null)} className="cursor-pointer text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        {exportNotice && (
          <div className="bg-studio-accent/15 border-b border-studio-accent/30 text-studio-accent px-6 py-2 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{exportNotice}</span>
            </div>
            <button onClick={() => setExportNotice(null)} className="cursor-pointer text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-studio-border px-6 bg-studio-bg/60">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'team'
                  ? 'border-studio-violet text-studio-violet'
                  : 'border-transparent text-studio-muted hover:text-studio-text'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team & Roles</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-studio-surface text-studio-muted font-mono">
                {allRoles.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'graph'
                  ? 'border-studio-violet text-studio-violet'
                  : 'border-transparent text-studio-muted hover:text-studio-text'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Workflow & Task Graph</span>
              {activeOrchestrationSession?.tasks?.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-studio-surface text-studio-muted font-mono">
                  {activeOrchestrationSession.tasks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('artifacts')}
              className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'artifacts'
                  ? 'border-studio-violet text-studio-violet'
                  : 'border-transparent text-studio-muted hover:text-studio-text'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Artifacts Inspector</span>
              {artifacts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-studio-surface text-studio-muted font-mono">
                  {artifacts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'audit'
                  ? 'border-studio-violet text-studio-violet'
                  : 'border-transparent text-studio-muted hover:text-studio-text'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Audit & Execution Trace</span>
              {toolAuditLog.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-studio-surface text-studio-muted font-mono">
                  {toolAuditLog.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'templates'
                  ? 'border-studio-violet text-studio-violet'
                  : 'border-transparent text-studio-muted hover:text-studio-text'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>SDLC Workflows</span>
              {workflowTemplates.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-studio-surface text-studio-muted font-mono">
                  {workflowTemplates.length}
                </span>
              )}
            </button>
          </div>

          {activeOrchestrationSession && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePushPlanToProject}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-studio-accent text-studio-bg font-medium hover:bg-studio-accentHover text-xs cursor-pointer shadow-sm transition-colors"
                title="Convert AI task graph into Project Deck kanban cards"
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Push Plan to Project Deck</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab Content Panes */}
        <div className="flex-1 overflow-hidden p-6 bg-studio-bg">
          {/* TAB 1: TEAM VIEW */}
          {activeTab === 'team' && (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-studio-muted" />
                  <input
                    type="text"
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    placeholder="Filter specialists by name or expertise..."
                    className="w-full bg-studio-card border border-studio-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-studio-text placeholder:text-studio-muted focus:border-studio-violet outline-none"
                  />
                </div>
                {activeOrchestrationSession && (
                  <div className="text-xs text-studio-muted">
                    <span className="font-semibold text-studio-text">{activeRoles.length}</span> assigned to active session
                  </div>
                )}
              </div>

              {/* Roles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 overflow-y-auto flex-1 pr-1">
                {filteredRoles.map((role) => {
                  const isAssigned = activeRoles.some((ar: any) => ar.id === role.id)
                  const isExpanded = expandedRoleId === role.id

                  let statusText = isAssigned ? 'Active' : 'Idle'
                  let statusColor = isAssigned
                    ? 'bg-studio-emerald/15 text-studio-emerald border-studio-emerald/30'
                    : 'bg-studio-surface text-studio-muted border-studio-border'

                  return (
                    <div
                      key={role.id}
                      className={`bg-studio-card border rounded-lg p-4 transition-all flex flex-col justify-between ${
                        isAssigned ? 'border-studio-violet/40 shadow-sm' : 'border-studio-border'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl p-1.5 rounded-lg bg-studio-surface border border-studio-border/60">
                              {role.avatar}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-xs font-semibold text-studio-text">{role.name}</h3>
                                <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono border ${statusColor}`}>
                                  {statusText}
                                </span>
                              </div>
                              <p className="text-[11px] text-studio-muted">{role.title}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-studio-muted bg-studio-surface px-1.5 py-0.5 rounded border border-studio-border/50">
                            {role.scope}
                          </span>
                        </div>

                        <p className="text-[11.5px] text-studio-text/90 mt-2.5 leading-relaxed">{role.description}</p>

                        {/* Expertise Pills */}
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {role.expertise?.map((exp: string) => (
                            <span
                              key={exp}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-studio-surface text-studio-muted border border-studio-border/50"
                            >
                              {exp}
                            </span>
                          ))}
                        </div>

                        {/* Allowed Tools */}
                        <div className="mt-3 pt-2.5 border-t border-studio-border/50">
                          <span className="text-[10px] font-semibold text-studio-muted uppercase tracking-wider block mb-1.5">
                            Permitted Tools
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {role.allowedTools?.map((tool: string) => {
                              const isWrite = tool.includes('write') || tool.includes('terminal')
                              return (
                                <span
                                  key={tool}
                                  className={`px-1.5 py-0.5 rounded font-mono text-[9.5px] border ${
                                    isWrite
                                      ? 'bg-studio-amber/10 text-studio-amber border-studio-amber/20'
                                      : 'bg-studio-blue/10 text-studio-blue border-studio-blue/20'
                                  }`}
                                >
                                  {tool}
                                </span>
                              )
                            })}
                          </div>
                        </div>

                        {/* Collapsible Persona System Prompt */}
                        {isExpanded && (
                          <div className="mt-3 p-2.5 bg-studio-surface rounded border border-studio-border text-[11px] font-mono text-studio-text/80 whitespace-pre-wrap leading-relaxed animate-in fade-in">
                            <span className="text-[10px] font-sans font-semibold text-studio-accent uppercase block mb-1">
                              System Persona Instructions
                            </span>
                            {role.systemInstructions}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 flex items-center justify-between text-[11px]">
                        <button
                          onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                          className="flex items-center gap-1 text-studio-muted hover:text-studio-text cursor-pointer transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          <span>{isExpanded ? 'Hide Persona' : 'Inspect Persona Instructions'}</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TASK GRAPH & WORKFLOW */}
          {activeTab === 'graph' && (
            <div className="flex flex-col h-full space-y-4">
              {!activeOrchestrationSession ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-studio-border rounded-xl">
                  <div className="p-3 rounded-full bg-studio-violet/10 text-studio-violet mb-3">
                    <GitBranch className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-semibold text-studio-text">No Active Orchestration Session</h3>
                  <p className="text-xs text-studio-muted max-w-sm mt-1 mb-4 leading-relaxed">
                    Start an orchestration from the AI Chat Deck or trigger an automated SDLC workflow to visualize the
                    specialist task graph.
                  </p>
                  <button
                    onClick={() => startOrchestration('Develop and test feature flow')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-violet text-studio-bg text-xs font-semibold hover:bg-studio-violet/90 cursor-pointer shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Generate Sample Task Graph</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col h-full space-y-4">
                  {/* Session Overview Bar */}
                  <div className="bg-studio-card border border-studio-border rounded-lg p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-semibold text-studio-muted tracking-wider block">
                        Orchestration Objective
                      </span>
                      <p className="text-xs font-medium text-studio-text mt-0.5">{activeOrchestrationSession.goal}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!activeOrchestrationSession.approvalGates?.planApproved && (
                        <button
                          onClick={() => approveGate('planApproved')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-studio-emerald text-studio-bg font-semibold hover:bg-studio-emerald/90 text-xs cursor-pointer shadow-sm transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Implementation Plan</span>
                        </button>
                      )}

                      {activeOrchestrationSession.approvalGates?.planApproved &&
                        !activeOrchestrationSession.approvalGates?.executionApproved && (
                          <button
                            onClick={() => approveGate('executionApproved')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-studio-accent text-studio-bg font-semibold hover:bg-studio-accentHover text-xs cursor-pointer shadow-sm transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Execution Result</span>
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Task DAG Tree List */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {activeOrchestrationSession.tasks?.map((task: any, index: number) => {
                      const assignedRole = allRoles.find((r) => r.id === task.assignedRoleId)
                      let statusBadge = 'bg-studio-surface text-studio-muted border-studio-border'
                      if (task.status === 'completed') {
                        statusBadge = 'bg-studio-emerald/15 text-studio-emerald border-studio-emerald/30'
                      } else if (task.status === 'running') {
                        statusBadge = 'bg-studio-accent/20 text-studio-accent border-studio-accent/40 animate-pulse'
                      } else if (task.status === 'failed') {
                        statusBadge = 'bg-studio-rose/15 text-studio-rose border-studio-rose/30'
                      }

                      return (
                        <div
                          key={task.id}
                          className="bg-studio-card border border-studio-border rounded-lg p-3.5 flex flex-col gap-2 hover:border-studio-border/90 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-full bg-studio-surface border border-studio-border flex items-center justify-center font-mono text-[11px] text-studio-muted">
                                {index + 1}
                              </span>
                              <div>
                                <h4 className="text-xs font-semibold text-studio-text flex items-center gap-2">
                                  <span>{task.title}</span>
                                  <span className="font-mono text-[10px] text-studio-muted">({task.id})</span>
                                </h4>
                                <p className="text-[11px] text-studio-muted mt-0.5">{task.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold border ${statusBadge}`}>
                                {task.status}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-studio-border/50 text-[11px]">
                            <div className="flex items-center gap-3">
                              {/* Assigned Specialist */}
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-studio-surface border border-studio-border/60">
                                <span>{assignedRole?.avatar || '🤖'}</span>
                                <span className="font-medium text-studio-text">{assignedRole?.name || task.assignedRoleId}</span>
                              </div>

                              {/* Dependencies */}
                              {task.dependencies?.length > 0 && (
                                <div className="flex items-center gap-1 text-studio-muted text-[10.5px]">
                                  <span>Depends on:</span>
                                  {task.dependencies.map((dep: string) => (
                                    <span key={dep} className="font-mono bg-studio-surface px-1 py-0.2 rounded border border-studio-border/50">
                                      {dep}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Task status actions */}
                            <div className="flex items-center gap-1.5">
                              {task.status !== 'completed' ? (
                                <button
                                  onClick={() => updateOrchestrationTask(task.id, 'completed', 'Completed by user confirmation')}
                                  className="px-2 py-0.5 rounded bg-studio-surface hover:bg-studio-card border border-studio-border text-studio-text hover:text-studio-emerald text-[10.5px] cursor-pointer transition-colors"
                                >
                                  Mark Done
                                </button>
                              ) : (
                                <button
                                  onClick={() => updateOrchestrationTask(task.id, 'pending')}
                                  className="px-2 py-0.5 rounded bg-studio-surface hover:bg-studio-card border border-studio-border text-studio-muted text-[10.5px] cursor-pointer transition-colors"
                                >
                                  Reopen
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ARTIFACTS INSPECTOR */}
          {activeTab === 'artifacts' && (
            <div className="flex h-full gap-4">
              {/* Artifacts Sidebar */}
              <div className="w-64 flex flex-col border-r border-studio-border pr-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-studio-text">Session Deliverables</span>
                  <span className="text-[10px] font-mono text-studio-muted">{filteredArtifacts.length} total</span>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1">
                  {['all', 'plan', 'architecture-adr', 'requirement-brief', 'code-diff', 'test-report'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setArtifactTypeFilter(type)}
                      className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
                        artifactTypeFilter === type
                          ? 'bg-studio-violet text-studio-bg font-medium'
                          : 'bg-studio-surface text-studio-muted hover:text-studio-text'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Artifact Items */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {filteredArtifacts.map((art: any) => (
                    <button
                      key={art.id}
                      onClick={() => setSelectedArtifactId(art.id)}
                      className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer flex flex-col gap-0.5 ${
                        (currentArtifact?.id === art.id)
                          ? 'bg-studio-card border-studio-violet text-studio-text shadow-sm'
                          : 'bg-studio-surface/50 border-studio-border/60 text-studio-muted hover:text-studio-text'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-studio-accent">{art.type}</span>
                        <span className="text-[9.5px] text-studio-muted">
                          {new Date(art.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-xs font-medium truncate text-studio-text">{art.title}</span>
                    </button>
                  ))}

                  {filteredArtifacts.length === 0 && (
                    <div className="text-center py-6 text-xs text-studio-muted">
                      No artifacts found for selected filter.
                    </div>
                  )}
                </div>
              </div>

              {/* Artifact Viewer */}
              <div className="flex-1 flex flex-col bg-studio-card border border-studio-border rounded-lg overflow-hidden">
                {currentArtifact ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-studio-border bg-studio-surface/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-studio-text">{currentArtifact.title}</h3>
                          <span className="px-1.5 py-0.2 rounded font-mono text-[9.5px] uppercase bg-studio-violet/15 text-studio-violet border border-studio-violet/30">
                            {currentArtifact.type}
                          </span>
                        </div>
                        <span className="text-[10.5px] font-mono text-studio-muted">{currentArtifact.id}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyArtifact(currentArtifact.content)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-studio-surface hover:bg-studio-card border border-studio-border text-xs text-studio-text cursor-pointer transition-colors"
                        >
                          {copiedArtifact ? <Check className="w-3.5 h-3.5 text-studio-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedArtifact ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          onClick={() => handleExportArtifact(currentArtifact)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-studio-violet text-studio-bg font-medium hover:bg-studio-violet/90 text-xs cursor-pointer transition-colors shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export to Workspace</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-studio-text bg-studio-bg leading-relaxed whitespace-pre-wrap select-text">
                      {currentArtifact.content}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center p-6 text-xs text-studio-muted">
                    Select an artifact from the sidebar to inspect contents.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT TRACE */}
          {activeTab === 'audit' && (
            <div className="flex flex-col h-full space-y-4">
              {/* Header Filter Controls */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-studio-muted" />
                    <input
                      type="text"
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      placeholder="Search tool calls or errors..."
                      className="w-full bg-studio-card border border-studio-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-studio-text placeholder:text-studio-muted focus:border-studio-violet outline-none"
                    />
                  </div>

                  <select
                    value={auditTierFilter}
                    onChange={(e) => setAuditTierFilter(e.target.value)}
                    className="bg-studio-card border border-studio-border rounded-lg px-2.5 py-1.5 text-xs text-studio-text focus:border-studio-violet outline-none cursor-pointer"
                  >
                    <option value="all">All Tiers</option>
                    <option value="read-only">read-only</option>
                    <option value="workspace-write">workspace-write</option>
                    <option value="system-execution">system-execution</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadToolAuditLog()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-studio-card hover:bg-studio-surface border border-studio-border text-xs text-studio-text cursor-pointer transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={() => clearToolAuditLog()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-studio-card hover:bg-studio-surface border border-studio-border text-xs text-studio-rose cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Log</span>
                  </button>
                </div>
              </div>

              {/* Audit Table / List */}
              <div className="flex-1 bg-studio-card border border-studio-border rounded-lg overflow-hidden flex flex-col">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-studio-border bg-studio-surface/50 text-[11px] font-semibold text-studio-muted uppercase tracking-wider">
                  <span className="col-span-2">Time</span>
                  <span className="col-span-3">Tool Name</span>
                  <span className="col-span-2">Safety Tier</span>
                  <span className="col-span-3">Arguments</span>
                  <span className="col-span-2 text-right">Result</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-studio-border/50">
                  {filteredAuditLog.map((log: any) => {
                    const isSuccess = log.success
                    let tierColor = 'text-studio-blue bg-studio-blue/10 border-studio-blue/20'
                    if (log.tier === 'workspace-write') {
                      tierColor = 'text-studio-amber bg-studio-amber/10 border-studio-amber/20'
                    } else if (log.tier === 'system-execution') {
                      tierColor = 'text-studio-rose bg-studio-rose/10 border-studio-rose/20'
                    }

                    return (
                      <div key={log.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs hover:bg-studio-surface/40 transition-colors items-center">
                        <span className="col-span-2 font-mono text-[10.5px] text-studio-muted">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="col-span-3 font-mono font-medium text-studio-text truncate">
                          {log.toolName}
                        </span>
                        <div className="col-span-2">
                          <span className={`px-1.5 py-0.2 rounded font-mono text-[9.5px] border ${tierColor}`}>
                            {log.tier}
                          </span>
                        </div>
                        <span className="col-span-3 font-mono text-[10.5px] text-studio-muted truncate" title={JSON.stringify(log.arguments)}>
                          {JSON.stringify(log.arguments)}
                        </span>
                        <div className="col-span-2 text-right">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              isSuccess
                                ? 'bg-studio-emerald/15 text-studio-emerald'
                                : 'bg-studio-rose/15 text-studio-rose'
                            }`}
                          >
                            {isSuccess ? `OK (${log.durationMs || 0}ms)` : 'DENIED'}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {filteredAuditLog.length === 0 && (
                    <div className="text-center py-10 text-xs text-studio-muted">
                      No tool execution audit records found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SDLC WORKFLOW TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-studio-text">Standard SDLC Workflows</h3>
                  <p className="text-[11px] text-studio-muted">
                    Pre-configured multi-role software engineering pipelines with safety gates
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 overflow-y-auto flex-1 pr-1">
                {workflowTemplates.map((tmpl: any) => (
                  <div
                    key={tmpl.id}
                    className="bg-studio-card border border-studio-border rounded-lg p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold text-studio-text">{tmpl.name}</h4>
                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono uppercase bg-studio-violet/15 text-studio-violet border border-studio-violet/30">
                              {tmpl.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-studio-muted mt-1 leading-relaxed">{tmpl.description}</p>
                        </div>
                      </div>

                      {/* Stages */}
                      <div className="mt-3 pt-2.5 border-t border-studio-border/50">
                        <span className="text-[10px] font-semibold text-studio-muted uppercase tracking-wider block mb-1.5">
                          Pipeline Stages ({tmpl.stages?.length})
                        </span>
                        <div className="space-y-1">
                          {tmpl.stages?.map((stage: any, sIdx: number) => (
                            <div
                              key={stage.id}
                              className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-studio-surface border border-studio-border/40"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[9.5px] text-studio-muted">{sIdx + 1}.</span>
                                <span className="text-studio-text">{stage.name}</span>
                              </div>
                              <span className="text-[10px] font-mono text-studio-muted">
                                {stage.assignedRoleId}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 flex items-center justify-end">
                      <button
                        onClick={() => {
                          startOrchestration(`Execute workflow: ${tmpl.name}`)
                          setActiveTab('graph')
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-studio-violet text-studio-bg text-xs font-semibold hover:bg-studio-violet/90 cursor-pointer shadow-sm transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Run Workflow</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

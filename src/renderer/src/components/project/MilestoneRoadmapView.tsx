import React, { useState } from 'react'
import {
  Milestone,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  Flame,
  X,
  Flag
} from 'lucide-react'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import type { TaskItem, MilestoneItem, IssueType } from '../../../../preload/index.d'

interface MilestoneRoadmapViewProps {
  onSelectTask: (taskId: string) => void
}

export const MilestoneRoadmapView: React.FC<MilestoneRoadmapViewProps> = ({ onSelectTask }) => {
  const {
    projectData,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    assignTaskToMilestone,
    saveToDisk
  } = useProjectStore()

  const { workspacePath, setStatusMessage } = useEditorStore()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneDesc, setMilestoneDesc] = useState('')
  const [milestoneDate, setMilestoneDate] = useState('')

  const milestones = projectData.milestones || []
  const tasks = projectData.tasks || []

  const handleCreateMilestone = () => {
    if (!milestoneTitle.trim()) return
    addMilestone({
      title: milestoneTitle.trim(),
      description: milestoneDesc.trim() || undefined,
      targetDate: milestoneDate.trim() || undefined,
      status: 'open'
    })
    if (workspacePath) saveToDisk(workspacePath)
    setMilestoneTitle('')
    setMilestoneDesc('')
    setMilestoneDate('')
    setIsCreateModalOpen(false)
    setStatusMessage('Created milestone')
    setTimeout(() => setStatusMessage('Ready'), 2000)
  }

  const handleToggleStatus = (m: MilestoneItem) => {
    const nextStatus = m.status === 'open' ? 'closed' : 'open'
    updateMilestone(m.id, { status: nextStatus })
    if (workspacePath) saveToDisk(workspacePath)
  }

  const handleDeleteMilestone = (mId: string) => {
    deleteMilestone(mId)
    if (workspacePath) saveToDisk(workspacePath)
  }

  const handleAssignTask = (taskId: string, mId?: string) => {
    assignTaskToMilestone(taskId, mId)
    if (workspacePath) saveToDisk(workspacePath)
  }

  const getTypeBadge = (type?: IssueType) => {
    switch (type) {
      case 'bug':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-studio-rose/10 text-studio-rose border border-studio-rose/20 font-mono">BUG</span>
      case 'epic':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-studio-violet/10 text-studio-violet border border-studio-violet/20 font-mono">EPIC</span>
      case 'story':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-studio-cyan/10 text-studio-cyan border border-studio-cyan/20 font-mono">STORY</span>
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-studio-amber/10 text-studio-amber border border-studio-amber/20 font-mono">TASK</span>
    }
  }

  return (
    <div className="flex-1 w-full h-full flex flex-col gap-4 overflow-y-auto pr-1">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-3 rounded-xl glass-panel border border-white/[0.05]">
        <div className="flex items-center gap-2">
          <Milestone className="w-4 h-4 text-studio-amber" />
          <h3 className="text-xs font-semibold text-white">Milestones & Release Roadmap</h3>
          <span className="text-[10px] font-mono text-studio-muted">
            {milestones.length} milestones tracked
          </span>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-studio-accent text-studio-bg font-medium hover:bg-studio-accentHover transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Milestone</span>
        </button>
      </div>

      {milestones.length === 0 ? (
        <div className="p-8 text-center glass-panel rounded-2xl border border-dashed border-white/10 flex flex-col items-center gap-2">
          <Flag className="w-8 h-8 text-studio-amber/60" />
          <h4 className="text-sm font-semibold text-white">No Milestones Created</h4>
          <p className="text-xs text-studio-muted max-w-sm leading-relaxed">
            Create milestone goals (e.g. "v1.0 Alpha Launch", "M1 Editor Stability") and link tasks to track progress.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-2 px-3 py-1.5 rounded-lg text-xs bg-studio-accent text-studio-bg font-medium cursor-pointer"
          >
            Create Milestone
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {milestones.map((m) => {
            const milestoneTasks = tasks.filter((t) => t.milestoneId === m.id)
            const completedCount = milestoneTasks.filter((t) => t.status === 'done').length
            const percent = milestoneTasks.length > 0 ? Math.round((completedCount / milestoneTasks.length) * 100) : 0

            return (
              <div
                key={m.id}
                className="p-4 rounded-2xl glass-panel border border-white/[0.06] hover:border-white/10 transition-colors flex flex-col gap-3"
              >
                {/* Milestone Top Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                          m.status === 'open'
                            ? 'bg-studio-amber/15 text-studio-amber border-studio-amber/30'
                            : 'bg-studio-emerald/15 text-studio-emerald border-studio-emerald/30'
                        }`}
                      >
                        {m.status.toUpperCase()}
                      </span>
                      <h4 className="text-sm font-semibold text-white truncate">{m.title}</h4>
                    </div>

                    {m.description && (
                      <p className="text-xs text-studio-muted mt-0.5">{m.description}</p>
                    )}

                    {m.targetDate && (
                      <div className="flex items-center gap-1.5 text-[10px] text-studio-muted font-mono mt-1">
                        <Calendar className="w-3 h-3 text-studio-cyan" />
                        <span>Target: {m.targetDate}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleStatus(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                        m.status === 'open'
                          ? 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                          : 'bg-studio-emerald/10 text-studio-emerald border-studio-emerald/20'
                      }`}
                    >
                      {m.status === 'open' ? 'Close Milestone' : 'Reopen'}
                    </button>
                    <button
                      onClick={() => handleDeleteMilestone(m.id)}
                      className="p-1.5 rounded-lg text-studio-muted hover:text-studio-rose hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-studio-muted">
                    <span>
                      {completedCount}/{milestoneTasks.length} issues resolved
                    </span>
                    <span className="text-white font-semibold">{percent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden border border-white/5">
                    <div
                      className="h-full rounded-full bg-studio-emerald transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Linked Tasks */}
                {milestoneTasks.length > 0 && (
                  <div className="flex flex-col gap-1 pt-2 border-t border-white/[0.04]">
                    {milestoneTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => onSelectTask(t.id)}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] text-xs transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[11px] text-studio-amber">{t.id}</span>
                          {getTypeBadge(t.type)}
                          <span className="text-white truncate max-w-sm">{t.title}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="uppercase text-studio-muted">{t.status}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAssignTask(t.id, undefined)
                            }}
                            className="text-studio-muted hover:text-studio-rose px-1"
                          >
                            Unlink
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Unassigned Milestone Tasks Quick Linker */}
      {milestones.length > 0 && (
        <div className="p-4 rounded-2xl glass-panel border border-white/[0.06] flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-white">Quick Assign to Milestone</h4>
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
            {tasks
              .filter((t) => !t.milestoneId)
              .slice(0, 10)
              .map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] text-xs font-mono"
                >
                  <span className="truncate max-w-xs text-studio-text">
                    {t.id}: {t.title}
                  </span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleAssignTask(t.id, e.target.value)
                    }}
                    className="glass-pill px-2 py-0.5 rounded text-[10px] text-white outline-none cursor-pointer"
                  >
                    <option value="" disabled className="bg-studio-card">
                      Assign Milestone...
                    </option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id} className="bg-studio-card">
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Create Milestone Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-sm p-5 flex flex-col gap-3 shadow-2xl">
            <h3 className="text-sm font-semibold text-white">New Milestone</h3>

            <div className="flex flex-col gap-2.5">
              <div>
                <label className="text-xs text-studio-muted block mb-1">Milestone Title *</label>
                <input
                  type="text"
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="e.g. M1: Code Intelligence"
                  className="w-full glass-pill rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-studio-accent font-sans"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-studio-muted block mb-1">Description</label>
                <textarea
                  value={milestoneDesc}
                  onChange={(e) => setMilestoneDesc(e.target.value)}
                  placeholder="Goals & deliverables..."
                  rows={2}
                  className="w-full glass-pill rounded-lg px-2.5 py-1.5 text-xs text-white outline-none resize-none font-sans"
                />
              </div>

              <div>
                <label className="text-xs text-studio-muted block mb-1">Target Date</label>
                <input
                  type="date"
                  value={milestoneDate}
                  onChange={(e) => setMilestoneDate(e.target.value)}
                  className="w-full glass-pill rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.04]">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-studio-muted hover:text-white glass-pill transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMilestone}
                className="px-3.5 py-1.5 rounded-lg text-xs bg-studio-accent hover:bg-studio-accentHover text-studio-bg font-medium transition-all cursor-pointer"
              >
                Create Milestone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import {
  Play,
  CheckCircle2,
  Plus,
  Trash2,
  Calendar,
  Layers,
  ChevronRight,
  Flame,
  ArrowRight,
  X
} from 'lucide-react'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import type { TaskItem, SprintItem, IssueType } from '../../../../preload/index.d'

interface SprintBacklogViewProps {
  onSelectTask: (taskId: string) => void
}

export const SprintBacklogView: React.FC<SprintBacklogViewProps> = ({ onSelectTask }) => {
  const {
    projectData,
    addSprint,
    startSprint,
    completeSprint,
    deleteSprint,
    assignTaskToSprint,
    saveToDisk
  } = useProjectStore()

  const { workspacePath, setStatusMessage } = useEditorStore()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [sprintName, setSprintName] = useState('')
  const [sprintGoal, setSprintGoal] = useState('')
  const [sprintStart, setSprintStart] = useState('')
  const [sprintEnd, setSprintEnd] = useState('')

  const sprints = projectData.sprints || []
  const tasks = projectData.tasks || []

  const activeSprint = sprints.find((s) => s.status === 'active')
  const plannedSprints = sprints.filter((s) => s.status === 'planned')
  const backlogTasks = tasks.filter((t) => !t.sprintId)

  const handleCreateSprint = () => {
    if (!sprintName.trim()) return
    addSprint({
      name: sprintName.trim(),
      goal: sprintGoal.trim() || undefined,
      startDate: sprintStart.trim() || undefined,
      endDate: sprintEnd.trim() || undefined,
      status: 'planned'
    })
    if (workspacePath) saveToDisk(workspacePath)
    setSprintName('')
    setSprintGoal('')
    setSprintStart('')
    setSprintEnd('')
    setIsCreateModalOpen(false)
    setStatusMessage('Created new sprint')
    setTimeout(() => setStatusMessage('Ready'), 2000)
  }

  const handleStartSprint = (sprintId: string) => {
    startSprint(sprintId)
    if (workspacePath) saveToDisk(workspacePath)
    setStatusMessage('Sprint started')
    setTimeout(() => setStatusMessage('Ready'), 2000)
  }

  const handleCompleteSprint = (sprintId: string) => {
    completeSprint(sprintId)
    if (workspacePath) saveToDisk(workspacePath)
    setStatusMessage('Sprint completed')
    setTimeout(() => setStatusMessage('Ready'), 2000)
  }

  const handleDeleteSprint = (sprintId: string) => {
    deleteSprint(sprintId)
    if (workspacePath) saveToDisk(workspacePath)
  }

  const handleMoveToSprint = (taskId: string, sprintId?: string) => {
    assignTaskToSprint(taskId, sprintId)
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
      case 'subtask':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-studio-muted border border-white/10 font-mono">SUB</span>
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-studio-amber/10 text-studio-amber border border-studio-amber/20 font-mono">TASK</span>
    }
  }

  const getPriorityBadge = (priority: TaskItem['priority']) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="flex items-center gap-1 text-[10px] text-studio-rose font-medium">
            <Flame className="w-2.5 h-2.5" /> Urgent
          </span>
        )
      case 'high':
        return <span className="text-[10px] text-studio-amber font-medium">High</span>
      case 'medium':
        return <span className="text-[10px] text-studio-cyan font-medium">Medium</span>
      default:
        return <span className="text-[10px] text-studio-muted">Low</span>
    }
  }

  const renderSprintTasks = (sprintTasks: TaskItem[]) => {
    if (sprintTasks.length === 0) {
      return (
        <div className="p-3 text-center text-xs text-studio-muted italic bg-white/[0.01] rounded-lg border border-dashed border-white/10">
          No tasks assigned to this sprint yet. Move tasks from the backlog below.
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-1.5">
        {sprintTasks.map((t) => (
          <div
            key={t.id}
            onClick={() => onSelectTask(t.id)}
            className="flex items-center justify-between p-2.5 rounded-lg bg-studio-card/80 hover:bg-studio-card border border-white/[0.06] hover:border-white/20 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-mono text-xs text-studio-amber font-semibold">{t.id}</span>
              {getTypeBadge(t.type)}
              <span className="text-xs text-white truncate max-w-md font-medium">{t.title}</span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {getPriorityBadge(t.priority)}
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/[0.04] text-studio-muted">
                {t.status}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleMoveToSprint(t.id, undefined)
                }}
                className="text-[10px] text-studio-muted hover:text-studio-rose font-mono px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
                title="Move back to backlog"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 w-full h-full flex flex-col gap-4 overflow-y-auto pr-1">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between p-3 rounded-xl glass-panel border border-white/[0.05]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-studio-cyan" />
          <h3 className="text-xs font-semibold text-white">Sprint Planning & Backlog</h3>
          <span className="text-[10px] font-mono text-studio-muted">
            {sprints.length} sprints • {backlogTasks.length} backlog issues
          </span>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-studio-accent text-studio-bg font-medium hover:bg-studio-accentHover transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Sprint</span>
        </button>
      </div>

      {/* Active Sprint Section */}
      {activeSprint && (
        <div className="p-4 rounded-2xl glass-panel border border-studio-emerald/30 shadow-[0_0_20px_rgba(136,192,150,0.06)] flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-studio-emerald/20 text-studio-emerald border border-studio-emerald/30">
                  ACTIVE SPRINT
                </span>
                <h4 className="text-sm font-semibold text-white">{activeSprint.name}</h4>
              </div>
              {activeSprint.goal && (
                <p className="text-xs text-studio-muted mt-0.5">Goal: {activeSprint.goal}</p>
              )}
              {(activeSprint.startDate || activeSprint.endDate) && (
                <div className="flex items-center gap-2 text-[10px] text-studio-muted font-mono mt-1">
                  <Calendar className="w-3 h-3 text-studio-emerald" />
                  <span>
                    {activeSprint.startDate || 'Start'} → {activeSprint.endDate || 'End'}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => handleCompleteSprint(activeSprint.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-studio-emerald/20 hover:bg-studio-emerald/30 text-studio-emerald border border-studio-emerald/30 font-medium transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Complete Sprint</span>
            </button>
          </div>

          {/* Tasks in active sprint */}
          {renderSprintTasks(tasks.filter((t) => t.sprintId === activeSprint.id))}
        </div>
      )}

      {/* Planned Sprints */}
      {plannedSprints.map((sprint) => {
        const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id)

        return (
          <div
            key={sprint.id}
            className="p-4 rounded-2xl glass-panel border border-white/[0.06] flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-studio-muted border border-white/10">
                    PLANNED
                  </span>
                  <h4 className="text-sm font-semibold text-white">{sprint.name}</h4>
                </div>
                {sprint.goal && (
                  <p className="text-xs text-studio-muted mt-0.5">Goal: {sprint.goal}</p>
                )}
                {(sprint.startDate || sprint.endDate) && (
                  <div className="flex items-center gap-2 text-[10px] text-studio-muted font-mono mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {sprint.startDate || 'Start'} → {sprint.endDate || 'End'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStartSprint(sprint.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-studio-accent/20 hover:bg-studio-accent/30 text-studio-accent border border-studio-accent/30 font-medium transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  <span>Start Sprint</span>
                </button>
                <button
                  onClick={() => handleDeleteSprint(sprint.id)}
                  className="p-1.5 rounded-lg text-studio-muted hover:text-studio-rose hover:bg-white/5 transition-colors cursor-pointer"
                  title="Delete sprint"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {renderSprintTasks(sprintTasks)}
          </div>
        )
      })}

      {/* Backlog Section */}
      <div className="p-4 rounded-2xl glass-panel border border-white/[0.06] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-white">Backlog</h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 text-studio-muted">
              {backlogTasks.length} unassigned issues
            </span>
          </div>
        </div>

        {backlogTasks.length === 0 ? (
          <div className="p-6 text-center text-xs text-studio-muted italic bg-white/[0.01] rounded-xl border border-dashed border-white/10">
            Backlog is completely empty! All tasks are assigned to sprints.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {backlogTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTask(t.id)}
                className="flex items-center justify-between p-2.5 rounded-lg bg-studio-card/80 hover:bg-studio-card border border-white/[0.06] hover:border-white/20 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-xs text-studio-amber font-semibold">{t.id}</span>
                  {getTypeBadge(t.type)}
                  <span className="text-xs text-white truncate max-w-md font-medium">{t.title}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {getPriorityBadge(t.priority)}
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/[0.04] text-studio-muted">
                    {t.status}
                  </span>

                  {/* Move to Sprint dropdown */}
                  {sprints.length > 0 && (
                    <select
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val) handleMoveToSprint(t.id, val)
                      }}
                      defaultValue=""
                      className="glass-pill px-2 py-0.5 rounded text-[10px] font-mono text-studio-muted hover:text-white outline-none cursor-pointer"
                    >
                      <option value="" disabled className="bg-studio-card">
                        Move to Sprint...
                      </option>
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id} className="bg-studio-card">
                          {s.name} ({s.status})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Sprint Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-sm p-5 flex flex-col gap-3 shadow-2xl">
            <h3 className="text-sm font-semibold text-white">Create New Sprint</h3>

            <div className="flex flex-col gap-2.5">
              <div>
                <label className="text-xs text-studio-muted block mb-1">Sprint Name *</label>
                <input
                  type="text"
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  placeholder="e.g. Sprint 1 - Core Foundations"
                  className="w-full glass-pill rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-studio-accent font-sans"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-studio-muted block mb-1">Sprint Goal</label>
                <input
                  type="text"
                  value={sprintGoal}
                  onChange={(e) => setSprintGoal(e.target.value)}
                  placeholder="What is the objective of this sprint?"
                  className="w-full glass-pill rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-studio-muted block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={sprintStart}
                    onChange={(e) => setSprintStart(e.target.value)}
                    className="w-full glass-pill rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-studio-muted block mb-1">End Date</label>
                  <input
                    type="date"
                    value={sprintEnd}
                    onChange={(e) => setSprintEnd(e.target.value)}
                    className="w-full glass-pill rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer font-mono"
                  />
                </div>
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
                onClick={handleCreateSprint}
                className="px-3.5 py-1.5 rounded-lg text-xs bg-studio-accent hover:bg-studio-accentHover text-studio-bg font-medium transition-all cursor-pointer"
              >
                Create Sprint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

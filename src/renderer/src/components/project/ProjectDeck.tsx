import React, { useState } from 'react'
import {
  Plus,
  Trash2,
  FileCode2,
  Target,
  ExternalLink,
  Search,
  Flame,
  CheckCircle2,
  CheckSquare,
  Square,
  X,
  Edit3
} from 'lucide-react'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import type { TaskItem } from '../../../preload/index.d'

const COLUMNS: { id: TaskItem['status']; title: string; badge: string }[] = [
  { id: 'backlog', title: 'Backlog', badge: 'bg-white/5 text-studio-muted border-white/10' },
  { id: 'todo', title: 'To Do', badge: 'bg-studio-cyan/10 text-studio-cyan border-studio-cyan/20' },
  { id: 'in_progress', title: 'In Progress', badge: 'bg-studio-amber/10 text-studio-amber border-studio-amber/20' },
  { id: 'review', title: 'Review', badge: 'bg-studio-violet/10 text-studio-violet border-studio-violet/20' },
  { id: 'done', title: 'Done', badge: 'bg-studio-emerald/10 text-studio-emerald border-studio-emerald/20' }
]

export const ProjectDeck: React.FC = () => {
  const {
    projectData,
    addTask,
    updateTaskStatus,
    updateTask,
    addSubtask,
    toggleSubtask,
    deleteTask,
    saveToDisk
  } = useProjectStore()
  const { workspacePath, openFile, setFocusTask, focusTask } = useEditorStore()

  const [activeModalCol, setActiveModalCol] = useState<TaskItem['status'] | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskPriority, setTaskPriority] = useState<TaskItem['priority']>('medium')
  const [taskLinkedFile, setTaskLinkedFile] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Drag and Drop state
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  // Task Detail Modal State
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  const handleCreateTask = () => {
    if (!taskTitle.trim() || !activeModalCol) return

    addTask({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      status: activeModalCol,
      priority: taskPriority,
      linkedFile: taskLinkedFile.trim() || undefined,
      subtasks: []
    })

    if (workspacePath) {
      saveToDisk(workspacePath)
    }

    setTaskTitle('')
    setTaskDesc('')
    setTaskLinkedFile('')
    setActiveModalCol(null)
  }

  const handleJumpToFile = async (filePath: string) => {
    try {
      const content = await window.maestroAPI.readFile(filePath)
      const name = filePath.split(/[\\/]/).pop() || 'file'
      openFile({ path: filePath, name, content })
    } catch (err) {
      console.error('Cannot open linked file:', err)
    }
  }

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== colId) {
      setDragOverCol(colId)
    }
  }

  const handleDrop = (e: React.DragEvent, colId: TaskItem['status']) => {
    e.preventDefault()
    setDragOverCol(null)
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) {
      updateTaskStatus(taskId, colId)
      if (workspacePath) {
        saveToDisk(workspacePath)
      }
    }
  }

  const handleAddSubtaskSubmit = (taskId: string) => {
    if (!newSubtaskTitle.trim()) return
    addSubtask(taskId, newSubtaskTitle.trim())
    setNewSubtaskTitle('')
    if (workspacePath) saveToDisk(workspacePath)
    // Update local selectedTask
    const updated = useProjectStore.getState().projectData.tasks.find((t) => t.id === taskId)
    if (updated) setSelectedTask(updated)
  }

  const handleToggleSubtaskItem = (taskId: string, subtaskId: string) => {
    toggleSubtask(taskId, subtaskId)
    if (workspacePath) saveToDisk(workspacePath)
    const updated = useProjectStore.getState().projectData.tasks.find((t) => t.id === taskId)
    if (updated) setSelectedTask(updated)
  }

  const getPriorityBadge = (p: TaskItem['priority']) => {
    switch (p) {
      case 'urgent':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.2 rounded-full bg-studio-rose/10 text-studio-rose border border-studio-rose/20">
            <Flame className="w-2.5 h-2.5" /> Urgent
          </span>
        )
      case 'high':
        return (
          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-studio-amber/10 text-studio-amber border border-studio-amber/20">
            High
          </span>
        )
      case 'medium':
        return (
          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-studio-cyan/10 text-studio-cyan border border-studio-cyan/20">
            Med
          </span>
        )
      default:
        return (
          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-white/5 text-studio-muted border border-white/10">
            Low
          </span>
        )
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-2.5 gap-2">
      {/* Header Bar */}
      <div className="flex items-center justify-between min-h-8 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-white tracking-wide">
            {projectData.name || 'Project Tasks'}
          </h2>
          <span className="text-xs text-studio-muted font-mono">
            ({projectData.tasks.length})
          </span>
        </div>

        {/* Search & Add */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 glass-pill px-2.5 py-1 rounded-lg text-xs">
            <Search className="w-3 h-3 text-studio-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted w-32"
            />
          </div>

          <button
            onClick={() => setActiveModalCol('todo')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-studio-accent hover:bg-studio-accentHover text-studio-bg text-xs font-medium transition-all cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Canvas */}
      <div className="flex-1 glass-panel rounded-2xl p-3 overflow-x-auto flex gap-3 border border-white/[0.05]">
        {COLUMNS.map((col) => {
          const tasks = projectData.tasks.filter((t) => {
            const matchesStatus = t.status === col.id
            const matchesQuery = searchQuery
              ? t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description?.toLowerCase().includes(searchQuery.toLowerCase())
              : true
            return matchesStatus && matchesQuery
          })

          const isOver = dragOverCol === col.id

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`w-64 flex flex-col bg-studio-card/50 border rounded-xl overflow-hidden shrink-0 transition-colors ${
                isOver ? 'border-studio-amber/40 bg-studio-amber/[0.03]' : 'border-white/[0.04]'
              }`}
            >
              {/* Column Header */}
              <div className="p-2.5 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-md border ${col.badge}`}>
                    {col.title}
                  </span>
                  <span className="text-xs text-studio-muted font-mono">
                    {tasks.length}
                  </span>
                </div>
                <button
                  onClick={() => setActiveModalCol(col.id)}
                  className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                  title="Add task"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                {tasks.map((task) => {
                  const isFocus = focusTask?.id === task.id
                  const subtasks = task.subtasks || []
                  const completedSubtasks = subtasks.filter((s) => s.completed).length

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => setSelectedTask(task)}
                      className={`group p-2.5 rounded-xl border transition-all duration-150 flex flex-col gap-1.5 relative cursor-grab active:cursor-grabbing ${
                        isFocus
                          ? 'bg-studio-amber/[0.08] border-studio-amber/30'
                          : 'bg-studio-surface/60 hover:bg-studio-surface border-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="text-xs font-medium text-studio-text leading-snug">
                          {task.title}
                        </span>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setFocusTask(isFocus ? null : { id: task.id, title: task.title })
                            }}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isFocus
                                ? 'text-studio-amber'
                                : 'text-studio-muted hover:text-studio-amber'
                            }`}
                            title={isFocus ? 'Unfocus' : 'Focus task in editor'}
                          >
                            <Target className="w-3 h-3" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteTask(task.id)
                              if (workspacePath) saveToDisk(workspacePath)
                            }}
                            className="p-1 rounded text-studio-muted hover:text-studio-rose transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-studio-muted leading-relaxed line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Subtasks Progress Pill */}
                      {subtasks.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-studio-muted font-mono">
                          <CheckSquare className="w-3 h-3 text-studio-emerald" />
                          <span>
                            {completedSubtasks}/{subtasks.length} subtasks
                          </span>
                        </div>
                      )}

                      {task.linkedFile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleJumpToFile(task.linkedFile!)
                          }}
                          className="flex items-center gap-1.5 text-[10px] text-studio-amber/80 hover:text-studio-amber bg-studio-amber/5 px-2 py-0.5 rounded-md transition-colors w-fit font-mono cursor-pointer"
                        >
                          <FileCode2 className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">
                            {task.linkedFile.split(/[\\/]/).pop()}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}

                      <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04] mt-0.5">
                        {getPriorityBadge(task.priority)}

                        <select
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            updateTaskStatus(task.id, e.target.value as TaskItem['status'])
                            if (workspacePath) saveToDisk(workspacePath)
                          }}
                          className="bg-studio-card text-studio-muted text-[10px] rounded px-1.5 py-0.2 border border-white/10 outline-none hover:text-white transition-colors cursor-pointer"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Add Task */}
      {activeModalCol && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-sm p-5 flex flex-col gap-3 shadow-studio-card">
            <h3 className="text-sm font-semibold text-white">New Task</h3>

            <div className="flex flex-col gap-2.5">
              <div>
                <label className="text-xs text-studio-muted block mb-1">Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full glass-pill rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-studio-accent transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-studio-muted block mb-1">Description</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Details..."
                  rows={2}
                  className="w-full glass-pill rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-studio-accent transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-studio-muted block mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskItem['priority'])}
                    className="w-full glass-pill rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="low" className="bg-studio-card">Low</option>
                    <option value="medium" className="bg-studio-card">Medium</option>
                    <option value="high" className="bg-studio-card">High</option>
                    <option value="urgent" className="bg-studio-card">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-studio-muted block mb-1">Linked File</label>
                  <input
                    type="text"
                    value={taskLinkedFile}
                    onChange={(e) => setTaskLinkedFile(e.target.value)}
                    placeholder="src/index.ts"
                    className="w-full glass-pill rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-studio-accent transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.04]">
              <button
                onClick={() => setActiveModalCol(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-studio-muted hover:text-white glass-pill transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="px-3 py-1.5 rounded-lg text-xs bg-studio-accent hover:bg-studio-accentHover text-studio-bg font-medium transition-all cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail & Subtasks Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-md p-5 flex flex-col gap-3 shadow-studio-card">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-mono text-studio-muted">
                  Issue / {selectedTask.status}
                </span>
                <h3 className="text-sm font-semibold text-white truncate">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded hover:bg-white/5 text-studio-muted hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedTask.description && (
              <p className="text-xs text-studio-muted leading-relaxed bg-white/[0.02] p-2.5 rounded-lg">
                {selectedTask.description}
              </p>
            )}

            {/* Subtasks Checklist */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between text-xs text-studio-muted font-medium">
                <span>Checklist / Subtasks</span>
                <span className="font-mono text-[10px]">
                  {(selectedTask.subtasks || []).filter((s) => s.completed).length}/
                  {(selectedTask.subtasks || []).length} done
                </span>
              </div>

              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {(selectedTask.subtasks || []).map((subtask) => (
                  <div
                    key={subtask.id}
                    onClick={() => handleToggleSubtaskItem(selectedTask.id, subtask.id)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/[0.03] cursor-pointer text-xs select-none transition-colors"
                  >
                    {subtask.completed ? (
                      <CheckSquare className="w-3.5 h-3.5 text-studio-emerald shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-studio-muted shrink-0" />
                    )}
                    <span
                      className={`truncate ${
                        subtask.completed ? 'line-through text-studio-muted' : 'text-white'
                      }`}
                    >
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add Subtask Input */}
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add a step / checklist item..."
                  className="flex-1 glass-pill rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-studio-accent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSubtaskSubmit(selectedTask.id)
                  }}
                />
                <button
                  onClick={() => handleAddSubtaskSubmit(selectedTask.id)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white font-medium cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.04]">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-3 py-1.5 rounded-lg text-xs bg-studio-accent text-studio-bg font-medium hover:bg-studio-accentHover cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

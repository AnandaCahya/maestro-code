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
  Edit3,
  GitBranch,
  Copy,
  Calendar,
  Tag,
  Link,
  ArrowUpDown,
  Filter
} from 'lucide-react'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import type { TaskItem, IssueType, CodeLinkItem } from '../../../preload/index.d'

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
    cloneTask,
    updateTaskStatus,
    updateTask,
    addCodeLink,
    removeCodeLink,
    addSubtask,
    toggleSubtask,
    deleteTask,
    saveToDisk,
    filterPriority,
    filterType,
    sortBy,
    setFilterPriority,
    setFilterType,
    setSortBy
  } = useProjectStore()

  const {
    workspacePath,
    openFile,
    setCursorPosition,
    setFocusTask,
    focusTask,
    gitStatus,
    refreshGitStatus,
    setStatusMessage
  } = useEditorStore()

  const [activeModalCol, setActiveModalCol] = useState<TaskItem['status'] | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskType, setTaskType] = useState<IssueType>('task')
  const [taskPriority, setTaskPriority] = useState<TaskItem['priority']>('medium')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskLinkedFile, setTaskLinkedFile] = useState('')
  const [taskLinkedLine, setTaskLinkedLine] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Drag and Drop state
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  // Task Detail Modal State
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newCodeLinkFile, setNewCodeLinkFile] = useState('')
  const [newCodeLinkLine, setNewCodeLinkLine] = useState('')

  const handleCreateTask = () => {
    if (!taskTitle.trim() || !activeModalCol) return

    const initialCodeLinks: CodeLinkItem[] = []
    if (taskLinkedFile.trim()) {
      initialCodeLinks.push({
        file: taskLinkedFile.trim(),
        line: taskLinkedLine.trim() ? parseInt(taskLinkedLine.trim(), 10) : undefined
      })
    }

    addTask({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      status: activeModalCol,
      priority: taskPriority,
      type: taskType,
      dueDate: taskDueDate.trim() || undefined,
      linkedFile: taskLinkedFile.trim() || undefined,
      linkedLine: taskLinkedLine.trim() ? parseInt(taskLinkedLine.trim(), 10) : undefined,
      codeLinks: initialCodeLinks,
      subtasks: []
    })

    if (workspacePath) {
      saveToDisk(workspacePath)
    }

    setTaskTitle('')
    setTaskDesc('')
    setTaskType('task')
    setTaskPriority('medium')
    setTaskDueDate('')
    setTaskLinkedFile('')
    setTaskLinkedLine('')
    setActiveModalCol(null)
  }

  const handleJumpToFile = async (filePath: string, line?: number) => {
    try {
      const content = await window.maestroAPI.readFile(filePath)
      const name = filePath.split(/[\\/]/).pop() || 'file'
      openFile({ path: filePath, name, content })
      if (line !== undefined) {
        setTimeout(() => {
          setCursorPosition(line, 1)
          window.dispatchEvent(new CustomEvent('editor-reveal-line', { detail: { line, col: 1 } }))
        }, 100)
      }
    } catch (err) {
      console.error('Cannot open linked file:', err)
      setStatusMessage(`Cannot open ${filePath}`)
      setTimeout(() => setStatusMessage('Ready'), 2000)
    }
  }

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 25)

  const handleCreateOrCheckoutBranch = async (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation()
    if (!workspacePath) return
    const branchName = `feat/${task.id.toLowerCase()}-${slugify(task.title)}`

    if (gitStatus.branch === branchName) {
      setStatusMessage(`Already on branch ${branchName}`)
      setFocusTask({ id: task.id, title: task.title })
      return
    }

    setStatusMessage(`Switching to branch ${branchName}...`)
    const checkoutRes = await window.maestroAPI.gitCheckoutBranch(workspacePath, branchName)
    if (checkoutRes.ok) {
      await refreshGitStatus()
      setStatusMessage(`Switched to branch ${branchName}`)
      setFocusTask({ id: task.id, title: task.title })
    } else {
      const createRes = await window.maestroAPI.gitCreateBranch(workspacePath, branchName)
      if (createRes.ok) {
        await refreshGitStatus()
        setStatusMessage(`Created & switched to branch ${branchName}`)
        setFocusTask({ id: task.id, title: task.title })
      } else {
        setStatusMessage(`Git: ${createRes.message}`)
      }
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
      if (colId === 'in_progress') {
        const targetTask = projectData.tasks.find((t) => t.id === taskId)
        if (targetTask) {
          setFocusTask({ id: targetTask.id, title: targetTask.title })
        }
      }
    }
  }

  const handleAddSubtaskSubmit = (taskId: string) => {
    if (!newSubtaskTitle.trim()) return
    addSubtask(taskId, newSubtaskTitle.trim())
    setNewSubtaskTitle('')
    if (workspacePath) saveToDisk(workspacePath)
    const updated = useProjectStore.getState().projectData.tasks.find((t) => t.id === taskId)
    if (updated) setSelectedTask(updated)
  }

  const handleToggleSubtaskItem = (taskId: string, subtaskId: string) => {
    toggleSubtask(taskId, subtaskId)
    if (workspacePath) saveToDisk(workspacePath)
    const updated = useProjectStore.getState().projectData.tasks.find((t) => t.id === taskId)
    if (updated) setSelectedTask(updated)
  }

  const handleAddCodeLinkSubmit = (taskId: string) => {
    if (!newCodeLinkFile.trim()) return
    const lineNum = newCodeLinkLine.trim() ? parseInt(newCodeLinkLine.trim(), 10) : undefined
    addCodeLink(taskId, { file: newCodeLinkFile.trim(), line: lineNum })
    setNewCodeLinkFile('')
    setNewCodeLinkLine('')
    if (workspacePath) saveToDisk(workspacePath)
    const updated = useProjectStore.getState().projectData.tasks.find((t) => t.id === taskId)
    if (updated) setSelectedTask(updated)
  }

  const handleRemoveCodeLinkItem = (taskId: string, index: number) => {
    removeCodeLink(taskId, index)
    if (workspacePath) saveToDisk(workspacePath)
    const updated = useProjectStore.getState().projectData.tasks.find((t) => t.id === taskId)
    if (updated) setSelectedTask(updated)
  }

  const handleCloneTaskItem = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    cloneTask(taskId)
    if (workspacePath) saveToDisk(workspacePath)
    setStatusMessage('Cloned task')
    setTimeout(() => setStatusMessage('Ready'), 1500)
  }

  const getTypeBadge = (type?: IssueType) => {
    switch (type) {
      case 'bug':
        return (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-studio-rose/15 text-studio-rose border border-studio-rose/25">
            BUG
          </span>
        )
      case 'epic':
        return (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/25">
            EPIC
          </span>
        )
      case 'story':
        return (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-studio-amber/15 text-studio-amber border border-studio-amber/25">
            STORY
          </span>
        )
      default:
        return (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-studio-cyan/15 text-studio-cyan border border-studio-cyan/25">
            TASK
          </span>
        )
    }
  }

  const getPriorityBadge = (p: TaskItem['priority']) => {
    switch (p) {
      case 'urgent':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-studio-rose/10 text-studio-rose border border-studio-rose/20">
            <Flame className="w-2.5 h-2.5" /> Urgent
          </span>
        )
      case 'high':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-studio-amber/10 text-studio-amber border border-studio-amber/20">
            High
          </span>
        )
      case 'medium':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-studio-cyan/10 text-studio-cyan border border-studio-cyan/20">
            Med
          </span>
        )
      default:
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-studio-muted border border-white/10">
            Low
          </span>
        )
    }
  }

  // Filter & sort tasks
  const getFilteredTasksForColumn = (colId: TaskItem['status']) => {
    return projectData.tasks
      .filter((t) => {
        if (t.status !== colId) return false
        if (filterPriority !== 'all' && t.priority !== filterPriority) return false
        if (filterType !== 'all' && (t.type || 'task') !== filterType) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const inTitle = t.title.toLowerCase().includes(q)
          const inDesc = t.description?.toLowerCase().includes(q)
          const inId = t.id.toLowerCase().includes(q)
          if (!inTitle && !inDesc && !inId) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title)
        if (sortBy === 'priority') {
          const pOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0)
        }
        return b.updatedAt - a.updatedAt
      })
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-2.5 gap-2">
      {/* Header Bar */}
      <div className="flex items-center justify-between min-h-8 px-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-white tracking-wide">
            {projectData.name || 'Project Tasks'}
          </h2>
          <span className="text-xs text-studio-muted font-mono">
            ({projectData.tasks.length})
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
            className="bg-white/[0.04] text-studio-muted text-xs rounded-lg px-2 py-1 border border-white/[0.06] outline-none hover:text-white transition-colors cursor-pointer"
            title="Filter by priority"
          >
            <option value="all" className="bg-studio-card">All Priorities</option>
            <option value="urgent" className="bg-studio-card">Urgent</option>
            <option value="high" className="bg-studio-card">High</option>
            <option value="medium" className="bg-studio-card">Medium</option>
            <option value="low" className="bg-studio-card">Low</option>
          </select>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-white/[0.04] text-studio-muted text-xs rounded-lg px-2 py-1 border border-white/[0.06] outline-none hover:text-white transition-colors cursor-pointer"
            title="Filter by issue type"
          >
            <option value="all" className="bg-studio-card">All Types</option>
            <option value="task" className="bg-studio-card">Task</option>
            <option value="bug" className="bg-studio-card">Bug</option>
            <option value="story" className="bg-studio-card">Story</option>
            <option value="epic" className="bg-studio-card">Epic</option>
          </select>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white/[0.04] text-studio-muted text-xs rounded-lg px-2 py-1 border border-white/[0.06] outline-none hover:text-white transition-colors cursor-pointer"
            title="Sort tasks"
          >
            <option value="updated" className="bg-studio-card">Sort: Recent</option>
            <option value="priority" className="bg-studio-card">Sort: Priority</option>
            <option value="title" className="bg-studio-card">Sort: Title</option>
          </select>

          {/* Search */}
          <div className="flex items-center gap-1.5 glass-pill px-2.5 py-1 rounded-lg text-xs">
            <Search className="w-3 h-3 text-studio-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks..."
              className="bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted w-24 focus:w-32 transition-all font-sans"
            />
          </div>

          <button
            onClick={() => setActiveModalCol('todo')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-studio-accent hover:bg-studio-accentHover text-studio-bg text-xs font-medium transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Canvas */}
      <div className="flex-1 glass-panel rounded-2xl p-3 overflow-x-auto flex gap-3 border border-white/[0.05]">
        {COLUMNS.map((col) => {
          const tasks = getFilteredTasksForColumn(col.id)
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
                  const codeLinks = task.codeLinks && task.codeLinks.length > 0
                    ? task.codeLinks
                    : task.linkedFile
                    ? [{ file: task.linkedFile, line: task.linkedLine }]
                    : []

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => setSelectedTask(task)}
                      className={`group p-2.5 rounded-xl border transition-all duration-150 flex flex-col gap-1.5 relative cursor-grab active:cursor-grabbing ${
                        isFocus
                          ? 'bg-studio-amber/[0.08] border-studio-amber/30 ring-1 ring-studio-amber/20'
                          : 'bg-studio-surface/60 hover:bg-studio-surface border-white/[0.04]'
                      }`}
                    >
                      {/* Top Bar: Stable ID, Type Badge, and Quick Actions */}
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-studio-amber font-semibold">
                            {task.id}
                          </span>
                          {getTypeBadge(task.type)}
                          {task.dueDate && (
                            <span className="text-studio-muted flex items-center gap-0.5 text-[9px] font-mono">
                              <Calendar className="w-2.5 h-2.5" />
                              <span>{task.dueDate}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Clone task */}
                          <button
                            onClick={(e) => handleCloneTaskItem(e, task.id)}
                            className="p-1 rounded text-studio-muted hover:text-studio-cyan transition-colors cursor-pointer"
                            title="Clone Task"
                          >
                            <Copy className="w-3 h-3" />
                          </button>

                          {/* Focus in editor */}
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

                          {/* Delete */}
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

                      {/* Title */}
                      <span className="text-xs font-medium text-studio-text leading-snug">
                        {task.title}
                      </span>

                      {task.description && (
                        <p className="text-[11px] text-studio-muted leading-relaxed line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Subtasks Progress */}
                      {subtasks.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-studio-muted font-mono">
                          <CheckSquare className="w-3 h-3 text-studio-emerald" />
                          <span>
                            {completedSubtasks}/{subtasks.length} subtasks
                          </span>
                        </div>
                      )}

                      {/* Multiple Code Links & Dedicated Git Branch */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {codeLinks.map((cl, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleJumpToFile(cl.file, cl.line)
                            }}
                            className="flex items-center gap-1 text-[10px] text-studio-amber/80 hover:text-studio-amber bg-studio-amber/5 px-2 py-0.5 rounded-md transition-colors w-fit font-mono cursor-pointer border border-studio-amber/10"
                            title={`Jump to ${cl.file}${cl.line ? `:${cl.line}` : ''}`}
                          >
                            <FileCode2 className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[100px]">
                              {cl.file.split(/[\\/]/).pop()}
                              {cl.line ? `:${cl.line}` : ''}
                            </span>
                            <ExternalLink className="w-2 h-2" />
                          </button>
                        ))}

                        <button
                          onClick={(e) => handleCreateOrCheckoutBranch(e, task)}
                          className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                            gitStatus.branch === `feat/${task.id.toLowerCase()}-${slugify(task.title)}`
                              ? 'bg-studio-amber/20 text-studio-amber border border-studio-amber/30'
                              : 'bg-white/[0.03] text-studio-muted hover:text-studio-amber hover:bg-white/[0.06] border border-white/[0.05]'
                          }`}
                          title={`Git Branch: feat/${task.id.toLowerCase()}-${slugify(task.title)} (Click to checkout)`}
                        >
                          <GitBranch className="w-2.5 h-2.5 text-studio-amber shrink-0" />
                          <span className="truncate max-w-[100px]">
                            feat/{task.id.toLowerCase()}
                          </span>
                        </button>
                      </div>

                      {/* Bottom Footer: Priority & Status Selector */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04] mt-0.5">
                        {getPriorityBadge(task.priority)}

                        <select
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            updateTaskStatus(task.id, e.target.value as TaskItem['status'])
                            if (workspacePath) saveToDisk(workspacePath)
                          }}
                          className="bg-studio-card text-studio-muted text-[10px] rounded px-1.5 py-0.5 border border-white/10 outline-none hover:text-white transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
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
                  className="w-full glass-pill rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-studio-accent transition-colors font-sans"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-studio-muted block mb-1">Description</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Details & context..."
                  rows={2}
                  className="w-full glass-pill rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-studio-accent transition-colors resize-none font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-studio-muted block mb-1">Issue Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as IssueType)}
                    className="w-full glass-pill rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="task" className="bg-studio-card">Task</option>
                    <option value="bug" className="bg-studio-card">Bug</option>
                    <option value="story" className="bg-studio-card">Story</option>
                    <option value="epic" className="bg-studio-card">Epic</option>
                  </select>
                </div>

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
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-studio-muted block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full glass-pill rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-studio-muted block mb-1">Linked Line</label>
                  <input
                    type="number"
                    value={taskLinkedLine}
                    onChange={(e) => setTaskLinkedLine(e.target.value)}
                    placeholder="Line #"
                    className="w-full glass-pill rounded-lg px-2 py-1.5 text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-studio-muted block mb-1">Linked File</label>
                <input
                  type="text"
                  value={taskLinkedFile}
                  onChange={(e) => setTaskLinkedFile(e.target.value)}
                  placeholder="src/index.ts"
                  className="w-full glass-pill rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-studio-accent transition-colors font-mono"
                />
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
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail & Subtasks Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-lg p-5 flex flex-col gap-3 shadow-studio-card max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-studio-amber font-semibold text-xs">
                    {selectedTask.id}
                  </span>
                  {getTypeBadge(selectedTask.type)}
                  <span className="text-[10px] uppercase font-mono text-studio-muted">
                    {selectedTask.status}
                  </span>
                </div>
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
              <p className="text-xs text-studio-muted leading-relaxed bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
                {selectedTask.description}
              </p>
            )}

            {/* Git Branch Automation */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className="w-4 h-4 text-studio-amber shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-white font-mono truncate">
                    feat/{selectedTask.id.toLowerCase()}-{slugify(selectedTask.title)}
                  </span>
                  <span className="text-[10px] text-studio-muted">
                    {gitStatus.branch === `feat/${selectedTask.id.toLowerCase()}-${slugify(selectedTask.title)}`
                      ? 'Current active Git branch'
                      : 'Dedicated task branch'}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => handleCreateOrCheckoutBranch(e, selectedTask)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors shrink-0 cursor-pointer ${
                  gitStatus.branch === `feat/${selectedTask.id.toLowerCase()}-${slugify(selectedTask.title)}`
                    ? 'bg-studio-emerald/20 text-studio-emerald border border-studio-emerald/30 font-medium'
                    : 'bg-studio-accent hover:bg-studio-accentHover text-studio-bg font-medium'
                }`}
              >
                {gitStatus.branch === `feat/${selectedTask.id.toLowerCase()}-${slugify(selectedTask.title)}`
                  ? 'Active Branch'
                  : 'Checkout Branch'}
              </button>
            </div>

            {/* Code Links Section */}
            <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center justify-between text-xs text-studio-muted font-medium">
                <div className="flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-studio-amber" />
                  <span>Linked Code Locations</span>
                </div>
                <span className="text-[10px] font-mono">
                  {(selectedTask.codeLinks || []).length} linked
                </span>
              </div>

              {/* List of links */}
              <div className="flex flex-col gap-1">
                {(selectedTask.codeLinks || []).map((cl, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] text-xs font-mono"
                  >
                    <button
                      onClick={() => handleJumpToFile(cl.file, cl.line)}
                      className="flex items-center gap-1.5 text-studio-amber hover:underline truncate text-left cursor-pointer"
                    >
                      <FileCode2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{cl.file}{cl.line ? `:${cl.line}` : ''}</span>
                    </button>
                    <button
                      onClick={() => handleRemoveCodeLinkItem(selectedTask.id, idx)}
                      className="p-1 text-studio-muted hover:text-studio-rose transition-colors cursor-pointer"
                      title="Remove link"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add code link inputs */}
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  type="text"
                  value={newCodeLinkFile}
                  onChange={(e) => setNewCodeLinkFile(e.target.value)}
                  placeholder="File path (e.g. src/index.ts)..."
                  className="flex-1 glass-pill rounded-lg px-2.5 py-1 text-xs text-white outline-none font-mono"
                />
                <input
                  type="number"
                  value={newCodeLinkLine}
                  onChange={(e) => setNewCodeLinkLine(e.target.value)}
                  placeholder="Line #"
                  className="w-16 glass-pill rounded-lg px-2 py-1 text-xs text-white outline-none font-mono"
                />
                <button
                  onClick={() => handleAddCodeLinkSubmit(selectedTask.id)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white font-medium cursor-pointer"
                >
                  Link
                </button>
              </div>
            </div>

            {/* Subtasks Checklist */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between text-xs text-studio-muted font-medium">
                <span>Checklist / Subtasks</span>
                <span className="font-mono text-[10px]">
                  {(selectedTask.subtasks || []).filter((s) => s.completed).length}/
                  {(selectedTask.subtasks || []).length} done
                </span>
              </div>

              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
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

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
              <button
                onClick={(e) => handleCloneTaskItem(e, selectedTask.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Clone Task</span>
              </button>

              <button
                onClick={() => setSelectedTask(null)}
                className="px-3 py-1.5 rounded-lg text-xs bg-studio-accent text-studio-bg font-medium hover:bg-studio-accentHover cursor-pointer shadow-sm"
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

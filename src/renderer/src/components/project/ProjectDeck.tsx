import React, { useState, useMemo } from 'react'
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
  Filter,
  MessageSquare,
  Clock,
  User,
  Users,
  AlertTriangle,
  Layers,
  ShieldAlert,
  ListTree,
  FileText,
  KanbanSquare,
  Milestone,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Archive,
  RefreshCw
} from 'lucide-react'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import { MarkdownRenderer } from './MarkdownRenderer'
import { SprintBacklogView } from './SprintBacklogView'
import { MilestoneRoadmapView } from './MilestoneRoadmapView'
import { ProjectDashboardView } from './ProjectDashboardView'
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
    activeProjectView,
    setActiveProjectView,
    syncStatus,
    conflictData,
    resolveConflict,
    syncWithRepository,
    createBackup,
    addTask,
    cloneTask,
    updateTaskStatus,
    updateTask,
    addCodeLink,
    removeCodeLink,
    addSubtask,
    toggleSubtask,
    addComment,
    deleteComment,
    addLabel,
    removeLabel,
    addComponent,
    removeComponent,
    addBlocker,
    removeBlocker,
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

  // New Task Modal state
  const [activeModalCol, setActiveModalCol] = useState<TaskItem['status'] | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskType, setTaskType] = useState<IssueType>('task')
  const [taskPriority, setTaskPriority] = useState<TaskItem['priority']>('medium')
  const [taskAssignee, setTaskAssignee] = useState('')
  const [taskReporter, setTaskReporter] = useState('')
  const [taskStartDate, setTaskStartDate] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskLabelsStr, setTaskLabelsStr] = useState('')
  const [taskComponentsStr, setTaskComponentsStr] = useState('')
  const [taskLinkedFile, setTaskLinkedFile] = useState('')
  const [taskLinkedLine, setTaskLinkedLine] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Drag and Drop state
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  // Task Detail Modal State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [activeDetailTab, setActiveDetailTab] = useState<'details' | 'subtasks' | 'code' | 'comments' | 'timeline'>('details')
  const [descTab, setDescTab] = useState<'write' | 'preview'>('preview')
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newCodeLinkFile, setNewCodeLinkFile] = useState('')
  const [newCodeLinkLine, setNewCodeLinkLine] = useState('')
  const [newCommentAuthor, setNewCommentAuthor] = useState('')
  const [newCommentContent, setNewCommentContent] = useState('')
  const [newLabelInput, setNewLabelInput] = useState('')
  const [newComponentInput, setNewComponentInput] = useState('')
  const [newBlockerInput, setNewBlockerInput] = useState('')
  const [activeCodeLinkIdx, setActiveCodeLinkIdx] = useState(0)

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null
    return (projectData?.tasks || []).find((t) => t.id === selectedTaskId) || null
  }, [projectData?.tasks, selectedTaskId])

  const handleCreateTask = () => {
    if (!taskTitle.trim() || !activeModalCol) return

    const initialCodeLinks: CodeLinkItem[] = []
    if (taskLinkedFile.trim()) {
      initialCodeLinks.push({
        file: taskLinkedFile.trim(),
        line: taskLinkedLine.trim() ? parseInt(taskLinkedLine.trim(), 10) : undefined
      })
    }

    const labels = taskLabelsStr
      .split(',')
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean)

    const components = taskComponentsStr
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)

    addTask({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      status: activeModalCol,
      priority: taskPriority,
      type: taskType,
      assignee: taskAssignee.trim() || undefined,
      reporter: taskReporter.trim() || undefined,
      startDate: taskStartDate.trim() || undefined,
      dueDate: taskDueDate.trim() || undefined,
      labels,
      components,
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
    setTaskAssignee('')
    setTaskReporter('')
    setTaskStartDate('')
    setTaskDueDate('')
    setTaskLabelsStr('')
    setTaskComponentsStr('')
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
      if (task.status === 'backlog' || task.status === 'todo') {
        updateTaskStatus(task.id, 'in_progress')
        saveToDisk(workspacePath)
      }
    } else {
      const createRes = await window.maestroAPI.gitCreateBranch(workspacePath, branchName)
      if (createRes.ok) {
        await refreshGitStatus()
        setStatusMessage(`Created & switched to branch ${branchName}`)
        setFocusTask({ id: task.id, title: task.title })
        if (task.status === 'backlog' || task.status === 'todo') {
          updateTaskStatus(task.id, 'in_progress')
          saveToDisk(workspacePath)
        }
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
        const targetTask = (projectData?.tasks || []).find((t) => t.id === taskId)
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
  }

  const handleToggleSubtaskItem = (taskId: string, subtaskId: string) => {
    toggleSubtask(taskId, subtaskId)
    if (workspacePath) saveToDisk(workspacePath)
  }

  const handleAddCodeLinkSubmit = (taskId: string) => {
    if (!newCodeLinkFile.trim()) return
    addCodeLink(taskId, {
      file: newCodeLinkFile.trim(),
      line: newCodeLinkLine.trim() ? parseInt(newCodeLinkLine.trim(), 10) : undefined
    })
    setNewCodeLinkFile('')
    setNewCodeLinkLine('')
    if (workspacePath) saveToDisk(workspacePath)
  }

  const handleRemoveCodeLinkItem = (taskId: string, index: number) => {
    removeCodeLink(taskId, index)
    if (workspacePath) saveToDisk(workspacePath)
  }

  const handleAddCommentSubmit = (taskId: string) => {
    if (!newCommentContent.trim()) return
    addComment(taskId, newCommentAuthor || 'Developer', newCommentContent)
    setNewCommentContent('')
    if (workspacePath) saveToDisk(workspacePath)
  }

  const handleDeleteCommentItem = (taskId: string, commentId: string) => {
    deleteComment(taskId, commentId)
    if (workspacePath) saveToDisk(workspacePath)
  }

  const handleAddLabelSubmit = (taskId: string) => {
    if (!newLabelInput.trim()) return
    addLabel(taskId, newLabelInput)
    setNewLabelInput('')
    if (workspacePath) saveToDisk(workspacePath)
  }

  const handleRemoveLabelItem = (taskId: string, label: string) => {
    removeLabel(taskId, label)
    if (workspacePath) saveToDisk(workspacePath)
  }

  const handleAddComponentSubmit = (taskId: string) => {
    if (!newComponentInput.trim()) return
    addComponent(taskId, newComponentInput)
    setNewComponentInput('')
    if (workspacePath) saveToDisk(workspacePath)
  }

  const handleRemoveComponentItem = (taskId: string, comp: string) => {
    removeComponent(taskId, comp)
    if (workspacePath) saveToDisk(workspacePath)
  }

  const handleAddBlockerSubmit = (taskId: string) => {
    if (!newBlockerInput.trim()) return
    addBlocker(taskId, newBlockerInput)
    setNewBlockerInput('')
    if (workspacePath) saveToDisk(workspacePath)
  }

  const handleRemoveBlockerItem = (taskId: string, blockerId: string) => {
    removeBlocker(taskId, blockerId)
    if (workspacePath) saveToDisk(workspacePath)
  }

  const handleCloneTaskItem = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    cloneTask(taskId)
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

  const filteredTasks = useMemo(() => {
    return (projectData?.tasks || [])
      .filter((t) => {
        if (filterPriority !== 'all' && t.priority !== filterPriority) return false
        if (filterType !== 'all' && (t.type || 'task') !== filterType) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchTitle = t.title.toLowerCase().includes(q)
          const matchId = t.id.toLowerCase().includes(q)
          const matchDesc = (t.description || '').toLowerCase().includes(q)
          const matchAssignee = (t.assignee || '').toLowerCase().includes(q)
          const matchLabels = (t.labels || []).some((l) => l.toLowerCase().includes(q))
          if (!matchTitle && !matchId && !matchDesc && !matchAssignee && !matchLabels) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title)
        if (sortBy === 'priority') {
          const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
          return pOrder[a.priority] - pOrder[b.priority]
        }
        return b.updatedAt - a.updatedAt
      })
  }, [projectData?.tasks, filterPriority, filterType, searchQuery, sortBy])

  return (
    <div className="flex-1 w-full h-full flex flex-col p-4 overflow-hidden bg-studio-bg select-none">
      {/* Top Header & Search/Filter Toolbar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white tracking-wide">
              {projectData?.name || 'Project Deck'}
            </h2>
            <span className="glass-pill px-2 py-0.5 rounded-full text-[10px] text-studio-muted font-mono">
              {(projectData?.tasks || []).length} issues
            </span>

            {/* Repository Sync Status Badge */}
            {syncStatus === 'synced' && (
              <span
                className="glass-pill px-2 py-0.5 rounded-full text-[10px] text-studio-emerald font-mono flex items-center gap-1"
                title="Synchronized with .maestro/project.json"
              >
                <CheckCircle2 className="w-2.5 h-2.5" /> Synced
              </span>
            )}
            {syncStatus === 'uncommitted' && (
              <button
                onClick={() => {
                  if (workspacePath) syncWithRepository(workspacePath)
                }}
                className="glass-pill px-2 py-0.5 rounded-full text-[10px] text-studio-amber font-mono flex items-center gap-1 hover:border-studio-amber transition-colors cursor-pointer"
                title="Uncommitted changes (Click to sync with repository)"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Uncommitted
              </button>
            )}
            {syncStatus === 'syncing' && (
              <span className="glass-pill px-2 py-0.5 rounded-full text-[10px] text-studio-cyan font-mono flex items-center gap-1">
                <RotateCw className="w-2.5 h-2.5 animate-spin" /> Syncing...
              </span>
            )}
            {syncStatus === 'conflict' && (
              <span className="glass-pill px-2 py-0.5 rounded-full text-[10px] text-studio-rose font-mono flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-2.5 h-2.5" /> Conflict
              </span>
            )}

            {/* Create Backup Button */}
            <button
              onClick={async () => {
                if (workspacePath) {
                  const backupName = await createBackup(workspacePath)
                  if (backupName) {
                    setStatusMessage(`Created project backup: ${backupName}`)
                    setTimeout(() => setStatusMessage('Ready'), 2500)
                  }
                }
              }}
              className="p-1 rounded-lg text-studio-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Create timestamped backup of project (.maestro/backups/)"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View Mode Switcher Pills */}
          <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <button
              onClick={() => setActiveProjectView('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeProjectView === 'kanban'
                  ? 'bg-studio-accent/20 text-studio-amber shadow-sm border border-studio-accent/30'
                  : 'text-studio-muted hover:text-white hover:bg-white/[0.04]'
              }`}
              title="Kanban Board View"
            >
              <KanbanSquare className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setActiveProjectView('backlog')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeProjectView === 'backlog'
                  ? 'bg-studio-accent/20 text-studio-amber shadow-sm border border-studio-accent/30'
                  : 'text-studio-muted hover:text-white hover:bg-white/[0.04]'
              }`}
              title="Backlog & Sprint Planning"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Backlog & Sprints</span>
            </button>
            <button
              onClick={() => setActiveProjectView('roadmap')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeProjectView === 'roadmap'
                  ? 'bg-studio-accent/20 text-studio-amber shadow-sm border border-studio-accent/30'
                  : 'text-studio-muted hover:text-white hover:bg-white/[0.04]'
              }`}
              title="Milestone Roadmap"
            >
              <Milestone className="w-3.5 h-3.5" />
              <span>Roadmap</span>
            </button>
            <button
              onClick={() => setActiveProjectView('dashboard')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeProjectView === 'dashboard'
                  ? 'bg-studio-accent/20 text-studio-amber shadow-sm border border-studio-accent/30'
                  : 'text-studio-muted hover:text-white hover:bg-white/[0.04]'
              }`}
              title="Analytics & Progress Dashboard"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        {activeProjectView === 'kanban' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-studio-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, IDs, labels..."
                className="glass-pill pl-8 pr-3 py-1 rounded-lg text-xs text-white placeholder-studio-muted outline-none w-44 focus:w-56 transition-all font-sans"
              />
            </div>

            {/* Filter Type */}
            <div className="flex items-center gap-1 glass-pill px-2 py-1 rounded-lg text-xs text-studio-muted">
              <Filter className="w-3 h-3 text-studio-cyan" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-transparent text-white text-xs outline-none cursor-pointer"
              >
                <option value="all" className="bg-studio-card">All Types</option>
                <option value="epic" className="bg-studio-card">Epic</option>
                <option value="story" className="bg-studio-card">Story</option>
                <option value="task" className="bg-studio-card">Task</option>
                <option value="bug" className="bg-studio-card">Bug</option>
                <option value="subtask" className="bg-studio-card">Subtask</option>
              </select>
            </div>

            {/* Filter Priority */}
            <div className="flex items-center gap-1 glass-pill px-2 py-1 rounded-lg text-xs text-studio-muted">
              <Flame className="w-3 h-3 text-studio-amber" />
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="bg-transparent text-white text-xs outline-none cursor-pointer"
              >
                <option value="all" className="bg-studio-card">All Priority</option>
                <option value="urgent" className="bg-studio-card">Urgent</option>
                <option value="high" className="bg-studio-card">High</option>
                <option value="medium" className="bg-studio-card">Medium</option>
                <option value="low" className="bg-studio-card">Low</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-1 glass-pill px-2 py-1 rounded-lg text-xs text-studio-muted">
              <ArrowUpDown className="w-3 h-3 text-studio-muted" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-white text-xs outline-none cursor-pointer"
              >
                <option value="updated" className="bg-studio-card">Recently Updated</option>
                <option value="priority" className="bg-studio-card">Priority</option>
                <option value="title" className="bg-studio-card">Title (A-Z)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Conflict Resolution Banner */}
      {syncStatus === 'conflict' && conflictData && (
        <div className="mb-3 p-3 rounded-xl bg-studio-rose/10 border border-studio-rose/30 flex items-center justify-between gap-3 shrink-0 animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-studio-rose shrink-0" />
            <div className="text-xs text-white">
              <span className="font-semibold text-studio-rose">Repository Conflict:</span> External modifications were detected in{' '}
              <code className="text-studio-amber font-mono text-[11px]">.maestro/project.json</code> while in-memory tasks are modified.
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => resolveConflict(workspacePath || '', 'local')}
              className="px-2.5 py-1 rounded-lg text-xs font-mono text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              title="Keep local changes and overwrite repository file"
            >
              Keep Local
            </button>
            <button
              onClick={() => resolveConflict(workspacePath || '', 'repository')}
              className="px-2.5 py-1 rounded-lg text-xs font-mono text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              title="Discard local changes and load repository version"
            >
              Accept Repository
            </button>
            <button
              onClick={() => resolveConflict(workspacePath || '', 'merge')}
              className="px-3 py-1 rounded-lg text-xs font-mono bg-studio-accent hover:bg-studio-accentHover text-studio-bg font-medium transition-colors cursor-pointer"
              title="3-way smart merge: keep newest task by updatedAt timestamp"
            >
              Smart Merge
            </button>
          </div>
        </div>
      )}

      {/* Kanban Board Columns */}
      {activeProjectView === 'kanban' && (
        <div
          onWheel={(e) => {
            if (e.deltaY !== 0 && !e.shiftKey) {
              const target = e.target as HTMLElement
              const isInnerScroll = target.closest('.overflow-y-auto')
              if (!isInnerScroll) {
                e.currentTarget.scrollLeft += e.deltaY
              }
            }
          }}
          className="flex-1 flex gap-3 overflow-x-auto pb-2 min-h-0"
        >
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id)
          const isOver = dragOverCol === col.id

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex-1 min-w-[260px] max-w-[320px] flex flex-col rounded-2xl glass-panel border transition-all duration-150 overflow-hidden ${
                isOver ? 'border-studio-accent ring-1 ring-studio-accent/40 bg-white/[0.04]' : 'border-white/[0.05]'
              }`}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-white/[0.04] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${col.badge}`}>
                    {col.title}
                  </span>
                  <span className="text-xs text-studio-muted font-mono">{colTasks.length}</span>
                </div>

                <button
                  onClick={() => setActiveModalCol(col.id)}
                  className="p-1 rounded-lg text-studio-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={`Add task to ${col.title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Task Cards Column */}
              <div className="flex-1 p-2.5 flex flex-col gap-2 overflow-y-auto min-h-0">
                {colTasks.map((task) => {
                  const isFocus = focusTask?.id === task.id
                  const subtasks = task.subtasks || []
                  const completedSubtasks = subtasks.filter((s) => s.completed).length
                  const codeLinks = task.codeLinks || (task.linkedFile ? [{ file: task.linkedFile, line: task.linkedLine }] : [])
                  const isBlocked = (task.blockedBy || []).length > 0

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`group p-3 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col gap-2 relative ${
                        isFocus
                          ? 'border-studio-amber bg-studio-amber/[0.06] shadow-[0_0_15px_rgba(224,169,109,0.12)]'
                          : 'border-white/[0.06] bg-studio-card/60 hover:bg-studio-card hover:border-white/20 hover:shadow-studio-card'
                      }`}
                    >
                      {/* Top Header: ID, Type, Focus, Delete */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] text-studio-amber font-semibold">
                            {task.id}
                          </span>
                          {getTypeBadge(task.type)}
                          {isBlocked && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-studio-rose/15 text-studio-rose border border-studio-rose/30 flex items-center gap-1">
                              <ShieldAlert className="w-2.5 h-2.5" /> BLOCKED
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Focus Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setFocusTask(isFocus ? null : { id: task.id, title: task.title })
                            }}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isFocus ? 'text-studio-amber' : 'text-studio-muted hover:text-studio-amber'
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

                      {/* Labels and Components */}
                      {((task.labels && task.labels.length > 0) || (task.components && task.components.length > 0)) && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {(task.labels || []).slice(0, 3).map((l, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/[0.04] text-studio-muted border border-white/[0.06]"
                            >
                              #{l}
                            </span>
                          ))}
                          {(task.components || []).slice(0, 2).map((c, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-studio-cyan/10 text-studio-cyan border border-studio-cyan/20"
                            >
                              [{c}]
                            </span>
                          ))}
                        </div>
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
                            <span className="truncate max-w-[90px]">
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
                          <span className="truncate max-w-[90px]">
                            feat/{task.id.toLowerCase()}
                          </span>
                        </button>
                      </div>

                      {/* Bottom Footer: Priority, Due Date, Assignee */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04] mt-0.5 text-[10px]">
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(task.priority)}
                          {task.dueDate && (
                            <span className="flex items-center gap-1 text-studio-muted font-mono">
                              <Calendar className="w-2.5 h-2.5" /> {task.dueDate}
                            </span>
                          )}
                        </div>

                        {task.assignee ? (
                          <div className="flex items-center gap-1 text-studio-muted font-mono">
                            <User className="w-2.5 h-2.5 text-studio-cyan" />
                            <span className="truncate max-w-[70px]">{task.assignee}</span>
                          </div>
                        ) : (
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
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* Backlog & Sprint Planning View */}
      {activeProjectView === 'backlog' && (
        <SprintBacklogView onSelectTask={(id) => setSelectedTaskId(id)} />
      )}

      {/* Milestone Roadmap View */}
      {activeProjectView === 'roadmap' && (
        <MilestoneRoadmapView onSelectTask={(id) => setSelectedTaskId(id)} />
      )}

      {/* Analytics & Progress Dashboard */}
      {activeProjectView === 'dashboard' && (
        <ProjectDashboardView />
      )}

      {/* Modal Add Task */}
      {activeModalCol && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-md p-5 flex flex-col gap-3 shadow-studio-card max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-semibold text-white">New Issue</h3>

            <div className="flex flex-col gap-2.5">
              <div>
                <label className="text-xs text-studio-muted block mb-1">Title *</label>
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
                <label className="text-xs text-studio-muted block mb-1">Description (Markdown Supported)</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Details, acceptance criteria, markdown..."
                  rows={3}
                  className="w-full glass-pill rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-studio-accent transition-colors resize-none font-mono"
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
                    <option value="subtask" className="bg-studio-card">Subtask</option>
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
                  <label className="text-xs text-studio-muted block mb-1">Assignee</label>
                  <input
                    type="text"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full glass-pill rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-studio-muted block mb-1">Reporter</label>
                  <input
                    type="text"
                    value={taskReporter}
                    onChange={(e) => setTaskReporter(e.target.value)}
                    placeholder="e.g. Project Lead"
                    className="w-full glass-pill rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-studio-muted block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={taskStartDate}
                    onChange={(e) => setTaskStartDate(e.target.value)}
                    className="w-full glass-pill rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-studio-muted block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full glass-pill rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-studio-muted block mb-1">Labels (comma separated)</label>
                  <input
                    type="text"
                    value={taskLabelsStr}
                    onChange={(e) => setTaskLabelsStr(e.target.value)}
                    placeholder="frontend, auth, ui"
                    className="w-full glass-pill rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-studio-muted block mb-1">Components</label>
                  <input
                    type="text"
                    value={taskComponentsStr}
                    onChange={(e) => setTaskComponentsStr(e.target.value)}
                    placeholder="Monaco, Terminal"
                    className="w-full glass-pill rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs text-studio-muted block mb-1">Linked File</label>
                  <input
                    type="text"
                    value={taskLinkedFile}
                    onChange={(e) => setTaskLinkedFile(e.target.value)}
                    placeholder="src/index.ts"
                    className="w-full glass-pill rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-studio-muted block mb-1">Line #</label>
                  <input
                    type="number"
                    value={taskLinkedLine}
                    onChange={(e) => setTaskLinkedLine(e.target.value)}
                    placeholder="42"
                    className="w-full glass-pill rounded-lg px-2 py-1.5 text-xs text-white outline-none font-mono"
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
                className="px-3.5 py-1.5 rounded-lg text-xs bg-studio-accent hover:bg-studio-accentHover text-studio-bg font-medium transition-all cursor-pointer"
              >
                Create Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-2xl p-5 flex flex-col gap-3.5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Top Bar */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-studio-amber font-semibold text-xs px-2 py-0.5 rounded bg-studio-amber/10 border border-studio-amber/20">
                    {selectedTask.id}
                  </span>
                  {getTypeBadge(selectedTask.type)}

                  {/* Status Dropdown */}
                  <select
                    value={selectedTask.status}
                    onChange={(e) => {
                      updateTaskStatus(selectedTask.id, e.target.value as TaskItem['status'])
                      if (workspacePath) saveToDisk(workspacePath)
                    }}
                    className="glass-pill px-2 py-0.5 rounded text-[11px] text-white outline-none font-mono cursor-pointer"
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.id} value={c.id} className="bg-studio-card">
                        {c.title}
                      </option>
                    ))}
                  </select>

                  {/* Priority Dropdown */}
                  <select
                    value={selectedTask.priority}
                    onChange={(e) => {
                      updateTask(selectedTask.id, { priority: e.target.value as TaskItem['priority'] })
                      if (workspacePath) saveToDisk(workspacePath)
                    }}
                    className="glass-pill px-2 py-0.5 rounded text-[11px] text-white outline-none font-mono cursor-pointer"
                  >
                    <option value="low" className="bg-studio-card">Low</option>
                    <option value="medium" className="bg-studio-card">Medium</option>
                    <option value="high" className="bg-studio-card">High</option>
                    <option value="urgent" className="bg-studio-card">Urgent</option>
                  </select>

                  <span className="text-[10px] text-studio-muted font-mono">
                    Updated: {new Date(selectedTask.updatedAt).toLocaleTimeString()}
                  </span>
                </div>

                {/* Task Title (Editable) */}
                <input
                  type="text"
                  value={selectedTask.title}
                  onChange={(e) => {
                    updateTask(selectedTask.id, { title: e.target.value })
                    if (workspacePath) saveToDisk(workspacePath)
                  }}
                  className="w-full bg-transparent text-sm font-semibold text-white border-b border-transparent hover:border-white/20 focus:border-studio-accent outline-none pb-0.5 transition-colors"
                />
              </div>

              <button
                onClick={() => setSelectedTaskId(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-studio-muted hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Markdown Description Section */}
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center justify-between text-xs text-studio-muted">
                <span className="font-medium text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-studio-cyan" />
                  Description
                </span>
                <div className="flex items-center gap-1 glass-pill p-0.5 rounded-md">
                  <button
                    onClick={() => setDescTab('write')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                      descTab === 'write' ? 'bg-white/10 text-white font-medium' : 'text-studio-muted hover:text-white'
                    }`}
                  >
                    Write
                  </button>
                  <button
                    onClick={() => setDescTab('preview')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                      descTab === 'preview' ? 'bg-white/10 text-white font-medium' : 'text-studio-muted hover:text-white'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              </div>

              {descTab === 'write' ? (
                <textarea
                  value={selectedTask.description || ''}
                  onChange={(e) => {
                    updateTask(selectedTask.id, { description: e.target.value })
                    if (workspacePath) saveToDisk(workspacePath)
                  }}
                  placeholder="Add detailed markdown description (headings, lists, code blocks, checklists)..."
                  rows={4}
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-studio-accent transition-colors font-mono resize-y"
                />
              ) : (
                <div className="min-h-[80px] p-2.5 rounded-lg bg-black/20 border border-white/5">
                  <MarkdownRenderer content={selectedTask.description || ''} />
                </div>
              )}
            </div>

            {/* Task Metadata & Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-studio-muted block mb-0.5 flex items-center gap-1">
                  <User className="w-2.5 h-2.5 text-studio-cyan" /> Assignee
                </span>
                <input
                  type="text"
                  value={selectedTask.assignee || ''}
                  onChange={(e) => {
                    updateTask(selectedTask.id, { assignee: e.target.value })
                    if (workspacePath) saveToDisk(workspacePath)
                  }}
                  placeholder="Unassigned"
                  className="w-full bg-transparent text-white text-xs outline-none"
                />
              </div>

              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-studio-muted block mb-0.5 flex items-center gap-1">
                  <Users className="w-2.5 h-2.5 text-studio-muted" /> Reporter
                </span>
                <input
                  type="text"
                  value={selectedTask.reporter || ''}
                  onChange={(e) => {
                    updateTask(selectedTask.id, { reporter: e.target.value })
                    if (workspacePath) saveToDisk(workspacePath)
                  }}
                  placeholder="Reporter name"
                  className="w-full bg-transparent text-white text-xs outline-none"
                />
              </div>

              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-studio-muted block mb-0.5 flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5 text-studio-emerald" /> Start Date
                </span>
                <input
                  type="date"
                  value={selectedTask.startDate || ''}
                  onChange={(e) => {
                    updateTask(selectedTask.id, { startDate: e.target.value })
                    if (workspacePath) saveToDisk(workspacePath)
                  }}
                  className="w-full bg-transparent text-white text-xs outline-none cursor-pointer font-mono"
                />
              </div>

              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-studio-muted block mb-0.5 flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5 text-studio-amber" /> Due Date
                </span>
                <input
                  type="date"
                  value={selectedTask.dueDate || ''}
                  onChange={(e) => {
                    updateTask(selectedTask.id, { dueDate: e.target.value })
                    if (workspacePath) saveToDisk(workspacePath)
                  }}
                  className="w-full bg-transparent text-white text-xs outline-none cursor-pointer font-mono"
                />
              </div>

              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-studio-muted block mb-0.5 flex items-center gap-1">
                  <Layers className="w-2.5 h-2.5 text-studio-cyan" /> Sprint
                </span>
                <select
                  value={selectedTask.sprintId || ''}
                  onChange={(e) => {
                    updateTask(selectedTask.id, { sprintId: e.target.value || undefined })
                    if (workspacePath) saveToDisk(workspacePath)
                  }}
                  className="w-full bg-transparent text-white text-xs outline-none cursor-pointer"
                >
                  <option value="" className="bg-studio-card">Backlog</option>
                  {(projectData.sprints || []).map((s) => (
                    <option key={s.id} value={s.id} className="bg-studio-card">
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-studio-muted block mb-0.5 flex items-center gap-1">
                  <Milestone className="w-2.5 h-2.5 text-studio-amber" /> Milestone
                </span>
                <select
                  value={selectedTask.milestoneId || ''}
                  onChange={(e) => {
                    updateTask(selectedTask.id, { milestoneId: e.target.value || undefined })
                    if (workspacePath) saveToDisk(workspacePath)
                  }}
                  className="w-full bg-transparent text-white text-xs outline-none cursor-pointer"
                >
                  <option value="" className="bg-studio-card">None</option>
                  {(projectData.milestones || []).map((m) => (
                    <option key={m.id} value={m.id} className="bg-studio-card">
                      {m.title} ({m.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Labels, Components, and Blockers */}
            <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs">
              {/* Labels */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-studio-muted flex items-center gap-1 shrink-0 font-mono">
                  <Tag className="w-3 h-3 text-studio-accent" /> Labels:
                </span>
                {(selectedTask.labels || []).map((label) => (
                  <span
                    key={label}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.05] text-white border border-white/10 font-mono text-[10px]"
                  >
                    #{label}
                    <button
                      onClick={() => handleRemoveLabelItem(selectedTask.id, label)}
                      className="hover:text-studio-rose cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newLabelInput}
                    onChange={(e) => setNewLabelInput(e.target.value)}
                    placeholder="+ Add label"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddLabelSubmit(selectedTask.id)
                    }}
                    className="w-24 px-2 py-0.5 rounded bg-black/30 border border-white/10 text-[10px] text-white outline-none font-mono"
                  />
                  <button
                    onClick={() => handleAddLabelSubmit(selectedTask.id)}
                    className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Components */}
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/[0.03]">
                <span className="text-[10px] text-studio-muted flex items-center gap-1 shrink-0 font-mono">
                  <Layers className="w-3 h-3 text-studio-cyan" /> Components:
                </span>
                {(selectedTask.components || []).map((comp) => (
                  <span
                    key={comp}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-studio-cyan/10 text-studio-cyan border border-studio-cyan/20 font-mono text-[10px]"
                  >
                    [{comp}]
                    <button
                      onClick={() => handleRemoveComponentItem(selectedTask.id, comp)}
                      className="hover:text-studio-rose cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newComponentInput}
                    onChange={(e) => setNewComponentInput(e.target.value)}
                    placeholder="+ Add component"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComponentSubmit(selectedTask.id)
                    }}
                    className="w-28 px-2 py-0.5 rounded bg-black/30 border border-white/10 text-[10px] text-white outline-none font-mono"
                  />
                  <button
                    onClick={() => handleAddComponentSubmit(selectedTask.id)}
                    className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Blocked by Dependencies */}
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/[0.03]">
                <span className="text-[10px] text-studio-muted flex items-center gap-1 shrink-0 font-mono">
                  <AlertTriangle className="w-3 h-3 text-studio-rose" /> Blocked By:
                </span>
                {(selectedTask.blockedBy || []).map((blocker) => (
                  <span
                    key={blocker}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-studio-rose/10 text-studio-rose border border-studio-rose/20 font-mono text-[10px]"
                  >
                    {blocker}
                    <button
                      onClick={() => handleRemoveBlockerItem(selectedTask.id, blocker)}
                      className="hover:text-white cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newBlockerInput}
                    onChange={(e) => setNewBlockerInput(e.target.value)}
                    placeholder="e.g. MST-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddBlockerSubmit(selectedTask.id)
                    }}
                    className="w-24 px-2 py-0.5 rounded bg-black/30 border border-white/10 text-[10px] text-white outline-none font-mono"
                  />
                  <button
                    onClick={() => handleAddBlockerSubmit(selectedTask.id)}
                    className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Tabs: Subtasks, Code & Git, Comments, Timeline */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1 border-b border-white/[0.06] pb-1.5 text-xs">
                <button
                  onClick={() => setActiveDetailTab('details')}
                  className={`px-2.5 py-1 rounded-lg font-mono transition-colors cursor-pointer ${
                    activeDetailTab === 'details' ? 'bg-white/10 text-white font-medium' : 'text-studio-muted hover:text-white'
                  }`}
                >
                  Subtasks ({(selectedTask.subtasks || []).length})
                </button>
                <button
                  onClick={() => setActiveDetailTab('code')}
                  className={`px-2.5 py-1 rounded-lg font-mono transition-colors cursor-pointer ${
                    activeDetailTab === 'code' ? 'bg-white/10 text-white font-medium' : 'text-studio-muted hover:text-white'
                  }`}
                >
                  Code & Git ({(selectedTask.codeLinks || []).length})
                </button>
                <button
                  onClick={() => setActiveDetailTab('comments')}
                  className={`px-2.5 py-1 rounded-lg font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                    activeDetailTab === 'comments' ? 'bg-white/10 text-white font-medium' : 'text-studio-muted hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  Comments ({(selectedTask.comments || []).length})
                </button>
                <button
                  onClick={() => setActiveDetailTab('timeline')}
                  className={`px-2.5 py-1 rounded-lg font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                    activeDetailTab === 'timeline' ? 'bg-white/10 text-white font-medium' : 'text-studio-muted hover:text-white'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Timeline ({(selectedTask.activities || []).length})
                </button>
              </div>

              {/* Subtasks Tab */}
              {activeDetailTab === 'details' && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                    {(selectedTask.subtasks || []).length === 0 ? (
                      <span className="text-studio-muted text-xs italic py-1">No checklist subtasks.</span>
                    ) : (
                      (selectedTask.subtasks || []).map((subtask) => (
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
                      ))
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Add subtask / checklist item..."
                      className="flex-1 glass-pill rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-studio-accent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSubtaskSubmit(selectedTask.id)
                      }}
                    />
                    <button
                      onClick={() => handleAddSubtaskSubmit(selectedTask.id)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white font-medium cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Code & Git Tab */}
              {activeDetailTab === 'code' && (
                <div className="flex flex-col gap-2">
                  {/* Git branch link */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center gap-2 min-w-0">
                      <GitBranch className="w-4 h-4 text-studio-amber shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-white font-mono truncate">
                          feat/{selectedTask.id.toLowerCase()}-{slugify(selectedTask.title)}
                        </span>
                        <span className="text-[10px] text-studio-muted">
                          {gitStatus.branch === `feat/${selectedTask.id.toLowerCase()}-${slugify(selectedTask.title)}`
                            ? 'Currently on this branch'
                            : 'Click to checkout dedicated branch'}
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

                  {/* Code locations list */}
                  <div className="flex items-center justify-between text-xs text-studio-muted">
                    <span className="font-medium text-white flex items-center gap-1.5">
                      <FileCode2 className="w-3.5 h-3.5 text-studio-cyan" />
                      Linked Code Locations ({(selectedTask.codeLinks || []).length})
                    </span>
                    {(selectedTask.codeLinks || []).length > 1 && (
                      <div className="flex items-center gap-1 glass-pill px-2 py-0.5 rounded-lg text-[10px] font-mono">
                        <span>
                          {activeCodeLinkIdx + 1} / {selectedTask.codeLinks.length}
                        </span>
                        <button
                          onClick={() => {
                            const links = selectedTask.codeLinks || []
                            if (links.length === 0) return
                            const prev = activeCodeLinkIdx > 0 ? activeCodeLinkIdx - 1 : links.length - 1
                            setActiveCodeLinkIdx(prev)
                            handleJumpToFile(links[prev].file, links[prev].line)
                          }}
                          className="p-0.5 rounded hover:bg-white/10 text-white cursor-pointer"
                          title="Previous linked location"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            const links = selectedTask.codeLinks || []
                            if (links.length === 0) return
                            const next = activeCodeLinkIdx < links.length - 1 ? activeCodeLinkIdx + 1 : 0
                            setActiveCodeLinkIdx(next)
                            handleJumpToFile(links[next].file, links[next].line)
                          }}
                          className="p-0.5 rounded hover:bg-white/10 text-white cursor-pointer"
                          title="Next linked location"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
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
                      placeholder="Line"
                      className="w-16 glass-pill rounded-lg px-2 py-1 text-xs text-white outline-none font-mono"
                    />
                    <button
                      onClick={() => handleAddCodeLinkSubmit(selectedTask.id)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white font-medium cursor-pointer"
                    >
                      Link
                    </button>
                  </div>
                </div>
              )}

              {/* Comments Tab */}
              {activeDetailTab === 'comments' && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {(selectedTask.comments || []).length === 0 ? (
                      <span className="text-studio-muted text-xs italic py-1">No comments yet. Be the first to comment!</span>
                    ) : (
                      (selectedTask.comments || []).map((c) => (
                        <div
                          key={c.id}
                          className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex flex-col gap-1 text-xs"
                        >
                          <div className="flex items-center justify-between text-[10px] text-studio-muted font-mono">
                            <span className="text-studio-accent font-semibold">{c.author}</span>
                            <div className="flex items-center gap-2">
                              <span>{new Date(c.createdAt).toLocaleString()}</span>
                              <button
                                onClick={() => handleDeleteCommentItem(selectedTask.id, c.id)}
                                className="hover:text-studio-rose cursor-pointer"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-studio-text leading-relaxed whitespace-pre-wrap">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add comment box */}
                  <div className="flex flex-col gap-1.5 mt-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newCommentAuthor}
                        onChange={(e) => setNewCommentAuthor(e.target.value)}
                        placeholder="Your Name (e.g. Developer)"
                        className="w-40 glass-pill px-2.5 py-1 text-xs text-white outline-none font-mono"
                      />
                    </div>
                    <textarea
                      value={newCommentContent}
                      onChange={(e) => setNewCommentContent(e.target.value)}
                      placeholder="Write a comment..."
                      rows={2}
                      className="w-full glass-pill p-2 text-xs text-white outline-none resize-none font-sans"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleAddCommentSubmit(selectedTask.id)}
                        className="px-3 py-1 rounded-lg bg-studio-accent hover:bg-studio-accentHover text-studio-bg font-medium text-xs transition-colors cursor-pointer"
                      >
                        Add Comment
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Timeline Tab */}
              {activeDetailTab === 'timeline' && (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto text-xs font-mono">
                  {(selectedTask.activities || []).length === 0 ? (
                    <span className="text-studio-muted text-xs italic py-1">No activities recorded.</span>
                  ) : (
                    [...(selectedTask.activities || [])]
                      .reverse()
                      .map((act) => (
                        <div
                          key={act.id}
                          className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.015] border border-white/[0.03]"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-studio-cyan mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-studio-text text-xs block leading-snug">{act.description}</span>
                            <span className="text-[10px] text-studio-muted">
                              {new Date(act.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] mt-1">
              <button
                onClick={(e) => handleCloneTaskItem(e, selectedTask.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer font-mono"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Clone Task</span>
              </button>

              <button
                onClick={() => setSelectedTaskId(null)}
                className="px-4 py-1.5 rounded-lg text-xs bg-studio-accent text-studio-bg font-medium hover:bg-studio-accentHover cursor-pointer shadow-sm"
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
export default ProjectDeck

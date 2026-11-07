import { create } from 'zustand'
import type {
  ProjectMetadata,
  TaskItem,
  SubtaskItem,
  IssueType,
  CodeLinkItem,
  TaskComment,
  TaskActivity,
  SprintItem,
  MilestoneItem
} from '../../../preload/index.d'

function generateTaskId(existingTasks: TaskItem[]): string {
  const maxNumber = existingTasks.reduce((max, t) => {
    const match = t.id.match(/(?:mst|task)-(\d+)/i)
    if (match) {
      const num = parseInt(match[1], 10)
      return Math.max(max, num)
    }
    return max
  }, 0)
  return `MST-${maxNumber + 1}`
}

export type ProjectViewMode = 'kanban' | 'backlog' | 'roadmap' | 'dashboard'
export type SyncStatus = 'synced' | 'uncommitted' | 'conflict' | 'syncing'

interface ProjectState {
  projectData: ProjectMetadata
  activeTaskId: string | null
  activeProjectView: ProjectViewMode
  isLoading: boolean
  isDirty: boolean
  syncStatus: SyncStatus
  conflictData: ProjectMetadata | null
  lastSavedTimestamp: number
  filterPriority: 'all' | TaskItem['priority']
  filterType: 'all' | IssueType
  sortBy: 'updated' | 'priority' | 'title'

  setActiveProjectView: (view: ProjectViewMode) => void
  setFilterPriority: (priority: 'all' | TaskItem['priority']) => void
  setFilterType: (type: 'all' | IssueType) => void
  setSortBy: (sort: 'updated' | 'priority' | 'title') => void
  setProjectData: (data: ProjectMetadata) => void
  setConflict: (diskData: ProjectMetadata) => void
  resolveConflict: (workspacePath: string, strategy: 'local' | 'repository' | 'merge') => Promise<void>
  syncWithRepository: (workspacePath: string) => Promise<void>
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  cloneTask: (taskId: string) => void
  updateTaskStatus: (taskId: string, status: TaskItem['status']) => void
  updateTask: (taskId: string, updates: Partial<TaskItem>) => void
  addCodeLink: (taskId: string, link: CodeLinkItem) => void
  removeCodeLink: (taskId: string, linkIndex: number) => void
  addSubtask: (taskId: string, title: string) => void
  toggleSubtask: (taskId: string, subtaskId: string) => void
  addComment: (taskId: string, author: string, content: string) => void
  deleteComment: (taskId: string, commentId: string) => void
  addLabel: (taskId: string, label: string) => void
  removeLabel: (taskId: string, label: string) => void
  addComponent: (taskId: string, component: string) => void
  removeComponent: (taskId: string, component: string) => void
  addBlocker: (taskId: string, blockerId: string) => void
  removeBlocker: (taskId: string, blockerId: string) => void

  // Sprint Management
  addSprint: (sprint: Omit<SprintItem, 'id'>) => void
  updateSprint: (sprintId: string, updates: Partial<SprintItem>) => void
  startSprint: (sprintId: string) => void
  completeSprint: (sprintId: string) => void
  deleteSprint: (sprintId: string) => void
  assignTaskToSprint: (taskId: string, sprintId?: string) => void

  // Milestone & Roadmap Management
  addMilestone: (milestone: Omit<MilestoneItem, 'id'>) => void
  updateMilestone: (milestoneId: string, updates: Partial<MilestoneItem>) => void
  deleteMilestone: (milestoneId: string) => void
  assignTaskToMilestone: (taskId: string, milestoneId?: string) => void

  deleteTask: (taskId: string) => void
  setActiveTask: (taskId: string | null) => void
  saveToDisk: (workspacePath: string) => Promise<void>
  createBackup: (workspacePath: string) => Promise<string>
  listBackups: (workspacePath: string) => Promise<{ filename: string; timestamp: number; size: number }[]>
  restoreBackup: (workspacePath: string, backupFileName: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectData: {
    name: 'Untitled Project',
    tasks: [],
    sprints: [],
    milestones: []
  },
  activeTaskId: null,
  activeProjectView: 'kanban',
  isLoading: false,
  isDirty: false,
  syncStatus: 'synced',
  conflictData: null,
  lastSavedTimestamp: Date.now(),
  filterPriority: 'all',
  filterType: 'all',
  sortBy: 'updated',

  setActiveProjectView: (activeProjectView) => set({ activeProjectView }),
  setFilterPriority: (filterPriority) => set({ filterPriority }),
  setFilterType: (filterType) => set({ filterType }),
  setSortBy: (sortBy) => set({ sortBy }),
  setProjectData: (data) =>
    set({
      projectData: data,
      isDirty: false,
      syncStatus: 'synced',
      conflictData: null,
      lastSavedTimestamp: Date.now()
    }),

  addTask: (taskData) => {
    const { projectData } = get()
    const newId = generateTaskId(projectData.tasks)
    const now = Date.now()
    const newTask: TaskItem = {
      ...taskData,
      id: newId,
      type: taskData.type || 'task',
      labels: taskData.labels || [],
      components: taskData.components || [],
      subtasks: taskData.subtasks || [],
      comments: taskData.comments || [],
      activities: [
        {
          id: `act-${now}`,
          type: 'created',
          description: `Task ${newId} created (${taskData.title})`,
          timestamp: now
        }
      ],
      codeLinks:
        taskData.codeLinks ||
        (taskData.linkedFile ? [{ file: taskData.linkedFile, line: taskData.linkedLine }] : []),
      createdAt: now,
      updatedAt: now
    }
    set({
      projectData: {
        ...projectData,
        tasks: [...projectData.tasks, newTask]
      }
    })
  },

  cloneTask: (taskId: string) => {
    const { projectData } = get()
    const target = projectData.tasks.find((t) => t.id === taskId)
    if (!target) return
    const newId = generateTaskId(projectData.tasks)
    const now = Date.now()
    const cloned: TaskItem = {
      ...target,
      id: newId,
      title: `${target.title} (Copy)`,
      subtasks: (target.subtasks || []).map((s, idx) => ({ ...s, id: `sub-${now}-${idx}` })),
      comments: [],
      activities: [
        {
          id: `act-${now}`,
          type: 'created',
          description: `Cloned from ${target.id}`,
          timestamp: now
        }
      ],
      createdAt: now,
      updatedAt: now
    }
    set({
      projectData: {
        ...projectData,
        tasks: [...projectData.tasks, cloned]
      }
    })
  },

  updateTaskStatus: (taskId, status) => {
    const { projectData } = get()
    const now = Date.now()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const oldStatus = t.status
          const activities = [
            ...(t.activities || []),
            {
              id: `act-${now}`,
              type: 'status_changed' as const,
              description: `Status changed from ${oldStatus.toUpperCase()} to ${status.toUpperCase()}`,
              timestamp: now
            }
          ]
          return { ...t, status, activities, updatedAt: now }
        })
      }
    })
  },

  updateTask: (taskId, updates) => {
    const { projectData } = get()
    const now = Date.now()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const activities = [...(t.activities || [])]
          if (updates.priority && updates.priority !== t.priority) {
            activities.push({
              id: `act-${now}`,
              type: 'priority_changed',
              description: `Priority changed from ${t.priority} to ${updates.priority}`,
              timestamp: now
            })
          }
          return { ...t, ...updates, activities, updatedAt: now }
        })
      }
    })
  },

  addCodeLink: (taskId, link) => {
    const { projectData } = get()
    const now = Date.now()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const existingLinks = t.codeLinks || []
          return {
            ...t,
            codeLinks: [...existingLinks, link],
            updatedAt: now
          }
        })
      }
    })
  },

  removeCodeLink: (taskId, linkIndex) => {
    const { projectData } = get()
    const now = Date.now()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const existingLinks = t.codeLinks || []
          return {
            ...t,
            codeLinks: existingLinks.filter((_, idx) => idx !== linkIndex),
            updatedAt: now
          }
        })
      }
    })
  },

  addSubtask: (taskId, title) => {
    const { projectData } = get()
    const now = Date.now()
    const newSubtask: SubtaskItem = {
      id: `sub-${now}`,
      title,
      completed: false
    }
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: [...(t.subtasks || []), newSubtask], updatedAt: now }
            : t
        )
      }
    })
  },

  toggleSubtask: (taskId, subtaskId) => {
    const { projectData } = get()
    const now = Date.now()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const subtasks = (t.subtasks || []).map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          )
          return { ...t, subtasks, updatedAt: now }
        })
      }
    })
  },

  addComment: (taskId, author, content) => {
    const { projectData } = get()
    const now = Date.now()
    const newComment: TaskComment = {
      id: `comment-${now}`,
      author: author.trim() || 'Developer',
      content: content.trim(),
      createdAt: now
    }
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const comments = [...(t.comments || []), newComment]
          const activities = [
            ...(t.activities || []),
            {
              id: `act-${now}`,
              type: 'comment_added' as const,
              description: `Added comment: "${content.slice(0, 30)}${content.length > 30 ? '...' : ''}"`,
              timestamp: now
            }
          ]
          return { ...t, comments, activities, updatedAt: now }
        })
      }
    })
  },

  deleteComment: (taskId, commentId) => {
    const { projectData } = get()
    const now = Date.now()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const comments = (t.comments || []).filter((c) => c.id !== commentId)
          return { ...t, comments, updatedAt: now }
        })
      }
    })
  },

  addLabel: (taskId, label) => {
    const { projectData } = get()
    const clean = label.trim().toLowerCase()
    if (!clean) return
    const now = Date.now()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const labels = t.labels || []
          if (labels.includes(clean)) return t
          return { ...t, labels: [...labels, clean], updatedAt: now }
        })
      }
    })
  },

  removeLabel: (taskId, label) => {
    const { projectData } = get()
    const now = Date.now()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const labels = (t.labels || []).filter((l) => l !== label)
          return { ...t, labels, updatedAt: now }
        })
      }
    })
  },

  addComponent: (taskId, component) => {
    const { projectData } = get()
    const clean = component.trim()
    if (!clean) return
    const now = Date.now()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const components = t.components || []
          if (components.includes(clean)) return t
          return { ...t, components: [...components, clean], updatedAt: now }
        })
      }
    })
  },

  removeComponent: (taskId, component) => {
    const { projectData } = get()
    const now = Date.now()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const components = (t.components || []).filter((c) => c !== component)
          return { ...t, components, updatedAt: now }
        })
      }
    })
  },

  addBlocker: (taskId, blockerId) => {
    const { projectData } = get()
    const clean = blockerId.trim().toUpperCase()
    if (!clean || clean === taskId) return
    const now = Date.now()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const blockedBy = t.blockedBy || []
          if (blockedBy.includes(clean)) return t
          return { ...t, blockedBy: [...blockedBy, clean], updatedAt: now }
        })
      }
    })
  },

  removeBlocker: (taskId, blockerId) => {
    const { projectData } = get()
    const now = Date.now()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const blockedBy = (t.blockedBy || []).filter((b) => b !== blockerId)
          return { ...t, blockedBy, updatedAt: now }
        })
      }
    })
  },

  // Sprint Management
  addSprint: (sprintData) => {
    const { projectData } = get()
    const newSprint: SprintItem = {
      ...sprintData,
      id: `SPRINT-${(projectData.sprints || []).length + 1}`
    }
    set({
      projectData: {
        ...projectData,
        sprints: [...(projectData.sprints || []), newSprint]
      }
    })
  },

  updateSprint: (sprintId, updates) => {
    const { projectData } = get()
    set({
      projectData: {
        ...projectData,
        sprints: (projectData.sprints || []).map((s) =>
          s.id === sprintId ? { ...s, ...updates } : s
        )
      }
    })
  },

  startSprint: (sprintId) => {
    const { projectData } = get()
    set({
      projectData: {
        ...projectData,
        sprints: (projectData.sprints || []).map((s) => ({
          ...s,
          status: s.id === sprintId ? 'active' : s.status === 'active' ? 'planned' : s.status
        }))
      }
    })
  },

  completeSprint: (sprintId) => {
    const { projectData } = get()
    set({
      projectData: {
        ...projectData,
        sprints: (projectData.sprints || []).map((s) =>
          s.id === sprintId ? { ...s, status: 'completed' } : s
        )
      }
    })
  },

  deleteSprint: (sprintId) => {
    const { projectData } = get()
    set({
      projectData: {
        ...projectData,
        sprints: (projectData.sprints || []).filter((s) => s.id !== sprintId),
        tasks: projectData.tasks.map((t) =>
          t.sprintId === sprintId ? { ...t, sprintId: undefined } : t
        )
      }
    })
  },

  assignTaskToSprint: (taskId, sprintId) => {
    const { projectData } = get()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) =>
          t.id === taskId ? { ...t, sprintId, updatedAt: Date.now() } : t
        )
      }
    })
  },

  // Milestone & Roadmap Management
  addMilestone: (milestoneData) => {
    const { projectData } = get()
    const newMilestone: MilestoneItem = {
      ...milestoneData,
      id: `MILESTONE-${(projectData.milestones || []).length + 1}`
    }
    set({
      projectData: {
        ...projectData,
        milestones: [...(projectData.milestones || []), newMilestone]
      }
    })
  },

  updateMilestone: (milestoneId, updates) => {
    const { projectData } = get()
    set({
      projectData: {
        ...projectData,
        milestones: (projectData.milestones || []).map((m) =>
          m.id === milestoneId ? { ...m, ...updates } : m
        )
      }
    })
  },

  deleteMilestone: (milestoneId) => {
    const { projectData } = get()
    set({
      projectData: {
        ...projectData,
        milestones: (projectData.milestones || []).filter((m) => m.id !== milestoneId),
        tasks: projectData.tasks.map((t) =>
          t.milestoneId === milestoneId ? { ...t, milestoneId: undefined } : t
        )
      }
    })
  },

  assignTaskToMilestone: (taskId, milestoneId) => {
    const { projectData } = get()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) =>
          t.id === taskId ? { ...t, milestoneId, updatedAt: Date.now() } : t
        )
      }
    })
  },

  deleteTask: (taskId) => {
    const { projectData, activeTaskId } = get()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.filter((t) => t.id !== taskId)
      },
      activeTaskId: activeTaskId === taskId ? null : activeTaskId
    })
  },

  setActiveTask: (taskId) => set({ activeTaskId: taskId }),

  saveToDisk: async (workspacePath: string) => {
    const { projectData } = get()
    if (!workspacePath) return
    try {
      await window.maestroAPI.saveProjectData(workspacePath, projectData)
      set({ isDirty: false, syncStatus: 'synced', lastSavedTimestamp: Date.now() })
    } catch (err) {
      console.error('Failed to save project data:', err)
      set({ syncStatus: 'uncommitted' })
    }
  },

  setConflict: (diskData) => set({ conflictData: diskData, syncStatus: 'conflict' }),

  resolveConflict: async (workspacePath: string, strategy: 'local' | 'repository' | 'merge') => {
    const { projectData, conflictData } = get()
    if (!conflictData) {
      set({ syncStatus: 'synced' })
      return
    }

    if (strategy === 'repository') {
      set({
        projectData: conflictData,
        conflictData: null,
        isDirty: false,
        syncStatus: 'synced',
        lastSavedTimestamp: Date.now()
      })
      return
    }

    if (strategy === 'local') {
      await get().saveToDisk(workspacePath)
      set({
        conflictData: null,
        isDirty: false,
        syncStatus: 'synced'
      })
      return
    }

    if (strategy === 'merge') {
      // 3-way smart merge
      const mergedTasksMap = new Map<string, TaskItem>()

      // Add local tasks
      for (const t of projectData.tasks) {
        mergedTasksMap.set(t.id, t)
      }

      // Merge repository tasks
      for (const repTask of conflictData.tasks) {
        const local = mergedTasksMap.get(repTask.id)
        if (!local) {
          mergedTasksMap.set(repTask.id, repTask)
        } else {
          // Take the more recently updated task
          if ((repTask.updatedAt || 0) > (local.updatedAt || 0)) {
            mergedTasksMap.set(repTask.id, repTask)
          }
        }
      }

      // Merge sprints
      const sprintMap = new Map<string, SprintItem>()
      for (const s of projectData.sprints || []) sprintMap.set(s.id, s)
      for (const s of conflictData.sprints || []) {
        if (!sprintMap.has(s.id)) sprintMap.set(s.id, s)
      }

      // Merge milestones
      const milestoneMap = new Map<string, MilestoneItem>()
      for (const m of projectData.milestones || []) milestoneMap.set(m.id, m)
      for (const m of conflictData.milestones || []) {
        if (!milestoneMap.has(m.id)) milestoneMap.set(m.id, m)
      }

      const mergedData: ProjectMetadata = {
        name: projectData.name || conflictData.name,
        description: projectData.description || conflictData.description,
        schemaVersion: projectData.schemaVersion || conflictData.schemaVersion || 1,
        tasks: Array.from(mergedTasksMap.values()),
        sprints: Array.from(sprintMap.values()),
        milestones: Array.from(milestoneMap.values())
      }

      set({
        projectData: mergedData,
        conflictData: null,
        isDirty: false,
        syncStatus: 'synced',
        lastSavedTimestamp: Date.now()
      })

      if (workspacePath) {
        await window.maestroAPI.saveProjectData(workspacePath, mergedData)
      }
    }
  },

  syncWithRepository: async (workspacePath: string) => {
    if (!workspacePath) return
    set({ syncStatus: 'syncing' })
    try {
      const diskData = await window.maestroAPI.loadProjectData(workspacePath)
      const { isDirty } = get()
      if (isDirty) {
        set({ conflictData: diskData, syncStatus: 'conflict' })
      } else {
        set({ projectData: diskData, syncStatus: 'synced', isDirty: false, lastSavedTimestamp: Date.now() })
      }
    } catch (err) {
      console.error('Failed to sync project:', err)
      set({ syncStatus: 'uncommitted' })
    }
  },

  createBackup: async (workspacePath: string) => {
    if (!workspacePath) return ''
    try {
      return await window.maestroAPI.createProjectBackup(workspacePath)
    } catch (err) {
      console.error('Failed to create project backup:', err)
      return ''
    }
  },

  listBackups: async (workspacePath: string) => {
    if (!workspacePath) return []
    try {
      return await window.maestroAPI.listProjectBackups(workspacePath)
    } catch (err) {
      console.error('Failed to list project backups:', err)
      return []
    }
  },

  restoreBackup: async (workspacePath: string, backupFileName: string) => {
    if (!workspacePath) return
    try {
      const restored = await window.maestroAPI.restoreProjectBackup(workspacePath, backupFileName)
      set({ projectData: restored })
    } catch (err) {
      console.error('Failed to restore project backup:', err)
    }
  }
}))

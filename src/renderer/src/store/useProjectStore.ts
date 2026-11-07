import { create } from 'zustand'
import type {
  ProjectMetadata,
  TaskItem,
  SubtaskItem,
  IssueType,
  CodeLinkItem,
  TaskComment,
  TaskActivity
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

interface ProjectState {
  projectData: ProjectMetadata
  activeTaskId: string | null
  isLoading: boolean
  filterPriority: 'all' | TaskItem['priority']
  filterType: 'all' | IssueType
  sortBy: 'updated' | 'priority' | 'title'

  setFilterPriority: (priority: 'all' | TaskItem['priority']) => void
  setFilterType: (type: 'all' | IssueType) => void
  setSortBy: (sort: 'updated' | 'priority' | 'title') => void
  setProjectData: (data: ProjectMetadata) => void
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
  deleteTask: (taskId: string) => void
  setActiveTask: (taskId: string | null) => void
  saveToDisk: (workspacePath: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectData: {
    name: 'Untitled Project',
    tasks: []
  },
  activeTaskId: null,
  isLoading: false,
  filterPriority: 'all',
  filterType: 'all',
  sortBy: 'updated',

  setFilterPriority: (filterPriority) => set({ filterPriority }),
  setFilterType: (filterType) => set({ filterType }),
  setSortBy: (sortBy) => set({ sortBy }),
  setProjectData: (data) => set({ projectData: data }),

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
              description: `Added a comment: "${content.slice(0, 30)}${content.length > 30 ? '...' : ''}"`,
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
    } catch (err) {
      console.error('Failed to save project data:', err)
    }
  }
}))

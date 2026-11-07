import { create } from 'zustand'
import type { ProjectMetadata, TaskItem, SubtaskItem, IssueType, CodeLinkItem } from '../../../preload/index.d'

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
    const newTask: TaskItem = {
      ...taskData,
      id: newId,
      type: taskData.type || 'task',
      subtasks: taskData.subtasks || [],
      codeLinks: taskData.codeLinks || (taskData.linkedFile ? [{ file: taskData.linkedFile, line: taskData.linkedLine }] : []),
      createdAt: Date.now(),
      updatedAt: Date.now()
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
    const cloned: TaskItem = {
      ...target,
      id: newId,
      title: `${target.title} (Copy)`,
      subtasks: (target.subtasks || []).map((s, idx) => ({ ...s, id: `sub-${Date.now()}-${idx}` })),
      createdAt: Date.now(),
      updatedAt: Date.now()
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
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) =>
          t.id === taskId ? { ...t, status, updatedAt: Date.now() } : t
        )
      }
    })
  },

  updateTask: (taskId, updates) => {
    const { projectData } = get()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: Date.now() } : t
        )
      }
    })
  },

  addCodeLink: (taskId, link) => {
    const { projectData } = get()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const existingLinks = t.codeLinks || []
          return {
            ...t,
            codeLinks: [...existingLinks, link],
            updatedAt: Date.now()
          }
        })
      }
    })
  },

  removeCodeLink: (taskId, linkIndex) => {
    const { projectData } = get()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const existingLinks = t.codeLinks || []
          return {
            ...t,
            codeLinks: existingLinks.filter((_, idx) => idx !== linkIndex),
            updatedAt: Date.now()
          }
        })
      }
    })
  },

  addSubtask: (taskId, title) => {
    const { projectData } = get()
    const newSubtask: SubtaskItem = {
      id: `sub-${Date.now()}`,
      title,
      completed: false
    }
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: [...(t.subtasks || []), newSubtask], updatedAt: Date.now() }
            : t
        )
      }
    })
  },

  toggleSubtask: (taskId, subtaskId) => {
    const { projectData } = get()
    set({
      projectData: {
        ...projectData,
        tasks: projectData.tasks.map((t) => {
          if (t.id !== taskId) return t
          const subtasks = (t.subtasks || []).map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          )
          return { ...t, subtasks, updatedAt: Date.now() }
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

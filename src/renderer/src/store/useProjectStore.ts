import { create } from 'zustand'
import type { ProjectMetadata, TaskItem, SubtaskItem } from '../../../preload/index.d'

interface ProjectState {
  projectData: ProjectMetadata
  activeTaskId: string | null
  isLoading: boolean

  setProjectData: (data: ProjectMetadata) => void
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTaskStatus: (taskId: string, status: TaskItem['status']) => void
  updateTask: (taskId: string, updates: Partial<TaskItem>) => void
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

  setProjectData: (data) => set({ projectData: data }),

  addTask: (taskData) => {
    const { projectData } = get()
    const newTask: TaskItem = {
      ...taskData,
      id: `task-${Date.now()}`,
      subtasks: taskData.subtasks || [],
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

import { create } from 'zustand'
import type {
  MaestroExtension,
  ExtensionCommandContribution
} from '../../../preload/index.d'
import { useEditorStore } from './useEditorStore'

interface ExtensionState {
  extensions: MaestroExtension[]
  contributedCommands: Array<{ command: string; title: string; category?: string; extensionId: string }>
  recommendations: string[]
  activeTab: 'installed' | 'recommended' | 'featured'
  searchQuery: string
  selectedExtension: MaestroExtension | null
  isLoading: boolean

  // Actions
  loadExtensions: (workspacePath?: string) => Promise<void>
  loadRecommendations: (workspacePath?: string) => Promise<void>
  toggleExtension: (id: string, enabled: boolean) => Promise<boolean>
  installLocalExtension: (folderPath: string) => Promise<boolean>
  uninstallExtension: (id: string) => Promise<boolean>
  executeCommand: (commandId: string) => Promise<void>
  setActiveTab: (tab: 'installed' | 'recommended' | 'featured') => void
  setSearchQuery: (query: string) => void
  selectExtension: (ext: MaestroExtension | null) => void
  initExtensionEventListener: () => () => void
}

export const useExtensionStore = create<ExtensionState>((set, get) => ({
  extensions: [],
  contributedCommands: [],
  recommendations: [],
  activeTab: 'installed',
  searchQuery: '',
  selectedExtension: null,
  isLoading: false,

  loadExtensions: async (workspacePath?: string) => {
    if (!window.maestroAPI) return
    set({ isLoading: true })
    try {
      const list = await window.maestroAPI.extensionLoad(workspacePath)
      const commands = await window.maestroAPI.extensionGetCommands()
      set({ extensions: list, contributedCommands: commands, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  loadRecommendations: async (workspacePath?: string) => {
    if (!workspacePath || !window.maestroAPI) return
    try {
      const res = await window.maestroAPI.loadExtensionRecommendations(workspacePath)
      if (res && res.recommendations) {
        set({ recommendations: res.recommendations })
      }
    } catch {
      // Ignore
    }
  },

  toggleExtension: async (id: string, enabled: boolean) => {
    if (!window.maestroAPI) return false
    const ok = await window.maestroAPI.extensionToggle(id, enabled)
    if (ok) {
      set((state) => ({
        extensions: state.extensions.map((e) =>
          e.id === id ? { ...e, isEnabled: enabled, state: enabled ? 'activated' : 'unactivated' } : e
        )
      }))
      const commands = await window.maestroAPI.extensionGetCommands()
      set({ contributedCommands: commands })
      useEditorStore.getState().setStatusMessage(`Extension ${id} ${enabled ? 'enabled' : 'disabled'}`)
      return true
    }
    return false
  },

  installLocalExtension: async (folderPath: string) => {
    if (!window.maestroAPI) return false
    const res = await window.maestroAPI.extensionInstall(folderPath)
    if (res.ok && res.extension) {
      set((state) => ({
        extensions: [...state.extensions.filter((e) => e.id !== res.extension!.id), res.extension!]
      }))
      const commands = await window.maestroAPI.extensionGetCommands()
      set({ contributedCommands: commands })
      useEditorStore.getState().setStatusMessage(`Installed extension: ${res.extension.displayName}`)
      return true
    } else {
      useEditorStore.getState().setStatusMessage(`Extension install failed: ${res.message || 'Error'}`)
      return false
    }
  },

  uninstallExtension: async (id: string) => {
    if (!window.maestroAPI) return false
    const ok = await window.maestroAPI.extensionUninstall(id)
    if (ok) {
      set((state) => ({
        extensions: state.extensions.filter((e) => e.id !== id),
        selectedExtension: state.selectedExtension?.id === id ? null : state.selectedExtension
      }))
      const commands = await window.maestroAPI.extensionGetCommands()
      set({ contributedCommands: commands })
      useEditorStore.getState().setStatusMessage(`Uninstalled extension: ${id}`)
      return true
    }
    return false
  },

  executeCommand: async (commandId: string) => {
    if (!window.maestroAPI) return
    const res = await window.maestroAPI.extensionExecuteCommand(commandId)
    if (res.ok) {
      useEditorStore.getState().setStatusMessage(res.result || 'Command executed')
    } else {
      useEditorStore.getState().setStatusMessage(`Error: ${res.message}`)
    }
    setTimeout(() => useEditorStore.getState().setStatusMessage('Ready'), 3000)
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectExtension: (ext) => set({ selectedExtension: ext }),

  initExtensionEventListener: () => {
    if (!window.maestroAPI) return () => {}

    const unsub = window.maestroAPI.onExtensionEvent(({ event, payload }) => {
      if (event === 'extension:installed' && payload.extension) {
        set((state) => ({
          extensions: [
            ...state.extensions.filter((e) => e.id !== payload.extension.id),
            payload.extension
          ]
        }))
      } else if (event === 'extension:uninstalled' && payload.extensionId) {
        set((state) => ({
          extensions: state.extensions.filter((e) => e.id !== payload.extensionId)
        }))
      }
    })

    return unsub
  }
}))

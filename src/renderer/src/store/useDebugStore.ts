import { create } from 'zustand'
import type {
  LaunchConfiguration,
  DapBreakpoint,
  DapStackFrame,
  DapThread,
  DapScope,
  DapVariable
} from '../../../preload/index.d'
import { useEditorStore } from './useEditorStore'

export interface WatchExpression {
  id: string
  expression: string
  result?: string
  type?: string
  error?: boolean
}

export interface ConsoleOutputItem {
  id: string
  category: 'console' | 'stdout' | 'stderr' | 'result' | 'input'
  text: string
  timestamp: number
}

interface DebugState {
  configurations: LaunchConfiguration[]
  selectedConfigIndex: number
  activeSessionId: string | null
  status: 'idle' | 'running' | 'stopped' | 'terminated'
  stopReason: string | null
  currentFrame: DapStackFrame | null
  stackFrames: DapStackFrame[]
  threads: DapThread[]
  scopes: DapScope[]
  variables: Record<number, DapVariable[]>
  breakpoints: DapBreakpoint[]
  watchExpressions: WatchExpression[]
  consoleOutputs: ConsoleOutputItem[]

  // Actions
  loadConfigurations: (workspacePath: string) => Promise<void>
  setSelectedConfigIndex: (index: number) => void
  startDebugging: (customConfig?: LaunchConfiguration) => Promise<boolean>
  stopDebugging: () => Promise<boolean>
  restartDebugging: () => Promise<boolean>
  pauseDebugging: () => Promise<boolean>
  continueDebugging: () => Promise<boolean>
  stepOver: () => Promise<boolean>
  stepInto: () => Promise<boolean>
  stepOut: () => Promise<boolean>
  toggleBreakpoint: (filePath: string, line: number) => Promise<void>
  updateBreakpoint: (id: string, updates: Partial<DapBreakpoint>) => Promise<void>
  toggleBreakpointEnabled: (id: string) => void
  removeBreakpoint: (id: string) => void
  removeAllBreakpoints: () => void
  addWatchExpression: (expression: string) => Promise<void>
  removeWatchExpression: (id: string) => void
  evaluateWatchExpressions: () => Promise<void>
  sendConsoleInput: (text: string) => Promise<void>
  clearConsole: () => void
  selectStackFrame: (frame: DapStackFrame) => Promise<void>
  initDapEventListener: () => () => void
}

export const useDebugStore = create<DebugState>((set, get) => ({
  configurations: [],
  selectedConfigIndex: 0,
  activeSessionId: null,
  status: 'idle',
  stopReason: null,
  currentFrame: null,
  stackFrames: [],
  threads: [],
  scopes: [],
  variables: {},
  breakpoints: [],
  watchExpressions: [],
  consoleOutputs: [
    {
      id: 'init',
      category: 'console',
      text: 'Debug console initialized. Use F5 to launch, F9 to toggle breakpoints.\n',
      timestamp: Date.now()
    }
  ],

  loadConfigurations: async (workspacePath: string) => {
    if (!window.maestroAPI) return
    try {
      const result = await window.maestroAPI.loadLaunchConfig(workspacePath)
      if (result && result.configurations.length > 0) {
        set({ configurations: result.configurations, selectedConfigIndex: 0 })
      } else {
        // Fallback default launch configuration
        const defaults: LaunchConfiguration[] = [
          {
            name: 'Launch Active File (Node.js)',
            type: 'node',
            request: 'launch',
            program: '${file}',
            stopOnEntry: false
          },
          {
            name: 'Run Project Main (index.js)',
            type: 'node',
            request: 'launch',
            program: '${workspaceFolder}/index.js',
            stopOnEntry: true
          }
        ]
        set({ configurations: defaults, selectedConfigIndex: 0 })
      }
    } catch {
      // Ignore
    }
  },

  setSelectedConfigIndex: (index: number) => {
    set({ selectedConfigIndex: index })
  },

  startDebugging: async (customConfig?: LaunchConfiguration) => {
    const { configurations, selectedConfigIndex, activeSessionId, breakpoints } = get()
    const workspacePath = useEditorStore.getState().workspacePath
    const activeFile = useEditorStore.getState().activeFilePath

    if (!workspacePath || !window.maestroAPI) return false

    // If already debugging and stopped, continue instead
    if (activeSessionId && get().status === 'stopped') {
      return get().continueDebugging()
    }

    const configToRun =
      customConfig ||
      configurations[selectedConfigIndex] || {
        name: 'Launch Active File',
        type: 'node',
        request: 'launch',
        program: activeFile || '${workspaceFolder}/index.js'
      }

    // Replace ${file} with active file if applicable
    const resolvedConfig: LaunchConfiguration = { ...configToRun }
    if (resolvedConfig.program && resolvedConfig.program.includes('${file}')) {
      resolvedConfig.program = activeFile || `${workspacePath}/index.js`
    }

    // Sync all breakpoints for the target file before launching
    if (activeFile) {
      const activeBps = breakpoints.filter((b) => b.filePath === activeFile)
      await window.maestroAPI.dapSetBreakpoints(
        activeFile,
        activeBps.map((b) => ({ line: b.line }))
      )
    }

    set({
      status: 'running',
      stopReason: null,
      currentFrame: null,
      stackFrames: [],
      scopes: [],
      variables: {}
    })

    const res = await window.maestroAPI.dapStartSession(workspacePath, resolvedConfig)
    if (res.ok && res.sessionId) {
      set((state) => ({
        activeSessionId: res.sessionId,
        consoleOutputs: [
          ...state.consoleOutputs,
          {
            id: `start-${Date.now()}`,
            category: 'console',
            text: `[Debug session started: ${resolvedConfig.name}]\n`,
            timestamp: Date.now()
          }
        ]
      }))
      useEditorStore.getState().setStatusMessage(`Debugging: ${resolvedConfig.name}`)
      return true
    } else {
      set((state) => ({
        status: 'idle',
        activeSessionId: null,
        consoleOutputs: [
          ...state.consoleOutputs,
          {
            id: `err-${Date.now()}`,
            category: 'stderr',
            text: `Failed to launch debugger: ${res.message || 'Unknown error'}\n`,
            timestamp: Date.now()
          }
        ]
      }))
      return false
    }
  },

  stopDebugging: async () => {
    const { activeSessionId } = get()
    if (!activeSessionId || !window.maestroAPI) return false

    await window.maestroAPI.dapStopSession(activeSessionId)
    set((state) => ({
      status: 'idle',
      activeSessionId: null,
      stopReason: null,
      currentFrame: null,
      stackFrames: [],
      scopes: [],
      variables: {},
      consoleOutputs: [
        ...state.consoleOutputs,
        {
          id: `stop-${Date.now()}`,
          category: 'console',
          text: `[Debug session stopped]\n`,
          timestamp: Date.now()
        }
      ]
    }))
    useEditorStore.getState().setStatusMessage('Debug session stopped')
    return true
  },

  restartDebugging: async () => {
    const { activeSessionId } = get()
    if (!activeSessionId || !window.maestroAPI) {
      return get().startDebugging()
    }

    set({ status: 'running', currentFrame: null })
    await window.maestroAPI.dapRestartSession(activeSessionId)
    return true
  },

  pauseDebugging: async () => {
    const { activeSessionId } = get()
    if (!activeSessionId || !window.maestroAPI) return false

    await window.maestroAPI.dapPause(activeSessionId)
    return true
  },

  continueDebugging: async () => {
    const { activeSessionId } = get()
    if (!activeSessionId || !window.maestroAPI) return false

    set({ status: 'running', currentFrame: null })
    await window.maestroAPI.dapContinue(activeSessionId)
    return true
  },

  stepOver: async () => {
    const { activeSessionId } = get()
    if (!activeSessionId || !window.maestroAPI) return false

    await window.maestroAPI.dapNext(activeSessionId)
    return true
  },

  stepInto: async () => {
    const { activeSessionId } = get()
    if (!activeSessionId || !window.maestroAPI) return false

    await window.maestroAPI.dapStepIn(activeSessionId)
    return true
  },

  stepOut: async () => {
    const { activeSessionId } = get()
    if (!activeSessionId || !window.maestroAPI) return false

    await window.maestroAPI.dapStepOut(activeSessionId)
    return true
  },

  toggleBreakpoint: async (filePath: string, line: number) => {
    const { breakpoints } = get()
    const existingIndex = breakpoints.findIndex(
      (b) => b.filePath === filePath && b.line === line
    )

    let updated: DapBreakpoint[]
    if (existingIndex >= 0) {
      updated = breakpoints.filter((_, idx) => idx !== existingIndex)
    } else {
      const newBp: DapBreakpoint = {
        id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        verified: true,
        filePath,
        line
      }
      updated = [...breakpoints, newBp]
    }

    set({ breakpoints: updated })

    // Send updated breakpoints to main process
    if (window.maestroAPI) {
      const fileBps = updated.filter((b) => b.filePath === filePath)
      await window.maestroAPI.dapSetBreakpoints(
        filePath,
        fileBps.map((b) => ({
          line: b.line,
          condition: b.condition,
          hitCondition: b.hitCondition,
          logMessage: b.logMessage
        }))
      )
    }
  },

  updateBreakpoint: async (id: string, updates: Partial<DapBreakpoint>) => {
    const { breakpoints } = get()
    const target = breakpoints.find((b) => b.id === id)
    if (!target) return

    const updated = breakpoints.map((b) => (b.id === id ? { ...b, ...updates } : b))
    set({ breakpoints: updated })

    if (window.maestroAPI) {
      const fileBps = updated.filter((b) => b.filePath === target.filePath)
      await window.maestroAPI.dapSetBreakpoints(
        target.filePath,
        fileBps.map((b) => ({
          line: b.line,
          condition: b.condition,
          hitCondition: b.hitCondition,
          logMessage: b.logMessage
        }))
      )
    }
  },

  toggleBreakpointEnabled: (id: string) => {
    set((state) => ({
      breakpoints: state.breakpoints.map((b) =>
        b.id === id ? { ...b, verified: !b.verified } : b
      )
    }))
  },

  removeBreakpoint: (id: string) => {
    set((state) => ({
      breakpoints: state.breakpoints.filter((b) => b.id !== id)
    }))
  },

  removeAllBreakpoints: () => {
    set({ breakpoints: [] })
  },

  addWatchExpression: async (expression: string) => {
    if (!expression.trim()) return
    const id = `watch-${Date.now()}`
    const item: WatchExpression = { id, expression: expression.trim() }

    set((state) => ({
      watchExpressions: [...state.watchExpressions, item]
    }))

    // Evaluate immediately
    const { activeSessionId } = get()
    if (activeSessionId && window.maestroAPI) {
      const evalRes = await window.maestroAPI.dapEvaluate(activeSessionId, item.expression)
      set((state) => ({
        watchExpressions: state.watchExpressions.map((w) =>
          w.id === id ? { ...w, result: evalRes.result, type: evalRes.type } : w
        )
      }))
    }
  },

  removeWatchExpression: (id: string) => {
    set((state) => ({
      watchExpressions: state.watchExpressions.filter((w) => w.id !== id)
    }))
  },

  evaluateWatchExpressions: async () => {
    const { activeSessionId, watchExpressions } = get()
    if (!activeSessionId || !window.maestroAPI) return

    const updated = await Promise.all(
      watchExpressions.map(async (w) => {
        try {
          const evalRes = await window.maestroAPI.dapEvaluate(activeSessionId, w.expression)
          return { ...w, result: evalRes.result, type: evalRes.type, error: evalRes.type === 'error' }
        } catch {
          return { ...w, result: 'Error evaluating', error: true }
        }
      })
    )

    set({ watchExpressions: updated })
  },

  sendConsoleInput: async (text: string) => {
    if (!text.trim()) return
    const { activeSessionId } = get()

    set((state) => ({
      consoleOutputs: [
        ...state.consoleOutputs,
        {
          id: `in-${Date.now()}`,
          category: 'input',
          text: `> ${text}`,
          timestamp: Date.now()
        }
      ]
    }))

    if (!activeSessionId || !window.maestroAPI) {
      set((state) => ({
        consoleOutputs: [
          ...state.consoleOutputs,
          {
            id: `res-${Date.now()}`,
            category: 'stderr',
            text: `Cannot evaluate: No active debug session. Launch with F5 first.`,
            timestamp: Date.now()
          }
        ]
      }))
      return
    }

    try {
      const evalRes = await window.maestroAPI.dapEvaluate(activeSessionId, text)
      set((state) => ({
        consoleOutputs: [
          ...state.consoleOutputs,
          {
            id: `res-${Date.now()}`,
            category: evalRes.type === 'error' ? 'stderr' : 'result',
            text: evalRes.result,
            timestamp: Date.now()
          }
        ]
      }))
    } catch (err: any) {
      set((state) => ({
        consoleOutputs: [
          ...state.consoleOutputs,
          {
            id: `res-${Date.now()}`,
            category: 'stderr',
            text: `Error: ${err.message}`,
            timestamp: Date.now()
          }
        ]
      }))
    }
  },

  clearConsole: () => {
    set({ consoleOutputs: [] })
  },

  selectStackFrame: async (frame: DapStackFrame) => {
    set({ currentFrame: frame })
    if (frame.source?.path) {
      // Jump editor to file and line
      try {
        const content = await window.maestroAPI.readFile(frame.source.path)
        useEditorStore.getState().openFile({
          path: frame.source.path,
          name: frame.source.name || frame.source.path.split(/[\\/]/).pop() || '',
          content
        })
        useEditorStore.getState().setActiveFile(frame.source.path)
        useEditorStore.getState().setCursorPosition(frame.line, frame.column || 1)
        window.dispatchEvent(
          new CustomEvent('editor-reveal-line', {
            detail: { line: frame.line, column: frame.column || 1 }
          })
        )
      } catch {
        // Source file not accessible
      }
    }
  },

  initDapEventListener: () => {
    if (!window.maestroAPI) return () => {}

    const unsubscribe = window.maestroAPI.onDapEvent(async ({ event, payload }) => {
      const state = get()

      if (event === 'output') {
        set((s) => ({
          consoleOutputs: [
            ...s.consoleOutputs,
            {
              id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              category: payload.category || 'console',
              text: payload.output || '',
              timestamp: Date.now()
            }
          ]
        }))
      } else if (event === 'stopped') {
        const frame: DapStackFrame = payload.frame || {
          id: 1,
          name: 'stopped',
          line: 1,
          column: 1
        }

        set({
          status: 'stopped',
          stopReason: payload.reason || 'breakpoint',
          currentFrame: frame
        })

        // Fetch stack frames, scopes, and variables
        if (state.activeSessionId) {
          const frames = await window.maestroAPI.dapGetStackTrace(state.activeSessionId, payload.threadId)
          const scopes = await window.maestroAPI.dapGetScopes(state.activeSessionId, frame.id)

          const variablesMap: Record<number, DapVariable[]> = {}
          for (const sc of scopes) {
            const vars = await window.maestroAPI.dapGetVariables(state.activeSessionId, sc.variablesReference)
            variablesMap[sc.variablesReference] = vars
          }

          set({
            stackFrames: frames.length > 0 ? frames : [frame],
            scopes,
            variables: variablesMap
          })

          // Evaluate watch expressions when paused
          get().evaluateWatchExpressions()
        }

        // Reveal source in editor
        if (frame.source?.path) {
          try {
            const content = await window.maestroAPI.readFile(frame.source.path)
            useEditorStore.getState().openFile({
              path: frame.source.path,
              name: frame.source.name || frame.source.path.split(/[\\/]/).pop() || '',
              content
            })
            useEditorStore.getState().setActiveFile(frame.source.path)
            useEditorStore.getState().setCursorPosition(frame.line, frame.column || 1)
            window.dispatchEvent(
              new CustomEvent('editor-reveal-line', {
                detail: { line: frame.line, column: frame.column || 1 }
              })
            )
          } catch {
            // Source file not accessible
          }
        }
      } else if (event === 'continued') {
        set({
          status: 'running',
          stopReason: null,
          currentFrame: null
        })
      } else if (event === 'terminated') {
        set({
          status: 'terminated',
          activeSessionId: null,
          stopReason: null,
          currentFrame: null,
          stackFrames: [],
          scopes: [],
          variables: {}
        })
        useEditorStore.getState().setStatusMessage('Debug session finished')
      }
    })

    return unsubscribe
  }
}))

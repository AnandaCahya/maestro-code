import { create } from 'zustand'
import type {
  TestFileItem,
  TestSuiteItem,
  TestCaseItem,
  TestDiscoveryResult,
  TestRunSummary
} from '../../../preload/index.d'
import { useEditorStore } from './useEditorStore'

interface TestState {
  framework: 'vitest' | 'jest' | 'node' | 'pytest' | 'custom'
  files: TestFileItem[]
  totalCount: number
  status: 'idle' | 'discovering' | 'running' | 'completed'
  filterStatus: 'all' | 'failed' | 'passed'
  searchQuery: string
  selectedTest: TestCaseItem | null
  outputLines: string[]
  lastSummary: TestRunSummary | null
  runHistory: TestRunSummary[]

  // Actions
  discoverTests: (workspacePath: string) => Promise<void>
  runAllTests: () => Promise<void>
  runTestFile: (filePath: string) => Promise<void>
  runSingleTest: (test: TestCaseItem) => Promise<void>
  runFailedTests: () => Promise<void>
  cancelRun: () => Promise<void>
  setFilterStatus: (filter: 'all' | 'failed' | 'passed') => void
  setSearchQuery: (query: string) => void
  selectTest: (test: TestCaseItem | null) => void
  clearOutput: () => void
  initTestEventListener: () => () => void
}

export const useTestStore = create<TestState>((set, get) => ({
  framework: 'node',
  files: [],
  totalCount: 0,
  status: 'idle',
  filterStatus: 'all',
  searchQuery: '',
  selectedTest: null,
  outputLines: ['Test output runner ready. Click Run All Tests or select a file.\n'],
  lastSummary: null,
  runHistory: [],

  discoverTests: async (workspacePath: string) => {
    if (!window.maestroAPI) return
    set({ status: 'discovering' })
    try {
      const res = await window.maestroAPI.testDiscover(workspacePath)
      set({
        framework: res.framework,
        files: res.files,
        totalCount: res.totalCount,
        status: 'idle'
      })
    } catch {
      set({ status: 'idle' })
    }
  },

  runAllTests: async () => {
    const workspacePath = useEditorStore.getState().workspacePath
    if (!workspacePath || !window.maestroAPI) return

    // Mark all as running
    set((state) => ({
      status: 'running',
      outputLines: [`=== Running all tests (${state.totalCount} tests) ===\n`],
      files: state.files.map((f) => ({
        ...f,
        status: 'running',
        suites: f.suites.map((s) => ({
          ...s,
          status: 'running',
          tests: s.tests.map((t) => ({ ...t, status: 'running' }))
        })),
        isolatedTests: f.isolatedTests.map((t) => ({ ...t, status: 'running' }))
      }))
    }))

    useEditorStore.getState().setStatusMessage('Running all tests...')
    await window.maestroAPI.testRun(workspacePath)
  },

  runTestFile: async (filePath: string) => {
    const workspacePath = useEditorStore.getState().workspacePath
    if (!workspacePath || !window.maestroAPI) return

    const fileName = filePath.split(/[\\/]/).pop() || filePath
    set((state) => ({
      status: 'running',
      outputLines: [`=== Running test file: ${fileName} ===\n`],
      files: state.files.map((f) =>
        f.filePath === filePath
          ? {
              ...f,
              status: 'running',
              suites: f.suites.map((s) => ({
                ...s,
                status: 'running',
                tests: s.tests.map((t) => ({ ...t, status: 'running' }))
              })),
              isolatedTests: f.isolatedTests.map((t) => ({ ...t, status: 'running' }))
            }
          : f
      )
    }))

    useEditorStore.getState().setStatusMessage(`Running tests in ${fileName}...`)
    await window.maestroAPI.testRun(workspacePath, [filePath])
  },

  runSingleTest: async (test: TestCaseItem) => {
    const workspacePath = useEditorStore.getState().workspacePath
    if (!workspacePath || !window.maestroAPI) return

    set((state) => ({
      status: 'running',
      outputLines: [`=== Running test: ${test.name} ===\n`],
      files: state.files.map((f) =>
        f.filePath === test.filePath
          ? {
              ...f,
              suites: f.suites.map((s) => ({
                ...s,
                tests: s.tests.map((t) => (t.id === test.id ? { ...t, status: 'running' } : t))
              })),
              isolatedTests: f.isolatedTests.map((t) =>
                t.id === test.id ? { ...t, status: 'running' } : t
              )
            }
          : f
      )
    }))

    useEditorStore.getState().setStatusMessage(`Running test "${test.name}"...`)
    await window.maestroAPI.testRun(workspacePath, [test.filePath], [test.name])
  },

  runFailedTests: async () => {
    const { files } = get()
    const failedFiles: string[] = []

    files.forEach((f) => {
      const hasFailedSuite = f.suites.some((s) =>
        s.status === 'failed' || s.tests.some((t) => t.status === 'failed')
      )
      const hasFailedIso = f.isolatedTests.some((t) => t.status === 'failed')
      if (hasFailedSuite || hasFailedIso || f.status === 'failed') {
        failedFiles.push(f.filePath)
      }
    })

    if (failedFiles.length === 0) {
      useEditorStore.getState().setStatusMessage('No failed tests to rerun')
      setTimeout(() => useEditorStore.getState().setStatusMessage('Ready'), 2000)
      return
    }

    const workspacePath = useEditorStore.getState().workspacePath
    if (!workspacePath || !window.maestroAPI) return

    set({ status: 'running', outputLines: [`=== Rerunning ${failedFiles.length} failed test files ===\n`] })
    useEditorStore.getState().setStatusMessage(`Rerunning ${failedFiles.length} failed test files...`)
    await window.maestroAPI.testRun(workspacePath, failedFiles)
  },

  cancelRun: async () => {
    if (window.maestroAPI) {
      await window.maestroAPI.testCancel()
      set({ status: 'idle' })
      useEditorStore.getState().setStatusMessage('Test run cancelled')
    }
  },

  setFilterStatus: (filter) => set({ filterStatus: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectTest: (test) => set({ selectedTest: test }),
  clearOutput: () => set({ outputLines: [] }),

  initTestEventListener: () => {
    if (!window.maestroAPI) return () => {}

    const unsub = window.maestroAPI.onTestEvent(({ event, payload }) => {
      if (event === 'output') {
        set((s) => ({
          outputLines: [...s.outputLines, payload.text || '']
        }))
      } else if (event === 'run:completed') {
        const summary: TestRunSummary = payload.summary || {
          runId: payload.runId,
          total: 0,
          passed: payload.isSuccess ? 1 : 0,
          failed: payload.isSuccess ? 0 : 1,
          skipped: 0,
          duration: 0,
          timestamp: Date.now()
        }

        const newStatus = summary.failed > 0 ? 'failed' : 'passed'

        set((state) => ({
          status: 'completed',
          lastSummary: summary,
          runHistory: [summary, ...state.runHistory].slice(0, 20),
          files: state.files.map((f) => ({
            ...f,
            status: f.status === 'running' ? newStatus : f.status,
            suites: f.suites.map((s) => ({
              ...s,
              status: s.status === 'running' ? newStatus : s.status,
              tests: s.tests.map((t) => ({
                ...t,
                status: t.status === 'running' ? newStatus : t.status,
                duration: summary.duration > 0 ? Math.round(summary.duration / (summary.total || 1)) : 10
              }))
            })),
            isolatedTests: f.isolatedTests.map((t) => ({
              ...t,
              status: t.status === 'running' ? newStatus : t.status,
              duration: summary.duration > 0 ? Math.round(summary.duration / (summary.total || 1)) : 10
            }))
          }))
        }))

        useEditorStore
          .getState()
          .setStatusMessage(
            `Tests finished: ${summary.passed} passed, ${summary.failed} failed (${summary.duration}ms)`
          )
      } else if (event === 'run:cancelled') {
        set({ status: 'idle' })
        useEditorStore.getState().setStatusMessage('Test execution cancelled')
      }
    })

    return unsub
  }
}))

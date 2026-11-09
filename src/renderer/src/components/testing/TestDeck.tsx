import React, { useState, useEffect, useMemo } from 'react'
import {
  Play,
  RotateCcw,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Circle,
  Clock,
  ChevronRight,
  ChevronDown,
  FileCode2,
  Layers,
  FlaskConical,
  X,
  Filter,
  Terminal,
  ExternalLink,
  Square,
  Bug,
  ShieldCheck
} from 'lucide-react'
import { useTestStore } from '../../store/useTestStore'
import { useEditorStore } from '../../store/useEditorStore'
import type { TestFileItem, TestSuiteItem, TestCaseItem } from '../../../../preload/index.d'

export const TestDeck: React.FC = () => {
  const {
    framework,
    files,
    totalCount,
    status,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    selectedTest,
    selectTest,
    discoverTests,
    runAllTests,
    runTestFile,
    runSingleTest,
    debugTestFile,
    debugSingleTest,
    runFailedTests,
    cancelRun,
    lastSummary,
    coverage,
    loadCoverage
  } = useTestStore()

  const { workspacePath, openFile, setActiveFile, setCursorPosition, setBottomDeckOpen, setActiveBottomTab } =
    useEditorStore()

  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({})
  const [expandedSuites, setExpandedSuites] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (workspacePath) {
      discoverTests(workspacePath)
    }
  }, [workspacePath])

  // Auto expand files on initial discovery
  useEffect(() => {
    const nextExp: Record<string, boolean> = {}
    files.forEach((f) => {
      nextExp[f.id] = true
    })
    setExpandedFiles(nextExp)
  }, [files.length])

  const toggleFile = (id: string) => {
    setExpandedFiles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleSuite = (id: string) => {
    setExpandedSuites((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleJumpToTest = async (filePath: string, line: number) => {
    try {
      const content = await window.maestroAPI.readFile(filePath)
      const fileName = filePath.split(/[\\/]/).pop() || filePath
      openFile({
        path: filePath,
        name: fileName,
        content
      })
      setActiveFile(filePath)
      setCursorPosition(line, 1)
      window.dispatchEvent(
        new CustomEvent('editor-reveal-line', {
          detail: { line, column: 1 }
        })
      )
    } catch (err) {
      console.error('Failed to jump to test line:', err)
    }
  }

  // Filtered files
  const filteredFiles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    return files
      .map((file) => {
        const matchesFile = !q || file.fileName.toLowerCase().includes(q)

        const filteredSuites = file.suites
          .map((suite) => {
            const matchesSuite = !q || suite.name.toLowerCase().includes(q)
            const filteredTests = suite.tests.filter((t) => {
              if (filterStatus === 'failed' && t.status !== 'failed') return false
              if (filterStatus === 'passed' && t.status !== 'passed') return false
              if (q && !matchesFile && !matchesSuite && !t.name.toLowerCase().includes(q)) return false
              return true
            })

            return {
              ...suite,
              tests: filteredTests
            }
          })
          .filter((s) => s.tests.length > 0 || (!q && filterStatus === 'all'))

        const filteredIsolated = file.isolatedTests.filter((t) => {
          if (filterStatus === 'failed' && t.status !== 'failed') return false
          if (filterStatus === 'passed' && t.status !== 'passed') return false
          if (q && !matchesFile && !t.name.toLowerCase().includes(q)) return false
          return true
        })

        const hasTests = filteredSuites.some((s) => s.tests.length > 0) || filteredIsolated.length > 0

        if (!hasTests && q) return null
        if (filterStatus !== 'all' && !hasTests) return null

        return {
          ...file,
          suites: filteredSuites,
          isolatedTests: filteredIsolated
        }
      })
      .filter(Boolean) as TestFileItem[]
  }, [files, searchQuery, filterStatus])

  const passedCount = useMemo(() => {
    let count = 0
    files.forEach((f) => {
      f.suites.forEach((s) => s.tests.forEach((t) => { if (t.status === 'passed') count++ }))
      f.isolatedTests.forEach((t) => { if (t.status === 'passed') count++ })
    })
    return count
  }, [files])

  const failedCount = useMemo(() => {
    let count = 0
    files.forEach((f) => {
      f.suites.forEach((s) => s.tests.forEach((t) => { if (t.status === 'failed') count++ }))
      f.isolatedTests.forEach((t) => { if (t.status === 'failed') count++ })
    })
    return count
  }, [files])

  const getStatusIcon = (st: string) => {
    if (st === 'passed') return <CheckCircle2 className="w-3.5 h-3.5 text-studio-emerald shrink-0" />
    if (st === 'failed') return <XCircle className="w-3.5 h-3.5 text-studio-rose shrink-0" />
    if (st === 'running') return <RefreshCw className="w-3.5 h-3.5 text-studio-accent animate-spin shrink-0" />
    return <Circle className="w-3.5 h-3.5 text-studio-muted/40 shrink-0" />
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs select-none">
      {/* Top Header & Actions */}
      <div className="p-2.5 border-b border-white/[0.04] flex flex-col gap-2 bg-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-studio-amber/20 flex items-center justify-center text-studio-amber shrink-0">
              <FlaskConical className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-white tracking-wide uppercase text-[11px]">
              Test Explorer
            </span>
            <span className="px-1.5 py-0.2 rounded bg-white/[0.08] text-[9px] font-mono text-studio-cyan font-bold uppercase">
              {framework}
            </span>
            {coverage && (
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold flex items-center gap-0.5 ${
                  coverage.status === 'good'
                    ? 'bg-studio-accent/20 text-studio-accent'
                    : coverage.status === 'warning'
                      ? 'bg-studio-amber/20 text-studio-amber'
                      : 'bg-studio-rose/20 text-studio-rose'
                }`}
                title={`Coverage: ${coverage.lines.pct}% lines, ${coverage.statements.pct}% stmts`}
              >
                <ShieldCheck className="w-2.5 h-2.5" />
                {coverage.lines.pct}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {status === 'running' ? (
              <button
                onClick={cancelRun}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-studio-rose/20 text-studio-rose hover:bg-studio-rose/30 transition-all font-medium text-[11px] cursor-pointer"
                title="Cancel Test Execution"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Cancel</span>
              </button>
            ) : (
              <>
                <button
                  onClick={loadCoverage}
                  className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-studio-cyan transition-colors cursor-pointer"
                  title="Load Test Coverage"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => workspacePath && discoverTests(workspacePath)}
                  className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                  title="Refresh Test Discovery"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={runFailedTests}
                  disabled={failedCount === 0}
                  className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-studio-amber disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  title="Rerun Failed Tests"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={runAllTests}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-studio-accent/20 hover:bg-studio-accent/30 text-studio-accent font-medium border border-studio-accent/30 cursor-pointer transition-all active:scale-95 text-[11px]"
                  title="Run All Tests"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run All</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex items-center gap-1 bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.06]">
            <Search className="w-3 h-3 text-studio-muted shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tests..."
              className="bg-transparent border-none outline-none text-white text-[11px] placeholder:text-studio-muted/50 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-studio-muted hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-0.5 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06] text-[10px] font-mono">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                filterStatus === 'all' ? 'bg-white/15 text-white font-bold' : 'text-studio-muted hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('failed')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                filterStatus === 'failed' ? 'bg-studio-rose/25 text-studio-rose font-bold' : 'text-studio-muted hover:text-studio-rose'
              }`}
            >
              Fail ({failedCount})
            </button>
            <button
              onClick={() => setFilterStatus('passed')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                filterStatus === 'passed' ? 'bg-studio-emerald/25 text-studio-emerald font-bold' : 'text-studio-muted hover:text-studio-emerald'
              }`}
            >
              Pass ({passedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Test Tree View */}
      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1">
        {filteredFiles.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-2 text-studio-muted">
            <FlaskConical className="w-7 h-7 text-studio-muted/40" />
            <div className="text-xs font-medium text-white/70">
              {totalCount === 0 ? 'No test files discovered' : 'No tests match filter'}
            </div>
            <p className="text-[11px] text-studio-muted max-w-xs leading-relaxed">
              Add <code>*.test.ts</code>, <code>*.spec.js</code>, or <code>test_*.py</code> files to your workspace.
            </p>
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isFileExpanded = expandedFiles[file.id] ?? true
            return (
              <div key={file.id} className="flex flex-col rounded-lg bg-white/[0.015] border border-white/[0.03] overflow-hidden">
                {/* File Header */}
                <div
                  onClick={() => toggleFile(file.id)}
                  className="group flex items-center justify-between px-2 py-1.5 hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {isFileExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-studio-muted shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-studio-muted shrink-0" />
                    )}
                    {getStatusIcon(file.status)}
                    <FileCode2 className="w-3.5 h-3.5 text-studio-muted group-hover:text-studio-cyan shrink-0 transition-colors" />
                    <span className="font-mono text-white text-[11px] truncate font-medium">
                      {file.fileName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {file.duration !== undefined && (
                      <span className="text-[10px] text-studio-muted font-mono">
                        {file.duration}ms
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        debugTestFile(file.filePath)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-studio-muted hover:text-studio-amber transition-all cursor-pointer"
                      title="Debug This Test File"
                    >
                      <Bug className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        runTestFile(file.filePath)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-studio-muted hover:text-studio-accent transition-all cursor-pointer"
                      title="Run This Test File"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                </div>

                {/* Suites and Tests */}
                {isFileExpanded && (
                  <div className="flex flex-col pl-4 pr-1 pb-1 gap-0.5 border-l border-white/[0.04] ml-3.5 my-0.5">
                    {file.suites.map((suite) => {
                      const isSuiteExp = expandedSuites[suite.id] ?? true
                      return (
                        <div key={suite.id} className="flex flex-col">
                          {/* Suite Title */}
                          <div
                            onClick={() => toggleSuite(suite.id)}
                            className="group flex items-center justify-between px-1.5 py-1 rounded hover:bg-white/[0.04] cursor-pointer"
                          >
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              {isSuiteExp ? (
                                <ChevronDown className="w-3 h-3 text-studio-muted shrink-0" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-studio-muted shrink-0" />
                              )}
                              {getStatusIcon(suite.status)}
                              <span className="text-white/80 font-medium truncate text-[11px]">
                                {suite.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-studio-muted font-mono">
                              ({suite.tests.length})
                            </span>
                          </div>

                          {/* Suite Tests */}
                          {isSuiteExp && (
                            <div className="flex flex-col pl-3 gap-0.5 border-l border-white/[0.04] ml-2">
                              {suite.tests.map((test) => (
                                <div
                                  key={test.id}
                                  onClick={() => {
                                    selectTest(test)
                                    handleJumpToTest(test.filePath, test.line)
                                  }}
                                  className={`group flex items-center justify-between px-1.5 py-1 rounded cursor-pointer transition-colors ${
                                    selectedTest?.id === test.id
                                      ? 'bg-studio-accent/20 text-white font-medium'
                                      : 'hover:bg-white/[0.04] text-studio-muted hover:text-white'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    {getStatusIcon(test.status)}
                                    <span className="truncate text-[11px]">{test.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-1">
                                    {test.duration !== undefined && (
                                      <span className="text-[10px] font-mono text-studio-muted">
                                        {test.duration}ms
                                      </span>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        debugSingleTest(test)
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-studio-amber transition-all cursor-pointer"
                                      title="Debug This Test"
                                    >
                                      <Bug className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        runSingleTest(test)
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-studio-accent transition-all cursor-pointer"
                                      title="Run This Test"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-current" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Isolated Tests */}
                    {file.isolatedTests.map((test) => (
                      <div
                        key={test.id}
                        onClick={() => {
                          selectTest(test)
                          handleJumpToTest(test.filePath, test.line)
                        }}
                        className={`group flex items-center justify-between px-1.5 py-1 rounded cursor-pointer transition-colors ${
                          selectedTest?.id === test.id
                            ? 'bg-studio-accent/20 text-white font-medium'
                            : 'hover:bg-white/[0.04] text-studio-muted hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {getStatusIcon(test.status)}
                          <span className="truncate text-[11px]">{test.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {test.duration !== undefined && (
                            <span className="text-[10px] font-mono text-studio-muted">
                              {test.duration}ms
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              debugSingleTest(test)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-studio-amber transition-all cursor-pointer"
                            title="Debug This Test"
                          >
                            <Bug className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              runSingleTest(test)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-studio-accent transition-all cursor-pointer"
                            title="Run This Test"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Summary Footer */}
      <div className="p-2.5 border-t border-white/[0.04] bg-black/30 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-2">
          {lastSummary ? (
            <>
              <span className="text-studio-emerald font-bold">{lastSummary.passed} passed</span>
              {lastSummary.failed > 0 && (
                <span className="text-studio-rose font-bold">{lastSummary.failed} failed</span>
              )}
              <span className="text-studio-muted">({lastSummary.duration}ms)</span>
            </>
          ) : (
            <span className="text-studio-muted">{totalCount} total tests</span>
          )}
        </div>

        <button
          onClick={() => {
            setActiveBottomTab('tests')
            setBottomDeckOpen(true)
          }}
          className="flex items-center gap-1 text-studio-muted hover:text-white transition-colors cursor-pointer"
          title="Open Test Results Output Panel"
        >
          <Terminal className="w-3 h-3 text-studio-amber" />
          <span>Results</span>
        </button>
      </div>
    </div>
  )
}

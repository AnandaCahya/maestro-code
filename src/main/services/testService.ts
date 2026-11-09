import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as fs from 'fs/promises'
import { BrowserWindow } from 'electron'
import { startDebugSession } from './dapService'
import type { LaunchConfiguration } from './settingsService'

export type TestFramework = 'vitest' | 'jest' | 'node' | 'pytest' | 'phpunit' | 'custom'

export interface TestCaseItem {
  id: string
  name: string
  suiteName?: string
  filePath: string
  line: number
  status: 'idle' | 'running' | 'passed' | 'failed' | 'skipped'
  duration?: number
  error?: {
    message: string
    stack?: string
    expected?: string
    actual?: string
  }
}

export interface TestSuiteItem {
  id: string
  name: string
  filePath: string
  line: number
  tests: TestCaseItem[]
  status: 'idle' | 'running' | 'passed' | 'failed' | 'skipped'
  duration?: number
}

export interface TestFileItem {
  id: string
  filePath: string
  fileName: string
  suites: TestSuiteItem[]
  isolatedTests: TestCaseItem[]
  status: 'idle' | 'running' | 'passed' | 'failed' | 'skipped'
  duration?: number
}

export interface TestDiscoveryResult {
  framework: TestFramework
  files: TestFileItem[]
  totalCount: number
}

export interface TestRunSummary {
  runId: string
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number
  timestamp: number
}

export interface TestAdapterInfo {
  name: string
  id: TestFramework
  supportedVersions: string
  detectionCriteria: string[]
  supportsDebug: boolean
  supportsCoverage: boolean
  description: string
}

export interface CoverageMetric {
  total: number
  covered: number
  skipped: number
  pct: number
}

export interface WorkspaceCoverageSummary {
  lines: CoverageMetric
  statements: CoverageMetric
  functions: CoverageMetric
  branches: CoverageMetric
  status: 'good' | 'warning' | 'danger'
  timestamp: number
  reportPath?: string
}

export interface FileCoverageDecoration {
  line: number
  status: 'covered' | 'uncovered' | 'partial'
  executionCount?: number
}

let activeTestProcess: ChildProcess | null = null
let currentRunId: string | null = null

function emitTestEvent(event: string, payload: any) {
  try {
    if (typeof BrowserWindow !== 'undefined' && BrowserWindow && typeof BrowserWindow.getAllWindows === 'function') {
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('test:event', { event, payload })
        }
      }
    }
  } catch {
    // Ignore in non-Electron or headless test environments
  }
}

const TEST_FILE_REGEX = /\.(test|spec)\.(ts|js|tsx|jsx|mjs|cjs)$/i
const PYTEST_FILE_REGEX = /(^test_.*\.py$|.*_test\.py$)/i
const PHPUNIT_FILE_REGEX = /(?:Test\.php$|^test.*\.php$)/i

/**
 * Registry of supported test frameworks and adapters
 */
export function getSupportedAdapters(): TestAdapterInfo[] {
  return [
    {
      name: 'Vitest',
      id: 'vitest',
      supportedVersions: 'v0.34.0+, v1.x, v2.x',
      detectionCriteria: ['vitest in package.json dependencies', 'vitest.config.ts', 'vitest.config.js'],
      supportsDebug: true,
      supportsCoverage: true,
      description: 'Next generation testing framework powered by Vite with native ESM and TypeScript support.'
    },
    {
      name: 'Jest',
      id: 'jest',
      supportedVersions: 'v27.x, v28.x, v29.x',
      detectionCriteria: ['jest in package.json dependencies', 'jest.config.js', 'jest.config.ts'],
      supportsDebug: true,
      supportsCoverage: true,
      description: 'Delightful JavaScript Testing Framework with a focus on simplicity.'
    },
    {
      name: 'pytest',
      id: 'pytest',
      supportedVersions: 'v6.x, v7.x, v8.x',
      detectionCriteria: ['pytest in requirements.txt', 'pytest.ini', 'pyproject.toml [tool.pytest]', 'test_*.py'],
      supportsDebug: true,
      supportsCoverage: true,
      description: 'Mature full-featured Python testing tool.'
    },
    {
      name: 'PHPUnit',
      id: 'phpunit',
      supportedVersions: 'v9.x, v10.x, v11.x',
      detectionCriteria: ['phpunit/phpunit in composer.json', 'phpunit.xml', 'phpunit.xml.dist', '*Test.php'],
      supportsDebug: true,
      supportsCoverage: true,
      description: 'Programmer-oriented testing framework for PHP.'
    },
    {
      name: 'Node Test Runner',
      id: 'node',
      supportedVersions: 'Node 18+, Node 20+, Node 22+',
      detectionCriteria: ['node:test import', 'fallback for JavaScript/TypeScript test files'],
      supportsDebug: true,
      supportsCoverage: false,
      description: 'Built-in Node.js native test runner module.'
    }
  ]
}

async function scanDirectoryForTestFiles(dir: string, baseDir: string): Promise<string[]> {
  const results: string[] = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const name = entry.name.toLowerCase()
        if (
          name === 'node_modules' ||
          name === '.git' ||
          name === 'dist' ||
          name === 'out' ||
          name === 'build' ||
          name === '.cache' ||
          name === 'coverage' ||
          name === 'vendor'
        ) {
          continue
        }
        const subFiles = await scanDirectoryForTestFiles(fullPath, baseDir)
        results.push(...subFiles)
      } else if (entry.isFile()) {
        if (
          TEST_FILE_REGEX.test(entry.name) ||
          PYTEST_FILE_REGEX.test(entry.name) ||
          PHPUNIT_FILE_REGEX.test(entry.name)
        ) {
          results.push(fullPath)
        }
      }
    }
  } catch {
    // Ignore unreadable dirs
  }
  return results
}

function parseTestFileContent(filePath: string, content: string): { suites: TestSuiteItem[]; isolatedTests: TestCaseItem[] } {
  const lines = content.split('\n')
  const suites: TestSuiteItem[] = []
  const isolatedTests: TestCaseItem[] = []

  let currentSuite: TestSuiteItem | null = null
  let currentSuiteBraceDepth = 0
  let braceDepth = 0

  const describeRegex = /(?:describe|suite)\s*\(\s*['"`](.*?)['"`]/
  const testRegex = /(?:test|it)\s*\(\s*['"`](.*?)['"`]/
  const pythonDefTestRegex = /def\s+(test_\w+)\s*\(/
  const phpClassRegex = /(?:class)\s+(\w+Test)\s+(?:extends\s+\w+)?/
  const phpMethodRegex = /(?:public\s+)?function\s+(test\w+)\s*\(/
  const phpDocTestRegex = /@test/

  let hasPendingPhpDocTest = false

  lines.forEach((line, index) => {
    const lineNum = index + 1
    const trimmed = line.trim()

    // Track braces approximately
    const openBraces = (line.match(/{/g) || []).length
    const closeBraces = (line.match(/}/g) || []).length

    // Check PHP class
    const phpClassMatch = line.match(phpClassRegex)
    if (phpClassMatch) {
      currentSuite = {
        id: `suite-${path.normalize(filePath)}-${lineNum}`,
        name: phpClassMatch[1],
        filePath,
        line: lineNum,
        tests: [],
        status: 'idle'
      }
      suites.push(currentSuite)
      currentSuiteBraceDepth = braceDepth
    }

    // Check PHP docblock @test
    if (phpDocTestRegex.test(trimmed)) {
      hasPendingPhpDocTest = true
    }

    // Check PHP test method
    const phpMethodMatch = line.match(phpMethodRegex) || (hasPendingPhpDocTest ? line.match(/(?:public\s+)?function\s+(\w+)\s*\(/) : null)
    if (phpMethodMatch) {
      const testName = phpMethodMatch[1]
      const testItem: TestCaseItem = {
        id: `test-${path.normalize(filePath)}-${lineNum}`,
        name: testName.replace(/^test_?/, '').replace(/_/g, ' ') || testName,
        suiteName: currentSuite ? currentSuite.name : undefined,
        filePath,
        line: lineNum,
        status: 'idle'
      }
      if (currentSuite) {
        currentSuite.tests.push(testItem)
      } else {
        isolatedTests.push(testItem)
      }
      hasPendingPhpDocTest = false
    }

    // Check for describe / suite (JS/TS)
    const descMatch = line.match(describeRegex)
    if (descMatch) {
      currentSuite = {
        id: `suite-${path.normalize(filePath)}-${lineNum}`,
        name: descMatch[1],
        filePath,
        line: lineNum,
        tests: [],
        status: 'idle'
      }
      suites.push(currentSuite)
      currentSuiteBraceDepth = braceDepth
    }

    // Check for test / it (JS/TS)
    const testMatch = line.match(testRegex)
    if (testMatch) {
      const testItem: TestCaseItem = {
        id: `test-${path.normalize(filePath)}-${lineNum}`,
        name: testMatch[1],
        suiteName: currentSuite ? currentSuite.name : undefined,
        filePath,
        line: lineNum,
        status: 'idle'
      }
      if (currentSuite) {
        currentSuite.tests.push(testItem)
      } else {
        isolatedTests.push(testItem)
      }
    }

    // Python pytest def test_*
    const pyMatch = line.match(pythonDefTestRegex)
    if (pyMatch) {
      const testItem: TestCaseItem = {
        id: `test-${path.normalize(filePath)}-${lineNum}`,
        name: pyMatch[1].replace(/_/g, ' '),
        filePath,
        line: lineNum,
        status: 'idle'
      }
      isolatedTests.push(testItem)
    }

    braceDepth += openBraces - closeBraces
    if (currentSuite && braceDepth <= currentSuiteBraceDepth && closeBraces > 0) {
      currentSuite = null
    }
  })

  return { suites, isolatedTests }
}

export async function discoverWorkspaceTests(workspacePath: string): Promise<TestDiscoveryResult> {
  const testFilePaths = await scanDirectoryForTestFiles(workspacePath, workspacePath)

  // Detect test framework
  let framework: TestFramework = 'node'

  // 1. Check composer.json & phpunit.xml for PHPUnit
  try {
    const hasPhpXml = await fs.stat(path.join(workspacePath, 'phpunit.xml')).catch(() => null)
    const hasPhpXmlDist = await fs.stat(path.join(workspacePath, 'phpunit.xml.dist')).catch(() => null)
    if (hasPhpXml || hasPhpXmlDist) {
      framework = 'phpunit'
    } else {
      const composerRaw = await fs.readFile(path.join(workspacePath, 'composer.json'), 'utf-8').catch(() => null)
      if (composerRaw) {
        const comp = JSON.parse(composerRaw)
        const compReq = { ...comp.require, ...comp['require-dev'] }
        if (compReq && compReq['phpunit/phpunit']) {
          framework = 'phpunit'
        }
      }
    }
  } catch {
    // Ignore
  }

  // 2. Check package.json for JS/TS
  if (framework === 'node') {
    try {
      const pkgRaw = await fs.readFile(path.join(workspacePath, 'package.json'), 'utf-8')
      const pkg = JSON.parse(pkgRaw)
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (deps.vitest) framework = 'vitest'
      else if (deps.jest) framework = 'jest'
      else if (pkg.scripts?.test) framework = 'custom'
    } catch {
      // Non-node or no package.json
      const hasPy = testFilePaths.some((p) => p.endsWith('.py'))
      const hasPhp = testFilePaths.some((p) => p.endsWith('.php'))
      if (hasPy) framework = 'pytest'
      else if (hasPhp) framework = 'phpunit'
    }
  }

  const files: TestFileItem[] = []
  let totalCount = 0

  for (const fPath of testFilePaths) {
    try {
      const content = await fs.readFile(fPath, 'utf-8')
      const { suites, isolatedTests } = parseTestFileContent(fPath, content)
      const fileCount = suites.reduce((acc, s) => acc + s.tests.length, 0) + isolatedTests.length

      if (fileCount > 0 || TEST_FILE_REGEX.test(fPath) || PHPUNIT_FILE_REGEX.test(fPath)) {
        files.push({
          id: `file-${path.normalize(fPath)}`,
          filePath: fPath,
          fileName: path.basename(fPath),
          suites,
          isolatedTests,
          status: 'idle'
        })
        totalCount += fileCount
      }
    } catch {
      // Ignore read errors
    }
  }

  return { framework, files, totalCount }
}

export async function runWorkspaceTests(
  workspacePath: string,
  targetFilePaths?: string[],
  targetTestNames?: string[]
): Promise<{ runId: string; ok: boolean; message?: string }> {
  try {
    if (activeTestProcess && !activeTestProcess.killed) {
      try {
        activeTestProcess.kill('SIGTERM')
      } catch {
        // Ignore
      }
    }

    const runId = `run-${Date.now()}`
    currentRunId = runId
    const startTime = Date.now()

    // Determine framework and executable
    let executable = 'npm'
    let args = ['test']

    const isPhp = targetFilePaths?.some((p) => p.endsWith('.php'))
    const isPy = targetFilePaths?.some((p) => p.endsWith('.py'))

    if (isPhp) {
      const isWin = process.platform === 'win32'
      const vendorBin = path.join(workspacePath, 'vendor', 'bin', isWin ? 'phpunit.bat' : 'phpunit')
      const hasVendor = await fs.stat(vendorBin).catch(() => null)
      executable = hasVendor ? vendorBin : isWin ? 'phpunit.bat' : 'phpunit'
      args = []
      if (targetTestNames && targetTestNames.length > 0) {
        args.push('--filter', targetTestNames[0])
      }
      if (targetFilePaths && targetFilePaths.length > 0) {
        args.push(...targetFilePaths)
      }
    } else if (isPy) {
      executable = process.platform === 'win32' ? 'pytest.exe' : 'pytest'
      args = []
      if (targetFilePaths && targetFilePaths.length > 0) {
        args.push(...targetFilePaths)
      }
      if (targetTestNames && targetTestNames.length > 0) {
        args.push('-k', targetTestNames[0])
      }
    } else {
      // Check package manager
      try {
        const hasPnpm = await fs.stat(path.join(workspacePath, 'pnpm-lock.yaml')).catch(() => null)
        const hasYarn = await fs.stat(path.join(workspacePath, 'yarn.lock')).catch(() => null)
        if (hasPnpm) executable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
        else if (hasYarn) executable = process.platform === 'win32' ? 'yarn.cmd' : 'yarn'
        else executable = process.platform === 'win32' ? 'npm.cmd' : 'npm'
      } catch {
        executable = process.platform === 'win32' ? 'npm.cmd' : 'npm'
      }

      if (targetFilePaths && targetFilePaths.length > 0) {
        const relPaths = targetFilePaths.map((p) => path.relative(workspacePath, p).replace(/\\/g, '/'))
        args.push('--', ...relPaths)
      }
    }

    emitTestEvent('run:started', { runId, targetFilePaths, targetTestNames })

    const isWin = process.platform === 'win32'
    const fullCmd = args.length > 0 ? `${executable} ${args.join(' ')}` : executable
    const child = isWin
      ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', fullCmd], {
          cwd: workspacePath,
          env: { ...process.env, CI: 'true' }
        })
      : spawn(executable, args, {
          cwd: workspacePath,
          env: { ...process.env, CI: 'true' }
        })

    activeTestProcess = child
    let fullOutput = ''

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString()
      fullOutput += text
      emitTestEvent('output', { runId, type: 'stdout', text })
    })

    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString()
      fullOutput += text
      emitTestEvent('output', { runId, type: 'stderr', text })
    })

    child.on('error', (err) => {
      emitTestEvent('output', { runId, type: 'stderr', text: `Test process error: ${err.message}\n` })
      emitTestEvent('run:completed', {
        runId,
        summary: {
          runId,
          total: 0,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: Date.now() - startTime,
          timestamp: Date.now()
        }
      })
    })

    child.on('exit', (code) => {
      const duration = Date.now() - startTime
      const isSuccess = code === 0

      // Parse output for test results
      const passMatches = fullOutput.match(/(\d+)\s+passed/i) || fullOutput.match(/OK\s*\((\d+)\s+tests/i)
      const failMatches = fullOutput.match(/(\d+)\s+failed/i) || fullOutput.match(/FAILURES!\s*Tests:\s*\d+,\s*Assertions:\s*\d+,\s*Failures:\s*(\d+)/i)
      const totalMatches = fullOutput.match(/Tests:\s*(\d+)\s+total/i) || fullOutput.match(/(\d+)\s+total/i)

      const passed = passMatches ? parseInt(passMatches[1], 10) : isSuccess ? 1 : 0
      const failed = failMatches ? parseInt(failMatches[1], 10) : isSuccess ? 0 : 1
      const total = totalMatches ? parseInt(totalMatches[1], 10) : passed + failed

      const summary: TestRunSummary = {
        runId,
        total,
        passed,
        failed,
        skipped: 0,
        duration,
        timestamp: Date.now()
      }

      emitTestEvent('run:completed', { runId, code, summary, isSuccess })
      activeTestProcess = null
      currentRunId = null
    })

    return { runId, ok: true }
  } catch (err: any) {
    return { runId: '', ok: false, message: err?.message || 'Failed to launch tests' }
  }
}

/**
 * Debug a specific test file or test case using the DAP debug adapter
 */
export async function debugWorkspaceTest(
  workspacePath: string,
  testFilePath: string,
  testName?: string
): Promise<{ ok: boolean; sessionId?: string; message?: string }> {
  try {
    const isPy = testFilePath.endsWith('.py')
    const isPhp = testFilePath.endsWith('.php')

    const launchConfig: LaunchConfiguration = {
      name: `Debug Test: ${path.basename(testFilePath)}${testName ? ` - ${testName}` : ''}`,
      type: isPy ? 'python' : isPhp ? 'php' : 'node',
      request: 'launch',
      program: testFilePath,
      args: testName ? (isPy ? ['-k', testName] : isPhp ? ['--filter', testName] : ['-t', testName]) : [],
      cwd: workspacePath
    }

    const debugResult = await startDebugSession(workspacePath, launchConfig)
    if (!debugResult.ok) {
      return { ok: false, message: debugResult.message || 'Failed to start debug session for test' }
    }

    emitTestEvent('run:started', {
      runId: debugResult.sessionId,
      targetFilePaths: [testFilePath],
      targetTestNames: testName ? [testName] : undefined,
      isDebug: true
    })

    return { ok: true, sessionId: debugResult.sessionId }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to debug test' }
  }
}

/**
 * Load test coverage summary from Istanbul / Jest / Vitest / LCOV reports
 */
export async function loadCoverageSummary(
  workspacePath: string,
  customCoverageDir?: string
): Promise<WorkspaceCoverageSummary | null> {
  const coverageDir = customCoverageDir || path.join(workspacePath, 'coverage')
  const summaryJsonPath = path.join(coverageDir, 'coverage-summary.json')

  try {
    const raw = await fs.readFile(summaryJsonPath, 'utf-8')
    const data = JSON.parse(raw)
    const total = data.total

    if (total && total.lines && total.statements) {
      const linePct = total.lines.pct ?? 0
      const status: 'good' | 'warning' | 'danger' = linePct >= 80 ? 'good' : linePct >= 50 ? 'warning' : 'danger'

      return {
        lines: total.lines,
        statements: total.statements,
        functions: total.functions || { total: 0, covered: 0, skipped: 0, pct: 0 },
        branches: total.branches || { total: 0, covered: 0, skipped: 0, pct: 0 },
        status,
        timestamp: Date.now(),
        reportPath: summaryJsonPath
      }
    }
  } catch {
    // coverage-summary.json not found, try lcov.info fallback
    const lcovPath = path.join(coverageDir, 'lcov.info')
    try {
      const lcovContent = await fs.readFile(lcovPath, 'utf-8')
      let linesFound = 0
      let linesHit = 0
      let funcFound = 0
      let funcHit = 0

      for (const line of lcovContent.split('\n')) {
        if (line.startsWith('LF:')) linesFound += parseInt(line.slice(3).trim(), 10) || 0
        else if (line.startsWith('LH:')) linesHit += parseInt(line.slice(3).trim(), 10) || 0
        else if (line.startsWith('FNF:')) funcFound += parseInt(line.slice(4).trim(), 10) || 0
        else if (line.startsWith('FNH:')) funcHit += parseInt(line.slice(4).trim(), 10) || 0
      }

      if (linesFound > 0) {
        const linePct = Math.round((linesHit / linesFound) * 100)
        const funcPct = funcFound > 0 ? Math.round((funcHit / funcFound) * 100) : 100
        const status: 'good' | 'warning' | 'danger' = linePct >= 80 ? 'good' : linePct >= 50 ? 'warning' : 'danger'

        return {
          lines: { total: linesFound, covered: linesHit, skipped: linesFound - linesHit, pct: linePct },
          statements: { total: linesFound, covered: linesHit, skipped: linesFound - linesHit, pct: linePct },
          functions: { total: funcFound, covered: funcHit, skipped: funcFound - funcHit, pct: funcPct },
          branches: { total: 0, covered: 0, skipped: 0, pct: 0 },
          status,
          timestamp: Date.now(),
          reportPath: lcovPath
        }
      }
    } catch {
      // No coverage files found
    }
  }

  return null
}

/**
 * Get line-by-line coverage status for gutter decorations in Monaco Editor
 */
export async function getFileCoverageDecorations(
  workspacePath: string,
  filePath: string,
  customCoverageDir?: string
): Promise<FileCoverageDecoration[]> {
  const coverageDir = customCoverageDir || path.join(workspacePath, 'coverage')
  const finalJsonPath = path.join(coverageDir, 'coverage-final.json')

  try {
    const raw = await fs.readFile(finalJsonPath, 'utf-8')
    const finalData = JSON.parse(raw)

    const normalizedTarget = path.normalize(filePath).toLowerCase()
    let fileCoverage: any = null

    for (const [covPath, entry] of Object.entries(finalData)) {
      if (path.normalize(covPath).toLowerCase() === normalizedTarget) {
        fileCoverage = entry
        break
      }
    }

    if (fileCoverage && fileCoverage.statementMap && fileCoverage.s) {
      const decorations: FileCoverageDecoration[] = []
      const stmtMap = fileCoverage.statementMap
      const sHits = fileCoverage.s

      for (const [stmtId, count] of Object.entries(sHits)) {
        const stmt = stmtMap[stmtId]
        if (stmt && stmt.start && stmt.start.line) {
          const line = stmt.start.line
          const execCount = typeof count === 'number' ? count : 0
          const status = execCount > 0 ? 'covered' : 'uncovered'

          const existing = decorations.find((d) => d.line === line)
          if (!existing) {
            decorations.push({ line, status, executionCount: execCount })
          } else if (existing.status === 'uncovered' && status === 'covered') {
            existing.status = 'partial'
          }
        }
      }

      return decorations.sort((a, b) => a.line - b.line)
    }
  } catch {
    // Try lcov.info fallback
    const lcovPath = path.join(coverageDir, 'lcov.info')
    try {
      const lcovRaw = await fs.readFile(lcovPath, 'utf-8')
      const targetBase = path.basename(filePath).toLowerCase()
      const blocks = lcovRaw.split('TN:')
      const decorations: FileCoverageDecoration[] = []

      for (const block of blocks) {
        const sfMatch = block.match(/SF:(.+)/)
        if (sfMatch && path.basename(sfMatch[1].trim()).toLowerCase() === targetBase) {
          const daLines = block.match(/DA:(\d+),(\d+)/g) || []
          for (const da of daLines) {
            const parts = da.replace('DA:', '').split(',')
            const line = parseInt(parts[0], 10)
            const count = parseInt(parts[1], 10)
            decorations.push({
              line,
              status: count > 0 ? 'covered' : 'uncovered',
              executionCount: count
            })
          }
          break
        }
      }

      if (decorations.length > 0) {
        return decorations.sort((a, b) => a.line - b.line)
      }
    } catch {
      // Ignore
    }
  }

  return []
}

export function cancelTestRun(runId?: string): boolean {
  if (activeTestProcess && !activeTestProcess.killed) {
    try {
      activeTestProcess.kill('SIGTERM')
      setTimeout(() => {
        if (activeTestProcess && !activeTestProcess.killed) {
          activeTestProcess.kill('SIGKILL')
        }
      }, 500)
      emitTestEvent('run:cancelled', { runId: runId || currentRunId })
      return true
    } catch {
      return false
    }
  }
  return false
}

export function stopAllTests(): void {
  if (activeTestProcess && !activeTestProcess.killed) {
    try {
      activeTestProcess.kill('SIGTERM')
    } catch {
      // Ignore
    }
  }
  activeTestProcess = null
}

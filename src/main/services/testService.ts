import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as fs from 'fs/promises'
import { BrowserWindow } from 'electron'

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
  framework: 'vitest' | 'jest' | 'node' | 'pytest' | 'custom'
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

let activeTestProcess: ChildProcess | null = null
let currentRunId: string | null = null

function emitTestEvent(event: string, payload: any) {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('test:event', { event, payload })
    }
  }
}

const TEST_FILE_REGEX = /\.(test|spec)\.(ts|js|tsx|jsx|mjs|cjs)$/i
const PYTEST_FILE_REGEX = /(^test_.*\.py$|.*_test\.py$)/i

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
          name === 'coverage'
        ) {
          continue
        }
        const subFiles = await scanDirectoryForTestFiles(fullPath, baseDir)
        results.push(...subFiles)
      } else if (entry.isFile()) {
        if (TEST_FILE_REGEX.test(entry.name) || PYTEST_FILE_REGEX.test(entry.name)) {
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

  lines.forEach((line, index) => {
    const lineNum = index + 1
    const trimmed = line.trim()

    // Track braces approximately
    const openBraces = (line.match(/{/g) || []).length
    const closeBraces = (line.match(/}/g) || []).length

    // Check for describe / suite
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

    // Check for test / it
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

  // Detect test framework from package.json
  let framework: 'vitest' | 'jest' | 'node' | 'pytest' | 'custom' = 'node'
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
    if (hasPy) framework = 'pytest'
  }

  const files: TestFileItem[] = []
  let totalCount = 0

  for (const fPath of testFilePaths) {
    try {
      const content = await fs.readFile(fPath, 'utf-8')
      const { suites, isolatedTests } = parseTestFileContent(fPath, content)
      const fileCount = suites.reduce((acc, s) => acc + s.tests.length, 0) + isolatedTests.length

      if (fileCount > 0 || TEST_FILE_REGEX.test(fPath)) {
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

    // Determine command to run
    let executable = 'npm'
    let args = ['test']

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
      // Pass file paths if runner supports arguments
      const relPaths = targetFilePaths.map((p) => path.relative(workspacePath, p).replace(/\\/g, '/'))
      args.push('--', ...relPaths)
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
      const passMatches = fullOutput.match(/(\d+)\s+passed/i)
      const failMatches = fullOutput.match(/(\d+)\s+failed/i)
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

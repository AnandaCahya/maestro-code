import fs from 'fs/promises'
import path from 'path'

export interface TaskPresentation {
  reveal?: 'always' | 'silent' | 'never'
  echo?: boolean
  focus?: boolean
  panel?: 'shared' | 'dedicated' | 'new'
  clear?: boolean
}

export interface TaskOptions {
  cwd?: string
  env?: Record<string, string>
  shell?: {
    executable?: string
    args?: string[]
  }
}

export interface MaestroTask {
  id: string
  label: string
  type: 'shell' | 'process' | 'npm'
  command: string
  args?: string[]
  cwd?: string
  source: 'tasks.json' | 'package.json'
  group?: 'build' | 'test' | 'clean' | 'none' | string
  isDefault?: boolean
  isBackground?: boolean
  problemMatcher?: string | string[]
  dependsOn?: string | string[]
  dependsOrder?: 'sequence' | 'parallel'
  presentation?: TaskPresentation
  options?: TaskOptions
  scope?: 'workspace' | 'global' | string
}

/**
 * Detect package manager based on lockfiles
 */
async function detectPackageManager(dir: string): Promise<string> {
  try {
    const files = await fs.readdir(dir)
    if (files.includes('pnpm-lock.yaml')) return 'pnpm'
    if (files.includes('yarn.lock')) return 'yarn'
    if (files.includes('bun.lockb') || files.includes('bun.lock')) return 'bun'
    if (files.includes('package-lock.json')) return 'npm'
  } catch {
    // ignore
  }
  return 'npm'
}

/**
 * Parse .vscode/tasks.json and auto-discover npm scripts
 */
export async function getWorkspaceTasks(workspacePath: string): Promise<MaestroTask[]> {
  const tasks: MaestroTask[] = []

  // 1. Read .vscode/tasks.json
  const tasksJsonPath = path.join(workspacePath, '.vscode', 'tasks.json')
  try {
    const raw = await fs.readFile(tasksJsonPath, 'utf-8')
    const cleanJson = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
    const parsed = JSON.parse(cleanJson)

    if (parsed && Array.isArray(parsed.tasks)) {
      for (const t of parsed.tasks) {
        if (!t.label || !t.command) continue

        let group: MaestroTask['group'] = 'none'
        let isDefault = false

        if (typeof t.group === 'string') {
          group = t.group
        } else if (typeof t.group === 'object' && t.group !== null) {
          group = t.group.kind || 'none'
          isDefault = Boolean(t.group.isDefault)
        }

        const dependsOn = Array.isArray(t.dependsOn)
          ? t.dependsOn.map(String)
          : typeof t.dependsOn === 'string'
            ? t.dependsOn
            : undefined

        const dependsOrder =
          t.dependsOrder === 'sequence' || t.dependsOrder === 'parallel'
            ? t.dependsOrder
            : 'parallel'

        const isBackground = Boolean(t.isBackground)
        const presentation =
          t.presentation && typeof t.presentation === 'object'
            ? {
                reveal: t.presentation.reveal,
                echo: t.presentation.echo,
                focus: t.presentation.focus,
                panel: t.presentation.panel,
                clear: t.presentation.clear
              }
            : undefined

        const options =
          t.options && typeof t.options === 'object'
            ? {
                cwd: t.options.cwd,
                env: t.options.env,
                shell: t.options.shell
              }
            : undefined

        tasks.push({
          id: `vscode-task-${t.label.replace(/\s+/g, '-').toLowerCase()}`,
          label: t.label,
          type: t.type || 'shell',
          command: t.command,
          args: Array.isArray(t.args) ? t.args.map(String) : undefined,
          cwd: t.options?.cwd || undefined,
          source: 'tasks.json',
          group,
          isDefault,
          isBackground,
          problemMatcher: t.problemMatcher,
          dependsOn,
          dependsOrder,
          presentation,
          options,
          scope: t.scope || 'workspace'
        })
      }
    }
  } catch {
    // tasks.json might not exist, proceed to package.json
  }

  // 2. Discover package.json scripts
  const pkgJsonPath = path.join(workspacePath, 'package.json')
  try {
    const rawPkg = await fs.readFile(pkgJsonPath, 'utf-8')
    const pkg = JSON.parse(rawPkg)

    if (pkg && pkg.scripts && typeof pkg.scripts === 'object') {
      const pm = await detectPackageManager(workspacePath)

      for (const [scriptName, scriptCmd] of Object.entries(pkg.scripts)) {
        if (typeof scriptCmd !== 'string') continue

        let group: 'build' | 'test' | 'none' = 'none'
        const lower = scriptName.toLowerCase()
        if (lower.includes('build') || lower === 'compile') {
          group = 'build'
        } else if (lower.includes('test')) {
          group = 'test'
        }

        // Avoid duplicating if tasks.json already defined task with same label
        const exists = tasks.some((t) => t.label.toLowerCase() === scriptName.toLowerCase())
        if (!exists) {
          tasks.push({
            id: `npm-${scriptName}`,
            label: `${pm}: ${scriptName}`,
            type: 'npm',
            command: `${pm} run ${scriptName}`,
            source: 'package.json',
            group,
            isDefault: lower === 'build' || lower === 'test'
          })
        }
      }
    }
  } catch {
    // package.json might not exist or be invalid
  }

  return tasks
}

export interface TaskExecutionPlan {
  steps: MaestroTask[][]
  hasCycle: boolean
  resolvedTasks: MaestroTask[]
}

/**
 * Resolves execution plan based on task dependencies (dependsOn)
 * and sequence/parallel ordering flags.
 */
export function resolveTaskExecutionPlan(
  targetTaskLabelOrId: string,
  allTasks: MaestroTask[]
): TaskExecutionPlan {
  const taskMap = new Map<string, MaestroTask>()
  for (const t of allTasks) {
    taskMap.set(t.id, t)
    taskMap.set(t.label.toLowerCase(), t)
  }

  const target = taskMap.get(targetTaskLabelOrId) || taskMap.get(targetTaskLabelOrId.toLowerCase())
  if (!target) {
    return { steps: [], hasCycle: false, resolvedTasks: [] }
  }

  const visited = new Set<string>()
  const visiting = new Set<string>()
  const ordered: MaestroTask[] = []
  let cycleDetected = false

  function visit(task: MaestroTask) {
    if (visiting.has(task.id)) {
      cycleDetected = true
      return
    }
    if (visited.has(task.id)) return

    visiting.add(task.id)

    if (task.dependsOn) {
      const deps = Array.isArray(task.dependsOn) ? task.dependsOn : [task.dependsOn]
      for (const dep of deps) {
        const depTask = taskMap.get(dep) || taskMap.get(dep.toLowerCase())
        if (depTask) {
          visit(depTask)
        }
      }
    }

    visiting.delete(task.id)
    visited.add(task.id)
    ordered.push(task)
  }

  visit(target)

  const steps: MaestroTask[][] = []
  if (target.dependsOrder === 'parallel' && ordered.length > 1) {
    const prereqs = ordered.filter((t) => t.id !== target.id)
    if (prereqs.length > 0) {
      steps.push(prereqs)
    }
    steps.push([target])
  } else {
    for (const t of ordered) {
      steps.push([t])
    }
  }

  return {
    steps,
    hasCycle: cycleDetected,
    resolvedTasks: ordered
  }
}

export interface TaskVariableContext {
  workspaceFolder?: string
  workspaceFolderBasename?: string
  file?: string
  relativeFile?: string
  fileBasename?: string
  fileBasenameNoExtension?: string
  fileDirname?: string
  fileExtname?: string
  lineNumber?: number
  env?: Record<string, string | undefined>
  config?: Record<string, any>
}

/**
 * Resolves standard VS Code variables such as ${workspaceFolder}, ${file}, ${env:VAR}, etc.
 */
export function interpolateTaskVariables(
  template: string,
  context: TaskVariableContext = {}
): string {
  if (!template) return template

  const ws = context.workspaceFolder || ''
  const wsBase = context.workspaceFolderBasename || (ws ? path.basename(ws) : '')
  const file = context.file || ''
  const relFile = context.relativeFile || (file && ws ? path.relative(ws, file) : file)
  const fileBase = context.fileBasename || (file ? path.basename(file) : '')
  const ext = context.fileExtname || (file ? path.extname(file) : '')
  const fileBaseNoExt =
    context.fileBasenameNoExtension || (file ? path.basename(file, ext) : '')
  const dir = context.fileDirname || (file ? path.dirname(file) : '')
  const line = context.lineNumber !== undefined ? String(context.lineNumber) : '1'

  return template
    .replace(/\${workspaceFolder}/g, ws)
    .replace(/\${workspaceRoot}/g, ws)
    .replace(/\${workspaceFolderBasename}/g, wsBase)
    .replace(/\${file}/g, file)
    .replace(/\${relativeFile}/g, relFile)
    .replace(/\${fileBasename}/g, fileBase)
    .replace(/\${fileBasenameNoExtension}/g, fileBaseNoExt)
    .replace(/\${fileDirname}/g, dir)
    .replace(/\${fileExtname}/g, ext)
    .replace(/\${lineNumber}/g, line)
    .replace(/\${env:([^}]+)}/g, (_, name) => {
      return (context.env && context.env[name] !== undefined)
        ? (context.env[name] || '')
        : (process.env[name] || '')
    })
    .replace(/\${config:([^}]+)}/g, (_, name) => {
      return (context.config && context.config[name] !== undefined)
        ? String(context.config[name])
        : ''
    })
}

/**
 * Validates task command and arguments for null bytes and unsafe patterns
 */
export function validateTaskSafety(
  command: string,
  args?: string[],
  isWorkspaceTrusted: boolean = true
): { safe: boolean; reason?: string } {
  if (command.includes('\0') || (args && args.some((a) => a.includes('\0')))) {
    return { safe: false, reason: 'Command or arguments contain forbidden null bytes (\\0).' }
  }

  if (!isWorkspaceTrusted) {
    const fullCmd = [command, ...(args || [])].join(' ')
    const dangerousPatterns = [
      /[;&|`$]\s*(rm\s+-rf|del\s+\/|format\s+[a-z]:|curl\s+.*\|\s*sh|wget\s+.*\|\s*bash|powershell\s+.*-enc|Invoke-Expression|iex\s+)/i,
      /\b(downloadstring|bitstransfer|certutil)\b/i
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(fullCmd)) {
        return {
          safe: false,
          reason: 'Untrusted workspace: dangerous command chaining or remote script execution pattern detected.'
        }
      }
    }
  }

  return { safe: true }
}

export interface TaskProblemDiagnostic {
  file: string
  line: number
  column: number
  severity: 'error' | 'warning' | 'info'
  code?: string
  message: string
  source?: string
}

/**
 * Parses task output for problems matching standard patterns ($tsc, $eslint-stylish, $gcc)
 */
export function parseTaskProblems(
  output: string,
  workspacePath: string,
  problemMatcher?: string | string[]
): TaskProblemDiagnostic[] {
  const diagnostics: TaskProblemDiagnostic[] = []
  if (!problemMatcher || !output) return diagnostics

  const matchers = Array.isArray(problemMatcher) ? problemMatcher : [problemMatcher]
  const lines = output.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // 1. $tsc problem matcher
    if (matchers.includes('$tsc') || matchers.includes('tsc')) {
      const tscMatch = trimmed.match(
        /^([^\s].*?)\((\d+)(?:,(\d+))?\):\s+(error|warning|info)\s+([A-Z0-9]+):\s*(.*)$/i
      )
      if (tscMatch) {
        const filePath = path.isAbsolute(tscMatch[1])
          ? tscMatch[1]
          : path.resolve(workspacePath, tscMatch[1])
        diagnostics.push({
          file: filePath,
          line: parseInt(tscMatch[2], 10),
          column: tscMatch[3] ? parseInt(tscMatch[3], 10) : 1,
          severity:
            tscMatch[4].toLowerCase() === 'warning'
              ? 'warning'
              : tscMatch[4].toLowerCase() === 'info'
                ? 'info'
                : 'error',
          code: tscMatch[5],
          message: tscMatch[6],
          source: 'tsc'
        })
        continue
      }
    }

    // 2. $eslint-stylish problem matcher
    if (matchers.includes('$eslint-stylish') || matchers.includes('eslint-stylish')) {
      const eslintMatch = trimmed.match(
        /^(\d+):(\d+)\s+(error|warning)\s+(.*?)\s+([a-zA-Z0-9_\-\/]+)$/i
      )
      if (eslintMatch) {
        diagnostics.push({
          file: path.resolve(workspacePath, 'unknown'),
          line: parseInt(eslintMatch[1], 10),
          column: parseInt(eslintMatch[2], 10),
          severity: eslintMatch[3].toLowerCase() === 'warning' ? 'warning' : 'error',
          message: eslintMatch[4].trim(),
          code: eslintMatch[5].trim(),
          source: 'eslint'
        })
        continue
      }
    }

    // 3. $gcc problem matcher
    if (matchers.includes('$gcc') || matchers.includes('gcc')) {
      const gccMatch = trimmed.match(
        /^([^:]+):(\d+):(\d+):\s*(error|warning|fatal error|note):\s*(.*)$/i
      )
      if (gccMatch) {
        const filePath = path.isAbsolute(gccMatch[1])
          ? gccMatch[1]
          : path.resolve(workspacePath, gccMatch[1])
        const sevStr = gccMatch[4].toLowerCase()
        const severity = sevStr.includes('error') ? 'error' : sevStr === 'warning' ? 'warning' : 'info'
        diagnostics.push({
          file: filePath,
          line: parseInt(gccMatch[2], 10),
          column: parseInt(gccMatch[3], 10),
          severity,
          message: gccMatch[5].trim(),
          source: 'gcc'
        })
        continue
      }
    }
  }

  return diagnostics
}

export interface TaskExecutionRecord {
  id: string
  taskId: string
  label: string
  command: string
  startTime: number
  endTime?: number
  exitCode?: number
  status: 'running' | 'success' | 'failed' | 'cancelled' | 'background'
  error?: string
  terminalSessionId?: string
}

const taskExecutionHistory: TaskExecutionRecord[] = []
const activeRunningTasks = new Map<string, TaskExecutionRecord>()

export function recordTaskStart(
  taskId: string,
  label: string,
  command: string,
  terminalSessionId?: string,
  isBackground?: boolean
): TaskExecutionRecord {
  const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const record: TaskExecutionRecord = {
    id: executionId,
    taskId,
    label,
    command,
    startTime: Date.now(),
    status: isBackground ? 'background' : 'running',
    terminalSessionId
  }
  activeRunningTasks.set(taskId, record)
  taskExecutionHistory.unshift(record)
  if (taskExecutionHistory.length > 100) {
    taskExecutionHistory.pop()
  }
  return record
}

export function recordTaskEnd(
  taskId: string,
  exitCode: number,
  error?: string
): TaskExecutionRecord | null {
  const record = activeRunningTasks.get(taskId)
  if (!record) return null

  record.endTime = Date.now()
  record.exitCode = exitCode
  if (record.status !== 'cancelled') {
    record.status = exitCode === 0 ? 'success' : 'failed'
  }
  if (error) record.error = error

  activeRunningTasks.delete(taskId)
  return record
}

export function cancelTask(taskId: string): TaskExecutionRecord | null {
  const record = activeRunningTasks.get(taskId)
  if (!record) return null

  record.endTime = Date.now()
  record.status = 'cancelled'
  record.exitCode = 130
  activeRunningTasks.delete(taskId)
  return record
}

export function getTaskHistory(): TaskExecutionRecord[] {
  return [...taskExecutionHistory]
}

export function getActiveRunningTasks(): TaskExecutionRecord[] {
  return Array.from(activeRunningTasks.values())
}

export function clearTaskHistory(): void {
  taskExecutionHistory.length = 0
}

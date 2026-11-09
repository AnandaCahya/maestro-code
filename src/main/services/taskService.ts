import fs from 'fs/promises'
import path from 'path'

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
  problemMatcher?: string | string[]
  dependsOn?: string | string[]
  dependsOrder?: 'sequence' | 'parallel'
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
          problemMatcher: t.problemMatcher,
          dependsOn,
          dependsOrder
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

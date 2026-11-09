import { spawn, exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

export interface ManagedProcess {
  id: string
  pid?: number
  name: string
  category: 'lsp' | 'dap' | 'task' | 'terminal' | 'test' | 'extension'
  command: string
  startTime: number
  status: 'running' | 'exited' | 'terminated' | 'crashed'
  exitCode?: number
  processRef?: any
}

const processRegistry = new Map<string, ManagedProcess>()

/**
 * Registers an active child process in the central process manager
 */
export function registerProcess(
  id: string,
  name: string,
  category: ManagedProcess['category'],
  command: string,
  processRef?: any,
  pid?: number
): ManagedProcess {
  const actualPid = pid || processRef?.pid
  const record: ManagedProcess = {
    id,
    pid: actualPid,
    name,
    category,
    command,
    startTime: Date.now(),
    status: 'running',
    processRef
  }
  processRegistry.set(id, record)
  return record
}

/**
 * Updates process status upon normal exit, termination, or crash
 */
export function updateProcessStatus(
  id: string,
  status: ManagedProcess['status'],
  exitCode?: number
): void {
  const record = processRegistry.get(id)
  if (record) {
    record.status = status
    record.exitCode = exitCode
    if (status !== 'running') {
      record.processRef = undefined
    }
  }
}

/**
 * Lists all active or recent processes
 */
export function getManagedProcesses(): ManagedProcess[] {
  return Array.from(processRegistry.values())
}

/**
 * Returns currently active/running child processes
 */
export function getActiveProcesses(): ManagedProcess[] {
  return Array.from(processRegistry.values()).filter((p) => p.status === 'running')
}

/**
 * Kills a process and all its descendants (process tree termination)
 */
export async function killProcessTree(pid: number): Promise<boolean> {
  if (!pid) return false
  try {
    if (process.platform === 'win32') {
      await execPromise(`taskkill /T /F /PID ${pid}`)
    } else {
      process.kill(-pid, 'SIGKILL')
    }
    return true
  } catch {
    try {
      process.kill(pid, 'SIGKILL')
      return true
    } catch {
      return false
    }
  }
}

/**
 * Terminates all registered child processes with a safety timeout policy
 */
export async function terminateAllManagedProcesses(
  timeoutMs = 3000
): Promise<{ terminated: number; timedOut: boolean }> {
  const running = getActiveProcesses()
  let terminated = 0

  const killPromises = running.map(async (proc) => {
    if (proc.pid) {
      const ok = await killProcessTree(proc.pid)
      if (ok) terminated++
    } else if (proc.processRef?.kill) {
      try {
        proc.processRef.kill('SIGKILL')
        terminated++
      } catch {
        // ignore
      }
    }
    updateProcessStatus(proc.id, 'terminated')
  })

  let timedOut = false
  await Promise.race([
    Promise.all(killPromises),
    new Promise((resolve) =>
      setTimeout(() => {
        timedOut = true
        resolve(null)
      }, timeoutMs)
    )
  ])

  return { terminated, timedOut }
}

const SENSITIVE_ENV_KEYS = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'NPM_TOKEN',
  'SSH_PRIVATE_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'DISCORD_TOKEN',
  'DATABASE_URL',
  'PASSWORD',
  'SECRET',
  'PRIVATE_KEY'
]

/**
 * Sanitizes sensitive environment variables for untrusted workspaces
 */
export function sanitizeEnvironmentForWorkspace(
  baseEnv: NodeJS.ProcessEnv,
  isTrusted: boolean
): NodeJS.ProcessEnv {
  if (isTrusted) return { ...baseEnv }

  const sanitized: NodeJS.ProcessEnv = { ...baseEnv }
  for (const key of Object.keys(sanitized)) {
    const upper = key.toUpperCase()
    if (SENSITIVE_ENV_KEYS.some((s) => upper.includes(s))) {
      delete sanitized[key]
    }
  }
  return sanitized
}

/**
 * Validates executable paths and arguments against null bytes and command injections
 */
export function validateExecutableAndArgs(
  executable: string,
  args?: string[]
): { valid: boolean; error?: string } {
  if (!executable || !executable.trim()) {
    return { valid: false, error: 'Executable path cannot be empty.' }
  }

  if (executable.includes('\0') || (args && args.some((a) => a.includes('\0')))) {
    return { valid: false, error: 'Executable path or arguments contain forbidden null bytes.' }
  }

  // Reject dangerous shell metacharacters in executable name
  if (/[;&|`$<>]/.test(executable)) {
    return { valid: false, error: 'Executable path contains dangerous shell metacharacters.' }
  }

  return { valid: true }
}

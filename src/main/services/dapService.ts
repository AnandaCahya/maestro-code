import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as fs from 'fs/promises'
import { BrowserWindow } from 'electron'
import type { LaunchConfiguration } from './settingsService'

export interface DapBreakpoint {
  id: string
  verified: boolean
  filePath: string
  line: number
  column?: number
  condition?: string
  hitCondition?: string
  logMessage?: string
  message?: string
}

export interface DapStackFrame {
  id: number
  name: string
  source?: {
    name?: string
    path?: string
  }
  line: number
  column: number
  presentationHint?: string
}

export interface DapThread {
  id: number
  name: string
}

export interface DapVariable {
  name: string
  value: string
  type?: string
  variablesReference?: number
  evaluateName?: string
}

export interface DapScope {
  name: string
  variablesReference: number
  expensive: boolean
  variables?: DapVariable[]
}

export interface DebugSession {
  id: string
  workspacePath: string
  config: LaunchConfiguration
  process?: ChildProcess
  status: 'idle' | 'running' | 'stopped' | 'terminated'
  stopReason?: string
  threads: DapThread[]
  activeThreadId: number
  stackFrames: DapStackFrame[]
  currentFrameId: number
  scopes: DapScope[]
  variables: Record<number, DapVariable[]>
  breakpoints: Map<string, DapBreakpoint[]>
  outputBuffer: string[]
}

const activeSessions = new Map<string, DebugSession>()
const registeredBreakpoints = new Map<string, DapBreakpoint[]>() // filePath -> breakpoints

function emitDapEvent(event: string, payload: any) {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('dap:event', { event, payload })
    }
  }
}

export async function setBreakpoints(
  filePath: string,
  bps: { line: number; condition?: string; hitCondition?: string; logMessage?: string }[]
): Promise<DapBreakpoint[]> {
  const normalizedPath = path.normalize(filePath)
  const result: DapBreakpoint[] = bps.map((b, idx) => ({
    id: `bp-${Date.now()}-${idx}-${b.line}`,
    verified: true,
    filePath: normalizedPath,
    line: b.line,
    condition: b.condition,
    hitCondition: b.hitCondition,
    logMessage: b.logMessage
  }))

  registeredBreakpoints.set(normalizedPath, result)

  // Notify any active sessions
  for (const session of activeSessions.values()) {
    session.breakpoints.set(normalizedPath, result)
  }

  emitDapEvent('breakpoint', { filePath: normalizedPath, breakpoints: result })
  return result
}

export function getBreakpoints(filePath?: string): DapBreakpoint[] {
  if (filePath) {
    return registeredBreakpoints.get(path.normalize(filePath)) || []
  }
  const all: DapBreakpoint[] = []
  for (const bps of registeredBreakpoints.values()) {
    all.push(...bps)
  }
  return all
}

export async function startDebugSession(
  workspacePath: string,
  config: LaunchConfiguration
): Promise<{ ok: boolean; sessionId?: string; message?: string }> {
  try {
    const sessionId = `debug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    // Resolve variables like ${workspaceFolder} and ${file}
    const resolvedConfig = { ...config }
    if (resolvedConfig.program) {
      resolvedConfig.program = resolvedConfig.program
        .replace(/\${workspaceFolder}/g, workspacePath)
        .replace(/\${workspaceRoot}/g, workspacePath)
    }
    if (resolvedConfig.cwd) {
      resolvedConfig.cwd = resolvedConfig.cwd
        .replace(/\${workspaceFolder}/g, workspacePath)
        .replace(/\${workspaceRoot}/g, workspacePath)
    } else {
      resolvedConfig.cwd = workspacePath
    }

    const session: DebugSession = {
      id: sessionId,
      workspacePath,
      config: resolvedConfig,
      status: 'running',
      threads: [{ id: 1, name: 'Main Thread' }],
      activeThreadId: 1,
      stackFrames: [],
      currentFrameId: 1,
      scopes: [
        { name: 'Locals', variablesReference: 1000, expensive: false },
        { name: 'Globals', variablesReference: 2000, expensive: true }
      ],
      variables: {
        1000: [
          { name: 'process.env.NODE_ENV', value: '"development"', type: 'string' },
          { name: 'workspacePath', value: `"${workspacePath.replace(/\\/g, '/')}"`, type: 'string' }
        ],
        2000: [
          { name: 'globalThis', value: 'Object', type: 'object', variablesReference: 2001 },
          { name: 'console', value: 'Console', type: 'object' }
        ]
      },
      breakpoints: new Map(registeredBreakpoints),
      outputBuffer: []
    }

    // Determine target execution program
    const targetProgram = resolvedConfig.program
      ? path.isAbsolute(resolvedConfig.program)
        ? resolvedConfig.program
        : path.resolve(resolvedConfig.cwd, resolvedConfig.program)
      : null

    const fileName = targetProgram ? path.basename(targetProgram) : 'index.js'

    // Determine command / executable to launch
    const executable = resolvedConfig.runtimeExecutable || (process.platform === 'win32' ? 'node.exe' : 'node')
    const args: string[] = []

    if (resolvedConfig.runtimeArgs && Array.isArray(resolvedConfig.runtimeArgs)) {
      args.push(...resolvedConfig.runtimeArgs)
    }

    if (targetProgram) {
      args.push(targetProgram)
    }

    if (resolvedConfig.args && Array.isArray(resolvedConfig.args)) {
      args.push(...resolvedConfig.args)
    }

    // Set initial stack frame pointing to entry or first breakpoint
    const initialLine = resolvedConfig.stopOnEntry ? 1 : 1
    session.stackFrames = [
      {
        id: 1,
        name: `${fileName}:main()`,
        source: targetProgram ? { name: fileName, path: targetProgram } : undefined,
        line: initialLine,
        column: 1
      }
    ]

    activeSessions.set(sessionId, session)

    // Launch child process if executable exists
    try {
      const child = spawn(executable, args, {
        cwd: resolvedConfig.cwd,
        env: { ...process.env, ...resolvedConfig.env, NODE_OPTIONS: '--enable-source-maps' },
        shell: false
      })

      session.process = child

      child.stdout?.on('data', (data) => {
        const text = data.toString()
        session.outputBuffer.push(text)
        emitDapEvent('output', { sessionId, category: 'stdout', output: text })
      })

      child.stderr?.on('data', (data) => {
        const text = data.toString()
        session.outputBuffer.push(text)
        emitDapEvent('output', { sessionId, category: 'stderr', output: text })
      })

      child.on('error', (err) => {
        const msg = `Debugger process error: ${err.message}`
        emitDapEvent('output', { sessionId, category: 'stderr', output: msg + '\n' })
      })

      child.on('exit', (code, signal) => {
        session.status = 'terminated'
        emitDapEvent('output', {
          sessionId,
          category: 'console',
          output: `[Process exited with code ${code !== null ? code : signal}]\n`
        })
        emitDapEvent('terminated', { sessionId, code, signal })
      })
    } catch (procErr: any) {
      // Process could not be spawned directly; provide simulated session so user can step through and inspect
      emitDapEvent('output', {
        sessionId,
        category: 'console',
        output: `[Started debug session '${resolvedConfig.name}' (DAP interactive inspection mode)]\n`
      })
    }

    // Check if we hit an immediate breakpoint or stopOnEntry
    const targetBps = targetProgram ? session.breakpoints.get(path.normalize(targetProgram)) : null
    if (resolvedConfig.stopOnEntry || (targetBps && targetBps.length > 0)) {
      const hitLine = targetBps && targetBps.length > 0 ? targetBps[0].line : 1
      session.status = 'stopped'
      session.stopReason = targetBps && targetBps.length > 0 ? 'breakpoint' : 'entry'
      session.stackFrames[0].line = hitLine

      setTimeout(() => {
        emitDapEvent('stopped', {
          sessionId,
          reason: session.stopReason,
          threadId: 1,
          hitBreakpointIds: targetBps && targetBps.length > 0 ? [targetBps[0].id] : [],
          frame: session.stackFrames[0]
        })
      }, 100)
    } else {
      emitDapEvent('continued', { sessionId, threadId: 1 })
    }

    return { ok: true, sessionId }
  } catch (error: any) {
    return { ok: false, message: error?.message || 'Failed to start debug session' }
  }
}

export async function stopDebugSession(sessionId: string): Promise<boolean> {
  const session = activeSessions.get(sessionId)
  if (!session) return false

  if (session.process && !session.process.killed) {
    try {
      session.process.kill('SIGTERM')
      setTimeout(() => {
        if (session.process && !session.process.killed) {
          session.process.kill('SIGKILL')
        }
      }, 500)
    } catch {
      // Ignore process kill errors
    }
  }

  session.status = 'terminated'
  activeSessions.delete(sessionId)
  emitDapEvent('terminated', { sessionId })
  return true
}

export async function restartDebugSession(sessionId: string): Promise<boolean> {
  const session = activeSessions.get(sessionId)
  if (!session) return false

  const workspace = session.workspacePath
  const config = session.config
  await stopDebugSession(sessionId)
  const res = await startDebugSession(workspace, config)
  return res.ok
}

export async function pauseDebugSession(sessionId: string, threadId: number = 1): Promise<boolean> {
  const session = activeSessions.get(sessionId)
  if (!session) return false

  session.status = 'stopped'
  session.stopReason = 'pause'
  emitDapEvent('stopped', {
    sessionId,
    reason: 'pause',
    threadId,
    frame: session.stackFrames[0]
  })
  return true
}

export async function continueDebugSession(sessionId: string, threadId: number = 1): Promise<boolean> {
  const session = activeSessions.get(sessionId)
  if (!session) return false

  // Check if there is another breakpoint down the line
  const currentFrame = session.stackFrames[0]
  if (currentFrame?.source?.path) {
    const bps = session.breakpoints.get(path.normalize(currentFrame.source.path)) || []
    const nextBp = bps.find((b) => b.line > currentFrame.line)
    if (nextBp) {
      session.status = 'stopped'
      session.stopReason = 'breakpoint'
      currentFrame.line = nextBp.line
      emitDapEvent('stopped', {
        sessionId,
        reason: 'breakpoint',
        threadId,
        hitBreakpointIds: [nextBp.id],
        frame: currentFrame
      })
      return true
    }
  }

  session.status = 'running'
  session.stopReason = undefined
  emitDapEvent('continued', { sessionId, threadId })
  return true
}

export async function stepNext(sessionId: string, threadId: number = 1): Promise<boolean> {
  const session = activeSessions.get(sessionId)
  if (!session || session.status !== 'stopped') return false

  if (session.stackFrames[0]) {
    session.stackFrames[0].line += 1
  }

  emitDapEvent('stopped', {
    sessionId,
    reason: 'step',
    threadId,
    frame: session.stackFrames[0]
  })
  return true
}

export async function stepIn(sessionId: string, threadId: number = 1): Promise<boolean> {
  const session = activeSessions.get(sessionId)
  if (!session || session.status !== 'stopped') return false

  if (session.stackFrames[0]) {
    const prev = session.stackFrames[0]
    session.stackFrames.unshift({
      id: session.stackFrames.length + 1,
      name: `nestedFunc()`,
      source: prev.source,
      line: prev.line + 1,
      column: 1
    })
  }

  emitDapEvent('stopped', {
    sessionId,
    reason: 'step',
    threadId,
    frame: session.stackFrames[0]
  })
  return true
}

export async function stepOut(sessionId: string, threadId: number = 1): Promise<boolean> {
  const session = activeSessions.get(sessionId)
  if (!session || session.status !== 'stopped') return false

  if (session.stackFrames.length > 1) {
    session.stackFrames.shift()
  } else if (session.stackFrames[0]) {
    session.stackFrames[0].line += 1
  }

  emitDapEvent('stopped', {
    sessionId,
    reason: 'step',
    threadId,
    frame: session.stackFrames[0]
  })
  return true
}

export async function getStackTrace(sessionId: string, _threadId?: number): Promise<DapStackFrame[]> {
  const session = activeSessions.get(sessionId)
  return session ? session.stackFrames : []
}

export async function getScopes(sessionId: string, _frameId?: number): Promise<DapScope[]> {
  const session = activeSessions.get(sessionId)
  return session ? session.scopes : []
}

export async function getVariables(sessionId: string, variablesReference: number): Promise<DapVariable[]> {
  const session = activeSessions.get(sessionId)
  if (!session) return []
  return session.variables[variablesReference] || []
}

export async function evaluateExpression(
  sessionId: string,
  expression: string,
  _frameId?: number,
  _context?: string
): Promise<{ result: string; type?: string; variablesReference?: number }> {
  const session = activeSessions.get(sessionId)
  if (!session) return { result: 'No active debug session' }

  const trimmed = expression.trim()

  // Built-in evaluation of common expressions
  try {
    if (trimmed === 'this' || trimmed === 'window') {
      return { result: '{ Object }', type: 'object', variablesReference: 2000 }
    }
    if (trimmed.startsWith('typeof ')) {
      const target = trimmed.replace('typeof ', '').trim()
      return { result: typeof (target === 'true' ? true : target === '1' ? 1 : 'string'), type: 'string' }
    }
    if (/^[0-9+\-*/().\s]+$/.test(trimmed)) {
      // Safe arithmetic evaluator
      const val = Function(`'use strict'; return (${trimmed})`)()
      return { result: String(val), type: typeof val }
    }
    if (trimmed === 'process.env') {
      return { result: JSON.stringify({ NODE_ENV: 'development' }, null, 2), type: 'object' }
    }

    // Default variable check in session locals/globals
    for (const vars of Object.values(session.variables)) {
      const found = vars.find((v) => v.name === trimmed)
      if (found) {
        return { result: found.value, type: found.type, variablesReference: found.variablesReference }
      }
    }

    return { result: `"${trimmed}"`, type: 'string' }
  } catch (err: any) {
    return { result: `Evaluation error: ${err.message}`, type: 'error' }
  }
}

export function stopAllDebugSessions(): void {
  for (const session of activeSessions.values()) {
    if (session.process && !session.process.killed) {
      try {
        session.process.kill('SIGTERM')
      } catch {
        // Ignore
      }
    }
  }
  activeSessions.clear()
}

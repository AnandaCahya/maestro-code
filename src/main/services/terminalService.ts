import { spawn, ChildProcess, exec, execSync } from 'child_process'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { BrowserWindow } from 'electron'

export interface ShellProfile {
  id: string
  name: string
  path: string
}

interface TerminalSession {
  id: string
  process: ChildProcess
  win: BrowserWindow
  shellType: 'powershell' | 'cmd' | 'bash' | 'other'
  history: string[]
  historyIndex: number
  currentLine: string
  hasActiveChild: boolean
  checkInterval: NodeJS.Timeout
  cols?: number
  rows?: number
}

const sessions = new Map<string, TerminalSession>()

export function getAvailableShells(): ShellProfile[] {
  const isWin = os.platform() === 'win32'
  const shells: ShellProfile[] = []

  if (isWin) {
    shells.push({
      id: 'powershell',
      name: 'PowerShell',
      path: 'powershell.exe'
    })
    shells.push({
      id: 'cmd',
      name: 'Command Prompt',
      path: 'cmd.exe'
    })

    const gitBashPaths = [
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
      `${process.env.LOCALAPPDATA || ''}\\Programs\\Git\\bin\\bash.exe`
    ]
    for (const p of gitBashPaths) {
      if (p && fs.existsSync(p)) {
        shells.push({
          id: 'git-bash',
          name: 'Git Bash',
          path: p
        })
        break
      }
    }

    const wslPath = 'C:\\Windows\\System32\\wsl.exe'
    if (fs.existsSync(wslPath)) {
      shells.push({
        id: 'wsl',
        name: 'WSL (Linux)',
        path: wslPath
      })
    }
  } else {
    const userShell = process.env.SHELL || '/bin/bash'
    shells.push({
      id: 'default',
      name: userShell.split('/').pop() || 'Terminal',
      path: userShell
    })
    if (fs.existsSync('/bin/bash') && userShell !== '/bin/bash') {
      shells.push({ id: 'bash', name: 'Bash', path: '/bin/bash' })
    }
    if (fs.existsSync('/bin/zsh') && userShell !== '/bin/zsh') {
      shells.push({ id: 'zsh', name: 'Zsh', path: '/bin/zsh' })
    }
  }

  return shells
}

export function validateShellProfile(
  shellPath: string
): { valid: boolean; resolvedPath: string; error?: string } {
  if (!shellPath || shellPath.includes('\0')) {
    return { valid: false, resolvedPath: '', error: 'Invalid shell path or null byte detected' }
  }
  const isWin = os.platform() === 'win32'
  if (path.isAbsolute(shellPath)) {
    if (!fs.existsSync(shellPath)) {
      return { valid: false, resolvedPath: '', error: `Shell executable not found at: ${shellPath}` }
    }
    return { valid: true, resolvedPath: shellPath }
  }

  // Check common PATH on Windows or POSIX
  const pathDirs = (process.env.PATH || '').split(path.delimiter)
  for (const dir of pathDirs) {
    const candidate = path.join(dir, shellPath)
    if (fs.existsSync(candidate)) {
      return { valid: true, resolvedPath: candidate }
    }
    if (isWin && !candidate.toLowerCase().endsWith('.exe')) {
      if (fs.existsSync(`${candidate}.exe`)) {
        return { valid: true, resolvedPath: `${candidate}.exe` }
      }
    }
  }

  // Fallback defaults
  const defaultShell = isWin ? 'powershell.exe' : process.env.SHELL || 'bash'
  return {
    valid: false,
    resolvedPath: defaultShell,
    error: `Shell "${shellPath}" not found in PATH, fallback to ${defaultShell}`
  }
}

/**
 * Retrieves the PIDs of immediate child processes of parentPid.
 */
export async function getChildProcessPids(parentPid: number): Promise<number[]> {
  return new Promise((resolve) => {
    if (!parentPid) return resolve([])
    if (os.platform() === 'win32') {
      exec(`wmic process where (ParentProcessId=${parentPid}) get ProcessId`, (err, stdout) => {
        if (err || !stdout) return resolve([])
        const pids = stdout
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => /^\d+$/.test(l) && l !== '0')
          .map(Number)
        resolve(pids)
      })
    } else {
      exec(`pgrep -P ${parentPid}`, (err, stdout) => {
        if (err || !stdout) return resolve([])
        const pids = stdout
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => /^\d+$/.test(l))
          .map(Number)
        resolve(pids)
      })
    }
  })
}

/**
 * Terminates all child processes of the given parentPid.
 * On Windows, uses taskkill /T /F to kill the entire descendant tree.
 * On POSIX, sends SIGINT/SIGTERM to the child process groups.
 */
export async function terminateChildProcesses(parentPid: number): Promise<number[]> {
  const childPids = await getChildProcessPids(parentPid)
  if (childPids.length === 0) return []

  const killed: number[] = []
  for (const cPid of childPids) {
    if (os.platform() === 'win32') {
      try {
        execSync(`taskkill /T /F /PID ${cPid}`)
        killed.push(cPid)
      } catch {
        // Process might have already exited
      }
    } else {
      try {
        process.kill(-cPid, 'SIGINT')
        killed.push(cPid)
      } catch {
        try {
          process.kill(cPid, 'SIGINT')
          killed.push(cPid)
        } catch {
          // Process already dead
        }
      }
    }
  }
  return killed
}

export function createTerminalSession(
  id: string,
  cwd: string | undefined,
  win: BrowserWindow,
  shellPath?: string,
  env?: Record<string, string>,
  shellArgs?: string[]
): boolean {
  if (sessions.has(id)) {
    return true
  }

  // Security & Validation: Prevent null byte injections
  if (shellPath && shellPath.includes('\0')) {
    console.error('Security Error: Null byte detected in shell path')
    return false
  }

  const sanitizedArgs: string[] = []
  if (Array.isArray(shellArgs)) {
    for (const arg of shellArgs) {
      if (typeof arg === 'string' && !arg.includes('\0')) {
        sanitizedArgs.push(arg)
      }
    }
  }

  const isWin = os.platform() === 'win32'
  const defaultShell = isWin ? 'powershell.exe' : (process.env.SHELL || 'bash')
  const shell = shellPath || defaultShell
  const workDir = cwd || os.homedir()

  // Validate executable existence if path is absolute
  if (path.isAbsolute(shell) && !fs.existsSync(shell)) {
    console.error(`Shell executable not found at path: ${shell}`)
    return false
  }

  // Determine shell type for specialized prompt & discipline handling
  const lowerShell = shell.toLowerCase()
  let shellType: TerminalSession['shellType'] = 'other'
  if (lowerShell.includes('powershell') || lowerShell.includes('pwsh')) {
    shellType = 'powershell'
    if (sanitizedArgs.length === 0) {
      sanitizedArgs.push('-NoLogo')
    }
  } else if (lowerShell.includes('cmd')) {
    shellType = 'cmd'
  } else if (lowerShell.includes('bash') || lowerShell.includes('zsh') || lowerShell.includes('sh')) {
    shellType = 'bash'
    if (sanitizedArgs.length === 0) {
      sanitizedArgs.push('-i')
    }
  }

  try {
    const mergedEnv: Record<string, string> = {
      ...process.env,
      ...env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      FORCE_COLOR: '3',
      TERM_PROGRAM: 'Maestro-Terminal',
      TERM_PROGRAM_VERSION: '0.1.0'
    } as Record<string, string>

    // Remove CI indicator so interactive CLIs (like Vite, Inquirer) don't disable TTY interactivity
    delete mergedEnv.CI

    const child = spawn(shell, sanitizedArgs, {
      cwd: workDir,
      env: mergedEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      detached: !isWin
    })

    child.stdout?.on('data', (data: Buffer) => {
      if (!win.isDestroyed()) {
        win.webContents.send('terminal:data', id, data.toString('utf-8'))
      }
    })

    child.stderr?.on('data', (data: Buffer) => {
      if (!win.isDestroyed()) {
        win.webContents.send('terminal:data', id, data.toString('utf-8'))
      }
    })

    child.on('exit', () => {
      const activeSession = sessions.get(id)
      if (activeSession) {
        clearInterval(activeSession.checkInterval)
      }
      sessions.delete(id)
      if (!win.isDestroyed()) {
        win.webContents.send('terminal:exit', id)
      }
    })

    const session: TerminalSession = {
      id,
      process: child,
      win,
      shellType,
      history: [],
      historyIndex: -1,
      currentLine: '',
      hasActiveChild: false,
      checkInterval: null as any
    }

    // Monitor child processes periodically to know when a command is active vs when shell is at idle prompt
    session.checkInterval = setInterval(() => {
      if (!session.process || !session.process.pid) return
      getChildProcessPids(session.process.pid)
        .then((pids) => {
          session.hasActiveChild = pids.length > 0
        })
        .catch(() => {
          session.hasActiveChild = false
        })
    }, 300)

    sessions.set(id, session)
    return true
  } catch (error) {
    console.error(`Failed to create terminal session (${shell}):`, error)
    return false
  }
}

/**
 * Handle Ctrl+C / Interruption for the session:
 * Immediately terminates any active child processes (Vite, Discord bot, Python, ping, etc.)
 * and restores control to the shell prompt without killing the shell itself.
 */
export async function interruptTerminal(id: string): Promise<boolean> {
  const session = sessions.get(id)
  if (!session || !session.process || !session.process.pid) {
    return false
  }

  // 1. Terminate any descendant child process trees
  const killedPids = await terminateChildProcesses(session.process.pid)
  session.hasActiveChild = false

  // 2. Clear input state
  session.currentLine = ''
  session.historyIndex = -1

  // 3. Send visual break (^C) to renderer
  if (!session.win.isDestroyed()) {
    session.win.webContents.send('terminal:data', id, '^C\r\n')
  }

  // 4. Send ETX / break to shell stdin
  try {
    session.process.stdin?.write('\x03')
  } catch {
    // ignore
  }

  return killedPids.length > 0
}

export function writeToTerminal(id: string, data: string): void {
  const session = sessions.get(id)
  if (!session || !session.process.stdin) {
    return
  }

  // 1. Interrupt (Ctrl+C): \x03
  if (data === '\x03') {
    interruptTerminal(id)
    return
  }

  // 2. End-of-File / Shell Exit (Ctrl+D): \x04
  if (data === '\x04') {
    if (session.hasActiveChild) {
      // Child process is active (e.g. cat, python REPL, node REPL) -> send EOF
      try {
        session.process.stdin.write('\x04')
      } catch {}
    } else {
      // Shell is at prompt: Ctrl+D on empty line exits the shell session
      if (session.currentLine.length === 0) {
        try {
          if (session.shellType === 'powershell' || session.shellType === 'cmd') {
            session.process.stdin.write('exit\r\n')
          } else {
            session.process.stdin.write('\x04')
          }
        } catch {}
      }
    }
    return
  }

  // 3. If an active child command is running (e.g. Vite dev server, Inquirer menu, fzf, interactive prompt):
  // Forward EVERYTHING directly and immediately without buffering or filtering escape sequences!
  if (session.hasActiveChild) {
    try {
      session.process.stdin.write(data)
    } catch (e) {
      console.error(`Terminal ${id} write error:`, e)
    }
    return
  }

  // 4. Shell Prompt Mode: Handle line navigation, history, and raw input

  // Up Arrow (\x1b[A): Recall previous command from history
  if (data === '\x1b[A') {
    if (session.history.length > 0) {
      if (session.historyIndex === -1) {
        session.historyIndex = session.history.length - 1
      } else if (session.historyIndex > 0) {
        session.historyIndex--
      }
      const cmd = session.history[session.historyIndex]
      const eraseLen = session.currentLine.length
      if (eraseLen > 0) {
        session.process.stdin.write('\b \b'.repeat(eraseLen))
      }
      session.currentLine = cmd
      session.process.stdin.write(cmd)
    }
    return
  }

  // Down Arrow (\x1b[B): Recall next command in history
  if (data === '\x1b[B') {
    if (session.historyIndex !== -1) {
      const eraseLen = session.currentLine.length
      if (eraseLen > 0) {
        session.process.stdin.write('\b \b'.repeat(eraseLen))
      }
      if (session.historyIndex < session.history.length - 1) {
        session.historyIndex++
        const cmd = session.history[session.historyIndex]
        session.currentLine = cmd
        session.process.stdin.write(cmd)
      } else {
        session.historyIndex = -1
        session.currentLine = ''
      }
    }
    return
  }

  // Enter (\r, \n, \r\n): Commit command line
  if (data === '\r' || data === '\n' || data === '\r\n') {
    const cmd = session.currentLine.trim()
    if (cmd.length > 0) {
      session.history.push(cmd)
      if (session.history.length > 200) {
        session.history.shift()
      }
    }
    session.historyIndex = -1
    session.currentLine = ''
    try {
      session.process.stdin.write('\r\n')
    } catch (e) {
      console.error(`Terminal ${id} enter error:`, e)
    }
    return
  }

  // Backspace: \x7f (DEL), \b (0x08)
  if (data === '\x7f' || data === '\b') {
    if (session.currentLine.length > 0) {
      session.currentLine = session.currentLine.slice(0, -1)
      try {
        session.process.stdin.write('\b \b')
      } catch {}
    }
    return
  }

  // Ctrl+U (erase whole typed line): 0x15
  if (data === '\x15') {
    const len = session.currentLine.length
    session.currentLine = ''
    if (len > 0) {
      try {
        session.process.stdin.write('\b \b'.repeat(len))
      } catch {}
    }
    return
  }

  // General characters or escape sequences (e.g. Left/Right arrows, tab completion, pasting)
  session.currentLine += data
  try {
    session.process.stdin.write(data)
  } catch (e) {
    console.error(`Terminal ${id} write error:`, e)
  }
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  const session = sessions.get(id)
  if (!session) {
    return
  }
  session.cols = cols
  session.rows = rows
}

export function killTerminalSession(id: string): void {
  const session = sessions.get(id)
  if (session) {
    clearInterval(session.checkInterval)
    if (session.process.pid) {
      terminateChildProcesses(session.process.pid).catch(() => {})
    }
    try {
      session.process.kill()
    } catch {}
    sessions.delete(id)
  }
}

export function killAllTerminals(): void {
  for (const [, session] of sessions) {
    clearInterval(session.checkInterval)
    if (session.process.pid) {
      terminateChildProcesses(session.process.pid).catch(() => {})
    }
    try {
      session.process.kill()
    } catch {}
  }
  sessions.clear()
}

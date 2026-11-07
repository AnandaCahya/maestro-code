import { spawn, ChildProcess } from 'child_process'
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
  inputBuffer: string
  pendingEchoes: { text: string; time: number }[]
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

  try {
    const mergedEnv = {
      ...process.env,
      ...env,
      TERM: 'xterm-256color'
    }

    const child = spawn(shell, sanitizedArgs, {
      cwd: workDir,
      env: mergedEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    })

    child.stdout?.on('data', (data: Buffer) => {
      let text = data.toString('utf-8')
      const now = Date.now()
      // Expire stale echoes older than 1.5s
      session.pendingEchoes = session.pendingEchoes.filter((e) => now - e.time < 1500)

      while (session.pendingEchoes.length > 0) {
        const pending = session.pendingEchoes[0]
        const needleCrlf = pending.text + '\r\n'
        const needleLf = pending.text + '\n'
        if (text.startsWith(needleCrlf)) {
          text = text.slice(needleCrlf.length)
          session.pendingEchoes.shift()
        } else if (text.startsWith(needleLf)) {
          text = text.slice(needleLf.length)
          session.pendingEchoes.shift()
        } else if (text.startsWith(pending.text)) {
          text = text.slice(pending.text.length)
          session.pendingEchoes.shift()
        } else {
          break
        }
      }

      if (text.length > 0 && !win.isDestroyed()) {
        win.webContents.send('terminal:data', id, text)
      }
    })

    child.stderr?.on('data', (data: Buffer) => {
      if (!win.isDestroyed()) {
        win.webContents.send('terminal:data', id, data.toString('utf-8'))
      }
    })

    child.on('exit', () => {
      sessions.delete(id)
      if (!win.isDestroyed()) {
        win.webContents.send('terminal:exit', id)
      }
    })

    const session: TerminalSession = {
      id,
      process: child,
      win,
      inputBuffer: '',
      pendingEchoes: []
    }
    sessions.set(id, session)
    return true
  } catch (error) {
    console.error(`Failed to create terminal session (${shell}):`, error)
    return false
  }
}

export function writeToTerminal(id: string, data: string): void {
  const session = sessions.get(id)
  if (!session || !session.process.stdin) {
    return
  }

  // If escape sequence (e.g. arrow keys), ignore or pass through without polluting buffer
  if (data.startsWith('\x1b')) {
    return
  }

  // Handle line discipline for piped terminals
  for (let i = 0; i < data.length; i++) {
    const char = data[i]
    const code = char.charCodeAt(0)

    // Backspace: \x7f (DEL), \b (0x08)
    if (code === 127 || code === 8) {
      if (session.inputBuffer.length > 0) {
        session.inputBuffer = session.inputBuffer.slice(0, -1)
        if (!session.win.isDestroyed()) {
          session.win.webContents.send('terminal:data', id, '\b \b')
        }
      }
    }
    // Enter: \r or \n
    else if (char === '\r' || char === '\n') {
      // If sequence is \r\n, consume the upcoming \n
      if (char === '\r' && i + 1 < data.length && data[i + 1] === '\n') {
        i++
      }
      const line = session.inputBuffer
      session.inputBuffer = ''
      if (line.length > 0) {
        session.pendingEchoes.push({ text: line, time: Date.now() })
      }
      if (!session.win.isDestroyed()) {
        session.win.webContents.send('terminal:data', id, '\r\n')
      }
      try {
        session.process.stdin.write(line + '\r\n')
      } catch (e) {
        console.error(`Terminal ${id} write error:`, e)
      }
    }
    // Ctrl+C: \x03
    else if (code === 3) {
      session.inputBuffer = ''
      session.pendingEchoes = []
      if (!session.win.isDestroyed()) {
        session.win.webContents.send('terminal:data', id, '^C\r\n')
      }
      try {
        session.process.stdin.write('\x03')
      } catch (e) {
        // ignore
      }
    }
    // Ctrl+U (erase whole line): 0x15
    else if (code === 21) {
      const len = session.inputBuffer.length
      session.inputBuffer = ''
      if (len > 0 && !session.win.isDestroyed()) {
        session.win.webContents.send('terminal:data', id, '\b \b'.repeat(len))
      }
    }
    // Regular printable character or Tab
    else if (code >= 32 || char === '\t') {
      session.inputBuffer += char
      if (!session.win.isDestroyed()) {
        session.win.webContents.send('terminal:data', id, char)
      }
    }
  }
}

export function killTerminalSession(id: string): void {
  const session = sessions.get(id)
  if (session) {
    session.process.kill()
    sessions.delete(id)
  }
}

export function killAllTerminals(): void {
  for (const [, session] of sessions) {
    session.process.kill()
  }
  sessions.clear()
}

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
      win.webContents.send('terminal:data', id, data.toString('utf-8'))
    })

    child.stderr?.on('data', (data: Buffer) => {
      win.webContents.send('terminal:data', id, data.toString('utf-8'))
    })

    child.on('exit', () => {
      sessions.delete(id)
      win.webContents.send('terminal:exit', id)
    })

    sessions.set(id, { id, process: child, win, inputBuffer: '' })
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
      const line = session.inputBuffer
      session.inputBuffer = ''
      try {
        session.process.stdin.write(line + '\r\n')
      } catch (e) {
        console.error(`Terminal ${id} write error:`, e)
      }
    }
    // Ctrl+C: \x03
    else if (code === 3) {
      session.inputBuffer = ''
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
      if (!session.win.isDestroyed()) {
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

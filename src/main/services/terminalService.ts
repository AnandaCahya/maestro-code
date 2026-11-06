import { spawn, ChildProcess } from 'child_process'
import os from 'os'
import fs from 'fs'
import { BrowserWindow } from 'electron'

export interface ShellProfile {
  id: string
  name: string
  path: string
}

interface TerminalSession {
  id: string
  process: ChildProcess
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
  shellPath?: string
): boolean {
  if (sessions.has(id)) {
    return true
  }

  const isWin = os.platform() === 'win32'
  const defaultShell = isWin ? 'powershell.exe' : (process.env.SHELL || 'bash')
  const shell = shellPath || defaultShell
  const workDir = cwd || os.homedir()

  try {
    const child = spawn(shell, [], {
      cwd: workDir,
      env: { ...process.env, TERM: 'xterm-256color' },
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

    sessions.set(id, { id, process: child })
    return true
  } catch (error) {
    console.error(`Failed to create terminal session (${shell}):`, error)
    return false
  }
}

export function writeToTerminal(id: string, data: string): void {
  const session = sessions.get(id)
  if (session && session.process.stdin) {
    session.process.stdin.write(data)
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

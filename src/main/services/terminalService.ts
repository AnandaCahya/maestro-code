import { spawn, ChildProcess } from 'child_process'
import os from 'os'
import { BrowserWindow } from 'electron'

interface TerminalSession {
  id: string
  process: ChildProcess
}

const sessions = new Map<string, TerminalSession>()

export function createTerminalSession(
  id: string,
  cwd: string | undefined,
  win: BrowserWindow
): boolean {
  if (sessions.has(id)) {
    return true
  }

  const isWin = os.platform() === 'win32'
  const shell = isWin ? 'powershell.exe' : (process.env.SHELL || 'bash')
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
    })

    sessions.set(id, { id, process: child })
    return true
  } catch (error) {
    console.error('Failed to create terminal session:', error)
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

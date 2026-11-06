import { spawn, ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import type { LspMessage } from '../../preload/index.d'

interface LspSession {
  serverName: string
  process: ChildProcess
  buffer: string
}

const activeSessions = new Map<string, LspSession>()

export function startLspServer(
  serverName: string,
  command: string,
  args: string[],
  rootUri: string | undefined,
  win: BrowserWindow
): { ok: boolean; message: string } {
  if (activeSessions.has(serverName)) {
    return { ok: true, message: `Server ${serverName} is already running` }
  }

  try {
    const lspProcess = spawn(command, args, {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    const session: LspSession = {
      serverName,
      process: lspProcess,
      buffer: ''
    }

    // Handle stdio JSON-RPC protocol
    lspProcess.stdout?.on('data', (data: Buffer) => {
      session.buffer += data.toString('utf-8')

      while (true) {
        const headerEnd = session.buffer.indexOf('\r\n\r\n')
        if (headerEnd === -1) break

        const header = session.buffer.slice(0, headerEnd)
        const match = header.match(/Content-Length:\s*(\d+)/i)
        if (!match) {
          session.buffer = session.buffer.slice(headerEnd + 4)
          continue
        }

        const contentLength = parseInt(match[1], 10)
        const contentStart = headerEnd + 4
        if (session.buffer.length < contentStart + contentLength) {
          break // Belum lengkap, tunggu chunk berikutnya
        }

        const body = session.buffer.slice(contentStart, contentStart + contentLength)
        session.buffer = session.buffer.slice(contentStart + contentLength)

        try {
          const message: LspMessage = JSON.parse(body)
          win.webContents.send('lsp:message', serverName, message)
        } catch (e) {
          console.error(`[LSP:${serverName}] Failed to parse JSON-RPC body:`, e)
        }
      }
    })

    lspProcess.stderr?.on('data', (data: Buffer) => {
      console.warn(`[LSP:${serverName}] stderr:`, data.toString('utf-8'))
    })

    lspProcess.on('exit', (code) => {
      console.log(`[LSP:${serverName}] process exited with code ${code}`)
      activeSessions.delete(serverName)
    })

    lspProcess.on('error', (err) => {
      console.error(`[LSP:${serverName}] error:`, err)
      activeSessions.delete(serverName)
    })

    activeSessions.set(serverName, session)

    // Send initialize request if rootUri provided
    if (rootUri) {
      sendLspMessage(serverName, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          processId: process.pid,
          rootUri: rootUri.startsWith('file://') ? rootUri : `file:///${rootUri.replace(/\\/g, '/')}`,
          capabilities: {
            textDocument: {
              hover: { dynamicRegistration: true, contentFormat: ['markdown', 'plaintext'] },
              completion: { dynamicRegistration: true, completionItem: { snippetSupport: true } },
              synchronization: { dynamicRegistration: true, willSave: true, willSaveWaitUntil: true, didSave: true },
              publishDiagnostics: { relatedInformation: true }
            }
          }
        }
      })
    }

    return { ok: true, message: `LSP Server ${serverName} started successfully` }
  } catch (err: any) {
    console.error(`[LSP:${serverName}] Failed to launch:`, err)
    return { ok: false, message: err?.message || 'Failed to start LSP process' }
  }
}

export function sendLspMessage(serverName: string, message: LspMessage): void {
  const session = activeSessions.get(serverName)
  if (!session || !session.process.stdin) {
    return
  }

  const json = JSON.stringify(message)
  const header = `Content-Length: ${Buffer.byteLength(json, 'utf-8')}\r\n\r\n`
  session.process.stdin.write(header + json)
}

export function stopLspServer(serverName: string): boolean {
  const session = activeSessions.get(serverName)
  if (session) {
    session.process.kill()
    activeSessions.delete(serverName)
    return true
  }
  return false
}

export function stopAllLspServers(): void {
  for (const [, session] of activeSessions) {
    session.process.kill()
  }
  activeSessions.clear()
}

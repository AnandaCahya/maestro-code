import { spawn, ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import type { LspMessage } from '../../preload/index.d'

interface LspSession {
  serverName: string
  process: ChildProcess
  buffer: string
  isInitialized: boolean
  restartCount: number
  lastRestartTime: number
  command: string
  args: string[]
  rootUri: string | undefined
}

const activeSessions = new Map<string, LspSession>()
const MAX_AUTO_RESTARTS = 3
const RESTART_WINDOW_MS = 60000 // 1 minute window
let currentLspWin: BrowserWindow | null = null

export function startLspServer(
  serverName: string,
  command: string,
  args: string[],
  rootUri: string | undefined,
  win: BrowserWindow
): { ok: boolean; message: string } {
  currentLspWin = win
  if (activeSessions.has(serverName)) {
    const existing = activeSessions.get(serverName)!
    if (!existing.process.killed) {
      return { ok: true, message: `Server ${serverName} is already running` }
    }
  }

  try {
    const lspProcess = spawn(command, args, {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    const prevSession = activeSessions.get(serverName)
    const restartCount = prevSession ? prevSession.restartCount + 1 : 0

    const session: LspSession = {
      serverName,
      process: lspProcess,
      buffer: '',
      isInitialized: false,
      restartCount,
      lastRestartTime: Date.now(),
      command,
      args,
      rootUri
    }

    // Handle stdio JSON-RPC protocol
    lspProcess.stdout?.on('data', (data: Buffer) => {
      session.buffer += data.toString('utf-8')

      // Malformed buffer protection: discard buffer if no header found within 1MB
      if (session.buffer.length > 1024 * 1024 && !session.buffer.includes('\r\n\r\n')) {
        console.warn(`[LSP:${serverName}] Malformed stream: buffer exceeded 1MB without headers, flushing.`)
        session.buffer = ''
        return
      }

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
        // Payload size protection: discard unreasonable or negative payload (> 50MB)
        if (isNaN(contentLength) || contentLength < 0 || contentLength > 50 * 1024 * 1024) {
          console.warn(`[LSP:${serverName}] Dropping malformed or oversized payload: ${contentLength} bytes`)
          session.buffer = session.buffer.slice(headerEnd + 4)
          continue
        }

        const contentStart = headerEnd + 4
        if (session.buffer.length < contentStart + contentLength) {
          break // Incomplete chunk, wait for more data
        }

        const body = session.buffer.slice(contentStart, contentStart + contentLength)
        session.buffer = session.buffer.slice(contentStart + contentLength)

        try {
          const message: LspMessage = JSON.parse(body)

          // If this is the response to initialize (id: 1), send the initialized notification
          if (message.id === 1 && message.result && !session.isInitialized) {
            session.isInitialized = true
            sendLspMessage(serverName, {
              jsonrpc: '2.0',
              method: 'initialized',
              params: {}
            })
            win.webContents.send('lsp:status', serverName, 'ready')
          }

          win.webContents.send('lsp:message', serverName, message)
          try {
            const desc = message.method || (message.id ? `Response #${message.id}` : 'notification')
            win.webContents.send('output:append', 'lsp', `[${serverName}] << ${desc}`)
          } catch {
            // ignore
          }
        } catch (e) {
          console.error(`[LSP:${serverName}] Failed to parse JSON-RPC body:`, e)
        }
      }
    })

    lspProcess.stderr?.on('data', (data: Buffer) => {
      const errText = data.toString('utf-8').trim()
      console.warn(`[LSP:${serverName}] stderr:`, errText)
      try {
        win.webContents.send('output:append', 'lsp', `[${serverName} STDERR] ${errText}`)
      } catch {
        // ignore
      }
    })

    lspProcess.on('exit', (code) => {
      console.log(`[LSP:${serverName}] process exited with code ${code}`)
      win.webContents.send('lsp:status', serverName, 'stopped')

      // Handle auto-restart policy if crashed unexpectedly (non-zero exit)
      const current = activeSessions.get(serverName)
      if (current && code !== 0 && code !== null) {
        const now = Date.now()
        if (now - current.lastRestartTime < RESTART_WINDOW_MS && current.restartCount < MAX_AUTO_RESTARTS) {
          console.log(`[LSP:${serverName}] Attempting auto-restart (${current.restartCount + 1}/${MAX_AUTO_RESTARTS})...`)
          setTimeout(() => {
            if (!win.isDestroyed()) {
              startLspServer(serverName, command, args, rootUri, win)
            }
          }, 1500)
          return
        }
      }
      activeSessions.delete(serverName)
    })

    lspProcess.on('error', (err) => {
      console.error(`[LSP:${serverName}] error:`, err)
      win.webContents.send('lsp:status', serverName, 'error')
      activeSessions.delete(serverName)
    })

    activeSessions.set(serverName, session)

    // Normalize rootUri for Windows, macOS, and Linux
    let normalizedUri = rootUri
    if (normalizedUri) {
      if (!normalizedUri.startsWith('file://')) {
        const cleanPath = normalizedUri.replace(/\\/g, '/')
        normalizedUri = cleanPath.startsWith('/') ? `file://${cleanPath}` : `file:///${cleanPath}`
      }
    }

    // Send full standard initialize request
    if (normalizedUri) {
      sendLspMessage(serverName, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          processId: process.pid,
          clientInfo: {
            name: 'Maestro Studio',
            version: '0.1.0'
          },
          rootUri: normalizedUri,
          workspaceFolders: [{ uri: normalizedUri, name: 'workspace' }],
          capabilities: {
            workspace: {
              workspaceFolders: true,
              configuration: true
            },
            textDocument: {
              synchronization: {
                dynamicRegistration: true,
                willSave: true,
                willSaveWaitUntil: true,
                didSave: true
              },
              hover: {
                dynamicRegistration: true,
                contentFormat: ['markdown', 'plaintext']
              },
              completion: {
                dynamicRegistration: true,
                completionItem: {
                  snippetSupport: true,
                  commitCharactersSupport: true,
                  documentationFormat: ['markdown', 'plaintext'],
                  deprecatedSupport: true
                }
              },
              signatureHelp: {
                dynamicRegistration: true,
                signatureInformation: {
                  documentationFormat: ['markdown', 'plaintext']
                }
              },
              definition: { dynamicRegistration: true, linkSupport: true },
              references: { dynamicRegistration: true },
              typeDefinition: { dynamicRegistration: true, linkSupport: true },
              implementation: { dynamicRegistration: true, linkSupport: true },
              documentSymbol: { dynamicRegistration: true, hierarchicalDocumentSymbolSupport: true },
              formatting: { dynamicRegistration: true },
              rangeFormatting: { dynamicRegistration: true },
              publishDiagnostics: {
                relatedInformation: true,
                tagSupport: { valueSet: [1, 2] }
              }
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
  try {
    session.process.stdin.write(header + json)
    if (currentLspWin && !currentLspWin.isDestroyed()) {
      const desc = message.method || (message.id ? `Response #${message.id}` : 'message')
      currentLspWin.webContents.send('output:append', 'lsp', `[${serverName}] >> ${desc}`)
    }
  } catch (e) {
    console.error(`[LSP:${serverName}] write error:`, e)
  }
}

export function cancelLspRequest(serverName: string, requestId: number | string): void {
  sendLspMessage(serverName, {
    jsonrpc: '2.0',
    method: '$/cancelRequest',
    params: { id: requestId }
  })
}

export function stopLspServer(serverName: string): boolean {
  const session = activeSessions.get(serverName)
  if (session) {
    try {
      // 1. Send shutdown request per LSP protocol
      sendLspMessage(serverName, {
        jsonrpc: '2.0',
        id: 999999,
        method: 'shutdown',
        params: {}
      })

      // 2. Send exit notification and kill after graceful delay
      setTimeout(() => {
        try {
          sendLspMessage(serverName, {
            jsonrpc: '2.0',
            method: 'exit',
            params: {}
          })
        } catch {
          // ignore
        }
        if (!session.process.killed) {
          session.process.kill()
        }
      }, 300)
    } catch {
      session.process.kill()
    }
    activeSessions.delete(serverName)
    return true
  }
  return false
}

export function stopAllLspServers(): void {
  for (const [serverName] of activeSessions) {
    stopLspServer(serverName)
  }
  activeSessions.clear()
}

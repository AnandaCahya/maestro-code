import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lspClient } from '../src/renderer/src/services/lspClient'
import { useEditorStore } from '../src/renderer/src/store/useEditorStore'

describe('LSP Client Progress, Versioning, and Server-to-Client Requests', () => {
  let sentMessages: any[] = []

  beforeEach(() => {
    sentMessages = []
    // Setup window.maestroAPI mock
    ;(globalThis as any).window = {
      maestroAPI: {
        sendLspMessage: vi.fn((_serverName, msg) => {
          sentMessages.push(msg)
        }),
        onLspMessage: vi.fn(),
        onLspStatus: vi.fn()
      }
    }
  })

  it('notifies doc close and cleans up tracked version', () => {
    const serverName = 'ts-server'
    // Mark server as active
    ;(lspClient as any).activeServers.add(serverName)

    const fileUri = 'file:///workspace/test.ts'
    lspClient.notifyDocOpen(serverName, fileUri, 'typescript', 'console.log(1)', 5)

    expect((lspClient as any).documentVersions.get(fileUri)).toBe(5)

    lspClient.notifyDocClose(serverName, fileUri)

    expect((lspClient as any).documentVersions.has(fileUri)).toBe(false)
    expect(sentMessages).toContainEqual({
      jsonrpc: '2.0',
      method: 'textDocument/didClose',
      params: { textDocument: { uri: fileUri } }
    })
  })

  it('notifies workspace didChangeConfiguration', () => {
    const serverName = 'ts-server'
    ;(lspClient as any).activeServers.add(serverName)

    lspClient.notifyDidChangeConfiguration(serverName, { tabSize: 2 })

    expect(sentMessages).toContainEqual({
      jsonrpc: '2.0',
      method: 'workspace/didChangeConfiguration',
      params: { settings: { tabSize: 2 } }
    })
  })

  it('handles server-to-client requests: workDoneProgress/create and workspace/configuration', () => {
    const serverName = 'ts-server'

    // window/workDoneProgress/create
    ;(lspClient as any).handleMessage(serverName, {
      jsonrpc: '2.0',
      id: 42,
      method: 'window/workDoneProgress/create',
      params: { token: 'token-1' }
    })

    expect(sentMessages).toContainEqual({
      jsonrpc: '2.0',
      id: 42,
      result: null
    })

    // workspace/configuration
    ;(lspClient as any).handleMessage(serverName, {
      jsonrpc: '2.0',
      id: 43,
      method: 'workspace/configuration',
      params: { items: [{ section: 'typescript' }] }
    })

    expect(sentMessages).toContainEqual({
      jsonrpc: '2.0',
      id: 43,
      result: [{}]
    })
  })

  it('handles $/progress lifecycle (begin, report, end) and updates store', () => {
    const serverName = 'ts-server'

    // begin
    ;(lspClient as any).handleMessage(serverName, {
      jsonrpc: '2.0',
      method: '$/progress',
      params: {
        token: 'token-abc',
        value: {
          kind: 'begin',
          title: 'Building project',
          message: 'Compiling files...',
          percentage: 20
        }
      }
    })

    expect(useEditorStore.getState().lspProgress).toEqual({
      token: 'token-abc',
      title: 'Building project',
      message: 'Compiling files...',
      percentage: 20
    })

    // report
    ;(lspClient as any).handleMessage(serverName, {
      jsonrpc: '2.0',
      method: '$/progress',
      params: {
        token: 'token-abc',
        value: {
          kind: 'report',
          message: 'Optimizing...',
          percentage: 85
        }
      }
    })

    expect(useEditorStore.getState().lspProgress).toEqual({
      token: 'token-abc',
      title: 'Building project',
      message: 'Optimizing...',
      percentage: 85
    })

    // end
    ;(lspClient as any).handleMessage(serverName, {
      jsonrpc: '2.0',
      method: '$/progress',
      params: {
        token: 'token-abc',
        value: {
          kind: 'end'
        }
      }
    })

    expect(useEditorStore.getState().lspProgress).toBeNull()
  })

  it('discards stale diagnostics with version older than tracked document version', () => {
    const serverName = 'ts-server'
    const uri = 'file:///workspace/stale.ts'
    ;(lspClient as any).documentVersions.set(uri, 10)

    let markerSet = false
    ;(lspClient as any).monacoInstance = {
      editor: {
        getModels: () => [
          {
            uri: { toString: () => uri }
          }
        ],
        setModelMarkers: () => {
          markerSet = true
        },
        getModelMarkers: () => []
      },
      MarkerSeverity: { Error: 8, Warning: 4, Info: 2, Hint: 1 }
    }

    // Stale diagnostic with version 8 (tracked is 10)
    ;(lspClient as any).handleMessage(serverName, {
      jsonrpc: '2.0',
      method: 'textDocument/publishDiagnostics',
      params: {
        uri,
        version: 8,
        diagnostics: [{ message: 'Old error', severity: 1, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } } }]
      }
    })

    expect(markerSet).toBe(false)

    // Current diagnostic with version 10 (or >= 10)
    ;(lspClient as any).handleMessage(serverName, {
      jsonrpc: '2.0',
      method: 'textDocument/publishDiagnostics',
      params: {
        uri,
        version: 10,
        diagnostics: [{ message: 'Current error', severity: 1, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } } }]
      }
    })

    expect(markerSet).toBe(true)
  })
})

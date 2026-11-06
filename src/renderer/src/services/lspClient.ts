import type * as monaco from 'monaco-editor'
import type { LspMessage } from '../../../preload/index.d'
import { useEditorStore, DiagnosticItem } from '../store/useEditorStore'

class LspClientManager {
  private activeServers = new Set<string>()
  private requestId = 10
  private pendingRequests = new Map<number | string, (res: any) => void>()
  private monacoInstance: typeof monaco | null = null

  constructor() {
    if (typeof window !== 'undefined' && window.maestroAPI?.onLspMessage) {
      window.maestroAPI.onLspMessage((serverName, message) => {
        this.handleMessage(serverName, message)
      })
    }
  }

  public setMonaco(m: typeof monaco): void {
    this.monacoInstance = m

    // Listen to all markers changed in Monaco
    m.editor.onDidChangeMarkers(() => {
      this.syncAllMarkers()
    })
  }

  public syncAllMarkers(): void {
    if (!this.monacoInstance) return
    const allMarkers = this.monacoInstance.editor.getModelMarkers({})
    const items: DiagnosticItem[] = allMarkers.map((marker, idx) => {
      const filePath = marker.resource.path || marker.resource.fsPath || marker.resource.toString()
      const fileName = filePath.split(/[\\/]/).pop() || 'file'

      let severity: 'error' | 'warning' | 'info' = 'info'
      if (marker.severity === this.monacoInstance!.MarkerSeverity.Error) {
        severity = 'error'
      } else if (marker.severity === this.monacoInstance!.MarkerSeverity.Warning) {
        severity = 'warning'
      }

      return {
        id: `diag-${idx}-${marker.startLineNumber}-${marker.startColumn}`,
        filePath,
        fileName,
        message: marker.message,
        severity,
        line: marker.startLineNumber,
        column: marker.startColumn
      }
    })

    useEditorStore.getState().setDiagnostics(items)
  }

  public async startServer(
    serverName: string,
    command: string,
    args: string[],
    rootUri?: string
  ): Promise<boolean> {
    const res = await window.maestroAPI.startLsp(serverName, command, args, rootUri)
    if (res.ok) {
      this.activeServers.add(serverName)
      return true
    }
    return false
  }

  public async stopServer(serverName: string): Promise<void> {
    await window.maestroAPI.stopLsp(serverName)
    this.activeServers.delete(serverName)
  }

  public isServerActive(serverName: string): boolean {
    return this.activeServers.has(serverName)
  }

  public notifyDocOpen(serverName: string, uri: string, languageId: string, text: string): void {
    if (!this.activeServers.has(serverName)) return

    window.maestroAPI.sendLspMessage(serverName, {
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: this.formatUri(uri),
          languageId,
          version: 1,
          text
        }
      }
    })
  }

  public notifyDocChange(
    serverName: string,
    uri: string,
    version: number,
    text: string
  ): void {
    if (!this.activeServers.has(serverName)) return

    window.maestroAPI.sendLspMessage(serverName, {
      jsonrpc: '2.0',
      method: 'textDocument/didChange',
      params: {
        textDocument: {
          uri: this.formatUri(uri),
          version
        },
        contentChanges: [{ text }]
      }
    })
  }

  public notifyDocSave(serverName: string, uri: string): void {
    if (!this.activeServers.has(serverName)) return

    window.maestroAPI.sendLspMessage(serverName, {
      jsonrpc: '2.0',
      method: 'textDocument/didSave',
      params: {
        textDocument: { uri: this.formatUri(uri) }
      }
    })
  }

  private handleMessage(_serverName: string, message: LspMessage): void {
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const resolver = this.pendingRequests.get(message.id)!
      this.pendingRequests.delete(message.id)
      resolver(message.result || message.error)
      return
    }

    if (message.method === 'textDocument/publishDiagnostics' && this.monacoInstance) {
      const { uri, diagnostics } = message.params
      const model = this.monacoInstance.editor
        .getModels()
        .find((m) => this.formatUri(m.uri.toString()) === this.formatUri(uri))

      if (model) {
        const markers: monaco.editor.IMarkerData[] = (diagnostics || []).map((diag: any) => ({
          severity:
            diag.severity === 1
              ? this.monacoInstance!.MarkerSeverity.Error
              : diag.severity === 2
                ? this.monacoInstance!.MarkerSeverity.Warning
                : this.monacoInstance!.MarkerSeverity.Info,
          message: diag.message,
          startLineNumber: diag.range.start.line + 1,
          startColumn: diag.range.start.character + 1,
          endLineNumber: diag.range.end.line + 1,
          endColumn: diag.range.end.character + 1
        }))

        this.monacoInstance.editor.setModelMarkers(model, 'lsp', markers)
        this.syncAllMarkers()
      }
    }
  }

  private formatUri(uri: string): string {
    if (uri.startsWith('file://')) return uri
    return `file:///${uri.replace(/\\/g, '/')}`
  }
}

export const lspClient = new LspClientManager()

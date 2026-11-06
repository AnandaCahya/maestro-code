import type * as monaco from 'monaco-editor'
import type { LspMessage } from '../../../preload/index.d'
import { useEditorStore, DiagnosticItem } from '../store/useEditorStore'

class LspClientManager {
  private activeServers = new Set<string>()
  private requestId = 100
  private pendingRequests = new Map<number | string, (res: any) => void>()
  private monacoInstance: typeof monaco | null = null
  private providersRegistered = false

  constructor() {
    if (typeof window !== 'undefined' && window.maestroAPI?.onLspMessage) {
      window.maestroAPI.onLspMessage((serverName, message) => {
        this.handleMessage(serverName, message)
      })
    }
  }

  public setMonaco(m: typeof monaco): void {
    this.monacoInstance = m

    // Configure TypeScript / JavaScript Compiler Options
    try {
      m.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: m.languages.typescript.ScriptTarget.ESNext,
        allowNonTextFiles: true,
        allowJs: true,
        checkJs: false,
        jsx: m.languages.typescript.JsxEmit.ReactJSX,
        moduleResolution: m.languages.typescript.ModuleResolutionKind.NodeJs,
        module: m.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true
      })

      m.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
      })

      m.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
      })
    } catch {
      // ignore
    }

    // Listen to all markers changed in Monaco
    m.editor.onDidChangeMarkers(() => {
      this.syncAllMarkers()
    })

    // Register LSP Hover, Definition, and Formatting Providers
    this.registerLspProviders()
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

  public async sendRequest(serverName: string, method: string, params: any): Promise<any> {
    if (!this.activeServers.has(serverName)) {
      return null
    }

    const id = ++this.requestId
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        resolve(null)
      }, 5000)

      this.pendingRequests.set(id, (res) => {
        clearTimeout(timer)
        resolve(res)
      })

      window.maestroAPI.sendLspMessage(serverName, {
        jsonrpc: '2.0',
        id,
        method,
        params
      })
    })
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

  private registerLspProviders(): void {
    if (this.providersRegistered || !this.monacoInstance) return
    this.providersRegistered = true

    const m = this.monacoInstance
    const languages = ['typescript', 'javascript', 'python', 'go', 'rust', 'json']

    // 1. LSP Hover Provider (textDocument/hover)
    languages.forEach((lang) => {
      m.languages.registerHoverProvider(lang, {
        provideHover: async (model, position) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return null

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/hover', {
            textDocument: { uri: this.formatUri(uri) },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          })

          if (!res || !res.contents) return null

          let value = ''
          if (typeof res.contents === 'string') {
            value = res.contents
          } else if (Array.isArray(res.contents)) {
            value = res.contents.map((c: any) => (typeof c === 'string' ? c : c.value)).join('\n\n')
          } else if (res.contents.value) {
            value = res.contents.value
          }

          if (!value) return null

          return {
            range: res.range
              ? new m.Range(
                  res.range.start.line + 1,
                  res.range.start.character + 1,
                  res.range.end.line + 1,
                  res.range.end.character + 1
                )
              : undefined,
            contents: [{ value }]
          }
        }
      })
    })

    // 2. LSP Definition Provider (textDocument/definition - F12 / Ctrl+Click)
    languages.forEach((lang) => {
      m.languages.registerDefinitionProvider(lang, {
        provideDefinition: async (model, position) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return null

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/definition', {
            textDocument: { uri: this.formatUri(uri) },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          })

          if (!res) return null

          const targets = Array.isArray(res) ? res : [res]
          return targets.map((target: any) => {
            const targetUri = target.uri || target.targetUri
            const targetRange = target.range || target.targetSelectionRange || target.targetRange

            return {
              uri: m.Uri.parse(targetUri),
              range: new m.Range(
                targetRange.start.line + 1,
                targetRange.start.character + 1,
                targetRange.end.line + 1,
                targetRange.end.character + 1
              )
            }
          })
        }
      })
    })
  }

  private handleMessage(_serverName: string, message: LspMessage): void {
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const resolver = this.pendingRequests.get(message.id)!
      this.pendingRequests.delete(message.id)
      resolver(message.result !== undefined ? message.result : message.error)
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

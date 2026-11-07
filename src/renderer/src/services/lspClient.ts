import type * as monaco from 'monaco-editor'
import type { LspMessage } from '../../../preload/index.d'
import { useEditorStore, DiagnosticItem, DocumentSymbolItem } from '../store/useEditorStore'

const LSP_SYMBOL_KINDS: Record<number, DocumentSymbolItem['kind']> = {
  1: 'variable',
  2: 'variable',
  3: 'variable',
  4: 'variable',
  5: 'class',
  6: 'method',
  7: 'property',
  8: 'property',
  9: 'method',
  10: 'enum',
  11: 'interface',
  12: 'function',
  13: 'variable',
  14: 'constant',
  15: 'variable',
  16: 'variable',
  17: 'variable',
  18: 'variable',
  19: 'variable',
  20: 'property',
  21: 'variable',
  22: 'enum',
  23: 'struct'
}

export function extractSymbolsFallback(content: string, languageId: string): DocumentSymbolItem[] {
  const lines = content.split('\n')
  const symbols: DocumentSymbolItem[] = []

  const isJsTs = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(languageId)
  const isPython = languageId === 'python'
  const isGo = languageId === 'go'
  const isRust = languageId === 'rust'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const lineNum = i + 1

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue
    }

    if (isJsTs || (!isPython && !isGo && !isRust)) {
      let match = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)/)
      if (match) {
        symbols.push({
          id: `sym-${lineNum}-${match[1]}`,
          name: match[1],
          kind: 'class',
          range: { startLine: lineNum, startCol: 1, endLine: lineNum, endCol: line.length }
        })
        continue
      }
      match = trimmed.match(/^(?:export\s+)?interface\s+([A-Za-z0-9_$]+)/)
      if (match) {
        symbols.push({
          id: `sym-${lineNum}-${match[1]}`,
          name: match[1],
          kind: 'interface',
          range: { startLine: lineNum, startCol: 1, endLine: lineNum, endCol: line.length }
        })
        continue
      }
      match = trimmed.match(/^(?:export\s+)?type\s+([A-Za-z0-9_$]+)\s*=/)
      if (match) {
        symbols.push({
          id: `sym-${lineNum}-${match[1]}`,
          name: match[1],
          kind: 'type',
          range: { startLine: lineNum, startCol: 1, endLine: lineNum, endCol: line.length }
        })
        continue
      }
      match = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/)
      if (match) {
        symbols.push({
          id: `sym-${lineNum}-${match[1]}`,
          name: match[1],
          kind: 'function',
          range: { startLine: lineNum, startCol: 1, endLine: lineNum, endCol: line.length }
        })
        continue
      }
      match = trimmed.match(/^(?:export\s+)?(?:const|let)\s+([A-Za-z0-9_$]+)(?:\s*:\s*[^=]+)?\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/)
      if (match) {
        symbols.push({
          id: `sym-${lineNum}-${match[1]}`,
          name: match[1],
          kind: 'function',
          range: { startLine: lineNum, startCol: 1, endLine: lineNum, endCol: line.length }
        })
        continue
      }
      match = trimmed.match(/^(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*:\s*React\.FC/)
      if (match) {
        symbols.push({
          id: `sym-${lineNum}-${match[1]}`,
          name: match[1],
          kind: 'function',
          range: { startLine: lineNum, startCol: 1, endLine: lineNum, endCol: line.length }
        })
        continue
      }
    }

    if (isPython) {
      let match = trimmed.match(/^class\s+([A-Za-z0-9_]+)/)
      if (match) {
        symbols.push({
          id: `sym-${lineNum}-${match[1]}`,
          name: match[1],
          kind: 'class',
          range: { startLine: lineNum, startCol: 1, endLine: lineNum, endCol: line.length }
        })
        continue
      }
      match = trimmed.match(/^(?:async\s+)?def\s+([A-Za-z0-9_]+)/)
      if (match) {
        symbols.push({
          id: `sym-${lineNum}-${match[1]}`,
          name: match[1],
          kind: 'function',
          range: { startLine: lineNum, startCol: 1, endLine: lineNum, endCol: line.length }
        })
        continue
      }
    }

    if (isGo) {
      let match = trimmed.match(/^type\s+([A-Za-z0-9_]+)\s+struct/)
      if (match) {
        symbols.push({
          id: `sym-${lineNum}-${match[1]}`,
          name: match[1],
          kind: 'struct',
          range: { startLine: lineNum, startCol: 1, endLine: lineNum, endCol: line.length }
        })
        continue
      }
      match = trimmed.match(/^func\s+(?:\([^)]+\)\s+)?([A-Za-z0-9_]+)/)
      if (match) {
        symbols.push({
          id: `sym-${lineNum}-${match[1]}`,
          name: match[1],
          kind: 'function',
          range: { startLine: lineNum, startCol: 1, endLine: lineNum, endCol: line.length }
        })
        continue
      }
    }

    if (isRust) {
      let match = trimmed.match(/^(?:pub\s+)?(?:struct|enum)\s+([A-Za-z0-9_]+)/)
      if (match) {
        symbols.push({
          id: `sym-${lineNum}-${match[1]}`,
          name: match[1],
          kind: 'struct',
          range: { startLine: lineNum, startCol: 1, endLine: lineNum, endCol: line.length }
        })
        continue
      }
      match = trimmed.match(/^(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)/)
      if (match) {
        symbols.push({
          id: `sym-${lineNum}-${match[1]}`,
          name: match[1],
          kind: 'function',
          range: { startLine: lineNum, startCol: 1, endLine: lineNum, endCol: line.length }
        })
        continue
      }
    }
  }

  for (let s = 0; s < symbols.length; s++) {
    if (s + 1 < symbols.length) {
      symbols[s].range.endLine = Math.max(symbols[s].range.startLine, symbols[s + 1].range.startLine - 1)
    } else {
      symbols[s].range.endLine = lines.length
    }
  }

  return symbols
}

class LspClientManager {
  private activeServers = new Set<string>()
  private requestId = 100
  private pendingRequests = new Map<number | string, (res: any) => void>()
  private monacoInstance: typeof monaco | null = null
  private providersRegistered = false

  constructor() {
    if (typeof window !== 'undefined') {
      window.maestroAPI?.onLspMessage((serverName, message) => {
        this.handleMessage(serverName, message)
      })

      window.maestroAPI?.onLspStatus?.((_serverName, status) => {
        if (status === 'ready') {
          useEditorStore.getState().setLspStatus('ready')
        } else if (status === 'stopped' || status === 'error') {
          useEditorStore.getState().setLspStatus('idle')
        } else {
          useEditorStore.getState().setLspStatus('syncing')
        }
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

    // Register LSP Providers
    this.registerLspProviders()
  }

  public applyTsConfig(compilerOptions: any): void {
    if (!this.monacoInstance) return
    try {
      const current = this.monacoInstance.languages.typescript.typescriptDefaults.getCompilerOptions()
      this.monacoInstance.languages.typescript.typescriptDefaults.setCompilerOptions({
        ...current,
        baseUrl: compilerOptions.baseUrl,
        paths: compilerOptions.paths
      })
    } catch (e) {
      console.warn('Failed to apply tsconfig to Monaco:', e)
    }
  }

  public async getDocumentSymbols(
    uri: string,
    content?: string,
    languageId = 'plaintext'
  ): Promise<DocumentSymbolItem[]> {
    const serverName = 'ts-server'
    if (this.isServerActive(serverName)) {
      try {
        const res = await this.sendRequest(serverName, 'textDocument/documentSymbol', {
          textDocument: { uri: this.formatUri(uri) }
        })
        if (res && Array.isArray(res) && res.length > 0) {
          const mapSymbol = (s: any, idx: number): DocumentSymbolItem => {
            const range = s.range || (s.location ? s.location.range : { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } })
            return {
              id: `sym-${s.name}-${idx}-${range.start.line}`,
              name: s.name,
              detail: s.detail,
              kind: LSP_SYMBOL_KINDS[s.kind] || 'variable',
              range: {
                startLine: range.start.line + 1,
                startCol: range.start.character + 1,
                endLine: range.end.line + 1,
                endCol: range.end.character + 1
              },
              children: s.children ? s.children.map(mapSymbol) : undefined
            }
          }
          const items = res.map(mapSymbol)
          useEditorStore.getState().setDocumentSymbols(items)
          return items
        }
      } catch {
        // fallback to regex
      }
    }

    if (content) {
      const fallback = extractSymbolsFallback(content, languageId)
      useEditorStore.getState().setDocumentSymbols(fallback)
      return fallback
    }

    return []
  }

  public syncAllMarkers(): void {
    if (!this.monacoInstance) return
    const allMarkers = this.monacoInstance.editor.getModelMarkers({})
    const items: DiagnosticItem[] = allMarkers.map((marker, idx) => {
      const filePath = marker.resource.path || marker.resource.fsPath || marker.resource.toString()
      const fileName = filePath.split(/[\\/]/).pop() || 'file'

      let severity: 'error' | 'warning' | 'info' | 'hint' = 'info'
      if (marker.severity === this.monacoInstance!.MarkerSeverity.Error) {
        severity = 'error'
      } else if (marker.severity === this.monacoInstance!.MarkerSeverity.Warning) {
        severity = 'warning'
      } else if (marker.severity === this.monacoInstance!.MarkerSeverity.Hint) {
        severity = 'hint'
      }

      return {
        id: `diag-${idx}-${marker.startLineNumber}-${marker.startColumn}`,
        filePath,
        fileName,
        message: marker.message,
        severity,
        source: marker.source,
        code: typeof marker.code === 'object' ? marker.code.value : marker.code,
        line: marker.startLineNumber,
        column: marker.startColumn,
        tags: marker.tags
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
        // Send cancel request on timeout
        window.maestroAPI?.cancelLsp?.(serverName, id)
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

    // 3. LSP Completion Provider (textDocument/completion)
    languages.forEach((lang) => {
      m.languages.registerCompletionItemProvider(lang, {
        triggerCharacters: ['.', ':', '<', '"', '/', '@', '*'],
        provideCompletionItems: async (model, position) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return { suggestions: [] }

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/completion', {
            textDocument: { uri: this.formatUri(uri) },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          })

          if (!res) return { suggestions: [] }
          const items: any[] = Array.isArray(res) ? res : res.items || []

          const wordInfo = model.getWordUntilPosition(position)
          const defaultRange = new m.Range(
            position.lineNumber,
            wordInfo.startColumn,
            position.lineNumber,
            wordInfo.endColumn
          )

          const suggestions = items.map((item) => {
            const insertText = item.insertText || item.label
            const isSnippet = item.insertTextFormat === 2

            return {
              label: item.label,
              kind: item.kind ? item.kind - 1 : m.languages.CompletionItemKind.Property,
              detail: item.detail,
              documentation: typeof item.documentation === 'object' ? item.documentation?.value : item.documentation,
              insertText,
              insertTextRules: isSnippet ? m.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
              range: defaultRange
            }
          })

          return { suggestions }
        }
      })
    })

    // 4. LSP Signature Help Provider (textDocument/signatureHelp)
    languages.forEach((lang) => {
      m.languages.registerSignatureHelpProvider(lang, {
        signatureHelpTriggerCharacters: ['(', ','],
        signatureHelpRetriggerCharacters: [','],
        provideSignatureHelp: async (model, position) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return null

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/signatureHelp', {
            textDocument: { uri: this.formatUri(uri) },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          })

          if (!res || !res.signatures || res.signatures.length === 0) return null

          return {
            value: {
              signatures: res.signatures.map((sig: any) => ({
                label: sig.label,
                documentation: typeof sig.documentation === 'object' ? sig.documentation?.value : sig.documentation,
                parameters: (sig.parameters || []).map((p: any) => ({
                  label: p.label,
                  documentation: typeof p.documentation === 'object' ? p.documentation?.value : p.documentation
                }))
              })),
              activeSignature: res.activeSignature || 0,
              activeParameter: res.activeParameter || 0
            },
            dispose: () => {}
          }
        }
      })
    })

    // 5. LSP Reference Provider (textDocument/references - Shift+F12)
    languages.forEach((lang) => {
      m.languages.registerReferenceProvider(lang, {
        provideReferences: async (model, position, context) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return []

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/references', {
            textDocument: { uri: this.formatUri(uri) },
            position: { line: position.lineNumber - 1, character: position.column - 1 },
            context
          })

          if (!res || !Array.isArray(res)) return []
          return res.map((ref: any) => ({
            uri: m.Uri.parse(ref.uri),
            range: new m.Range(
              ref.range.start.line + 1,
              ref.range.start.character + 1,
              ref.range.end.line + 1,
              ref.range.end.character + 1
            )
          }))
        }
      })
    })

    // 6. LSP Type Definition Provider (textDocument/typeDefinition)
    languages.forEach((lang) => {
      m.languages.registerTypeDefinitionProvider(lang, {
        provideTypeDefinition: async (model, position) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return []

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/typeDefinition', {
            textDocument: { uri: this.formatUri(uri) },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          })

          if (!res) return []
          const targets = Array.isArray(res) ? res : [res]
          return targets.map((t: any) => ({
            uri: m.Uri.parse(t.uri || t.targetUri),
            range: new m.Range(
              (t.range || t.targetRange).start.line + 1,
              (t.range || t.targetRange).start.character + 1,
              (t.range || t.targetRange).end.line + 1,
              (t.range || t.targetRange).end.character + 1
            )
          }))
        }
      })
    })

    // 7. LSP Implementation Provider (textDocument/implementation)
    languages.forEach((lang) => {
      m.languages.registerImplementationProvider(lang, {
        provideImplementation: async (model, position) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return []

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/implementation', {
            textDocument: { uri: this.formatUri(uri) },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          })

          if (!res) return []
          const targets = Array.isArray(res) ? res : [res]
          return targets.map((t: any) => ({
            uri: m.Uri.parse(t.uri || t.targetUri),
            range: new m.Range(
              (t.range || t.targetRange).start.line + 1,
              (t.range || t.targetRange).start.character + 1,
              (t.range || t.targetRange).end.line + 1,
              (t.range || t.targetRange).end.character + 1
            )
          }))
        }
      })
    })

    // 8. LSP Document Symbol Provider (textDocument/documentSymbol)
    languages.forEach((lang) => {
      m.languages.registerDocumentSymbolProvider(lang, {
        provideDocumentSymbols: async (model) => {
          const uri = model.uri.toString()
          const items = await this.getDocumentSymbols(uri, model.getValue(), lang)
          return items.map((item) => ({
            name: item.name,
            detail: item.detail || '',
            kind:
              item.kind === 'class'
                ? m.languages.SymbolKind.Class
                : item.kind === 'interface'
                  ? m.languages.SymbolKind.Interface
                  : item.kind === 'function'
                    ? m.languages.SymbolKind.Function
                    : item.kind === 'method'
                      ? m.languages.SymbolKind.Method
                      : item.kind === 'struct'
                        ? m.languages.SymbolKind.Struct
                        : item.kind === 'enum'
                          ? m.languages.SymbolKind.Enum
                          : item.kind === 'constant'
                            ? m.languages.SymbolKind.Constant
                            : m.languages.SymbolKind.Variable,
            tags: [],
            range: new m.Range(
              item.range.startLine,
              item.range.startCol,
              item.range.endLine,
              item.range.endCol
            ),
            selectionRange: new m.Range(
              item.range.startLine,
              item.range.startCol,
              item.range.startLine,
              item.range.endCol
            )
          }))
        }
      })
    })

    // 9. LSP Rename Provider (textDocument/rename - F2)
    languages.forEach((lang) => {
      m.languages.registerRenameProvider(lang, {
        provideRenameEdits: async (model, position, newName) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return undefined

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/rename', {
            textDocument: { uri: this.formatUri(uri) },
            position: { line: position.lineNumber - 1, character: position.column - 1 },
            newName
          })

          if (!res) return undefined

          const edits: any[] = []
          if (res.changes) {
            for (const fileUri of Object.keys(res.changes)) {
              for (const edit of res.changes[fileUri]) {
                edits.push({
                  resource: m.Uri.parse(fileUri),
                  textEdit: {
                    range: new m.Range(
                      edit.range.start.line + 1,
                      edit.range.start.character + 1,
                      edit.range.end.line + 1,
                      edit.range.end.character + 1
                    ),
                    text: edit.newText
                  }
                })
              }
            }
          }
          return { edits }
        }
      })
    })

    // 10. LSP Document Formatting Provider (textDocument/formatting - Shift+Alt+F)
    languages.forEach((lang) => {
      m.languages.registerDocumentFormattingEditProvider(lang, {
        provideDocumentFormattingEdits: async (model, options) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return []

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/formatting', {
            textDocument: { uri: this.formatUri(uri) },
            options: {
              tabSize: options.tabSize,
              insertSpaces: options.insertSpaces
            }
          })

          if (!res || !Array.isArray(res)) return []
          return res.map((edit: any) => ({
            range: new m.Range(
              edit.range.start.line + 1,
              edit.range.start.character + 1,
              edit.range.end.line + 1,
              edit.range.end.character + 1
            ),
            text: edit.newText
          }))
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
                : diag.severity === 3
                  ? this.monacoInstance!.MarkerSeverity.Info
                  : this.monacoInstance!.MarkerSeverity.Hint,
          message: diag.message,
          source: diag.source,
          code: typeof diag.code === 'object' ? diag.code.value : diag.code,
          tags: diag.tags,
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

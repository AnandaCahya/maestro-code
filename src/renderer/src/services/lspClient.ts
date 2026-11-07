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

function getMonacoCompletionKind(m: typeof monaco, lspKind?: number): monaco.languages.CompletionItemKind {
  if (!lspKind) return m.languages.CompletionItemKind.Property
  const kinds = [
    m.languages.CompletionItemKind.Text,
    m.languages.CompletionItemKind.Method,
    m.languages.CompletionItemKind.Function,
    m.languages.CompletionItemKind.Constructor,
    m.languages.CompletionItemKind.Field,
    m.languages.CompletionItemKind.Variable,
    m.languages.CompletionItemKind.Class,
    m.languages.CompletionItemKind.Interface,
    m.languages.CompletionItemKind.Module,
    m.languages.CompletionItemKind.Property,
    m.languages.CompletionItemKind.Unit,
    m.languages.CompletionItemKind.Value,
    m.languages.CompletionItemKind.Enum,
    m.languages.CompletionItemKind.Keyword,
    m.languages.CompletionItemKind.Snippet,
    m.languages.CompletionItemKind.Color,
    m.languages.CompletionItemKind.File,
    m.languages.CompletionItemKind.Reference,
    m.languages.CompletionItemKind.Folder,
    m.languages.CompletionItemKind.EnumMember,
    m.languages.CompletionItemKind.Constant,
    m.languages.CompletionItemKind.Struct,
    m.languages.CompletionItemKind.Event,
    m.languages.CompletionItemKind.Operator,
    m.languages.CompletionItemKind.TypeParameter
  ]
  return kinds[lspKind - 1] ?? m.languages.CompletionItemKind.Property
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

  public async getWorkspaceSymbols(query: string): Promise<Array<{
    name: string
    kind: string
    containerName?: string
    filePath: string
    line: number
    col: number
  }>> {
    const serverName = 'ts-server'
    if (this.isServerActive(serverName)) {
      try {
        const res = await this.sendRequest(serverName, 'workspace/symbol', { query })
        if (res && Array.isArray(res) && res.length > 0) {
          return res.map((s: any) => {
            const uri = s.location ? s.location.uri : ''
            const filePath = uri.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
            const range = s.location?.range || { start: { line: 0, character: 0 } }
            return {
              name: s.name,
              kind: LSP_SYMBOL_KINDS[s.kind] || 'variable',
              containerName: s.containerName,
              filePath,
              line: range.start.line + 1,
              col: range.start.character + 1
            }
          })
        }
      } catch {
        // fallback
      }
    }

    // Fallback across open files
    const { openFiles } = useEditorStore.getState()
    const results: Array<{
      name: string
      kind: string
      containerName?: string
      filePath: string
      line: number
      col: number
    }> = []

    const q = query.toLowerCase()
    for (const f of openFiles) {
      const syms = extractSymbolsFallback(f.content, f.language || 'plaintext')
      for (const s of syms) {
        if (!q || s.name.toLowerCase().includes(q) || s.kind.toLowerCase().includes(q)) {
          results.push({
            name: s.name,
            kind: s.kind,
            containerName: f.name,
            filePath: f.path,
            line: s.range.startLine,
            col: s.range.startCol
          })
        }
      }
    }
    return results.slice(0, 50)
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

    // 3. LSP Completion Provider (textDocument/completion & completionItem/resolve)
    languages.forEach((lang) => {
      m.languages.registerCompletionItemProvider(lang, {
        triggerCharacters: ['.', ':', '<', '"', "'", '/', '@', '*', '(', ' ', '{'],
        provideCompletionItems: async (model, position, context) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return { suggestions: [] }

          const uri = model.uri.toString()
          const triggerKind = context.triggerKind === m.languages.CompletionTriggerKind.TriggerCharacter ? 2 : 1
          const res = await this.sendRequest(serverName, 'textDocument/completion', {
            textDocument: { uri: this.formatUri(uri) },
            position: { line: position.lineNumber - 1, character: position.column - 1 },
            context: {
              triggerKind,
              triggerCharacter: context.triggerCharacter
            }
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
            let insertText = item.insertText || (typeof item.label === 'string' ? item.label : item.label?.label || '')
            let itemRange = defaultRange

            if (item.textEdit) {
              if (item.textEdit.range) {
                itemRange = new m.Range(
                  item.textEdit.range.start.line + 1,
                  item.textEdit.range.start.character + 1,
                  item.textEdit.range.end.line + 1,
                  item.textEdit.range.end.character + 1
                )
                insertText = item.textEdit.newText
              } else if (item.textEdit.insert) {
                itemRange = new m.Range(
                  item.textEdit.insert.start.line + 1,
                  item.textEdit.insert.start.character + 1,
                  item.textEdit.insert.end.line + 1,
                  item.textEdit.insert.end.character + 1
                )
                insertText = item.textEdit.newText
              }
            }

            const isSnippet = item.insertTextFormat === 2
            const docValue = typeof item.documentation === 'object' ? item.documentation?.value : item.documentation

            const completionItem: any = {
              label: item.label,
              kind: getMonacoCompletionKind(m, item.kind),
              detail: item.detail,
              documentation: docValue ? { value: docValue } : undefined,
              insertText,
              insertTextRules: isSnippet ? m.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
              range: itemRange,
              sortText: item.sortText,
              filterText: item.filterText,
              commitCharacters: item.commitCharacters,
              _rawItem: item
            }

            if (item.additionalTextEdits && Array.isArray(item.additionalTextEdits)) {
              completionItem.additionalTextEdits = item.additionalTextEdits.map((edit: any) => ({
                range: new m.Range(
                  edit.range.start.line + 1,
                  edit.range.start.character + 1,
                  edit.range.end.line + 1,
                  edit.range.end.character + 1
                ),
                text: edit.newText
              }))
            }

            return completionItem
          })

          return {
            suggestions,
            incomplete: !Array.isArray(res) ? Boolean(res.isIncomplete) : false
          }
        },
        resolveCompletionItem: async (item: any) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName) || !item._rawItem) {
            return item
          }

          try {
            const resolved = await this.sendRequest(serverName, 'completionItem/resolve', item._rawItem)
            if (resolved) {
              if (resolved.documentation) {
                const docVal = typeof resolved.documentation === 'object' ? resolved.documentation.value : resolved.documentation
                item.documentation = docVal ? { value: docVal } : undefined
              }
              if (resolved.detail) {
                item.detail = resolved.detail
              }
              if (resolved.additionalTextEdits && Array.isArray(resolved.additionalTextEdits)) {
                item.additionalTextEdits = resolved.additionalTextEdits.map((edit: any) => ({
                  range: new m.Range(
                    edit.range.start.line + 1,
                    edit.range.start.character + 1,
                    edit.range.end.line + 1,
                    edit.range.end.character + 1
                  ),
                  text: edit.newText
                }))
              }
            }
          } catch {
            // resolve is best-effort per LSP
          }
          return item
        }
      })
    })

    // 4. LSP Signature Help Provider (textDocument/signatureHelp)
    languages.forEach((lang) => {
      m.languages.registerSignatureHelpProvider(lang, {
        signatureHelpTriggerCharacters: ['(', '<', ','],
        signatureHelpRetriggerCharacters: [',', '<'],
        provideSignatureHelp: async (model, position, _token, context) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return null

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/signatureHelp', {
            textDocument: { uri: this.formatUri(uri) },
            position: { line: position.lineNumber - 1, character: position.column - 1 },
            context: context
              ? {
                  triggerKind: context.triggerKind,
                  triggerCharacter: context.triggerCharacter,
                  isRetrigger: context.isRetrigger
                }
              : undefined
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

    // 11. LSP Document Range Formatting Provider (textDocument/rangeFormatting)
    languages.forEach((lang) => {
      m.languages.registerDocumentRangeFormattingEditProvider(lang, {
        provideDocumentRangeFormattingEdits: async (model, range, options) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return []

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/rangeFormatting', {
            textDocument: { uri: this.formatUri(uri) },
            range: {
              start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
              end: { line: range.endLineNumber - 1, character: range.endColumn - 1 }
            },
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

    // 12. LSP Code Action & Quick Fix Provider (textDocument/codeAction)
    languages.forEach((lang) => {
      m.languages.registerCodeActionProvider(lang, {
        provideCodeActions: async (model, range, context) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return { actions: [], dispose: () => {} }

          const uri = model.uri.toString()
          const diagnostics = (context.markers || []).map((marker) => ({
            range: {
              start: { line: marker.startLineNumber - 1, character: marker.startColumn - 1 },
              end: { line: marker.endLineNumber - 1, character: marker.endColumn - 1 }
            },
            message: marker.message,
            severity:
              marker.severity === 8
                ? 1
                : marker.severity === 4
                  ? 2
                  : marker.severity === 2
                    ? 3
                    : 4,
            code: typeof marker.code === 'object' ? marker.code.value : marker.code,
            source: marker.source
          }))

          const res = await this.sendRequest(serverName, 'textDocument/codeAction', {
            textDocument: { uri: this.formatUri(uri) },
            range: {
              start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
              end: { line: range.endLineNumber - 1, character: range.endColumn - 1 }
            },
            context: {
              diagnostics,
              only: context.only ? [context.only] : undefined
            }
          })

          if (!res || !Array.isArray(res)) return { actions: [], dispose: () => {} }

          const actions = res.map((action: any) => {
            const codeAction: monaco.languages.CodeAction = {
              title: action.title,
              kind: action.kind || 'quickfix',
              isPreferred: !!action.isPreferred
            }

            if (action.edit) {
              const edits: any[] = []
              if (action.edit.changes) {
                for (const fileUri of Object.keys(action.edit.changes)) {
                  for (const change of action.edit.changes[fileUri]) {
                    edits.push({
                      resource: m.Uri.parse(fileUri),
                      textEdit: {
                        range: new m.Range(
                          change.range.start.line + 1,
                          change.range.start.character + 1,
                          change.range.end.line + 1,
                          change.range.end.character + 1
                        ),
                        text: change.newText
                      }
                    })
                  }
                }
              }
              if (action.edit.documentChanges) {
                for (const docChange of action.edit.documentChanges) {
                  if (docChange.textDocument && docChange.edits) {
                    for (const change of docChange.edits) {
                      edits.push({
                        resource: m.Uri.parse(docChange.textDocument.uri),
                        textEdit: {
                          range: new m.Range(
                            change.range.start.line + 1,
                            change.range.start.character + 1,
                            change.range.end.line + 1,
                            change.range.end.character + 1
                          ),
                          text: change.newText
                        }
                      })
                    }
                  }
                }
              }
              codeAction.edit = { edits }
            }

            return codeAction
          })

          return {
            actions,
            dispose: () => {}
          }
        }
      })
    })

    // 13. LSP Document Highlight Provider (textDocument/documentHighlight)
    languages.forEach((lang) => {
      m.languages.registerDocumentHighlightProvider(lang, {
        provideDocumentHighlights: async (model, position) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return []

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/documentHighlight', {
            textDocument: { uri: this.formatUri(uri) },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          })

          if (!res || !Array.isArray(res)) return []
          return res.map((dh: any) => ({
            range: new m.Range(
              dh.range.start.line + 1,
              dh.range.start.character + 1,
              dh.range.end.line + 1,
              dh.range.end.character + 1
            ),
            kind:
              dh.kind === 2
                ? m.languages.DocumentHighlightKind.Write
                : dh.kind === 3
                  ? m.languages.DocumentHighlightKind.Text
                  : m.languages.DocumentHighlightKind.Read
          }))
        }
      })
    })

    // 14. LSP Inlay Hints Provider (textDocument/inlayHint)
    languages.forEach((lang) => {
      m.languages.registerInlayHintsProvider(lang, {
        provideInlayHints: async (model, range) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return { hints: [], dispose: () => {} }

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/inlayHint', {
            textDocument: { uri: this.formatUri(uri) },
            range: {
              start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
              end: { line: range.endLineNumber - 1, character: range.endColumn - 1 }
            }
          })

          if (!res || !Array.isArray(res)) return { hints: [], dispose: () => {} }
          const hints = res.map((hint: any) => ({
            position: new m.Position(hint.position.line + 1, hint.position.character + 1),
            label:
              typeof hint.label === 'string'
                ? hint.label
                : Array.isArray(hint.label)
                  ? hint.label.map((p: any) => p.value).join('')
                  : hint.label?.value || '',
            kind:
              hint.kind === 1
                ? m.languages.InlayHintKind.Type
                : m.languages.InlayHintKind.Parameter,
            paddingLeft: !!hint.paddingLeft,
            paddingRight: !!hint.paddingRight
          }))

          return { hints, dispose: () => {} }
        }
      })
    })

    // 15. LSP Folding Range Provider (textDocument/foldingRange)
    languages.forEach((lang) => {
      m.languages.registerFoldingRangeProvider(lang, {
        provideFoldingRanges: async (model) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return []

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/foldingRange', {
            textDocument: { uri: this.formatUri(uri) }
          })

          if (!res || !Array.isArray(res)) return []
          return res.map((fr: any) => ({
            start: fr.startLine + 1,
            end: fr.endLine + 1,
            kind:
              fr.kind === 'comment'
                ? m.languages.FoldingRangeKind.Comment
                : fr.kind === 'imports'
                  ? m.languages.FoldingRangeKind.Imports
                  : fr.kind === 'region'
                    ? m.languages.FoldingRangeKind.Region
                    : undefined
          }))
        }
      })
    })

    // 16. LSP Selection Range Provider (textDocument/selectionRange)
    languages.forEach((lang) => {
      m.languages.registerSelectionRangeProvider(lang, {
        provideSelectionRanges: async (model, positions) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return []

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/selectionRange', {
            textDocument: { uri: this.formatUri(uri) },
            positions: positions.map((p) => ({ line: p.lineNumber - 1, character: p.column - 1 }))
          })

          if (!res || !Array.isArray(res)) return []
          const mapRange = (sr: any): any[] => {
            const list: any[] = []
            let curr = sr
            while (curr && curr.range) {
              list.push({
                range: new m.Range(
                  curr.range.start.line + 1,
                  curr.range.start.character + 1,
                  curr.range.end.line + 1,
                  curr.range.end.character + 1
                )
              })
              curr = curr.parent
            }
            return list
          }
          return res.map(mapRange)
        }
      })
    })

    // 17. LSP Document Color Provider (textDocument/documentColor & textDocument/colorPresentation)
    languages.forEach((lang) => {
      m.languages.registerColorProvider(lang, {
        provideDocumentColors: async (model) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return []

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/documentColor', {
            textDocument: { uri: this.formatUri(uri) }
          })

          if (!res || !Array.isArray(res)) return []
          return res.map((item: any) => ({
            range: new m.Range(
              item.range.start.line + 1,
              item.range.start.character + 1,
              item.range.end.line + 1,
              item.range.end.character + 1
            ),
            color: {
              red: item.color.red,
              green: item.color.green,
              blue: item.color.blue,
              alpha: item.color.alpha
            }
          }))
        },
        provideColorPresentations: async (model, colorInfo) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return []

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/colorPresentation', {
            textDocument: { uri: this.formatUri(uri) },
            color: colorInfo.color,
            range: {
              start: { line: colorInfo.range.startLineNumber - 1, character: colorInfo.range.startColumn - 1 },
              end: { line: colorInfo.range.endLineNumber - 1, character: colorInfo.range.endColumn - 1 }
            }
          })

          if (!res || !Array.isArray(res)) return []
          return res.map((cp: any) => ({
            label: cp.label,
            textEdit: cp.textEdit
              ? {
                  range: new m.Range(
                    cp.textEdit.range.start.line + 1,
                    cp.textEdit.range.start.character + 1,
                    cp.textEdit.range.end.line + 1,
                    cp.textEdit.range.end.character + 1
                  ),
                  text: cp.textEdit.newText
                }
              : undefined
          }))
        }
      })
    })

    // 18. LSP Linked Editing Range Provider (textDocument/linkedEditingRange)
    languages.forEach((lang) => {
      m.languages.registerLinkedEditingRangeProvider(lang, {
        provideLinkedEditingRange: async (model, position) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return null

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/linkedEditingRange', {
            textDocument: { uri: this.formatUri(uri) },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          })

          if (!res || !res.ranges) return null
          return {
            ranges: res.ranges.map(
              (r: any) =>
                new m.Range(
                  r.start.line + 1,
                  r.start.character + 1,
                  r.end.line + 1,
                  r.end.character + 1
                )
            ),
            wordPattern: res.wordPattern ? new RegExp(res.wordPattern) : undefined
          }
        }
      })
    })

    // 19. LSP CodeLens Provider (textDocument/codeLens & codeLens/resolve)
    languages.forEach((lang) => {
      m.languages.registerCodeLensProvider(lang, {
        provideCodeLenses: async (model) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return { lenses: [], dispose: () => {} }

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/codeLens', {
            textDocument: { uri: this.formatUri(uri) }
          })

          if (!res || !Array.isArray(res)) return { lenses: [], dispose: () => {} }
          const lenses = res.map((cl: any) => ({
            range: new m.Range(
              cl.range.start.line + 1,
              cl.range.start.character + 1,
              cl.range.end.line + 1,
              cl.range.end.character + 1
            ),
            command: cl.command
              ? {
                  id: cl.command.command || 'nop',
                  title: cl.command.title || '',
                  arguments: cl.command.arguments
                }
              : undefined,
            _rawLens: cl
          }))

          return { lenses, dispose: () => {} }
        },
        resolveCodeLens: async (_model, codeLens: any) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName) || !codeLens._rawLens) return codeLens

          try {
            const resolved = await this.sendRequest(serverName, 'codeLens/resolve', codeLens._rawLens)
            if (resolved && resolved.command) {
              codeLens.command = {
                id: resolved.command.command || 'nop',
                title: resolved.command.title || '',
                arguments: resolved.command.arguments
              }
            }
          } catch {
            // best-effort
          }
          return codeLens
        }
      })
    })
  }

  public async organizeImports(uri: string): Promise<boolean> {
    const serverName = 'ts-server'
    if (!this.isServerActive(serverName)) return false

    try {
      const formattedUri = this.formatUri(uri)
      const res = await this.sendRequest(serverName, 'textDocument/codeAction', {
        textDocument: { uri: formattedUri },
        range: {
          start: { line: 0, character: 0 },
          end: { line: 99999, character: 0 }
        },
        context: {
          diagnostics: [],
          only: ['source.organizeImports']
        }
      })

      if (!res || !Array.isArray(res) || res.length === 0) return false
      const action = res[0]
      if (action.edit) {
        await this.applyWorkspaceEdit(action.edit)
        return true
      }
    } catch (err) {
      console.warn('Failed to organize imports:', err)
    }
    return false
  }

  public async getCodeActionsForDiagnostic(
    diag: DiagnosticItem
  ): Promise<Array<{ title: string; kind?: string; edit?: any; isPreferred?: boolean }>> {
    const serverName = 'ts-server'
    if (!this.isServerActive(serverName)) return []

    try {
      const uri = this.formatUri(diag.filePath)
      const res = await this.sendRequest(serverName, 'textDocument/codeAction', {
        textDocument: { uri },
        range: {
          start: { line: diag.line - 1, character: diag.column - 1 },
          end: { line: diag.line - 1, character: diag.column }
        },
        context: {
          diagnostics: [
            {
              range: {
                start: { line: diag.line - 1, character: diag.column - 1 },
                end: { line: diag.line - 1, character: diag.column }
              },
              message: diag.message,
              severity:
                diag.severity === 'error'
                  ? 1
                  : diag.severity === 'warning'
                    ? 2
                    : diag.severity === 'info'
                      ? 3
                      : 4,
              code: diag.code,
              source: diag.source
            }
          ]
        }
      })

      if (!res || !Array.isArray(res)) return []
      return res.map((a: any) => ({
        title: a.title,
        kind: a.kind,
        edit: a.edit,
        isPreferred: a.isPreferred
      }))
    } catch {
      return []
    }
  }

  public async applyWorkspaceEdit(workspaceEdit: any): Promise<boolean> {
    if (!workspaceEdit) return false

    try {
      // 1. Changes map: { [uri: string]: TextEdit[] }
      if (workspaceEdit.changes) {
        for (const uri of Object.keys(workspaceEdit.changes)) {
          const edits = workspaceEdit.changes[uri]
          await this.applyFileEdits(uri, edits)
        }
      }

      // 2. DocumentChanges array: (TextDocumentEdit | CreateFile | RenameFile | DeleteFile)[]
      if (workspaceEdit.documentChanges && Array.isArray(workspaceEdit.documentChanges)) {
        for (const docChange of workspaceEdit.documentChanges) {
          if (docChange.textDocument && docChange.edits) {
            await this.applyFileEdits(docChange.textDocument.uri, docChange.edits)
          }
        }
      }

      return true
    } catch (err) {
      console.error('Failed to apply workspace edit:', err)
      return false
    }
  }

  private async applyFileEdits(uri: string, edits: any[]): Promise<void> {
    const m = this.monacoInstance
    const filePath = uri.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
    const normalizedUri = this.formatUri(uri)

    const model = m?.editor.getModels().find((mod) => this.formatUri(mod.uri.toString()) === normalizedUri)

    if (model && m) {
      const sorted = [...edits].sort((a, b) => {
        if (b.range.start.line !== a.range.start.line) return b.range.start.line - a.range.start.line
        return b.range.start.character - a.range.start.character
      })

      const monacoEdits = sorted.map((e) => ({
        range: new m.Range(
          e.range.start.line + 1,
          e.range.start.character + 1,
          e.range.end.line + 1,
          e.range.end.character + 1
        ),
        text: e.newText
      }))

      model.pushEditOperations([], monacoEdits, () => null)
      const newContent = model.getValue()
      useEditorStore.getState().updateFileContent(model.uri.fsPath || filePath, newContent)
      this.notifyDocChange('ts-server', model.uri.fsPath || filePath, model.getVersionId(), newContent)
    } else {
      try {
        const diskContent = await window.maestroAPI.readFile(filePath)
        const sorted = [...edits].sort((a, b) => {
          if (b.range.start.line !== a.range.start.line) return b.range.start.line - a.range.start.line
          return b.range.start.character - a.range.start.character
        })

        let modified = diskContent
        for (const edit of sorted) {
          const startLine = edit.range.start.line
          const startChar = edit.range.start.character
          const endLine = edit.range.end.line
          const endChar = edit.range.end.character

          const currentLines = modified.split('\n')
          let startIndex = 0
          for (let l = 0; l < startLine && l < currentLines.length; l++) {
            startIndex += currentLines[l].length + 1
          }
          startIndex += startChar

          let endIndex = 0
          for (let l = 0; l < endLine && l < currentLines.length; l++) {
            endIndex += currentLines[l].length + 1
          }
          endIndex += endChar

          modified = modified.slice(0, startIndex) + edit.newText + modified.slice(endIndex)
        }

        await window.maestroAPI.writeFile(filePath, modified)
      } catch (e) {
        console.warn(`Failed to apply edits to file ${filePath}:`, e)
      }
    }
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

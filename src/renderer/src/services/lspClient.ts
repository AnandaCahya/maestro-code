import type * as monaco from 'monaco-editor'
import type { LspMessage } from '../../../preload/index.d'
import { useEditorStore, DiagnosticItem, DocumentSymbolItem } from '../store/useEditorStore'
import { registerLanguageConfigurations } from './languageService'

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

const SEMANTIC_TOKEN_TYPES = [
  'comment', 'keyword', 'string', 'number', 'regexp', 'operator', 'namespace',
  'type', 'struct', 'class', 'interface', 'enum', 'typeParameter', 'function',
  'method', 'decorator', 'macro', 'variable', 'parameter', 'property', 'label',
  'enumMember', 'event'
]

const SEMANTIC_TOKEN_MODIFIERS = [
  'declaration', 'definition', 'readonly', 'static', 'deprecated', 'abstract',
  'async', 'modification', 'documentation', 'defaultLibrary'
]

class LspClientManager {
  private activeServers = new Set<string>()
  private requestId = 100
  private pendingRequests = new Map<number | string, (res: any) => void>()
  private monacoInstance: typeof monaco | null = null
  private providersRegistered = false
  private documentVersions = new Map<string, number>()
  private dynamicCapabilities = new Map<string, any>()
  private workspaceFolders: Array<{ uri: string; name: string }> = []
  private discoveredProjects: Array<{
    configPath: string
    projectRoot: string
    compilerOptions: any
    isValid: boolean
    error?: string
    warnings?: string[]
  }> = []

  public getDiscoveredProjects() {
    return this.discoveredProjects
  }

  public async updateConfigForFile(filePath: string): Promise<void> {
    const { workspacePath } = useEditorStore.getState()
    if (!workspacePath || !filePath) return
    try {
      const cleanPath = filePath.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
      const config = await window.maestroAPI.loadTsConfig(workspacePath, cleanPath)
      if (config?.compilerOptions) {
        this.applyTsConfig(config.compilerOptions, config.projectRoot)
      }
    } catch {
      // ignore
    }
  }

  public getDynamicCapabilities(): Map<string, any> {
    return this.dynamicCapabilities
  }

  public getWorkspaceFolders(): Array<{ uri: string; name: string }> {
    return this.workspaceFolders
  }

  public updateWorkspaceFolders(
    added: Array<{ uri: string; name: string }>,
    removed: Array<{ uri: string; name: string }>
  ): void {
    const addedFormatted = added.map((f) => ({ uri: this.formatUri(f.uri), name: f.name }))
    const removedFormatted = removed.map((f) => ({ uri: this.formatUri(f.uri), name: f.name }))

    const removedUris = new Set(removedFormatted.map((f) => f.uri))
    this.workspaceFolders = this.workspaceFolders.filter((f) => !removedUris.has(f.uri))
    this.workspaceFolders.push(...addedFormatted)

    for (const serverName of this.activeServers) {
      this.sendNotification(serverName, 'workspace/didChangeWorkspaceFolders', {
        event: {
          added: addedFormatted,
          removed: removedFormatted
        }
      })
    }
  }

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

      m.languages.typescript.typescriptDefaults.setEagerModelSync(true)
      m.languages.typescript.javascriptDefaults.setEagerModelSync(true)

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

    // Register Language Configurations (comments, brackets, auto-closing pairs) and Snippets
    try {
      registerLanguageConfigurations(m)
    } catch {
      // ignore
    }
  }

  public async reloadTypeScriptService(): Promise<void> {
    const serverName = 'ts-server'
    const { workspacePath, openFiles, activeFilePath } = useEditorStore.getState()
    if (!workspacePath) return

    try {
      // 1. Discover multi-project tsconfigs across the workspace
      const discovery = await window.maestroAPI.discoverTsProjects?.(workspacePath)
      if (discovery) {
        this.discoveredProjects = discovery.projects || []

        // Report invalid tsconfig syntax/compiler flag diagnostics
        if (discovery.errors && discovery.errors.length > 0) {
          const configDiags: DiagnosticItem[] = discovery.errors.map((errItem, idx) => ({
            id: `tsconfig-diag-${idx}`,
            filePath: errItem.configPath,
            fileName: errItem.configPath.split(/[/\\]/).pop() || 'tsconfig.json',
            message: `[TypeScript Configuration] ${errItem.error}`,
            severity: 'error',
            source: 'tsconfig',
            line: 1,
            column: 1
          }))
          useEditorStore.getState().setDiagnostics(configDiags)
          useEditorStore.getState().appendOutput('lsp', `[tsconfig Error] Found ${discovery.errors.length} invalid TypeScript configuration file(s).`)
        }
      }

      // 2. Load active file's matching tsconfig (or nearest project)
      const config = await window.maestroAPI.loadTsConfig(workspacePath, activeFilePath || undefined)
      if (config?.compilerOptions) {
        this.applyTsConfig(config.compilerOptions, config.projectRoot)
      }
    } catch (e) {
      console.warn('Failed to reload tsconfig:', e)
    }

    if (this.isServerActive(serverName)) {
      await this.stopServer(serverName)
      await this.startServer(serverName, 'npx', ['typescript-language-server', '--stdio'], workspacePath)
      for (const file of openFiles) {
        if (file.language && ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(file.language)) {
          this.notifyDocOpen(serverName, file.path, file.language, file.content, 1)
        }
      }
    }
  }

  public async getMoniker(uri: string, position: { line: number; character: number }): Promise<any> {
    const serverName = 'ts-server'
    if (!this.isServerActive(serverName)) return null
    try {
      return await this.sendRequest(serverName, 'textDocument/moniker', {
        textDocument: { uri: this.formatUri(uri) },
        position
      })
    } catch {
      return null
    }
  }

  public applyTsConfig(compilerOptions: any, _projectRoot?: string): void {
    if (!this.monacoInstance) return
    try {
      const m = this.monacoInstance
      const current = m.languages.typescript.typescriptDefaults.getCompilerOptions()

      let target = current.target
      if (compilerOptions.target !== undefined) {
        const t = String(compilerOptions.target).toLowerCase()
        if (t === 'es3') target = m.languages.typescript.ScriptTarget.ES3
        else if (t === 'es5') target = m.languages.typescript.ScriptTarget.ES5
        else if (t === 'es6' || t === 'es2015') target = m.languages.typescript.ScriptTarget.ES2015
        else if (t === 'es2016') target = m.languages.typescript.ScriptTarget.ES2016
        else if (t === 'es2017') target = m.languages.typescript.ScriptTarget.ES2017
        else if (t === 'es2018') target = m.languages.typescript.ScriptTarget.ES2018
        else if (t === 'es2019') target = m.languages.typescript.ScriptTarget.ES2019
        else if (t === 'es2020') target = m.languages.typescript.ScriptTarget.ES2020
        else if (t === 'es2021') target = m.languages.typescript.ScriptTarget.ES2021
        else if (t === 'es2022') target = m.languages.typescript.ScriptTarget.ES2022
        else target = m.languages.typescript.ScriptTarget.ESNext
      }

      let jsx = current.jsx
      if (compilerOptions.jsx !== undefined) {
        const j = String(compilerOptions.jsx).toLowerCase()
        if (j === 'react') jsx = m.languages.typescript.JsxEmit.React
        else if (j === 'react-jsx' || j === 'react-jsxdev') jsx = m.languages.typescript.JsxEmit.ReactJSX
        else if (j === 'preserve') jsx = m.languages.typescript.JsxEmit.Preserve
        else if (j === 'react-native') jsx = m.languages.typescript.JsxEmit.ReactNative
      }

      let moduleResolution = current.moduleResolution
      if (compilerOptions.moduleResolution !== undefined) {
        const mr = String(compilerOptions.moduleResolution).toLowerCase()
        if (mr === 'classic') moduleResolution = m.languages.typescript.ModuleResolutionKind.Classic
        else moduleResolution = m.languages.typescript.ModuleResolutionKind.NodeJs
      }

      const mergedOptions = {
        ...current,
        target,
        jsx,
        moduleResolution,
        baseUrl: compilerOptions.baseUrl !== undefined ? compilerOptions.baseUrl : current.baseUrl,
        paths: compilerOptions.paths !== undefined ? compilerOptions.paths : current.paths,
        strict: compilerOptions.strict !== undefined ? Boolean(compilerOptions.strict) : current.strict,
        allowJs: compilerOptions.allowJs !== undefined ? Boolean(compilerOptions.allowJs) : current.allowJs,
        checkJs: compilerOptions.checkJs !== undefined ? Boolean(compilerOptions.checkJs) : current.checkJs,
        noImplicitAny: compilerOptions.noImplicitAny !== undefined ? Boolean(compilerOptions.noImplicitAny) : current.noImplicitAny,
        esModuleInterop: compilerOptions.esModuleInterop !== undefined ? Boolean(compilerOptions.esModuleInterop) : current.esModuleInterop,
        experimentalDecorators: compilerOptions.experimentalDecorators !== undefined ? Boolean(compilerOptions.experimentalDecorators) : current.experimentalDecorators
      }

      m.languages.typescript.typescriptDefaults.setCompilerOptions(mergedOptions)
      m.languages.typescript.javascriptDefaults.setCompilerOptions({
        ...mergedOptions,
        checkJs: compilerOptions.checkJs ?? false
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
      const filePath = marker.resource.fsPath || marker.resource.path || marker.resource.toString()
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

      // Send initialize request as required by LSP specification
      const formattedRoot = rootUri ? this.formatUri(rootUri) : null
      try {
        await this.sendRequest(serverName, 'initialize', {
          processId: null,
          clientInfo: {
            name: 'Maestro Studio',
            version: '0.1.0'
          },
          rootUri: formattedRoot,
          rootPath: rootUri || null,
          workspaceFolders: formattedRoot
            ? [{ uri: formattedRoot, name: rootUri?.split(/[/\\]/).pop() || 'workspace' }]
            : null,
          capabilities: {
            workspace: {
              workspaceFolders: true,
              configuration: true
            },
            textDocument: {
              synchronization: {
                dynamicRegistration: false,
                willSave: false,
                willSaveWaitUntil: false,
                didSave: true
              },
              publishDiagnostics: {
                relatedInformation: true,
                versionSupport: true,
                tagSupport: { valueSet: [1, 2] }
              },
              completion: {
                dynamicRegistration: false,
                completionItem: {
                  snippetSupport: true,
                  commitCharactersSupport: true,
                  documentationFormat: ['markdown', 'plaintext']
                }
              },
              hover: {
                dynamicRegistration: false,
                contentFormat: ['markdown', 'plaintext']
              },
              definition: { dynamicRegistration: false },
              references: { dynamicRegistration: false },
              documentSymbol: {
                dynamicRegistration: false,
                hierarchicalDocumentSymbolSupport: true
              },
              codeAction: { dynamicRegistration: false },
              formatting: { dynamicRegistration: false },
              rangeFormatting: { dynamicRegistration: false },
              onTypeFormatting: { dynamicRegistration: false },
              rename: { dynamicRegistration: false, prepareSupport: true },
              semanticTokens: {
                dynamicRegistration: false,
                requests: {
                  range: true,
                  full: {
                    delta: true
                  }
                },
                tokenTypes: SEMANTIC_TOKEN_TYPES,
                tokenModifiers: SEMANTIC_TOKEN_MODIFIERS,
                formats: ['relative'],
                multilineTokenSupport: false,
                overlappingTokenSupport: false
              }
            }
          }
        })

        // Send initialized notification
        this.sendNotification(serverName, 'initialized', {})
        useEditorStore.getState().setLspStatus('ready')

        // Re-notify open files for this server
        const { openFiles } = useEditorStore.getState()
        for (const file of openFiles) {
          if (file.language && ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(file.language)) {
            this.notifyDocOpen(serverName, file.path, file.language, file.content, 1)
          }
        }
      } catch (err) {
        console.warn(`LSP initialization error for ${serverName}:`, err)
      }

      return true
    }
    return false
  }

  public sendNotification(serverName: string, method: string, params: any): void {
    if (!this.activeServers.has(serverName)) return
    window.maestroAPI.sendLspMessage(serverName, {
      jsonrpc: '2.0',
      method,
      params
    })
  }

  public async ensureServerForFile(filePath: string, languageId: string): Promise<void> {
    const isJsTs = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(languageId)
    if (isJsTs && !this.isServerActive('ts-server')) {
      const { workspacePath } = useEditorStore.getState()
      const root = workspacePath || filePath.replace(/[/\\][^/\\]+$/, '')
      await this.startServer('ts-server', 'npx', ['typescript-language-server', '--stdio'], root)
    }
  }

  public async stopServer(serverName: string): Promise<void> {
    await window.maestroAPI.stopLsp(serverName)
    this.activeServers.delete(serverName)
  }

  public isServerActive(serverName: string): boolean {
    return this.activeServers.has(serverName)
  }

  public async sendRequest(
    serverName: string,
    method: string,
    params: any,
    cancellationToken?: {
      isCancellationRequested?: boolean
      onCancellationRequested?: (cb: () => void) => { dispose?: () => void } | void
    }
  ): Promise<any> {
    if (!this.activeServers.has(serverName)) {
      return null
    }

    if (cancellationToken?.isCancellationRequested) {
      return null
    }

    const id = ++this.requestId
    return new Promise((resolve) => {
      let unbindCancel: any = null

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        if (unbindCancel && typeof unbindCancel.dispose === 'function') {
          unbindCancel.dispose()
        }
        // Send cancel request on timeout
        window.maestroAPI?.cancelLsp?.(serverName, id)
        resolve(null)
      }, 15000)

      if (cancellationToken && typeof cancellationToken.onCancellationRequested === 'function') {
        unbindCancel = cancellationToken.onCancellationRequested(() => {
          clearTimeout(timer)
          this.pendingRequests.delete(id)
          window.maestroAPI?.cancelLsp?.(serverName, id)
          resolve(null)
        })
      }

      this.pendingRequests.set(id, (res) => {
        clearTimeout(timer)
        if (unbindCancel && typeof unbindCancel.dispose === 'function') {
          unbindCancel.dispose()
        }
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

  public notifyDocOpen(
    serverName: string,
    uri: string,
    languageId: string,
    text: string,
    version: number = 1
  ): void {
    if (!this.activeServers.has(serverName)) return

    const formattedUri = this.formatUri(uri)
    this.documentVersions.set(formattedUri, version)

    // For JS/TS files, asynchronously update project compiler settings if belonging to multi-project config
    if (['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(languageId)) {
      this.updateConfigForFile(uri)
    }

    window.maestroAPI.sendLspMessage(serverName, {
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: formattedUri,
          languageId,
          version,
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

    const formattedUri = this.formatUri(uri)
    this.documentVersions.set(formattedUri, version)

    window.maestroAPI.sendLspMessage(serverName, {
      jsonrpc: '2.0',
      method: 'textDocument/didChange',
      params: {
        textDocument: {
          uri: formattedUri,
          version
        },
        contentChanges: [{ text }]
      }
    })
  }

  public notifyDocClose(serverName: string, uri: string): void {
    if (!this.activeServers.has(serverName)) return

    const formattedUri = this.formatUri(uri)
    this.documentVersions.delete(formattedUri)

    window.maestroAPI.sendLspMessage(serverName, {
      jsonrpc: '2.0',
      method: 'textDocument/didClose',
      params: {
        textDocument: { uri: formattedUri }
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

  public notifyDidChangeConfiguration(serverName: string, settings: any): void {
    if (!this.activeServers.has(serverName)) return

    window.maestroAPI.sendLspMessage(serverName, {
      jsonrpc: '2.0',
      method: 'workspace/didChangeConfiguration',
      params: { settings }
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

          // Preload model in Monaco if target is an unopened file so Peek Definition works
          for (const target of targets) {
            const targetUri = target.uri || target.targetUri
            if (targetUri) {
              const uriObj = m.Uri.parse(targetUri)
              if (!m.editor.getModel(uriObj)) {
                try {
                  const fsPath = targetUri.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
                  const content = await window.maestroAPI.readFile(fsPath)
                  if (typeof content === 'string') {
                    m.editor.createModel(content, undefined, uriObj)
                  }
                } catch {
                  // ignore
                }
              }
            }
          }

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

          // Preload model in Monaco if referenced file is not open so Peek References works
          for (const ref of res) {
            if (ref.uri) {
              const uriObj = m.Uri.parse(ref.uri)
              if (!m.editor.getModel(uriObj)) {
                try {
                  const fsPath = ref.uri.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
                  const content = await window.maestroAPI.readFile(fsPath)
                  if (typeof content === 'string') {
                    m.editor.createModel(content, undefined, uriObj)
                  }
                } catch {
                  // ignore
                }
              }
            }
          }

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

    // 20. LSP Document Link Provider (textDocument/documentLink)
    languages.forEach((lang) => {
      m.languages.registerLinkProvider(lang, {
        provideLinks: async (model) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return { links: [] }

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/documentLink', {
            textDocument: { uri: this.formatUri(uri) }
          })

          if (!res || !Array.isArray(res)) return { links: [] }
          return {
            links: res.map((link: any) => ({
              range: new m.Range(
                link.range.start.line + 1,
                link.range.start.character + 1,
                link.range.end.line + 1,
                link.range.end.character + 1
              ),
              url: link.target,
              tooltip: link.tooltip
            }))
          }
        }
      })
    })

    // 21. LSP On-Type Formatting Provider (textDocument/onTypeFormatting)
    languages.forEach((lang) => {
      m.languages.registerOnTypeFormattingEditProvider(lang, {
        autoFormatTriggerCharacters: [';', '}', '\n'],
        provideOnTypeFormattingEdits: async (model, position, ch, options) => {
          const serverName = 'ts-server'
          if (!this.isServerActive(serverName)) return []

          const uri = model.uri.toString()
          const res = await this.sendRequest(serverName, 'textDocument/onTypeFormatting', {
            textDocument: { uri: this.formatUri(uri) },
            position: { line: position.lineNumber - 1, character: position.column - 1 },
            ch,
            options: {
              tabSize: options.tabSize,
              insertSpaces: options.insertSpaces
            }
          })

          if (!res || !Array.isArray(res)) return []
          return res.map((e: any) => ({
            range: new m.Range(
              e.range.start.line + 1,
              e.range.start.character + 1,
              e.range.end.line + 1,
              e.range.end.character + 1
            ),
            text: e.newText
          }))
        }
      })
    })

    // 22. LSP Call Hierarchy Provider
    languages.forEach((lang) => {
      if ((m.languages as any).registerCallHierarchyProvider) {
        ;(m.languages as any).registerCallHierarchyProvider(lang, {
          provideCallHierarchyItems: async (model: any, position: any) => {
            const serverName = 'ts-server'
            if (!this.isServerActive(serverName)) return undefined

            const uri = model.uri.toString()
            const res = await this.sendRequest(serverName, 'textDocument/prepareCallHierarchy', {
              textDocument: { uri: this.formatUri(uri) },
              position: { line: position.lineNumber - 1, character: position.column - 1 }
            })

            if (!res || !Array.isArray(res) || res.length === 0) return undefined
            return res.map((item: any) => ({
              name: item.name,
              kind: item.kind,
              detail: item.detail,
              uri: m.Uri.parse(item.uri),
              range: new m.Range(
                item.range.start.line + 1,
                item.range.start.character + 1,
                item.range.end.line + 1,
                item.range.end.character + 1
              ),
              selectionRange: new m.Range(
                item.selectionRange.start.line + 1,
                item.selectionRange.start.character + 1,
                item.selectionRange.end.line + 1,
                item.selectionRange.end.character + 1
              ),
              _rawItem: item
            }))
          },
          provideIncomingCalls: async (item: any) => {
            const serverName = 'ts-server'
            if (!this.isServerActive(serverName) || !item._rawItem) return undefined

            const res = await this.sendRequest(serverName, 'callHierarchy/incomingCalls', {
              item: item._rawItem
            })

            if (!res || !Array.isArray(res)) return undefined
            return res.map((call: any) => ({
              from: {
                name: call.from.name,
                kind: call.from.kind,
                detail: call.from.detail,
                uri: m.Uri.parse(call.from.uri),
                range: new m.Range(
                  call.from.range.start.line + 1,
                  call.from.range.start.character + 1,
                  call.from.range.end.line + 1,
                  call.from.range.end.character + 1
                ),
                selectionRange: new m.Range(
                  call.from.selectionRange.start.line + 1,
                  call.from.selectionRange.start.character + 1,
                  call.from.selectionRange.end.line + 1,
                  call.from.selectionRange.end.character + 1
                ),
                _rawItem: call.from
              },
              fromRanges: (call.fromRanges || []).map(
                (r: any) =>
                  new m.Range(
                    r.start.line + 1,
                    r.start.character + 1,
                    r.end.line + 1,
                    r.end.character + 1
                  )
              )
            }))
          },
          provideOutgoingCalls: async (item: any) => {
            const serverName = 'ts-server'
            if (!this.isServerActive(serverName) || !item._rawItem) return undefined

            const res = await this.sendRequest(serverName, 'callHierarchy/outgoingCalls', {
              item: item._rawItem
            })

            if (!res || !Array.isArray(res)) return undefined
            return res.map((call: any) => ({
              to: {
                name: call.to.name,
                kind: call.to.kind,
                detail: call.to.detail,
                uri: m.Uri.parse(call.to.uri),
                range: new m.Range(
                  call.to.range.start.line + 1,
                  call.to.range.start.character + 1,
                  call.to.range.end.line + 1,
                  call.to.range.end.character + 1
                ),
                selectionRange: new m.Range(
                  call.to.selectionRange.start.line + 1,
                  call.to.selectionRange.start.character + 1,
                  call.to.selectionRange.end.line + 1,
                  call.to.selectionRange.end.character + 1
                ),
                _rawItem: call.to
              },
              fromRanges: (call.fromRanges || []).map(
                (r: any) =>
                  new m.Range(
                    r.start.line + 1,
                    r.start.character + 1,
                    r.end.line + 1,
                    r.end.character + 1
                  )
              )
            }))
          }
        })
      }
    })

    // 23. LSP Type Hierarchy Provider
    languages.forEach((lang) => {
      if ((m.languages as any).registerTypeHierarchyProvider) {
        ;(m.languages as any).registerTypeHierarchyProvider(lang, {
          provideTypeHierarchyItems: async (model: any, position: any) => {
            const serverName = 'ts-server'
            if (!this.isServerActive(serverName)) return undefined

            const uri = model.uri.toString()
            const res = await this.sendRequest(serverName, 'textDocument/prepareTypeHierarchy', {
              textDocument: { uri: this.formatUri(uri) },
              position: { line: position.lineNumber - 1, character: position.column - 1 }
            })

            if (!res || !Array.isArray(res) || res.length === 0) return undefined
            return res.map((item: any) => ({
              name: item.name,
              kind: item.kind,
              detail: item.detail,
              uri: m.Uri.parse(item.uri),
              range: new m.Range(
                item.range.start.line + 1,
                item.range.start.character + 1,
                item.range.end.line + 1,
                item.range.end.character + 1
              ),
              selectionRange: new m.Range(
                item.selectionRange.start.line + 1,
                item.selectionRange.start.character + 1,
                item.selectionRange.end.line + 1,
                item.selectionRange.end.character + 1
              ),
              _rawItem: item
            }))
          },
          provideSupertypes: async (item: any) => {
            const serverName = 'ts-server'
            if (!this.isServerActive(serverName) || !item._rawItem) return undefined

            const res = await this.sendRequest(serverName, 'typeHierarchy/supertypes', {
              item: item._rawItem
            })

            if (!res || !Array.isArray(res)) return undefined
            return res.map((st: any) => ({
              name: st.name,
              kind: st.kind,
              detail: st.detail,
              uri: m.Uri.parse(st.uri),
              range: new m.Range(
                st.range.start.line + 1,
                st.range.start.character + 1,
                st.range.end.line + 1,
                st.range.end.character + 1
              ),
              selectionRange: new m.Range(
                st.selectionRange.start.line + 1,
                st.selectionRange.start.character + 1,
                st.selectionRange.end.line + 1,
                st.selectionRange.end.character + 1
              ),
              _rawItem: st
            }))
          },
          provideSubtypes: async (item: any) => {
            const serverName = 'ts-server'
            if (!this.isServerActive(serverName) || !item._rawItem) return undefined

            const res = await this.sendRequest(serverName, 'typeHierarchy/subtypes', {
              item: item._rawItem
            })

            if (!res || !Array.isArray(res)) return undefined
            return res.map((st: any) => ({
              name: st.name,
              kind: st.kind,
              detail: st.detail,
              uri: m.Uri.parse(st.uri),
              range: new m.Range(
                st.range.start.line + 1,
                st.range.start.character + 1,
                st.range.end.line + 1,
                st.range.end.character + 1
              ),
              selectionRange: new m.Range(
                st.selectionRange.start.line + 1,
                st.selectionRange.start.character + 1,
                st.selectionRange.end.line + 1,
                st.selectionRange.end.character + 1
              ),
              _rawItem: st
            }))
          }
        })
      }
    })

    // 24. Semantic Tokens Provider (with Delta & Cancellation support)
    const legend = { tokenTypes: SEMANTIC_TOKEN_TYPES, tokenModifiers: SEMANTIC_TOKEN_MODIFIERS }

    languages.forEach((lang) => {
      if ((m.languages as any).registerDocumentSemanticTokensProvider) {
        ;(m.languages as any).registerDocumentSemanticTokensProvider(lang, {
          getLegend: () => legend,
          provideDocumentSemanticTokens: async (model: any, lastResultId: string | null, token: any) => {
            const serverName = 'ts-server'
            if (!this.isServerActive(serverName)) return undefined

            const uri = model.uri.toString()
            const formattedUri = this.formatUri(uri)

            // If lastResultId is present, attempt delta token computation
            if (lastResultId) {
              try {
                const deltaRes = await this.sendRequest(
                  serverName,
                  'textDocument/semanticTokens/full/delta',
                  {
                    textDocument: { uri: formattedUri },
                    previousResultId: lastResultId
                  },
                  token
                )

                if (deltaRes) {
                  // If delta edits were computed by LSP server:
                  if (deltaRes.edits && Array.isArray(deltaRes.edits)) {
                    return {
                      resultId: deltaRes.resultId,
                      edits: deltaRes.edits.map((e: any) => ({
                        start: e.start,
                        deleteCount: e.deleteCount,
                        data: e.data ? new Uint32Array(e.data) : undefined
                      }))
                    }
                  }
                  // If server fell back to full token data:
                  if (deltaRes.data) {
                    return {
                      resultId: deltaRes.resultId,
                      data: new Uint32Array(deltaRes.data)
                    }
                  }
                }
              } catch {
                // Fallback to full request below
              }
            }

            // Full semantic tokens request with cancellation token
            const res = await this.sendRequest(
              serverName,
              'textDocument/semanticTokens/full',
              {
                textDocument: { uri: formattedUri }
              },
              token
            )

            if (!res || !res.data) return undefined
            return {
              data: new Uint32Array(res.data),
              resultId: res.resultId
            }
          },
          releaseDocumentSemanticTokens: (_resultId: string | undefined) => {
            // Document semantic token state cleanup
          }
        })
      }

      if ((m.languages as any).registerDocumentRangeSemanticTokensProvider) {
        ;(m.languages as any).registerDocumentRangeSemanticTokensProvider(lang, {
          getLegend: () => legend,
          provideDocumentRangeSemanticTokens: async (model: any, range: any, token: any) => {
            const serverName = 'ts-server'
            if (!this.isServerActive(serverName)) return undefined

            const uri = model.uri.toString()
            const res = await this.sendRequest(
              serverName,
              'textDocument/semanticTokens/range',
              {
                textDocument: { uri: this.formatUri(uri) },
                range: {
                  start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
                  end: { line: range.endLineNumber - 1, character: range.endColumn - 1 }
                }
              },
              token
            )

            if (!res || !res.data) return undefined
            return {
              data: new Uint32Array(res.data)
            }
          }
        })
      }
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
        isPreferred: a.isPreferred,
        command: a.command,
        _rawAction: a
      }))
    } catch {
      return []
    }
  }

  public async resolveCodeAction(serverName: string, action: any): Promise<any> {
    if (!this.isServerActive(serverName) || !action) return action
    try {
      const raw = action._rawAction || action
      const res = await this.sendRequest(serverName, 'codeAction/resolve', raw)
      return res || action
    } catch {
      return action
    }
  }

  public async applyWorkspaceEdit(workspaceEdit: any, options?: { forceNoPreview?: boolean }): Promise<boolean> {
    if (!workspaceEdit) return false

    // Analyze affected files and count edits
    const affectedUris: string[] = []
    const affectedFiles: Array<{
      uri: string
      filePath: string
      fileName: string
      editsCount: number
      kind?: 'edit' | 'create' | 'delete' | 'rename'
      diffPreview?: string
    }> = []
    let totalEdits = 0
    let hasDeletions = false
    let hasCreations = false

    if (workspaceEdit.changes) {
      for (const uri of Object.keys(workspaceEdit.changes)) {
        if (!affectedUris.includes(uri)) affectedUris.push(uri)
        const edits = workspaceEdit.changes[uri] || []
        totalEdits += edits.length
        const filePath = uri.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
        const fileName = filePath.split(/[/\\]/).pop() || 'file'
        const diffPreview = edits
          .slice(0, 5)
          .map((e: any) => `Line ${(e.range?.start?.line ?? 0) + 1}: ${e.newText || '(deleted text)'}`)
          .join('\n')
        affectedFiles.push({
          uri,
          filePath,
          fileName,
          editsCount: edits.length,
          kind: 'edit',
          diffPreview
        })
      }
    }

    if (workspaceEdit.documentChanges && Array.isArray(workspaceEdit.documentChanges)) {
      for (const dc of workspaceEdit.documentChanges) {
        if (dc.textDocument?.uri) {
          const uri = dc.textDocument.uri
          if (!affectedUris.includes(uri)) affectedUris.push(uri)
          const edits = dc.edits || []
          totalEdits += edits.length
          const filePath = uri.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
          const fileName = filePath.split(/[/\\]/).pop() || 'file'
          const diffPreview = edits
            .slice(0, 5)
            .map((e: any) => `Line ${(e.range?.start?.line ?? 0) + 1}: ${e.newText || '(deleted text)'}`)
            .join('\n')
          affectedFiles.push({
            uri,
            filePath,
            fileName,
            editsCount: edits.length,
            kind: 'edit',
            diffPreview
          })
        } else if (dc.kind === 'delete' && dc.uri) {
          hasDeletions = true
          const uri = dc.uri
          if (!affectedUris.includes(uri)) affectedUris.push(uri)
          const filePath = uri.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
          const fileName = filePath.split(/[/\\]/).pop() || 'file'
          affectedFiles.push({
            uri,
            filePath,
            fileName,
            editsCount: 0,
            kind: 'delete',
            diffPreview: 'File will be deleted'
          })
        } else if (dc.kind === 'create' && dc.uri) {
          hasCreations = true
          const uri = dc.uri
          if (!affectedUris.includes(uri)) affectedUris.push(uri)
          const filePath = uri.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
          const fileName = filePath.split(/[/\\]/).pop() || 'file'
          affectedFiles.push({
            uri,
            filePath,
            fileName,
            editsCount: 0,
            kind: 'create',
            diffPreview: 'New file will be created'
          })
        }
      }
    }

    const isLargeOrDestructive = hasDeletions || affectedUris.length >= 2 || totalEdits >= 8

    if (isLargeOrDestructive && !options?.forceNoPreview) {
      const confirmed = await new Promise<boolean>((resolve) => {
        useEditorStore.getState().setPendingWorkspaceEdit({
          edit: workspaceEdit,
          summary: {
            filesCount: affectedUris.length,
            totalEdits,
            hasDeletions,
            hasCreations,
            affectedFiles
          },
          resolve
        })
      })
      if (!confirmed) return false
    }

    // Snapshot state of all affected files for transactional rollback
    const snapshots = new Map<string, string>()
    for (const uri of affectedUris) {
      const filePath = uri.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
      const m = this.monacoInstance
      const normalizedUri = this.formatUri(uri)
      const model = m?.editor.getModels().find((mod) => this.formatUri(mod.uri.toString()) === normalizedUri)
      if (model) {
        snapshots.set(uri, model.getValue())
      } else {
        try {
          const content = await window.maestroAPI.readFile(filePath)
          snapshots.set(uri, content)
        } catch {
          // File may not exist yet or binary
        }
      }
    }

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
          } else if (docChange.kind === 'create' && docChange.uri) {
            const filePath = docChange.uri.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
            await window.maestroAPI.createFile(filePath)
          } else if (docChange.kind === 'delete' && docChange.uri) {
            const filePath = docChange.uri.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
            await window.maestroAPI.deletePath(filePath)
          } else if (docChange.kind === 'rename' && docChange.oldUri && docChange.newUri) {
            const oldPath = docChange.oldUri.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
            const newPath = docChange.newUri.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
            await window.maestroAPI.renamePath(oldPath, newPath)
          }
        }
      }

      return true
    } catch (err) {
      console.error('Failed to apply workspace edit, rolling back changes:', err)
      // Rollback to snapshots
      for (const [uri, oldContent] of snapshots.entries()) {
        const filePath = uri.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
        const m = this.monacoInstance
        const normalizedUri = this.formatUri(uri)
        const model = m?.editor.getModels().find((mod) => this.formatUri(mod.uri.toString()) === normalizedUri)
        if (model) {
          model.setValue(oldContent)
        } else {
          try {
            await window.maestroAPI.writeFile(filePath, oldContent)
          } catch {
            // ignore
          }
        }
      }
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

  private handleMessage(serverName: string, message: LspMessage): void {
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const resolver = this.pendingRequests.get(message.id)!
      this.pendingRequests.delete(message.id)
      resolver(message.result !== undefined ? message.result : message.error)
      return
    }

    // 1. Server-to-Client Request: window/workDoneProgress/create
    if (message.method === 'window/workDoneProgress/create' && message.id !== undefined) {
      window.maestroAPI?.sendLspMessage?.(serverName, {
        jsonrpc: '2.0',
        id: message.id,
        result: null
      })
      return
    }

    // Dynamic Capability Registration
    if (message.method === 'client/registerCapability' && message.id !== undefined) {
      const registrations = message.params?.registrations || []
      for (const reg of registrations) {
        this.dynamicCapabilities.set(reg.id, reg)
      }
      window.maestroAPI?.sendLspMessage?.(serverName, {
        jsonrpc: '2.0',
        id: message.id,
        result: null
      })
      return
    }

    // Dynamic Capability Unregistration
    if (message.method === 'client/unregisterCapability' && message.id !== undefined) {
      const unregisterations = message.params?.unregisterations || []
      for (const unreg of unregisterations) {
        this.dynamicCapabilities.delete(unreg.id)
      }
      window.maestroAPI?.sendLspMessage?.(serverName, {
        jsonrpc: '2.0',
        id: message.id,
        result: null
      })
      return
    }

    // Server-to-Client Workspace Edit Request
    if (message.method === 'workspace/applyEdit' && message.id !== undefined) {
      this.applyWorkspaceEdit(message.params?.edit).then((applied) => {
        window.maestroAPI?.sendLspMessage?.(serverName, {
          jsonrpc: '2.0',
          id: message.id,
          result: { applied }
        })
      })
      return
    }

    // 2. Server-to-Client Request: workspace/configuration
    if (message.method === 'workspace/configuration' && message.id !== undefined) {
      const items = message.params?.items || []
      window.maestroAPI?.sendLspMessage?.(serverName, {
        jsonrpc: '2.0',
        id: message.id,
        result: items.map(() => ({}))
      })
      return
    }

    // 3. Server-to-Client Request: workspace/workspaceFolders
    if (message.method === 'workspace/workspaceFolders' && message.id !== undefined) {
      const wsPath = useEditorStore.getState().workspacePath
      const fallbackResult = wsPath ? [{ uri: this.formatUri(wsPath), name: wsPath.split(/[/\\]/).pop() || 'root' }] : null
      const result = this.workspaceFolders.length > 0 ? this.workspaceFolders : fallbackResult
      window.maestroAPI?.sendLspMessage?.(serverName, {
        jsonrpc: '2.0',
        id: message.id,
        result
      })
      return
    }

    // 4. Server-to-Client Request: window/showMessageRequest
    if (message.method === 'window/showMessageRequest' && message.id !== undefined) {
      const actions = message.params?.actions || []
      window.maestroAPI?.sendLspMessage?.(serverName, {
        jsonrpc: '2.0',
        id: message.id,
        result: actions[0] || null
      })
      return
    }

    // 5. Server-to-Client Notifications: window/showMessage and window/logMessage
    if (message.method === 'window/showMessage' || message.method === 'window/logMessage') {
      const text = message.params?.message || ''
      const type = message.params?.type
      const label = type === 1 ? 'ERROR' : type === 2 ? 'WARN' : type === 3 ? 'INFO' : 'LOG'
      useEditorStore.getState().appendOutput('lsp', `[${serverName} ${label}] ${text}`)
      return
    }

    // 6. Progress Notification: $/progress
    if (message.method === '$/progress') {
      const { token, value } = message.params || {}
      if (value) {
        if (value.kind === 'begin') {
          useEditorStore.getState().setLspProgress({
            token,
            title: value.title || 'LSP Processing',
            message: value.message,
            percentage: value.percentage
          })
        } else if (value.kind === 'report') {
          useEditorStore.getState().setLspProgress({
            token,
            title: value.title || useEditorStore.getState().lspProgress?.title || 'LSP Processing',
            message: value.message,
            percentage: value.percentage
          })
        } else if (value.kind === 'end') {
          useEditorStore.getState().setLspProgress(null)
        }
      }
      return
    }

    // 7. textDocument/publishDiagnostics
    if (message.method === 'textDocument/publishDiagnostics' && this.monacoInstance) {
      const { uri, diagnostics, version } = message.params
      const formattedUri = this.formatUri(uri)

      // Guard against stale diagnostics from older document versions
      if (version !== undefined && version !== null) {
        const currentVersion = this.documentVersions.get(formattedUri)
        if (currentVersion !== undefined && version < currentVersion) {
          // Stale diagnostics received for an older document version, discard
          return
        }
      }

      const model = this.monacoInstance.editor
        .getModels()
        .find((m) => this.formatUri(m.uri.toString()) === formattedUri)

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

  public formatUri(uri: string): string {
    if (!uri) return ''
    try {
      let decoded = decodeURIComponent(uri).replace(/\\/g, '/')
      if (decoded.startsWith('file://')) {
        decoded = decoded.replace(/^file:\/\/\/?/, '')
      }
      decoded = decoded.replace(/^\/+/, '').replace(/\/+/g, '/')
      return 'file:///' + decoded.toLowerCase()
    } catch {
      return uri.toLowerCase()
    }
  }
}

export const lspClient = new LspClientManager()

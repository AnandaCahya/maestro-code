import fs from 'fs/promises'
import path from 'path'
import os from 'os'

export interface WorkspaceSettings {
  tabSize: number
  fontSize: number
  wordWrap: 'on' | 'off'
  formatOnSave: boolean
  minimap: boolean
  lineNumbers: 'on' | 'off' | 'relative'
  insertSpaces: boolean
  fontLigatures?: boolean
  fontFamily?: string
  filesExclude?: Record<string, boolean>
  filesAssociations?: Record<string, string>
  defaultProfile?: string
  languageOverrides?: Record<string, Partial<WorkspaceSettings>>
}

export const defaultSettings: WorkspaceSettings = {
  tabSize: 2,
  fontSize: 14,
  wordWrap: 'on',
  formatOnSave: true,
  minimap: false,
  lineNumbers: 'on',
  insertSpaces: true,
  fontLigatures: true,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  filesExclude: {
    '**/.git': true,
    '**/node_modules': true,
    '**/dist': true,
    '**/out': true
  }
}

export interface SettingSchemaDefinition {
  key: string
  type: 'number' | 'string' | 'boolean' | 'object'
  enum?: string[]
  default: any
  description: string
}

export const SETTINGS_SCHEMA: SettingSchemaDefinition[] = [
  { key: 'editor.tabSize', type: 'number', default: 2, description: 'The number of spaces a tab is equal to.' },
  { key: 'editor.fontSize', type: 'number', default: 14, description: 'Controls the font size in pixels.' },
  { key: 'editor.wordWrap', type: 'string', enum: ['on', 'off'], default: 'on', description: 'Controls how lines should wrap.' },
  { key: 'editor.formatOnSave', type: 'boolean', default: true, description: 'Format a file on save.' },
  { key: 'editor.minimap.enabled', type: 'boolean', default: false, description: 'Controls whether the minimap is shown.' },
  { key: 'editor.lineNumbers', type: 'string', enum: ['on', 'off', 'relative'], default: 'on', description: 'Controls the display of line numbers.' },
  { key: 'editor.insertSpaces', type: 'boolean', default: true, description: 'Insert spaces when pressing Tab.' },
  { key: 'files.exclude', type: 'object', default: {}, description: 'Configure glob patterns for excluding files and folders.' },
  { key: 'files.associations', type: 'object', default: {}, description: 'Configure language associations for file name patterns.' }
]

export function validateSettings(rawObj: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  for (const def of SETTINGS_SCHEMA) {
    if (rawObj[def.key] !== undefined) {
      const val = rawObj[def.key]
      if (def.type === 'number' && typeof val !== 'number') {
        errors.push(`Setting ${def.key} must be a number`)
      } else if (def.type === 'boolean' && typeof val !== 'boolean') {
        errors.push(`Setting ${def.key} must be a boolean`)
      } else if (def.type === 'string' && typeof val !== 'string') {
        errors.push(`Setting ${def.key} must be a string`)
      } else if (def.enum && !def.enum.includes(val)) {
        errors.push(`Setting ${def.key} must be one of: ${def.enum.join(', ')}`)
      }
    }
  }
  return { valid: errors.length === 0, errors }
}

export function getEffectiveSettingsForLanguage(
  baseSettings: WorkspaceSettings,
  languageId?: string
): WorkspaceSettings {
  if (!languageId || !baseSettings.languageOverrides || !baseSettings.languageOverrides[languageId]) {
    return baseSettings
  }
  const overrides = baseSettings.languageOverrides[languageId]
  return {
    ...baseSettings,
    tabSize: overrides.tabSize !== undefined ? overrides.tabSize : baseSettings.tabSize,
    fontSize: overrides.fontSize !== undefined ? overrides.fontSize : baseSettings.fontSize,
    insertSpaces: overrides.insertSpaces !== undefined ? overrides.insertSpaces : baseSettings.insertSpaces,
    wordWrap: overrides.wordWrap !== undefined ? overrides.wordWrap : baseSettings.wordWrap,
    formatOnSave: overrides.formatOnSave !== undefined ? overrides.formatOnSave : baseSettings.formatOnSave
  }
}

export function detectLanguageWithAssociations(
  fileName: string,
  associations?: Record<string, string>
): string {
  if (associations && typeof associations === 'object') {
    const baseName = fileName.split(/[\\/]/).pop() || fileName
    for (const [pattern, lang] of Object.entries(associations)) {
      if (!pattern || !lang) continue
      if (pattern === baseName) return lang
      if (pattern.includes('*')) {
        const regexStr = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
        try {
          if (new RegExp(regexStr, 'i').test(baseName)) {
            return lang
          }
        } catch {
          // ignore invalid pattern
        }
      }
    }
  }

  const base = (fileName.split(/[\\/]/).pop() || fileName).toLowerCase()
  if (base === 'dockerfile') return 'dockerfile'
  if (base.startsWith('.env')) return 'ini'

  const ext = base.split('.').pop() || ''
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'cts':
    case 'mts':
      return 'typescript'
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript'
    case 'json':
    case 'jsonc':
    case 'json5':
      return 'json'
    case 'html':
    case 'htm':
      return 'html'
    case 'css':
      return 'css'
    case 'scss':
    case 'sass':
      return 'scss'
    case 'less':
      return 'less'
    case 'md':
    case 'markdown':
      return 'markdown'
    case 'py':
    case 'pyw':
    case 'pyi':
      return 'python'
    case 'go':
      return 'go'
    case 'rs':
      return 'rust'
    case 'c':
    case 'h':
      return 'c'
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'hh':
    case 'hxx':
      return 'cpp'
    case 'cs':
      return 'csharp'
    case 'java':
      return 'java'
    case 'kt':
    case 'kts':
      return 'kotlin'
    case 'swift':
      return 'swift'
    case 'php':
      return 'php'
    case 'rb':
      return 'ruby'
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'shell'
    case 'ps1':
    case 'psm1':
      return 'powershell'
    case 'yaml':
    case 'yml':
      return 'yaml'
    case 'xml':
    case 'svg':
      return 'xml'
    case 'sql':
      return 'sql'
    case 'lua':
      return 'lua'
    case 'ini':
    case 'conf':
    case 'properties':
      return 'ini'
    case 'graphql':
    case 'gql':
      return 'graphql'
    case 'diff':
    case 'patch':
      return 'diff'
    default:
      return 'plaintext'
  }
}

export async function loadWorkspaceSettings(workspacePath: string): Promise<WorkspaceSettings> {
  const settingsPath = path.join(workspacePath, '.vscode', 'settings.json')
  try {
    const raw = await fs.readFile(settingsPath, 'utf-8')
    // Remove JSON comments if any (simple strip // and /* */)
    const cleanJson = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
    const parsed = JSON.parse(cleanJson)

    const languageOverrides: Record<string, Partial<WorkspaceSettings>> = {}
    for (const key of Object.keys(parsed)) {
      const match = /^\[([a-zA-Z0-9_\-]+)\]$/.exec(key)
      if (match && typeof parsed[key] === 'object' && parsed[key] !== null) {
        const lang = match[1]
        const block = parsed[key]
        languageOverrides[lang] = {
          tabSize: typeof block['editor.tabSize'] === 'number' ? block['editor.tabSize'] : undefined,
          fontSize: typeof block['editor.fontSize'] === 'number' ? block['editor.fontSize'] : undefined,
          insertSpaces: typeof block['editor.insertSpaces'] === 'boolean' ? block['editor.insertSpaces'] : undefined,
          wordWrap: block['editor.wordWrap'] === 'off' ? 'off' : block['editor.wordWrap'] === 'on' ? 'on' : undefined,
          formatOnSave: typeof block['editor.formatOnSave'] === 'boolean' ? block['editor.formatOnSave'] : undefined
        }
      }
    }

    const defaultProfile =
      parsed['terminal.integrated.defaultProfile.windows'] ||
      parsed['terminal.integrated.defaultProfile.linux'] ||
      parsed['terminal.integrated.defaultProfile.osx'] ||
      parsed['terminal.integrated.shell']

    return {
      tabSize: typeof parsed['editor.tabSize'] === 'number' ? parsed['editor.tabSize'] : defaultSettings.tabSize,
      fontSize: typeof parsed['editor.fontSize'] === 'number' ? parsed['editor.fontSize'] : defaultSettings.fontSize,
      wordWrap: parsed['editor.wordWrap'] === 'off' ? 'off' : defaultSettings.wordWrap,
      formatOnSave: typeof parsed['editor.formatOnSave'] === 'boolean' ? parsed['editor.formatOnSave'] : defaultSettings.formatOnSave,
      minimap: typeof parsed['editor.minimap.enabled'] === 'boolean' ? parsed['editor.minimap.enabled'] : defaultSettings.minimap,
      lineNumbers: ['on', 'off', 'relative'].includes(parsed['editor.lineNumbers'])
        ? parsed['editor.lineNumbers']
        : defaultSettings.lineNumbers,
      insertSpaces: typeof parsed['editor.insertSpaces'] === 'boolean' ? parsed['editor.insertSpaces'] : defaultSettings.insertSpaces,
      fontLigatures: typeof parsed['editor.fontLigatures'] === 'boolean' ? parsed['editor.fontLigatures'] : defaultSettings.fontLigatures,
      fontFamily: typeof parsed['editor.fontFamily'] === 'string' ? parsed['editor.fontFamily'] : defaultSettings.fontFamily,
      filesExclude: parsed['files.exclude'] && typeof parsed['files.exclude'] === 'object' ? parsed['files.exclude'] : defaultSettings.filesExclude,
      filesAssociations: parsed['files.associations'] && typeof parsed['files.associations'] === 'object' ? parsed['files.associations'] : undefined,
      defaultProfile,
      languageOverrides
    }
  } catch {
    // Jika file tidak ada atau gagal diparse, kembalikan default
    return { ...defaultSettings }
  }
}

export interface TsConfigResult {
  compilerOptions?: {
    baseUrl?: string
    paths?: Record<string, string[]>
    target?: string
    module?: string
    moduleResolution?: string
    jsx?: string
    strict?: boolean
    allowJs?: boolean
    checkJs?: boolean
    noImplicitAny?: boolean
    esModuleInterop?: boolean
    experimentalDecorators?: boolean
    [key: string]: any
  }
  configPath?: string
  projectRoot?: string
  isInferred?: boolean
  error?: string
  warnings?: string[]
}

export interface TsProjectConfig {
  configPath: string
  projectRoot: string
  compilerOptions: Record<string, any>
  references?: Array<{ path: string }>
  include?: string[]
  exclude?: string[]
  isValid: boolean
  error?: string
  warnings?: string[]
}

export interface TsWorkspaceDiscovery {
  projects: TsProjectConfig[]
  errors: Array<{ configPath: string; error: string }>
  isInferred: boolean
}

export function validateCompilerOptions(compilerOptions: Record<string, any>): {
  valid: boolean
  warnings: string[]
  errors: string[]
} {
  const warnings: string[] = []
  const errors: string[] = []

  if (compilerOptions.target !== undefined) {
    const validTargets = [
      'es3', 'es5', 'es6', 'es2015', 'es2016', 'es2017', 'es2018',
      'es2019', 'es2020', 'es2021', 'es2022', 'es2023', 'es2024', 'esnext'
    ]
    const targetStr = String(compilerOptions.target).toLowerCase()
    if (!validTargets.includes(targetStr)) {
      errors.push(`Invalid compiler target '${compilerOptions.target}'. Supported targets include: ${validTargets.slice(0, 7).join(', ')}, esnext`)
    }
  }

  if (compilerOptions.jsx !== undefined) {
    const validJsx = ['preserve', 'react', 'react-jsx', 'react-jsxdev', 'react-native']
    const jsxStr = String(compilerOptions.jsx).toLowerCase()
    if (!validJsx.includes(jsxStr)) {
      errors.push(`Invalid compiler jsx option '${compilerOptions.jsx}'. Expected one of: ${validJsx.join(', ')}`)
    }
  }

  if (compilerOptions.moduleResolution !== undefined) {
    const validResolutions = ['node', 'nodejs', 'classic', 'node16', 'nodenext', 'bundler']
    const resStr = String(compilerOptions.moduleResolution).toLowerCase()
    if (!validResolutions.includes(resStr)) {
      warnings.push(`Unrecognized moduleResolution '${compilerOptions.moduleResolution}'. Recommended: node, nodenext, or bundler`)
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  }
}

export function getInferredTsConfig(projectRoot: string): TsConfigResult {
  return {
    compilerOptions: {
      target: 'ESNext',
      module: 'CommonJS',
      moduleResolution: 'NodeJs',
      jsx: 'react-jsx',
      allowJs: true,
      checkJs: false,
      strict: false,
      esModuleInterop: true,
      allowNonTextFiles: true
    },
    projectRoot,
    isInferred: true
  }
}

export async function discoverTsProjects(workspacePath: string): Promise<TsWorkspaceDiscovery> {
  const projects: TsProjectConfig[] = []
  const errors: Array<{ configPath: string; error: string }> = []

  const IGNORED_DIRS = new Set([
    'node_modules', '.git', 'dist', 'out', 'build', '.next', '.nuxt',
    '.turbo', 'coverage', '.cache', '.idea', '.vscode'
  ])

  async function scanDir(currentDir: string, depth: number): Promise<void> {
    if (depth > 4) return
    let entries: import('fs').Dirent[]
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    const configCandidates = entries.filter(
      (e) => e.isFile() && (e.name === 'tsconfig.json' || e.name === 'jsconfig.json')
    )
    for (const file of configCandidates) {
      const fullConfigPath = path.join(currentDir, file.name)
      try {
        const raw = await fs.readFile(fullConfigPath, 'utf-8')
        const cleanJson = raw
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*/g, '')
        const parsed = JSON.parse(cleanJson)
        const opts = parsed?.compilerOptions || {}
        const validation = validateCompilerOptions(opts)

        projects.push({
          configPath: fullConfigPath,
          projectRoot: currentDir,
          compilerOptions: opts,
          references: parsed?.references,
          include: parsed?.include,
          exclude: parsed?.exclude,
          isValid: validation.valid,
          error: validation.errors.length > 0 ? validation.errors.join('; ') : undefined,
          warnings: validation.warnings
        })

        if (!validation.valid) {
          errors.push({
            configPath: fullConfigPath,
            error: validation.errors.join('; ')
          })
        }
      } catch (err: any) {
        const errMsg = `Syntax error parsing ${file.name}: ${err?.message || 'Invalid JSON'}`
        projects.push({
          configPath: fullConfigPath,
          projectRoot: currentDir,
          compilerOptions: {},
          isValid: false,
          error: errMsg
        })
        errors.push({
          configPath: fullConfigPath,
          error: errMsg
        })
      }
    }

    // Traverse subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        await scanDir(path.join(currentDir, entry.name), depth + 1)
      }
    }
  }

  try {
    await scanDir(workspacePath, 0)
  } catch {
    // ignore
  }

  if (projects.length === 0) {
    return {
      projects: [],
      errors,
      isInferred: true
    }
  }

  return {
    projects,
    errors,
    isInferred: false
  }
}

export function findTsConfigForFile(
  filePath: string,
  projects: TsProjectConfig[]
): TsProjectConfig | null {
  if (!projects || projects.length === 0) return null

  const normFile = path.resolve(filePath).toLowerCase().replace(/\\/g, '/')
  const sorted = [...projects].sort((a, b) => b.projectRoot.length - a.projectRoot.length)

  for (const proj of sorted) {
    const normRoot = path.resolve(proj.projectRoot).toLowerCase().replace(/\\/g, '/')
    if (normFile.startsWith(normRoot === '/' ? '/' : normRoot + '/') || normFile === normRoot) {
      return proj
    }
  }

  return sorted[0] || null
}

export async function loadTsConfig(
  workspacePath: string,
  filePath?: string
): Promise<TsConfigResult | null> {
  const discovery = await discoverTsProjects(workspacePath)

  if (discovery.isInferred || discovery.projects.length === 0) {
    return getInferredTsConfig(workspacePath)
  }

  let matchedProject: TsProjectConfig | null = null
  if (filePath) {
    matchedProject = findTsConfigForFile(filePath, discovery.projects)
  }

  if (!matchedProject) {
    matchedProject =
      discovery.projects.find((p) => path.resolve(p.projectRoot) === path.resolve(workspacePath)) ||
      discovery.projects[0]
  }

  return {
    compilerOptions: matchedProject.compilerOptions,
    configPath: matchedProject.configPath,
    projectRoot: matchedProject.projectRoot,
    isInferred: false,
    error: matchedProject.error,
    warnings: matchedProject.warnings
  }
}
export async function saveWorkspaceSettings(
  workspacePath: string,
  settings: WorkspaceSettings
): Promise<boolean> {
  const vscodeDir = path.join(workspacePath, '.vscode')
  const settingsPath = path.join(vscodeDir, 'settings.json')

  try {
    let existingObj: Record<string, any> = {}
    try {
      const raw = await fs.readFile(settingsPath, 'utf-8')
      existingObj = JSON.parse(raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, ''))
    } catch {
      // File belum ada
    }

    existingObj['editor.tabSize'] = settings.tabSize
    existingObj['editor.fontSize'] = settings.fontSize
    existingObj['editor.wordWrap'] = settings.wordWrap
    existingObj['editor.formatOnSave'] = settings.formatOnSave
    existingObj['editor.minimap.enabled'] = settings.minimap
    existingObj['editor.lineNumbers'] = settings.lineNumbers
    existingObj['editor.insertSpaces'] = settings.insertSpaces
    if (typeof settings.fontLigatures === 'boolean') {
      existingObj['editor.fontLigatures'] = settings.fontLigatures
    }
    if (settings.fontFamily) {
      existingObj['editor.fontFamily'] = settings.fontFamily
    }
    if (settings.filesExclude) {
      existingObj['files.exclude'] = settings.filesExclude
    }
    if (settings.filesAssociations) {
      existingObj['files.associations'] = settings.filesAssociations
    }

    await fs.mkdir(vscodeDir, { recursive: true })
    await fs.writeFile(settingsPath, JSON.stringify(existingObj, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Failed to save workspace settings:', error)
    return false
  }
}

export interface EditorConfigRules {
  indentStyle?: 'tab' | 'space'
  indentSize?: number
  tabWidth?: number
  endOfLine?: 'lf' | 'crlf' | 'cr'
  charset?: string
  trimTrailingWhitespace?: boolean
  insertFinalNewline?: boolean
}

function matchesEditorConfigPattern(filePath: string, pattern: string): boolean {
  const normPath = filePath.replace(/\\/g, '/')
  const baseName = path.basename(normPath)

  if (pattern === '*' || pattern === '**') return true

  // Handle {ts,tsx,js,jsx} braces expansion
  const braceMatch = pattern.match(/\{([^}]+)\}/)
  if (braceMatch) {
    const parts = braceMatch[1].split(',')
    return parts.some((p) => {
      const sub = pattern.replace(braceMatch[0], p.trim())
      return matchesEditorConfigPattern(filePath, sub)
    })
  }

  // Handle *.ext or ext patterns
  if (pattern.startsWith('*.')) {
    const ext = pattern.slice(1)
    return normPath.endsWith(ext)
  }

  // Handle generic wildcard regex
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')
  const regex = new RegExp(`(^|/)${regexStr}$`, 'i')
  return regex.test(normPath) || regex.test(baseName)
}

export async function loadEditorConfig(
  workspacePath: string,
  targetFilePath?: string
): Promise<EditorConfigRules | null> {
  const configPath = path.join(workspacePath, '.editorconfig')
  try {
    const raw = await fs.readFile(configPath, 'utf-8')
    const lines = raw.split('\n')
    let currentPattern = '*'
    const rules: EditorConfigRules = {}

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#') || line.startsWith(';')) continue

      // Check section header: [*.ts]
      const sectionMatch = line.match(/^\[(.*)\]$/)
      if (sectionMatch) {
        currentPattern = sectionMatch[1].trim()
        continue
      }

      // Key = value
      const eqIdx = line.indexOf('=')
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim().toLowerCase()
        const value = line.slice(eqIdx + 1).trim().toLowerCase()

        // Test if this section applies to targetFilePath
        const applies = !targetFilePath || matchesEditorConfigPattern(targetFilePath, currentPattern)
        if (applies) {
          if (key === 'indent_style') {
            rules.indentStyle = value === 'tab' ? 'tab' : 'space'
          } else if (key === 'indent_size') {
            const num = parseInt(value, 10)
            if (!isNaN(num)) rules.indentSize = num
          } else if (key === 'tab_width') {
            const num = parseInt(value, 10)
            if (!isNaN(num)) rules.tabWidth = num
          } else if (key === 'end_of_line') {
            if (value === 'lf' || value === 'crlf' || value === 'cr') {
              rules.endOfLine = value
            }
          } else if (key === 'charset') {
            rules.charset = value
          } else if (key === 'trim_trailing_whitespace') {
            rules.trimTrailingWhitespace = value === 'true'
          } else if (key === 'insert_final_newline') {
            rules.insertFinalNewline = value === 'true'
          }
        }
      }
    }

    return Object.keys(rules).length > 0 ? rules : null
  } catch {
    return null
  }
}

export interface LaunchConfiguration {
  name: string
  type: string
  request: 'launch' | 'attach' | string
  program?: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  runtimeExecutable?: string
  runtimeArgs?: string[]
  stopOnEntry?: boolean
  console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal'
  [key: string]: any
}

export interface LaunchConfigResult {
  version?: string
  configurations: LaunchConfiguration[]
  compounds?: Array<{ name: string; configurations: string[] }>
}

export interface ExtensionRecommendationsResult {
  recommendations: string[]
  unwantedRecommendations?: string[]
}

export async function loadLaunchConfig(workspacePath: string): Promise<LaunchConfigResult | null> {
  const launchPath = path.join(workspacePath, '.vscode', 'launch.json')
  try {
    const raw = await fs.readFile(launchPath, 'utf-8')
    const cleanJson = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
    const parsed = JSON.parse(cleanJson)
    if (parsed && Array.isArray(parsed.configurations)) {
      return {
        version: parsed.version,
        configurations: parsed.configurations,
        compounds: Array.isArray(parsed.compounds) ? parsed.compounds : undefined
      }
    }
  } catch {
    // File not found or invalid
  }
  return null
}

export async function loadExtensionRecommendations(
  workspacePath: string
): Promise<ExtensionRecommendationsResult | null> {
  const extPath = path.join(workspacePath, '.vscode', 'extensions.json')
  try {
    const raw = await fs.readFile(extPath, 'utf-8')
    const cleanJson = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
    const parsed = JSON.parse(cleanJson)
    if (parsed && Array.isArray(parsed.recommendations)) {
      return {
        recommendations: parsed.recommendations,
        unwantedRecommendations: Array.isArray(parsed.unwantedRecommendations)
          ? parsed.unwantedRecommendations
          : undefined
      }
    }
  } catch {
    // File not found or invalid
  }
  return null
}

export interface KeybindingEntry {
  key: string
  command: string
  when?: string
  args?: any
}

export function getUserSettingsPath(): string {
  const home = os.homedir()
  return path.join(home, '.maestro', 'settings.json')
}

export async function loadUserSettings(): Promise<Partial<WorkspaceSettings>> {
  const p = getUserSettingsPath()
  try {
    const raw = await fs.readFile(p, 'utf-8')
    const cleanJson = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
    const parsed = JSON.parse(cleanJson)
    return {
      tabSize: typeof parsed['editor.tabSize'] === 'number' ? parsed['editor.tabSize'] : undefined,
      fontSize: typeof parsed['editor.fontSize'] === 'number' ? parsed['editor.fontSize'] : undefined,
      wordWrap: parsed['editor.wordWrap'] === 'off' ? 'off' : parsed['editor.wordWrap'] === 'on' ? 'on' : undefined,
      formatOnSave: typeof parsed['editor.formatOnSave'] === 'boolean' ? parsed['editor.formatOnSave'] : undefined,
      minimap: typeof parsed['editor.minimap.enabled'] === 'boolean' ? parsed['editor.minimap.enabled'] : undefined,
      lineNumbers: ['on', 'off', 'relative'].includes(parsed['editor.lineNumbers']) ? parsed['editor.lineNumbers'] : undefined,
      insertSpaces: typeof parsed['editor.insertSpaces'] === 'boolean' ? parsed['editor.insertSpaces'] : undefined,
      filesExclude: parsed['files.exclude'] && typeof parsed['files.exclude'] === 'object' ? parsed['files.exclude'] : undefined
    }
  } catch {
    return {}
  }
}

export async function getEffectiveSettings(
  workspacePath?: string,
  languageId?: string
): Promise<WorkspaceSettings> {
  const userSettings = await loadUserSettings()
  const wsSettings = workspacePath ? await loadWorkspaceSettings(workspacePath) : defaultSettings

  // Precedence: Default -> User -> Workspace -> Language Overrides
  const merged: WorkspaceSettings = {
    ...defaultSettings,
    ...Object.fromEntries(Object.entries(userSettings).filter(([_, v]) => v !== undefined)),
    ...wsSettings
  }

  return getEffectiveSettingsForLanguage(merged, languageId)
}

export async function loadUserKeybindings(workspacePath?: string): Promise<KeybindingEntry[]> {
  const results: KeybindingEntry[] = []

  // 1. User level keybindings (~/.maestro/keybindings.json)
  const userKeybindingsPath = path.join(os.homedir(), '.maestro', 'keybindings.json')
  try {
    const raw = await fs.readFile(userKeybindingsPath, 'utf-8')
    const clean = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
    const parsed = JSON.parse(clean)
    if (Array.isArray(parsed)) {
      results.push(...parsed)
    }
  } catch {
    // optional user file
  }

  // 2. Workspace level keybindings (.vscode/keybindings.json)
  if (workspacePath) {
    const wsKeybindingsPath = path.join(workspacePath, '.vscode', 'keybindings.json')
    try {
      const raw = await fs.readFile(wsKeybindingsPath, 'utf-8')
      const clean = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
      const parsed = JSON.parse(clean)
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const existingIdx = results.findIndex((r) => r.key === item.key)
          if (existingIdx >= 0) {
            results[existingIdx] = item
          } else {
            results.push(item)
          }
        }
      }
    } catch {
      // optional workspace file
    }
  }

  return results
}

export interface KeybindingConflict {
  key: string
  commands: string[]
  whenClauses: (string | undefined)[]
  hasDirectConflict: boolean
}

/**
 * Detect conflicts in keybindings where identical key chords map to multiple commands
 */
export function detectKeybindingConflicts(keybindings: KeybindingEntry[]): KeybindingConflict[] {
  const map = new Map<string, KeybindingEntry[]>()

  for (const kb of keybindings) {
    const normalizedKey = kb.key.toLowerCase().replace(/\s+/g, '')
    const list = map.get(normalizedKey) || []
    list.push(kb)
    map.set(normalizedKey, list)
  }

  const conflicts: KeybindingConflict[] = []

  for (const [, entries] of map.entries()) {
    if (entries.length > 1) {
      const commands = entries.map((e) => e.command)
      const whenClauses = entries.map((e) => e.when)
      const hasDirectConflict =
        entries.some((e) => !e.when) ||
        entries.some((e, idx) => entries.findIndex((other, oIdx) => oIdx !== idx && other.when === e.when) >= 0)

      conflicts.push({
        key: entries[0].key,
        commands,
        whenClauses,
        hasDirectConflict
      })
    }
  }

  return conflicts
}

/**
 * Resolves the effective keybinding for a command taking context 'when' condition into account
 */
export function resolveEffectiveKeybinding(
  command: string,
  context: Record<string, any>,
  keybindings: KeybindingEntry[]
): KeybindingEntry | null {
  const matches = keybindings.filter((kb) => kb.command === command)
  if (matches.length === 0) return null

  for (const match of matches) {
    if (!match.when) return match

    const whenKey = match.when.replace(/^!/, '').trim()
    const isNegated = match.when.startsWith('!')
    const contextVal = Boolean(context[whenKey])

    if (isNegated ? !contextVal : contextVal) {
      return match
    }
  }

  return matches[0]
}

/**
 * Save user keybinding override into user (~/.maestro/keybindings.json) or workspace (.vscode/keybindings.json)
 */
export async function saveUserKeybindingOverride(
  entry: KeybindingEntry,
  workspacePath?: string
): Promise<boolean> {
  const filePath = workspacePath
    ? path.join(workspacePath, '.vscode', 'keybindings.json')
    : path.join(os.homedir(), '.maestro', 'keybindings.json')

  try {
    let existingList: KeybindingEntry[] = []
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const clean = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
      existingList = JSON.parse(clean)
      if (!Array.isArray(existingList)) existingList = []
    } catch {
      existingList = []
    }

    const idx = existingList.findIndex(
      (e) => e.key.toLowerCase() === entry.key.toLowerCase() && (e.when || '') === (entry.when || '')
    )

    if (idx >= 0) {
      existingList[idx] = entry
    } else {
      existingList.push(entry)
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(existingList, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Failed to save keybinding override:', err)
    return false
  }
}

/**
 * Remove a keybinding override
 */
export async function removeUserKeybindingOverride(
  key: string,
  command: string,
  workspacePath?: string
): Promise<boolean> {
  const filePath = workspacePath
    ? path.join(workspacePath, '.vscode', 'keybindings.json')
    : path.join(os.homedir(), '.maestro', 'keybindings.json')

  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const clean = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
    const existingList: KeybindingEntry[] = JSON.parse(clean)
    if (!Array.isArray(existingList)) return false

    const filtered = existingList.filter(
      (e) => !(e.key.toLowerCase() === key.toLowerCase() && e.command === command)
    )

    await fs.writeFile(filePath, JSON.stringify(filtered, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
}

export async function updateSettingsSafely(
  filePath: string,
  updates: Record<string, any>
): Promise<boolean> {
  try {
    let existingObj: Record<string, any> = {}
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const clean = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
      existingObj = JSON.parse(clean)
    } catch {
      existingObj = {}
    }

    // Merge updates while preserving all unknown fields
    const updated = {
      ...existingObj,
      ...updates
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Failed to safely update settings file:', filePath, err)
    return false
  }
}

const KEY_TO_PROP: Record<string, keyof WorkspaceSettings> = {
  'editor.tabSize': 'tabSize',
  'editor.fontSize': 'fontSize',
  'editor.wordWrap': 'wordWrap',
  'editor.formatOnSave': 'formatOnSave',
  'editor.minimap.enabled': 'minimap',
  'editor.lineNumbers': 'lineNumbers',
  'editor.insertSpaces': 'insertSpaces',
  'editor.fontLigatures': 'fontLigatures',
  'editor.fontFamily': 'fontFamily',
  'files.exclude': 'filesExclude',
  'files.associations': 'filesAssociations'
}

/**
 * Loads folder-level settings (.vscode/settings.json in subfolders)
 */
export async function loadFolderSettings(folderPath: string): Promise<Partial<WorkspaceSettings>> {
  const settingsPath = path.join(folderPath, '.vscode', 'settings.json')
  try {
    const raw = await fs.readFile(settingsPath, 'utf-8')
    const cleanJson = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
    const parsed = JSON.parse(cleanJson)
    const result: Partial<WorkspaceSettings> = {}
    if (typeof parsed['editor.tabSize'] === 'number') result.tabSize = parsed['editor.tabSize']
    else if (typeof parsed.tabSize === 'number') result.tabSize = parsed.tabSize

    if (typeof parsed['editor.fontSize'] === 'number') result.fontSize = parsed['editor.fontSize']
    else if (typeof parsed.fontSize === 'number') result.fontSize = parsed.fontSize

    if (parsed['editor.wordWrap'] !== undefined) result.wordWrap = parsed['editor.wordWrap']
    else if (parsed.wordWrap !== undefined) result.wordWrap = parsed.wordWrap

    if (typeof parsed['editor.formatOnSave'] === 'boolean') result.formatOnSave = parsed['editor.formatOnSave']
    else if (typeof parsed.formatOnSave === 'boolean') result.formatOnSave = parsed.formatOnSave

    if (typeof parsed['editor.insertSpaces'] === 'boolean') result.insertSpaces = parsed['editor.insertSpaces']
    else if (typeof parsed.insertSpaces === 'boolean') result.insertSpaces = parsed.insertSpaces

    return result
  } catch {
    return {}
  }
}

export interface EffectiveSettingInspectorResult {
  key: string
  effectiveValue: any
  origin: 'default' | 'user' | 'workspace' | 'folder' | 'language'
  defaultValue: any
  userValue?: any
  workspaceValue?: any
  folderValue?: any
  languageValue?: any
}

/**
 * Resolves effective setting value across default, user, workspace, folder, and language overrides
 */
export async function getEffectiveSetting(
  key: string,
  workspacePath?: string,
  folderPath?: string,
  languageId?: string
): Promise<EffectiveSettingInspectorResult> {
  const schemaDef = SETTINGS_SCHEMA.find((s) => s.key === key)
  const prop = KEY_TO_PROP[key] || (key as keyof WorkspaceSettings)
  const defaultValue = schemaDef ? schemaDef.default : (defaultSettings as any)[prop]

  const userSettings = await loadUserSettings()
  const userValue = (userSettings as any)[prop] !== undefined ? (userSettings as any)[prop] : (userSettings as any)[key]

  let workspaceValue: any = undefined
  let languageValue: any = undefined
  if (workspacePath) {
    const wsSettingsPath = path.join(workspacePath, '.vscode', 'settings.json')
    try {
      const raw = await fs.readFile(wsSettingsPath, 'utf-8')
      const clean = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
      const rawWs = JSON.parse(clean)

      if (rawWs[key] !== undefined) {
        workspaceValue = rawWs[key]
      } else if (rawWs[prop] !== undefined) {
        workspaceValue = rawWs[prop]
      }

      if (languageId && rawWs[`[${languageId}]`]) {
        const langObj = rawWs[`[${languageId}]`]
        if (langObj[key] !== undefined) {
          languageValue = langObj[key]
        } else if (langObj[prop] !== undefined) {
          languageValue = langObj[prop]
        }
      }
    } catch {
      // workspace file not present
    }
  }

  let folderValue: any = undefined
  if (folderPath) {
    const fSettings = await loadFolderSettings(folderPath)
    folderValue = (fSettings as any)[prop] !== undefined ? (fSettings as any)[prop] : (fSettings as any)[key]
  }

  let effectiveValue = defaultValue
  let origin: EffectiveSettingInspectorResult['origin'] = 'default'

  if (userValue !== undefined) {
    effectiveValue = userValue
    origin = 'user'
  }
  if (workspaceValue !== undefined) {
    effectiveValue = workspaceValue
    origin = 'workspace'
  }
  if (folderValue !== undefined) {
    effectiveValue = folderValue
    origin = 'folder'
  }
  if (languageValue !== undefined) {
    effectiveValue = languageValue
    origin = 'language'
  }

  return {
    key,
    effectiveValue,
    origin,
    defaultValue,
    userValue,
    workspaceValue,
    folderValue,
    languageValue
  }
}

export interface ConfigurationDiagnostic {
  line: number
  column: number
  message: string
  severity: 'error' | 'warning'
  key?: string
}

/**
 * Validates settings JSON against known schemas and reports diagnostics for Problems panel
 */
export function validateSettingsJsonContent(rawJson: string): {
  valid: boolean
  diagnostics: ConfigurationDiagnostic[]
  unknownKeys: string[]
} {
  const diagnostics: ConfigurationDiagnostic[] = []
  const unknownKeys: string[] = []

  let parsed: any
  try {
    const cleanJson = rawJson.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
    parsed = JSON.parse(cleanJson)
  } catch (err: any) {
    return {
      valid: false,
      diagnostics: [
        {
          line: 1,
          column: 1,
          message: `JSON syntax error: ${err.message}`,
          severity: 'error'
        }
      ],
      unknownKeys: []
    }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return {
      valid: false,
      diagnostics: [
        {
          line: 1,
          column: 1,
          message: 'Settings JSON must be an object at root level.',
          severity: 'error'
        }
      ],
      unknownKeys: []
    }
  }

  const lines = rawJson.split(/\r?\n/)

  for (const [key, val] of Object.entries(parsed)) {
    const keyLineIdx = lines.findIndex((l) => l.includes(`"${key}"`))
    const lineNum = keyLineIdx !== -1 ? keyLineIdx + 1 : 1

    const schema = SETTINGS_SCHEMA.find((s) => s.key === key)
    if (!schema) {
      if (!key.startsWith('[') && !key.endsWith(']')) {
        unknownKeys.push(key)
        diagnostics.push({
          line: lineNum,
          column: 1,
          message: `Unknown configuration setting '${key}'.`,
          severity: 'warning',
          key
        })
      }
      continue
    }

    if (schema.type === 'number' && typeof val !== 'number') {
      diagnostics.push({
        line: lineNum,
        column: 1,
        message: `Setting '${key}' must be of type number, but received ${typeof val}.`,
        severity: 'error',
        key
      })
    } else if (schema.type === 'boolean' && typeof val !== 'boolean') {
      diagnostics.push({
        line: lineNum,
        column: 1,
        message: `Setting '${key}' must be of type boolean, but received ${typeof val}.`,
        severity: 'error',
        key
      })
    } else if (schema.type === 'string' && typeof val !== 'string') {
      diagnostics.push({
        line: lineNum,
        column: 1,
        message: `Setting '${key}' must be of type string, but received ${typeof val}.`,
        severity: 'error',
        key
      })
    } else if (schema.enum && !schema.enum.includes(val)) {
      diagnostics.push({
        line: lineNum,
        column: 1,
        message: `Setting '${key}' value '${val}' is not allowed. Expected one of: ${schema.enum.join(', ')}.`,
        severity: 'error',
        key
      })
    }
  }

  const hasErrors = diagnostics.some((d) => d.severity === 'error')
  return {
    valid: !hasErrors,
    diagnostics,
    unknownKeys
  }
}

/**
 * Validates EditorConfig content and returns syntax/value diagnostics
 */
export function validateEditorConfigContent(rawContent: string): {
  valid: boolean
  diagnostics: ConfigurationDiagnostic[]
} {
  const diagnostics: ConfigurationDiagnostic[] = []
  const lines = rawContent.split(/\r?\n/)

  const validKeys = [
    'root',
    'indent_style',
    'indent_size',
    'tab_width',
    'end_of_line',
    'charset',
    'trim_trailing_whitespace',
    'insert_final_newline'
  ]

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()
    const lineNum = i + 1

    if (!line || line.startsWith('#') || line.startsWith(';')) continue

    if (line.startsWith('[')) {
      if (!line.endsWith(']')) {
        diagnostics.push({
          line: lineNum,
          column: 1,
          message: 'Malformed section header: missing closing bracket "]"',
          severity: 'error'
        })
      }
      continue
    }

    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) {
      diagnostics.push({
        line: lineNum,
        column: 1,
        message: `Invalid EditorConfig line: missing "=" delimiter`,
        severity: 'error'
      })
      continue
    }

    const key = line.slice(0, eqIdx).trim().toLowerCase()
    const value = line.slice(eqIdx + 1).trim().toLowerCase()

    if (!validKeys.includes(key)) {
      diagnostics.push({
        line: lineNum,
        column: 1,
        message: `Unrecognized EditorConfig directive "${key}"`,
        severity: 'warning',
        key
      })
      continue
    }

    if (key === 'indent_style' && value !== 'tab' && value !== 'space') {
      diagnostics.push({
        line: lineNum,
        column: 1,
        message: `Invalid indent_style "${value}". Must be "tab" or "space".`,
        severity: 'error',
        key
      })
    } else if (key === 'indent_size' && value !== 'tab' && isNaN(parseInt(value, 10))) {
      diagnostics.push({
        line: lineNum,
        column: 1,
        message: `Invalid indent_size "${value}". Must be a positive integer or "tab".`,
        severity: 'error',
        key
      })
    } else if (key === 'end_of_line' && !['lf', 'crlf', 'cr'].includes(value)) {
      diagnostics.push({
        line: lineNum,
        column: 1,
        message: `Invalid end_of_line "${value}". Must be "lf", "crlf", or "cr".`,
        severity: 'error',
        key
      })
    } else if (key === 'trim_trailing_whitespace' && value !== 'true' && value !== 'false') {
      diagnostics.push({
        line: lineNum,
        column: 1,
        message: `Invalid trim_trailing_whitespace "${value}". Must be "true" or "false".`,
        severity: 'error',
        key
      })
    } else if (key === 'insert_final_newline' && value !== 'true' && value !== 'false') {
      diagnostics.push({
        line: lineNum,
        column: 1,
        message: `Invalid insert_final_newline "${value}". Must be "true" or "false".`,
        severity: 'error',
        key
      })
    }
  }

  const hasErrors = diagnostics.some((d) => d.severity === 'error')
  return {
    valid: !hasErrors,
    diagnostics
  }
}

/**
 * Checks before overwriting configuration file, requiring confirmation if file exists
 */
export async function safeWriteSettingsFile(
  filePath: string,
  newContent: string,
  confirmed: boolean = false
): Promise<{ ok: boolean; requiresConfirmation?: boolean; error?: string }> {
  try {
    let exists = false
    try {
      await fs.access(filePath)
      exists = true
    } catch {
      exists = false
    }

    if (exists && !confirmed) {
      return {
        ok: false,
        requiresConfirmation: true,
        error: `File ${path.basename(filePath)} already exists. Confirmation required before overwriting.`
      }
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, newContent, 'utf-8')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

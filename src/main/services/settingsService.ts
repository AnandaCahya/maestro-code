import fs from 'fs/promises'
import path from 'path'

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

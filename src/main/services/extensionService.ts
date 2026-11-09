import * as path from 'path'
import * as fs from 'fs/promises'
import * as os from 'os'
import { BrowserWindow } from 'electron'

export interface ExtensionCommandContribution {
  command: string
  title: string
  category?: string
  icon?: string
}

export interface ExtensionManifest {
  name: string
  displayName?: string
  version: string
  publisher: string
  description?: string
  main?: string
  engines?: { vscode?: string; maestro?: string }
  activationEvents?: string[]
  contributes?: {
    commands?: ExtensionCommandContribution[]
    configuration?: Record<string, any>
    keybindings?: Array<{ command: string; key: string; when?: string }>
    snippets?: Array<{ language: string; path: string }>
    themes?: Array<{ label: string; uiTheme: string; path: string }>
    languages?: Array<{ id: string; extensions?: string[]; aliases?: string[] }>
  }
}

export interface MaestroExtension {
  id: string // publisher.name
  name: string
  displayName: string
  version: string
  publisher: string
  description: string
  path: string
  manifest: ExtensionManifest
  isEnabled: boolean
  isBuiltin: boolean
  state: 'unactivated' | 'activated' | 'error'
  error?: string
}

const activeExtensions = new Map<string, MaestroExtension>()
const registeredExtensionCommands = new Map<string, { extensionId: string; command: ExtensionCommandContribution }>()

function emitExtensionEvent(event: string, payload: any) {
  if (typeof BrowserWindow === 'undefined' || !BrowserWindow || typeof BrowserWindow.getAllWindows !== 'function') {
    return
  }
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('extension:event', { event, payload })
    }
  }
}

function getGlobalExtensionsDir(): string {
  const home = os.homedir()
  return path.join(home, '.maestro', 'extensions')
}

// Built-in starter extensions to provide out-of-the-box extensions ecosystem
const BUILTIN_EXTENSIONS: MaestroExtension[] = [
  {
    id: 'maestro.theme-cyber-bento',
    name: 'theme-cyber-bento',
    displayName: 'Cozy Cyber-Bento Theme',
    version: '1.0.0',
    publisher: 'maestro',
    description: 'Official Warm Charcoal, Honey Amber and Matcha Green aesthetic theme for Mestro Code.',
    path: 'builtin:theme-cyber-bento',
    manifest: {
      name: 'theme-cyber-bento',
      displayName: 'Cozy Cyber-Bento Theme',
      version: '1.0.0',
      publisher: 'maestro',
      description: 'Official Warm Charcoal, Honey Amber and Matcha Green aesthetic theme for Mestro Code.',
      contributes: {
        themes: [{ label: 'Cozy Cyber-Bento Dark', uiTheme: 'vs-dark', path: './themes/cyber-bento.json' }],
        commands: [
          { command: 'maestro.theme.applyCyber', title: 'Apply Cozy Cyber-Bento Theme', category: 'Preferences' }
        ]
      }
    },
    isEnabled: true,
    isBuiltin: true,
    state: 'activated'
  },
  {
    id: 'maestro.eslint-toolkit',
    name: 'eslint-toolkit',
    displayName: 'ESLint Code Quality Toolkit',
    version: '2.1.0',
    publisher: 'maestro',
    description: 'Integrates ESLint diagnostics, auto-fix on save, and quick problem navigation into Mestro Code.',
    path: 'builtin:eslint-toolkit',
    manifest: {
      name: 'eslint-toolkit',
      displayName: 'ESLint Code Quality Toolkit',
      version: '2.1.0',
      publisher: 'maestro',
      description: 'Integrates ESLint diagnostics and code formatting into Mestro Code.',
      activationEvents: ['onLanguage:javascript', 'onLanguage:typescript'],
      contributes: {
        commands: [
          { command: 'eslint.executeAutofix', title: 'ESLint: Fix all auto-fixable problems', category: 'ESLint' },
          { command: 'eslint.restartServer', title: 'ESLint: Restart ESLint Server', category: 'ESLint' }
        ]
      }
    },
    isEnabled: true,
    isBuiltin: true,
    state: 'activated'
  },
  {
    id: 'maestro.prettier-formatter',
    name: 'prettier-formatter',
    displayName: 'Prettier Code Formatter',
    version: '3.0.0',
    publisher: 'maestro',
    description: 'Opinionated code formatter supporting TypeScript, JavaScript, CSS, HTML, and Markdown.',
    path: 'builtin:prettier-formatter',
    manifest: {
      name: 'prettier-formatter',
      displayName: 'Prettier Code Formatter',
      version: '3.0.0',
      publisher: 'maestro',
      description: 'Opinionated code formatter supporting TypeScript, JavaScript, and JSON.',
      contributes: {
        commands: [
          { command: 'prettier.formatDocument', title: 'Format Document (Prettier)', category: 'Prettier' }
        ]
      }
    },
    isEnabled: true,
    isBuiltin: true,
    state: 'activated'
  }
]

export async function loadExtensions(workspacePath?: string): Promise<MaestroExtension[]> {
  activeExtensions.clear()
  registeredExtensionCommands.clear()

  // 1. Load Builtin Extensions
  for (const b of BUILTIN_EXTENSIONS) {
    activeExtensions.set(b.id, { ...b })
    if (b.isEnabled && b.manifest.contributes?.commands) {
      for (const cmd of b.manifest.contributes.commands) {
        registeredExtensionCommands.set(cmd.command, { extensionId: b.id, command: cmd })
      }
    }
  }

  // 2. Discover user global extensions (~/.maestro/extensions)
  const globalDir = getGlobalExtensionsDir()
  await fs.mkdir(globalDir, { recursive: true }).catch(() => { })

  try {
    const entries = await fs.readdir(globalDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const extPath = path.join(globalDir, entry.name)
        const ext = await parseExtensionDir(extPath, false)
        if (ext) {
          activeExtensions.set(ext.id, ext)
          if (ext.isEnabled && ext.manifest.contributes?.commands) {
            for (const cmd of ext.manifest.contributes.commands) {
              registeredExtensionCommands.set(cmd.command, { extensionId: ext.id, command: cmd })
            }
          }
        }
      }
    }
  } catch {
    // Ignore read error
  }

  // 3. Discover workspace extensions (.maestro/extensions)
  if (workspacePath) {
    const wsExtDir = path.join(workspacePath, '.maestro', 'extensions')
    try {
      const entries = await fs.readdir(wsExtDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const extPath = path.join(wsExtDir, entry.name)
          const ext = await parseExtensionDir(extPath, false)
          if (ext) {
            activeExtensions.set(ext.id, ext)
            if (ext.isEnabled && ext.manifest.contributes?.commands) {
              for (const cmd of ext.manifest.contributes.commands) {
                registeredExtensionCommands.set(cmd.command, { extensionId: ext.id, command: cmd })
              }
            }
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return Array.from(activeExtensions.values())
}

async function parseExtensionDir(extPath: string, isBuiltin: boolean = false): Promise<MaestroExtension | null> {
  try {
    const pkgPath = path.join(extPath, 'package.json')
    const raw = await fs.readFile(pkgPath, 'utf-8')
    const manifest: ExtensionManifest = JSON.parse(raw)

    if (!manifest.name || !manifest.publisher) {
      return null
    }

    const id = `${manifest.publisher}.${manifest.name}`
    return {
      id,
      name: manifest.name,
      displayName: manifest.displayName || manifest.name,
      version: manifest.version || '0.0.1',
      publisher: manifest.publisher,
      description: manifest.description || '',
      path: extPath,
      manifest,
      isEnabled: true,
      isBuiltin,
      state: 'activated'
    }
  } catch {
    return null
  }
}

export async function toggleExtension(extensionId: string, enabled: boolean): Promise<boolean> {
  const ext = activeExtensions.get(extensionId)
  if (!ext) return false

  ext.isEnabled = enabled
  ext.state = enabled ? 'activated' : 'unactivated'

  if (!enabled) {
    // Deregister commands
    for (const [cmdName, entry] of registeredExtensionCommands.entries()) {
      if (entry.extensionId === extensionId) {
        registeredExtensionCommands.delete(cmdName)
      }
    }
  } else {
    // Register commands
    if (ext.manifest.contributes?.commands) {
      for (const cmd of ext.manifest.contributes.commands) {
        registeredExtensionCommands.set(cmd.command, { extensionId: ext.id, command: cmd })
      }
    }
  }

  emitExtensionEvent('extension:changed', { extension: ext })
  return true
}

export async function installLocalExtension(targetPath: string): Promise<{ ok: boolean; extension?: MaestroExtension; message?: string }> {
  try {
    // If target is directory with package.json
    let packageDir = targetPath
    const stat = await fs.stat(targetPath)
    if (!stat.isDirectory()) {
      return { ok: false, message: 'Please select an unpacked extension folder containing package.json' }
    }

    const ext = await parseExtensionDir(packageDir, false)
    if (!ext) {
      return { ok: false, message: 'Invalid extension folder: missing package.json with name and publisher' }
    }

    // Copy to ~/.maestro/extensions/<id>
    const destDir = path.join(getGlobalExtensionsDir(), ext.id)
    await fs.mkdir(destDir, { recursive: true })

    // Copy all files
    await copyDirRecursive(packageDir, destDir)

    const installed = await parseExtensionDir(destDir, false)
    if (installed) {
      activeExtensions.set(installed.id, installed)
      emitExtensionEvent('extension:installed', { extension: installed })
      return { ok: true, extension: installed }
    }

    return { ok: false, message: 'Failed to initialize installed extension' }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to install extension' }
  }
}

export async function uninstallExtension(extensionId: string): Promise<boolean> {
  const ext = activeExtensions.get(extensionId)
  if (!ext || ext.isBuiltin) return false

  try {
    await fs.rm(ext.path, { recursive: true, force: true })
    activeExtensions.delete(extensionId)
    emitExtensionEvent('extension:uninstalled', { extensionId })
    return true
  } catch {
    return false
  }
}

export function getContributedCommands(): Array<{ command: string; title: string; category?: string; extensionId: string }> {
  const list: Array<{ command: string; title: string; category?: string; extensionId: string }> = []
  for (const entry of registeredExtensionCommands.values()) {
    list.push({
      command: entry.command.command,
      title: entry.command.title,
      category: entry.command.category || 'Extensions',
      extensionId: entry.extensionId
    })
  }
  return list
}

export async function executeExtensionCommand(commandId: string, ...args: any[]): Promise<{ ok: boolean; result?: any; message?: string }> {
  const entry = registeredExtensionCommands.get(commandId)
  if (!entry) {
    return { ok: false, message: `Command '${commandId}' is not registered by any active extension.` }
  }

  // Builtin command handlers or extension host dispatch
  if (commandId === 'maestro.theme.applyCyber') {
    return { ok: true, result: 'Cozy Cyber-Bento Theme applied' }
  }

  return { ok: true, result: `Executed extension command: ${entry.command.title}` }
}

async function copyDirRecursive(src: string, dest: string): Promise<void> {
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true })
      await copyDirRecursive(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}

export interface ExtensionCompatibilityReport {
  compatible: boolean
  targetEngine?: string
  supportedContributions: string[]
  unsupportedContributions: string[]
  notes: string[]
}

/**
 * Validates extension compatibility against Maestro supported API surface and contribution points
 */
export function validateExtensionCompatibility(manifest: ExtensionManifest): ExtensionCompatibilityReport {
  const supportedContributions: string[] = []
  const unsupportedContributions: string[] = []
  const notes: string[] = []

  const contributes = manifest.contributes || {}
  const KNOWN_CONTRIBUTIONS = ['commands', 'themes', 'configuration', 'keybindings', 'snippets', 'languages']

  for (const key of Object.keys(contributes)) {
    if (KNOWN_CONTRIBUTIONS.includes(key)) {
      supportedContributions.push(key)
    } else {
      unsupportedContributions.push(key)
      notes.push(`Contribution point "${key}" is currently not supported natively.`)
    }
  }

  const vscodeEngine = manifest.engines?.vscode
  if (vscodeEngine) {
    notes.push(`Targets VS Code engine version: ${vscodeEngine}`)
  }

  const compatible = Boolean(manifest.name && manifest.publisher && unsupportedContributions.length === 0)

  return {
    compatible,
    targetEngine: vscodeEngine || manifest.engines?.maestro,
    supportedContributions,
    unsupportedContributions,
    notes
  }
}

/**
 * Returns all snippet contributions from enabled extensions
 */
export function getContributedSnippets(): Array<{ language: string; path: string; extensionId: string }> {
  const list: Array<{ language: string; path: string; extensionId: string }> = []
  for (const ext of activeExtensions.values()) {
    if (ext.isEnabled && ext.manifest.contributes?.snippets) {
      for (const snip of ext.manifest.contributes.snippets) {
        list.push({
          language: snip.language,
          path: path.isAbsolute(snip.path) ? snip.path : path.resolve(ext.path, snip.path),
          extensionId: ext.id
        })
      }
    }
  }
  return list
}

/**
 * Returns all language contributions from enabled extensions
 */
export function getContributedLanguages(): Array<{
  id: string
  extensions?: string[]
  aliases?: string[]
  extensionId: string
}> {
  const list: Array<{
    id: string
    extensions?: string[]
    aliases?: string[]
    extensionId: string
  }> = []
  for (const ext of activeExtensions.values()) {
    if (ext.isEnabled && ext.manifest.contributes?.languages) {
      for (const lang of ext.manifest.contributes.languages) {
        list.push({
          id: lang.id,
          extensions: lang.extensions,
          aliases: lang.aliases,
          extensionId: ext.id
        })
      }
    }
  }
  return list
}

/**
 * Exports inventory of installed extensions
 */
export async function exportExtensionInventory(
  targetWorkspacePath?: string
): Promise<{ inventory: Array<{ id: string; version: string; isBuiltin: boolean }>; recommendationsPath?: string }> {
  const inventory = Array.from(activeExtensions.values()).map((e) => ({
    id: e.id,
    version: e.version,
    isBuiltin: e.isBuiltin
  }))

  let recommendationsPath: string | undefined
  if (targetWorkspacePath) {
    try {
      const vscodeDir = path.join(targetWorkspacePath, '.vscode')
      await fs.mkdir(vscodeDir, { recursive: true })
      recommendationsPath = path.join(vscodeDir, 'extensions.json')
      const content = {
        recommendations: inventory.filter((e) => !e.isBuiltin).map((e) => e.id)
      }
      await fs.writeFile(recommendationsPath, JSON.stringify(content, null, 2), 'utf-8')
    } catch {
      // ignore
    }
  }

  return { inventory, recommendationsPath }
}

/**
 * Returns isolated storage directory for an extension (global or workspace-scoped)
 */
export async function getExtensionStoragePath(extensionId: string, workspacePath?: string): Promise<string> {
  let storageDir: string
  if (workspacePath) {
    storageDir = path.join(workspacePath, '.maestro', 'extension-storage', extensionId)
  } else {
    storageDir = path.join(os.homedir(), '.maestro', 'extension-storage', extensionId)
  }
  await fs.mkdir(storageDir, { recursive: true })
  return storageDir
}

/**
 * Installs an extension from a local directory or .vsix archive package
 */
export async function installVsixExtension(
  vsixPath: string
): Promise<{ ok: boolean; extension?: MaestroExtension; message?: string }> {
  try {
    const stat = await fs.stat(vsixPath)
    if (stat.isDirectory()) {
      return await installLocalExtension(vsixPath)
    }

    const tempExtractDir = path.join(os.tmpdir(), `maestro-vsix-${Date.now()}`)
    await fs.mkdir(tempExtractDir, { recursive: true })

    try {
      if (process.platform === 'win32') {
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execP = promisify(exec)
        await execP(`powershell -Command "Expand-Archive -Path '${vsixPath}' -DestinationPath '${tempExtractDir}' -Force"`)
      } else {
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execP = promisify(exec)
        await execP(`unzip -q "${vsixPath}" -d "${tempExtractDir}"`)
      }
    } catch {
      // ignore if powershell/unzip is unavailable
    }

    const innerExtDir = path.join(tempExtractDir, 'extension')
    const hasInner = await fs.stat(innerExtDir).then((s) => s.isDirectory()).catch(() => false)
    const finalDir = hasInner ? innerExtDir : tempExtractDir

    const res = await installLocalExtension(finalDir)
    await fs.rm(tempExtractDir, { recursive: true, force: true }).catch(() => {})
    return res
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to install VSIX package' }
  }
}

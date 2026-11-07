import fs from 'fs/promises'
import path from 'path'

export interface WorkspaceSettings {
  tabSize: number
  fontSize: number
  wordWrap: 'on' | 'off'
  formatOnSave: boolean
  minimap: boolean
  lineNumbers: 'on' | 'off' | 'relative'
}

export const defaultSettings: WorkspaceSettings = {
  tabSize: 2,
  fontSize: 14,
  wordWrap: 'on',
  formatOnSave: true,
  minimap: false,
  lineNumbers: 'on'
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

    return {
      tabSize: typeof parsed['editor.tabSize'] === 'number' ? parsed['editor.tabSize'] : defaultSettings.tabSize,
      fontSize: typeof parsed['editor.fontSize'] === 'number' ? parsed['editor.fontSize'] : defaultSettings.fontSize,
      wordWrap: parsed['editor.wordWrap'] === 'off' ? 'off' : defaultSettings.wordWrap,
      formatOnSave: typeof parsed['editor.formatOnSave'] === 'boolean' ? parsed['editor.formatOnSave'] : defaultSettings.formatOnSave,
      minimap: typeof parsed['editor.minimap.enabled'] === 'boolean' ? parsed['editor.minimap.enabled'] : defaultSettings.minimap,
      lineNumbers: ['on', 'off', 'relative'].includes(parsed['editor.lineNumbers'])
        ? parsed['editor.lineNumbers']
        : defaultSettings.lineNumbers
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
    jsx?: string
    strict?: boolean
    [key: string]: any
  }
}

export async function loadTsConfig(workspacePath: string): Promise<TsConfigResult | null> {
  const candidates = ['tsconfig.json', 'jsconfig.json']
  for (const file of candidates) {
    const fullPath = path.join(workspacePath, file)
    try {
      const raw = await fs.readFile(fullPath, 'utf-8')
      const cleanJson = raw
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '')
      const parsed = JSON.parse(cleanJson)
      if (parsed && typeof parsed === 'object') {
        return {
          compilerOptions: parsed.compilerOptions || {}
        }
      }
    } catch {
      // try next
    }
  }
  return null
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

    await fs.mkdir(vscodeDir, { recursive: true })
    await fs.writeFile(settingsPath, JSON.stringify(existingObj, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Failed to save workspace settings:', error)
    return false
  }
}

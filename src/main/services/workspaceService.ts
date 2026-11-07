import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

export interface RecentWorkspace {
  path: string
  name: string
  lastOpened: number
}

export interface WorkspaceSessionState {
  openFiles: { path: string; name: string; isPinned?: boolean; group?: 1 | 2 }[]
  activeFilePath: string | null
  layoutMode?: 'editor' | 'project' | 'split'
  editorSplitMode?: 'none' | 'vertical' | 'horizontal'
  group1FilePaths?: string[]
  group2FilePaths?: string[]
  group1ActiveFilePath?: string | null
  group2ActiveFilePath?: string | null
  activeEditorGroup?: 1 | 2
  workspaceFolders?: Array<{ path: string; name: string }>
}

function getUserDataDir(): string {
  try {
    return app.getPath('userData')
  } catch {
    return path.join(process.env.APPDATA || process.env.HOME || '.', '.maestro-studio')
  }
}

function getRecentWorkspacesPath(): string {
  return path.join(getUserDataDir(), 'recent_workspaces.json')
}

function getTrustedWorkspacesPath(): string {
  return path.join(getUserDataDir(), 'trusted_workspaces.json')
}

function getWorkspaceStatePath(workspacePath: string): string {
  return path.join(workspacePath, '.maestro', 'workspace_state.json')
}

export async function getRecentWorkspaces(): Promise<RecentWorkspace[]> {
  try {
    const file = getRecentWorkspacesPath()
    const content = await fs.readFile(file, 'utf-8')
    const list: RecentWorkspace[] = JSON.parse(content)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export async function addRecentWorkspace(workspacePath: string): Promise<RecentWorkspace[]> {
  try {
    const list = await getRecentWorkspaces()
    const baseName = path.basename(workspacePath) || workspacePath
    const filtered = list.filter((item) => item.path.toLowerCase() !== workspacePath.toLowerCase())

    const updated: RecentWorkspace[] = [
      {
        path: workspacePath,
        name: baseName,
        lastOpened: Date.now()
      },
      ...filtered
    ].slice(0, 15) // keep up to 15 recent projects

    const file = getRecentWorkspacesPath()
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, JSON.stringify(updated, null, 2), 'utf-8')
    return updated
  } catch (err) {
    console.error('Failed to add recent workspace:', err)
    return []
  }
}

export async function removeRecentWorkspace(workspacePath: string): Promise<RecentWorkspace[]> {
  try {
    const list = await getRecentWorkspaces()
    const updated = list.filter((item) => item.path.toLowerCase() !== workspacePath.toLowerCase())
    const file = getRecentWorkspacesPath()
    await fs.writeFile(file, JSON.stringify(updated, null, 2), 'utf-8')
    return updated
  } catch (err) {
    console.error('Failed to remove recent workspace:', err)
    return []
  }
}

export async function clearRecentWorkspaces(): Promise<boolean> {
  try {
    const file = getRecentWorkspacesPath()
    await fs.writeFile(file, JSON.stringify([], null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
}

export async function isWorkspaceTrusted(workspacePath: string): Promise<boolean> {
  try {
    const file = getTrustedWorkspacesPath()
    const content = await fs.readFile(file, 'utf-8')
    const list: string[] = JSON.parse(content)
    return list.some((p) => p.toLowerCase() === workspacePath.toLowerCase())
  } catch {
    // By default, if not explicitly untrusted, return true or false based on existence
    return true
  }
}

export async function setWorkspaceTrusted(workspacePath: string, trusted: boolean): Promise<boolean> {
  try {
    const file = getTrustedWorkspacesPath()
    let list: string[] = []
    try {
      const content = await fs.readFile(file, 'utf-8')
      list = JSON.parse(content)
    } catch {
      list = []
    }

    if (trusted) {
      if (!list.some((p) => p.toLowerCase() === workspacePath.toLowerCase())) {
        list.push(workspacePath)
      }
    } else {
      list = list.filter((p) => p.toLowerCase() !== workspacePath.toLowerCase())
    }

    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, JSON.stringify(list, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Failed to set workspace trusted:', err)
    return false
  }
}

export async function saveWorkspaceSessionState(
  workspacePath: string,
  state: WorkspaceSessionState
): Promise<boolean> {
  try {
    const file = getWorkspaceStatePath(workspacePath)
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, JSON.stringify(state, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Failed to save workspace session state:', err)
    return false
  }
}

export async function loadWorkspaceSessionState(
  workspacePath: string
): Promise<WorkspaceSessionState | null> {
  try {
    const file = getWorkspaceStatePath(workspacePath)
    const content = await fs.readFile(file, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

export interface CodeWorkspaceData {
  folders: { path: string; name?: string }[]
  settings?: Record<string, any>
}

export async function parseCodeWorkspace(
  filePath: string
): Promise<{ resolvedFolders: string[]; settings: Record<string, any> } | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const parsed: CodeWorkspaceData = JSON.parse(content)
    const dir = path.dirname(filePath)
    const resolvedFolders = (parsed.folders || []).map((f) =>
      path.isAbsolute(f.path) ? f.path : path.resolve(dir, f.path)
    )
    return {
      resolvedFolders,
      settings: parsed.settings || {}
    }
  } catch (err) {
    console.error('Failed to parse .code-workspace:', err)
    return null
  }
}

export async function saveCodeWorkspace(
  filePath: string,
  folders: string[],
  settings?: Record<string, any>
): Promise<boolean> {
  try {
    const dir = path.dirname(filePath)
    const relativeFolders = folders.map((f) => {
      const rel = path.relative(dir, f)
      return { path: rel || '.' }
    })
    const payload: CodeWorkspaceData = {
      folders: relativeFolders,
      settings: settings || {}
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Failed to save .code-workspace:', err)
    return false
  }
}

/**
 * Recursively discovers Git repositories and submodules within a root path.
 */
export async function discoverGitRepositories(
  rootPath: string,
  maxDepth = 3
): Promise<string[]> {
  const discovered: string[] = []

  async function walk(dir: string, depth: number) {
    if (depth > maxDepth) return
    try {
      const gitPath = path.join(dir, '.git')
      try {
        const stat = await fs.stat(gitPath)
        if (stat.isDirectory() || stat.isFile()) {
          discovered.push(dir)
        }
      } catch {
        // Not a git repo at this level
      }

      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (['node_modules', '.git', 'out', 'dist', '.agents'].includes(entry.name)) {
          continue
        }
        if (entry.isDirectory()) {
          await walk(path.join(dir, entry.name), depth + 1)
        }
      }
    } catch {
      // ignore
    }
  }

  await walk(rootPath, 0)
  return discovered
}

/**
 * Creates a backup snapshot of workspace configuration and metadata.
 */
export async function createWorkspaceBackup(workspacePath: string): Promise<string> {
  const backupsDir = path.join(workspacePath, '.maestro', 'backups')
  await fs.mkdir(backupsDir, { recursive: true })

  const timestamp = Date.now()
  const backupFileName = `workspace-backup-${timestamp}.json`
  const backupFilePath = path.join(backupsDir, backupFileName)

  const sessionState = await loadWorkspaceSessionState(workspacePath)

  let projectData: any = null
  try {
    const pPath = path.join(workspacePath, '.maestro', 'project.json')
    projectData = JSON.parse(await fs.readFile(pPath, 'utf-8'))
  } catch {
    // ignore
  }

  const payload = {
    timestamp,
    workspacePath,
    sessionState,
    projectData
  }

  await fs.writeFile(backupFilePath, JSON.stringify(payload, null, 2), 'utf-8')
  return backupFileName
}

/**
 * Lists all existing workspace backup files.
 */
export async function listWorkspaceBackups(workspacePath: string): Promise<string[]> {
  const backupsDir = path.join(workspacePath, '.maestro', 'backups')
  try {
    const files = await fs.readdir(backupsDir)
    return files
      .filter((f) => f.startsWith('workspace-backup-') && f.endsWith('.json'))
      .sort()
      .reverse()
  } catch {
    return []
  }
}

/**
 * Restores a workspace backup from file.
 */
export async function restoreWorkspaceBackup(
  workspacePath: string,
  backupFileName: string
): Promise<boolean> {
  const backupFilePath = path.join(workspacePath, '.maestro', 'backups', backupFileName)
  try {
    const content = await fs.readFile(backupFilePath, 'utf-8')
    const payload = JSON.parse(content)

    if (payload.sessionState) {
      await saveWorkspaceSessionState(workspacePath, payload.sessionState)
    }
    if (payload.projectData) {
      const pPath = path.join(workspacePath, '.maestro', 'project.json')
      await fs.writeFile(pPath, JSON.stringify(payload.projectData, null, 2), 'utf-8')
    }
    return true
  } catch (err) {
    console.error('Failed to restore workspace backup:', err)
    return false
  }
}

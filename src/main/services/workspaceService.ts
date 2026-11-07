import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

export interface RecentWorkspace {
  path: string
  name: string
  lastOpened: number
}

export interface WorkspaceSessionState {
  openFiles: { path: string; name: string; isPinned?: boolean }[]
  activeFilePath: string | null
  layoutMode?: 'editor' | 'project' | 'split'
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

import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import { dialog, BrowserWindow, shell } from 'electron'
import type { FileItem } from '../../preload/index.d'

let currentWatcher: fsSync.FSWatcher | null = null
let debounceTimer: NodeJS.Timeout | null = null

export function watchWorkspace(workspacePath: string, win: BrowserWindow): void {
  stopWatchingWorkspace()

  try {
    currentWatcher = fsSync.watch(workspacePath, { recursive: true }, (eventType, filename) => {
      if (!filename) return

      const normalized = filename.replace(/\\/g, '/')
      if (
        normalized.includes('.git/') ||
        normalized.startsWith('.git') ||
        normalized.includes('node_modules/') ||
        normalized.startsWith('node_modules') ||
        normalized.includes('out/') ||
        normalized.startsWith('out') ||
        normalized.includes('dist/') ||
        normalized.startsWith('dist')
      ) {
        return
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      debounceTimer = setTimeout(() => {
        if (!win.isDestroyed()) {
          win.webContents.send('fs:changed', { eventType, filename: normalized })
        }
      }, 250)
    })
  } catch (err) {
    console.error('Failed to watch workspace:', err)
  }
}

export function stopWatchingWorkspace(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (currentWatcher) {
    try {
      currentWatcher.close()
    } catch {
      // ignore
    }
    currentWatcher = null
  }
}

export function revealInOS(targetPath: string): void {
  shell.showItemInFolder(targetPath)
}

export async function openDirectoryDialog(win: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
}

export async function readDirectory(dirPath: string): Promise<FileItem[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const items: FileItem[] = []

    for (const entry of entries) {
      // Abaikan node_modules, .git, dan temporary files agar responsif
      if (['node_modules', '.git', 'out', 'dist'].includes(entry.name)) {
        continue
      }

      const fullPath = path.join(dirPath, entry.name)
      const isDirectory = entry.isDirectory()

      items.push({
        name: entry.name,
        path: fullPath,
        isDirectory
      })
    }

    // Urutkan: folder terlebih dahulu (A-Z), kemudian file (A-Z)
    return items.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) {
        return a.name.localeCompare(b.name)
      }
      return a.isDirectory ? -1 : 1
    })
  } catch (err) {
    console.error('Error reading directory:', dirPath, err)
    return []
  }
}

export async function readFileContent(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8')
}

export async function writeFileContent(filePath: string, content: string): Promise<boolean> {
  await fs.writeFile(filePath, content, 'utf-8')
  return true
}

export async function createFile(filePath: string): Promise<boolean> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, '', 'utf-8')
  return true
}

export async function createDirectory(dirPath: string): Promise<boolean> {
  await fs.mkdir(dirPath, { recursive: true })
  return true
}

export async function deletePath(targetPath: string): Promise<boolean> {
  const stat = await fs.stat(targetPath)
  if (stat.isDirectory()) {
    await fs.rm(targetPath, { recursive: true, force: true })
  } else {
    await fs.unlink(targetPath)
  }
  return true
}

export async function renamePath(oldPath: string, newPath: string): Promise<boolean> {
  await fs.rename(oldPath, newPath)
  return true
}

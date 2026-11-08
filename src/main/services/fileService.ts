import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import { dialog, BrowserWindow, shell } from 'electron'
import type { FileItem } from '../../preload/index.d'

export const EXCLUDED_WATCH_PATTERNS = [
  '.git/',
  'node_modules/',
  'out/',
  'dist/',
  'build/',
  '.next/',
  '.nuxt/',
  '.turbo/',
  '.svelte-kit/',
  'coverage/',
  '.cache/',
  '.idea/',
  '.vscode-test/'
]

export function isWatchExcluded(filename: string): boolean {
  const norm = filename.replace(/\\/g, '/')
  return EXCLUDED_WATCH_PATTERNS.some(
    (pat) =>
      norm.startsWith(pat) ||
      norm.includes('/' + pat) ||
      norm.startsWith('.' + pat) ||
      norm.endsWith('/' + pat.replace(/\/$/, ''))
  )
}

let currentWatcher: fsSync.FSWatcher | null = null
let debounceTimer: NodeJS.Timeout | null = null
let maxWaitTimer: NodeJS.Timeout | null = null
const collectedEvents = new Map<string, string>()
const DEBOUNCE_MS = 200
const MAX_WAIT_MS = 800

function flushWatchEvents(win: BrowserWindow): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (maxWaitTimer) {
    clearTimeout(maxWaitTimer)
    maxWaitTimer = null
  }
  if (collectedEvents.size === 0) return

  const entries = Array.from(collectedEvents.entries()).map(([filename, eventType]) => ({
    filename,
    eventType
  }))
  collectedEvents.clear()

  const isBurst = entries.length >= 15
  const lastEvent = entries[entries.length - 1]

  if (!win.isDestroyed()) {
    win.webContents.send('fs:changed', {
      eventType: isBurst ? 'batch' : lastEvent.eventType,
      filename: lastEvent.filename,
      isBurst,
      batch: entries
    })
  }
}

export function watchWorkspace(workspacePath: string, win: BrowserWindow): void {
  stopWatchingWorkspace()

  try {
    currentWatcher = fsSync.watch(workspacePath, { recursive: true }, (eventType, filename) => {
      if (!filename) return

      const normalized = filename.replace(/\\/g, '/')
      if (isWatchExcluded(normalized)) {
        return
      }

      collectedEvents.set(normalized, eventType)

      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      debounceTimer = setTimeout(() => {
        flushWatchEvents(win)
      }, DEBOUNCE_MS)

      if (!maxWaitTimer) {
        maxWaitTimer = setTimeout(() => {
          flushWatchEvents(win)
        }, MAX_WAIT_MS)
      }
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
  if (maxWaitTimer) {
    clearTimeout(maxWaitTimer)
    maxWaitTimer = null
  }
  collectedEvents.clear()
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

export async function openWorkspaceFileDialog(win: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      { name: 'VS Code Workspace', extensions: ['code-workspace'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
}

export async function readDirectory(dirPath: string): Promise<FileItem[]> {
  try {
    const safePath = sanitizePath(dirPath)
    const entries = await fs.readdir(safePath, { withFileTypes: true })
    const items: FileItem[] = []

    for (const entry of entries) {
      // Abaikan node_modules, .git, dan temporary files agar responsif
      if (['node_modules', '.git', 'out', 'dist'].includes(entry.name)) {
        continue
      }

      const fullPath = path.join(safePath, entry.name)
      let isDirectory = entry.isDirectory()
      const isSymbolicLink = entry.isSymbolicLink()

      // Safe symlink traversal policy: resolve destination to determine if directory
      if (isSymbolicLink) {
        try {
          const stat = await fs.stat(fullPath)
          isDirectory = stat.isDirectory()
        } catch {
          // Broken symlink
          isDirectory = false
        }
      }

      items.push({
        name: entry.name,
        path: fullPath,
        isDirectory,
        isSymbolicLink
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

/**
 * Validates and sanitizes a path to protect against path traversal and null bytes.
 */
export function sanitizePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Invalid path: path must be a non-empty string')
  }
  if (inputPath.includes('\0')) {
    throw new Error('Security Error: Null byte detected in path')
  }
  return path.resolve(inputPath)
}

/**
 * Redacts secrets, tokens, and passwords from log output
 */
export function redactSecrets(text: string): string {
  if (!text) return ''
  return text
    .replace(/(ghp_[a-zA-Z0-9]{36})/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/(Bearer\s+)[a-zA-Z0-9_\-\.]{20,}/gi, '$1[REDACTED_TOKEN]')
    .replace(/(password|secret|token|apiKey)\s*[:=]\s*["']?([^"',\s]+)["']?/gi, '$1="[REDACTED]"')
}

export async function readFileContent(filePath: string): Promise<string> {
  const safePath = sanitizePath(filePath)
  return await fs.readFile(safePath, 'utf-8')
}

export async function readFileBase64(filePath: string): Promise<string> {
  const safePath = sanitizePath(filePath)
  const buffer = await fs.readFile(safePath)
  const ext = path.extname(safePath).toLowerCase().replace('.', '')
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
    avif: 'image/avif'
  }
  const mime = mimeMap[ext] || 'application/octet-stream'
  return `data:${mime};base64,${buffer.toString('base64')}`
}

export async function getFileMetadata(
  filePath: string
): Promise<{ size: number; mtime: number } | null> {
  try {
    const safePath = sanitizePath(filePath)
    const stat = await fs.stat(safePath)
    return { size: stat.size, mtime: stat.mtimeMs }
  } catch {
    return null
  }
}

export interface EncodingDetectionResult {
  encoding: 'utf-8' | 'utf-8-bom' | 'utf-16le' | 'utf-16be' | 'utf-32le' | 'utf-32be' | 'binary'
  hasBOM: boolean
  isBinary: boolean
}

export async function isReadOnly(filePath: string): Promise<boolean> {
  const safePath = sanitizePath(filePath)
  try {
    await fs.access(safePath, fsSync.constants.W_OK)
    return false
  } catch {
    return true
  }
}

export async function detectFileEncoding(filePath: string): Promise<EncodingDetectionResult> {
  const safePath = sanitizePath(filePath)
  const buffer = await fs.readFile(safePath)
  const sample = buffer.subarray(0, 4096)
  const bytesRead = sample.length

  // Check BOMs
  if (bytesRead >= 3 && sample[0] === 0xEF && sample[1] === 0xBB && sample[2] === 0xBF) {
    return { encoding: 'utf-8-bom', hasBOM: true, isBinary: false }
  }
  if (
    bytesRead >= 4 &&
    sample[0] === 0xFF &&
    sample[1] === 0xFE &&
    sample[2] === 0x00 &&
    sample[3] === 0x00
  ) {
    return { encoding: 'utf-32le', hasBOM: true, isBinary: false }
  }
  if (
    bytesRead >= 4 &&
    sample[0] === 0x00 &&
    sample[1] === 0x00 &&
    sample[2] === 0xFE &&
    sample[3] === 0xFF
  ) {
    return { encoding: 'utf-32be', hasBOM: true, isBinary: false }
  }
  if (bytesRead >= 2 && sample[0] === 0xFF && sample[1] === 0xFE) {
    return { encoding: 'utf-16le', hasBOM: true, isBinary: false }
  }
  if (bytesRead >= 2 && sample[0] === 0xFE && sample[1] === 0xFF) {
    return { encoding: 'utf-16be', hasBOM: true, isBinary: false }
  }

  // Check for null bytes / binary content
  let nullCount = 0
  for (let i = 0; i < bytesRead; i++) {
    if (sample[i] === 0) {
      nullCount++
    }
  }

  if (nullCount > 0) {
    return { encoding: 'binary', hasBOM: false, isBinary: true }
  }

  return { encoding: 'utf-8', hasBOM: false, isBinary: false }
}

export interface WriteFileOptions {
  atomic?: boolean
  overwriteReadOnly?: boolean
  encoding?: BufferEncoding
}

export async function writeFileContent(
  filePath: string,
  content: string,
  options: WriteFileOptions = { atomic: true }
): Promise<boolean> {
  const safePath = sanitizePath(filePath)
  const targetDir = path.dirname(safePath)
  await fs.mkdir(targetDir, { recursive: true })

  // Check if target file exists and is read-only
  let isTargetReadOnly = false
  try {
    await fs.access(safePath, fsSync.constants.W_OK)
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      isTargetReadOnly = true
    }
  }

  if (isTargetReadOnly) {
    if (options.overwriteReadOnly) {
      try {
        await fs.chmod(safePath, 0o666)
      } catch {
        throw new Error(`Failed to modify permissions of read-only file: ${safePath}`)
      }
    } else {
      throw new Error(`Permission denied: file is read-only (${safePath})`)
    }
  }

  if (options.atomic === false) {
    await fs.writeFile(safePath, content, options.encoding || 'utf-8')
    return true
  }

  // Atomic save: write to temporary file in the same directory then rename
  const tmpName = `.maestro-tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const tmpPath = path.join(targetDir, tmpName)

  try {
    await fs.writeFile(tmpPath, content, options.encoding || 'utf-8')
    try {
      await fs.rename(tmpPath, safePath)
    } catch {
      // Fallback for cross-device or Windows rename issues
      await fs.copyFile(tmpPath, safePath)
      await fs.unlink(tmpPath).catch(() => {})
    }
    return true
  } catch (err) {
    // Clean up temporary file if write or rename failed
    await fs.unlink(tmpPath).catch(() => {})
    throw err
  }
}

export interface FileOperationRecord {
  id: string
  timestamp: number
  type: 'createFile' | 'createDirectory' | 'delete' | 'rename' | 'move' | 'duplicate'
  targetPath: string
  newPath?: string
  previousContent?: string
  isDirectory?: boolean
}

const fileUndoStack: FileOperationRecord[] = []
const fileRedoStack: FileOperationRecord[] = []
const MAX_UNDO_STACK = 30

export function recordFileOperation(op: FileOperationRecord): void {
  fileUndoStack.push(op)
  if (fileUndoStack.length > MAX_UNDO_STACK) {
    fileUndoStack.shift()
  }
  fileRedoStack.length = 0
}

export function canUndoFileOperation(): boolean {
  return fileUndoStack.length > 0
}

export function canRedoFileOperation(): boolean {
  return fileRedoStack.length > 0
}

export async function undoFileOperation(): Promise<{ ok: boolean; message: string }> {
  const op = fileUndoStack.pop()
  if (!op) {
    return { ok: false, message: 'No file operations to undo' }
  }

  try {
    switch (op.type) {
      case 'createFile': {
        if (fsSync.existsSync(op.targetPath)) {
          await fs.unlink(op.targetPath)
        }
        fileRedoStack.push(op)
        return { ok: true, message: `Undid file creation: ${path.basename(op.targetPath)}` }
      }
      case 'createDirectory': {
        if (fsSync.existsSync(op.targetPath)) {
          await fs.rm(op.targetPath, { recursive: true, force: true })
        }
        fileRedoStack.push(op)
        return { ok: true, message: `Undid folder creation: ${path.basename(op.targetPath)}` }
      }
      case 'rename':
      case 'move': {
        if (op.newPath && fsSync.existsSync(op.newPath)) {
          await fs.rename(op.newPath, op.targetPath)
        }
        fileRedoStack.push(op)
        return { ok: true, message: `Undid ${op.type}: restored ${path.basename(op.targetPath)}` }
      }
      case 'duplicate': {
        if (op.newPath && fsSync.existsSync(op.newPath)) {
          const stat = await fs.stat(op.newPath)
          if (stat.isDirectory()) {
            await fs.rm(op.newPath, { recursive: true, force: true })
          } else {
            await fs.unlink(op.newPath)
          }
        }
        fileRedoStack.push(op)
        return { ok: true, message: `Undid duplication: removed ${path.basename(op.newPath || '')}` }
      }
      case 'delete': {
        if (op.isDirectory) {
          await fs.mkdir(op.targetPath, { recursive: true })
        } else if (op.previousContent !== undefined) {
          await fs.mkdir(path.dirname(op.targetPath), { recursive: true })
          await fs.writeFile(op.targetPath, op.previousContent, 'utf-8')
        }
        fileRedoStack.push(op)
        return { ok: true, message: `Restored deleted item: ${path.basename(op.targetPath)}` }
      }
      default:
        return { ok: false, message: 'Unknown operation type' }
    }
  } catch (err: any) {
    return { ok: false, message: `Failed to undo: ${err?.message || err}` }
  }
}

export async function redoFileOperation(): Promise<{ ok: boolean; message: string }> {
  const op = fileRedoStack.pop()
  if (!op) {
    return { ok: false, message: 'No file operations to redo' }
  }

  try {
    switch (op.type) {
      case 'createFile': {
        await createFile(op.targetPath, false)
        fileUndoStack.push(op)
        return { ok: true, message: `Redid file creation: ${path.basename(op.targetPath)}` }
      }
      case 'createDirectory': {
        await createDirectory(op.targetPath, false)
        fileUndoStack.push(op)
        return { ok: true, message: `Redid folder creation: ${path.basename(op.targetPath)}` }
      }
      case 'rename':
      case 'move': {
        if (op.newPath && fsSync.existsSync(op.targetPath)) {
          await fs.rename(op.targetPath, op.newPath)
        }
        fileUndoStack.push(op)
        return { ok: true, message: `Redid ${op.type}: moved to ${path.basename(op.newPath || '')}` }
      }
      case 'duplicate': {
        if (op.newPath && fsSync.existsSync(op.targetPath)) {
          const stat = await fs.stat(op.targetPath)
          if (stat.isDirectory()) {
            await fs.cp(op.targetPath, op.newPath, { recursive: true })
          } else {
            await fs.copyFile(op.targetPath, op.newPath)
          }
        }
        fileUndoStack.push(op)
        return { ok: true, message: `Redid duplication: created ${path.basename(op.newPath || '')}` }
      }
      case 'delete': {
        if (fsSync.existsSync(op.targetPath)) {
          const stat = await fs.stat(op.targetPath)
          if (stat.isDirectory()) {
            await fs.rm(op.targetPath, { recursive: true, force: true })
          } else {
            await fs.unlink(op.targetPath)
          }
        }
        fileUndoStack.push(op)
        return { ok: true, message: `Redid deletion: removed ${path.basename(op.targetPath)}` }
      }
      default:
        return { ok: false, message: 'Unknown operation type' }
    }
  } catch (err: any) {
    return { ok: false, message: `Failed to redo: ${err?.message || err}` }
  }
}

export async function createFile(filePath: string, recordUndo = true): Promise<boolean> {
  const safePath = sanitizePath(filePath)
  await fs.mkdir(path.dirname(safePath), { recursive: true })
  await fs.writeFile(safePath, '', 'utf-8')
  if (recordUndo) {
    recordFileOperation({
      id: `create-${Date.now()}`,
      timestamp: Date.now(),
      type: 'createFile',
      targetPath: safePath
    })
  }
  return true
}

export async function createDirectory(dirPath: string, recordUndo = true): Promise<boolean> {
  const safePath = sanitizePath(dirPath)
  await fs.mkdir(safePath, { recursive: true })
  if (recordUndo) {
    recordFileOperation({
      id: `mkdir-${Date.now()}`,
      timestamp: Date.now(),
      type: 'createDirectory',
      targetPath: safePath
    })
  }
  return true
}

export async function deletePath(targetPath: string, recordUndo = true): Promise<boolean> {
  const safePath = sanitizePath(targetPath)
  let previousContent: string | undefined
  let isDir = false
  try {
    const stat = await fs.stat(safePath)
    isDir = stat.isDirectory()
    if (!isDir) {
      previousContent = await fs.readFile(safePath, 'utf-8')
    }
  } catch {
    // ignore
  }

  if (isDir) {
    await fs.rm(safePath, { recursive: true, force: true })
  } else {
    await fs.unlink(safePath)
  }

  if (recordUndo) {
    recordFileOperation({
      id: `del-${Date.now()}`,
      timestamp: Date.now(),
      type: 'delete',
      targetPath: safePath,
      previousContent,
      isDirectory: isDir
    })
  }
  return true
}

export async function renamePath(oldPath: string, newPath: string, recordUndo = true): Promise<boolean> {
  const safeOld = sanitizePath(oldPath)
  const safeNew = sanitizePath(newPath)
  await fs.rename(safeOld, safeNew)
  if (recordUndo) {
    recordFileOperation({
      id: `ren-${Date.now()}`,
      timestamp: Date.now(),
      type: 'rename',
      targetPath: safeOld,
      newPath: safeNew
    })
  }
  return true
}

export async function duplicatePath(sourcePath: string, recordUndo = true): Promise<string> {
  const dir = path.dirname(sourcePath)
  const ext = path.extname(sourcePath)
  const baseName = path.basename(sourcePath, ext)
  const stat = await fs.stat(sourcePath)

  let copyIndex = 1
  let targetPath = path.join(dir, `${baseName} copy${ext}`)
  while (fsSync.existsSync(targetPath)) {
    copyIndex++
    targetPath = path.join(dir, `${baseName} copy ${copyIndex}${ext}`)
  }

  if (stat.isDirectory()) {
    await fs.cp(sourcePath, targetPath, { recursive: true })
  } else {
    await fs.copyFile(sourcePath, targetPath)
  }

  if (recordUndo) {
    recordFileOperation({
      id: `dup-${Date.now()}`,
      timestamp: Date.now(),
      type: 'duplicate',
      targetPath: sourcePath,
      newPath: targetPath
    })
  }

  return targetPath
}

export async function openWithExternalApp(targetPath: string): Promise<string> {
  try {
    const errorMsg = await shell.openPath(targetPath)
    return errorMsg || ''
  } catch (err: any) {
    return err?.message || 'Failed to open with external app'
  }
}

export async function movePath(
  sourcePath: string,
  destinationDir: string,
  recordUndo = true
): Promise<{ ok: boolean; newPath: string; error?: string }> {
  try {
    const fileName = path.basename(sourcePath)
    let targetPath = path.join(destinationDir, fileName)

    if (sourcePath === targetPath) {
      return { ok: true, newPath: targetPath }
    }

    // If destination exists, generate non-colliding name
    if (fsSync.existsSync(targetPath)) {
      const ext = path.extname(fileName)
      const baseName = path.basename(fileName, ext)
      let idx = 1
      while (fsSync.existsSync(targetPath)) {
        targetPath = path.join(destinationDir, `${baseName} (${idx})${ext}`)
        idx++
      }
    }

    await fs.rename(sourcePath, targetPath)
    if (recordUndo) {
      recordFileOperation({
        id: `move-${Date.now()}`,
        timestamp: Date.now(),
        type: 'move',
        targetPath: sourcePath,
        newPath: targetPath
      })
    }
    return { ok: true, newPath: targetPath }
  } catch (err: any) {
    return { ok: false, newPath: '', error: err?.message || 'Failed to move' }
  }
}

export async function copyPathTo(
  sourcePath: string,
  destinationDir: string
): Promise<{ ok: boolean; newPath: string; error?: string }> {
  try {
    const fileName = path.basename(sourcePath)
    let targetPath = path.join(destinationDir, fileName)

    // Generate non-colliding name if exists
    if (fsSync.existsSync(targetPath)) {
      const ext = path.extname(fileName)
      const baseName = path.basename(fileName, ext)
      let idx = 1
      while (fsSync.existsSync(targetPath)) {
        targetPath = path.join(destinationDir, `${baseName} (${idx})${ext}`)
        idx++
      }
    }

    const stat = await fs.stat(sourcePath)
    if (stat.isDirectory()) {
      await fs.cp(sourcePath, targetPath, { recursive: true })
    } else {
      await fs.copyFile(sourcePath, targetPath)
    }

    return { ok: true, newPath: targetPath }
  } catch (err: any) {
    return { ok: false, newPath: '', error: err?.message || 'Failed to copy' }
  }
}

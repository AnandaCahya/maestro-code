import fs from 'fs/promises'
import path from 'path'
import type { ProjectMetadata, TaskItem, SprintItem, MilestoneItem } from '../../preload/index.d'

const MAESTRO_DIR = '.maestro'
const TASKS_FILE = 'project.json'
const BACKUPS_DIR = 'backups'
const CURRENT_SCHEMA_VERSION = 1
const MAX_BACKUPS = 10

const defaultProjectData: ProjectMetadata = {
  name: 'New Project',
  description: 'Integrated Project Management workspace',
  schemaVersion: CURRENT_SCHEMA_VERSION,
  tasks: [
    {
      id: 'MST-1',
      title: 'Setup Environment & Dependencies',
      description: 'Review package.json and ensure all dev tools are operational',
      status: 'done',
      priority: 'high',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now()
    },
    {
      id: 'MST-2',
      title: 'Initialize Language Server Protocol (LSP)',
      description: 'Configure TypeScript/JavaScript LSP connection via JSON-RPC',
      status: 'in_progress',
      priority: 'urgent',
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'MST-3',
      title: 'Build File Explorer & Tree Navigation',
      description: 'Implement directory tree with file icon badges and context menus',
      status: 'todo',
      priority: 'medium',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  sprints: [],
  milestones: []
}

/**
 * Validates and repairs project metadata, ensuring valid schema,
 * unique IDs, and safe fallback values.
 */
export function validateAndRepairProjectData(raw: any, fallbackName: string): ProjectMetadata {
  if (!raw || typeof raw !== 'object') {
    return {
      name: fallbackName,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      tasks: [],
      sprints: [],
      milestones: []
    }
  }

  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name : fallbackName
  const description = typeof raw.description === 'string' ? raw.description : undefined
  const schemaVersion = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : CURRENT_SCHEMA_VERSION

  const validStatuses: TaskItem['status'][] = ['backlog', 'todo', 'in_progress', 'review', 'done']
  const validPriorities: TaskItem['priority'][] = ['low', 'medium', 'high', 'urgent']

  // Validate Tasks and deduplicate IDs
  const seenIds = new Set<string>()
  const tasks: TaskItem[] = []

  if (Array.isArray(raw.tasks)) {
    for (let i = 0; i < raw.tasks.length; i++) {
      const t = raw.tasks[i]
      if (!t || typeof t !== 'object') continue

      let id = typeof t.id === 'string' && t.id.trim() ? t.id.trim() : `MST-${i + 1}`
      if (seenIds.has(id)) {
        let counter = 2
        while (seenIds.has(`${id}-${counter}`)) {
          counter++
        }
        id = `${id}-${counter}`
      }
      seenIds.add(id)

      const status = validStatuses.includes(t.status) ? t.status : 'todo'
      const priority = validPriorities.includes(t.priority) ? t.priority : 'medium'
      const title = typeof t.title === 'string' && t.title.trim() ? t.title : `Task ${id}`
      const createdAt = typeof t.createdAt === 'number' ? t.createdAt : Date.now()
      const updatedAt = typeof t.updatedAt === 'number' ? t.updatedAt : Date.now()

      tasks.push({
        ...t,
        id,
        title,
        status,
        priority,
        createdAt,
        updatedAt
      })
    }
  }

  // Validate Sprints
  const sprints: SprintItem[] = []
  if (Array.isArray(raw.sprints)) {
    for (const s of raw.sprints) {
      if (s && typeof s === 'object' && typeof s.id === 'string' && typeof s.name === 'string') {
        sprints.push(s)
      }
    }
  }

  // Validate Milestones
  const milestones: MilestoneItem[] = []
  if (Array.isArray(raw.milestones)) {
    for (const m of raw.milestones) {
      if (m && typeof m === 'object' && typeof m.id === 'string' && typeof m.title === 'string') {
        milestones.push(m)
      }
    }
  }

  return {
    name,
    description,
    schemaVersion,
    tasks,
    sprints,
    milestones
  }
}

/**
 * Ensures .maestro directory and a recommended .gitignore exist.
 */
async function ensureMaestroDir(rootPath: string): Promise<string> {
  const dir = path.join(rootPath, MAESTRO_DIR)
  await fs.mkdir(dir, { recursive: true })

  const gitignorePath = path.join(dir, '.gitignore')
  try {
    await fs.access(gitignorePath)
  } catch {
    const gitignoreContent = [
      '# Maestro Project Management Local-Only Files',
      'local.json',
      'cache/',
      '*.tmp',
      'backups/',
      ''
    ].join('\n')
    await fs.writeFile(gitignorePath, gitignoreContent, 'utf-8').catch(() => {})
  }

  return dir
}

export async function detectPackageManager(rootPath: string): Promise<'pnpm' | 'npm' | 'yarn' | 'bun' | 'none'> {
  try {
    const files = await fs.readdir(rootPath)
    if (files.includes('pnpm-lock.yaml')) return 'pnpm'
    if (files.includes('package-lock.json')) return 'npm'
    if (files.includes('yarn.lock')) return 'yarn'
    if (files.includes('bun.lockb') || files.includes('bun.lock')) return 'bun'
    if (files.includes('package.json')) return 'npm'
    return 'none'
  } catch {
    return 'none'
  }
}

export async function loadProjectData(rootPath: string): Promise<ProjectMetadata> {
  const dir = await ensureMaestroDir(rootPath)
  const filePath = path.join(dir, TASKS_FILE)
  const pm = await detectPackageManager(rootPath)

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(content)
    const data = validateAndRepairProjectData(parsed, path.basename(rootPath))
    data.packageManager = pm
    return data
  } catch (err) {
    // If project.json failed to read or parse, attempt recovery from latest backup
    try {
      const backupDir = path.join(dir, BACKUPS_DIR)
      const files = await fs.readdir(backupDir)
      const backupFiles = files
        .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
        .sort()
        .reverse()

      if (backupFiles.length > 0) {
        const latestBackup = path.join(backupDir, backupFiles[0])
        const backupContent = await fs.readFile(latestBackup, 'utf-8')
        const recovered = JSON.parse(backupContent)
        console.warn(`[Maestro] Recovered project state from backup: ${backupFiles[0]}`)
        const data = validateAndRepairProjectData(recovered, path.basename(rootPath))
        data.packageManager = pm
        return data
      }
    } catch {
      // No backup available, continue to initialize default
    }

    // Initialize default project data
    try {
      const initialData: ProjectMetadata = {
        ...defaultProjectData,
        name: path.basename(rootPath),
        packageManager: pm
      }
      await saveProjectData(rootPath, initialData)
      return initialData
    } catch {
      return {
        name: path.basename(rootPath),
        schemaVersion: CURRENT_SCHEMA_VERSION,
        tasks: [],
        sprints: [],
        milestones: [],
        packageManager: pm
      }
    }
  }
}

/**
 * Crash-safe atomic write of project.json.
 * Writes to a temporary file first, then atomically renames it.
 */
export async function saveProjectData(rootPath: string, data: ProjectMetadata): Promise<boolean> {
  const dir = await ensureMaestroDir(rootPath)
  const filePath = path.join(dir, TASKS_FILE)
  const tempPath = path.join(dir, `${TASKS_FILE}.tmp`)

  const payload: ProjectMetadata = {
    ...data,
    schemaVersion: CURRENT_SCHEMA_VERSION
  }

  const serialized = JSON.stringify(payload, null, 2)

  try {
    // Write to temp file first for crash-safety
    await fs.writeFile(tempPath, serialized, 'utf-8')
    // Atomic rename
    await fs.rename(tempPath, filePath)
    return true
  } catch (err) {
    // Fallback: direct write if atomic rename is restricted
    try {
      await fs.writeFile(filePath, serialized, 'utf-8')
      await fs.unlink(tempPath).catch(() => {})
      return true
    } catch (fallbackErr) {
      console.error('[Maestro] Failed to save project data:', fallbackErr)
      return false
    }
  }
}

/**
 * Creates a timestamped backup of project.json in .maestro/backups/
 */
export async function createProjectBackup(rootPath: string): Promise<string> {
  const dir = await ensureMaestroDir(rootPath)
  const sourcePath = path.join(dir, TASKS_FILE)
  const backupDir = path.join(dir, BACKUPS_DIR)
  await fs.mkdir(backupDir, { recursive: true })

  const timestamp = Date.now()
  const backupFilename = `backup-${timestamp}.json`
  const targetPath = path.join(backupDir, backupFilename)

  await fs.copyFile(sourcePath, targetPath)

  // Prune old backups exceeding MAX_BACKUPS
  try {
    const files = await fs.readdir(backupDir)
    const backupFiles = files
      .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()

    while (backupFiles.length > MAX_BACKUPS) {
      const oldest = backupFiles.shift()
      if (oldest) {
        await fs.unlink(path.join(backupDir, oldest)).catch(() => {})
      }
    }
  } catch {
    // ignore pruning errors
  }

  return backupFilename
}

export async function listProjectBackups(
  rootPath: string
): Promise<{ filename: string; timestamp: number; size: number }[]> {
  const dir = path.join(rootPath, MAESTRO_DIR, BACKUPS_DIR)
  try {
    const files = await fs.readdir(dir)
    const backups: { filename: string; timestamp: number; size: number }[] = []

    for (const file of files) {
      if (file.startsWith('backup-') && file.endsWith('.json')) {
        const stats = await fs.stat(path.join(dir, file))
        const match = file.match(/backup-(\d+)\.json/)
        const timestamp = match ? parseInt(match[1], 10) : stats.mtimeMs
        backups.push({
          filename: file,
          timestamp,
          size: stats.size
        })
      }
    }

    return backups.sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    return []
  }
}

export async function restoreProjectBackup(
  rootPath: string,
  backupFileName: string
): Promise<ProjectMetadata> {
  const backupPath = path.join(rootPath, MAESTRO_DIR, BACKUPS_DIR, backupFileName)
  const content = await fs.readFile(backupPath, 'utf-8')
  const parsed = JSON.parse(content)
  const repaired = validateAndRepairProjectData(parsed, path.basename(rootPath))
  await saveProjectData(rootPath, repaired)
  return repaired
}

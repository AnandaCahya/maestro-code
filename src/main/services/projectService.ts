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

  // Automatically redact secrets before saving to repository metadata
  const { sanitized } = sanitizeProjectMetadataSecrets(data)

  const payload: ProjectMetadata = {
    ...sanitized,
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

// -------------------------------------------------------------------------
// Section 13.4 & 14: Focus, Code-Link Validation & Sync Security
// -------------------------------------------------------------------------

export interface CodeLinkValidationResult {
  brokenLinks: Array<{ file: string; line?: number; endLine?: number; reason: string }>
  validLinks: Array<{ file: string; line?: number; endLine?: number }>
}

/**
 * Validates code links for tasks, detecting missing files or out-of-bounds line numbers
 */
export async function validateTaskCodeLinks(
  workspacePath: string,
  tasks: TaskItem[]
): Promise<Record<string, CodeLinkValidationResult>> {
  const results: Record<string, CodeLinkValidationResult> = {}

  for (const task of tasks) {
    const broken: CodeLinkValidationResult['brokenLinks'] = []
    const valid: CodeLinkValidationResult['validLinks'] = []

    const allLinks = [...(task.codeLinks || [])]
    if (task.linkedFile) {
      allLinks.push({ file: task.linkedFile, line: task.linkedLine })
    }

    for (const link of allLinks) {
      const absPath = path.isAbsolute(link.file)
        ? link.file
        : path.resolve(workspacePath, link.file)

      try {
        const stats = await fs.stat(absPath)
        if (!stats.isFile()) {
          broken.push({ ...link, reason: 'Path is not a regular file' })
          continue
        }

        if (link.line !== undefined) {
          const content = await fs.readFile(absPath, 'utf-8')
          const totalLines = content.split('\n').length
          if (link.line > totalLines || link.line < 1) {
            broken.push({
              ...link,
              reason: `Line ${link.line} exceeds total file lines (${totalLines})`
            })
            continue
          }
          if (link.endLine !== undefined && link.endLine > totalLines) {
            broken.push({
              ...link,
              reason: `EndLine ${link.endLine} exceeds total file lines (${totalLines})`
            })
            continue
          }
        }

        valid.push(link)
      } catch {
        broken.push({ ...link, reason: 'File does not exist on disk' })
      }
    }

    results[task.id] = { brokenLinks: broken, validLinks: valid }
  }

  return results
}

/**
 * Task-aware search filter: returns tasks that have code links pointing to given file
 */
export function filterTasksByLinkedFiles(tasks: TaskItem[], targetFilePath: string): TaskItem[] {
  const normTarget = path.normalize(targetFilePath).toLowerCase()

  return tasks.filter((task) => {
    if (task.linkedFile && path.normalize(task.linkedFile).toLowerCase() === normTarget) {
      return true
    }
    if (task.codeLinks && task.codeLinks.some((l) => path.normalize(l.file).toLowerCase() === normTarget)) {
      return true
    }
    return false
  })
}

const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9_]{36}/g, // GitHub Personal Access Token
  /github_pat_[A-Za-z0-9_]{82}/g, // GitHub Fine-grained PAT
  /sk-[A-Za-z0-9]{32,}/g, // OpenAI secret key
  /AKIA[0-9A-Z]{16}/g, // AWS Access Key
  /Bearer\s+[A-Za-z0-9\-_.~+/]+=*/g, // Bearer Token
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/g // PEM Private Key
]

/**
 * Sanitizes project metadata to prevent secrets from being written to repository
 */
export function sanitizeProjectMetadataSecrets(data: ProjectMetadata): {
  sanitized: ProjectMetadata
  redactedCount: number
} {
  let redactedCount = 0

  function redactString(str?: string): string | undefined {
    if (!str) return str
    let current = str
    for (const pat of SECRET_PATTERNS) {
      current = current.replace(pat, () => {
        redactedCount++
        return '[REDACTED_SECRET]'
      })
    }
    return current
  }

  const sanitizedTasks = (data.tasks || []).map((t) => {
    return {
      ...t,
      description: redactString(t.description),
      comments: (t.comments || []).map((c) => ({
        ...c,
        content: redactString(c.content) || ''
      })),
      activities: (t.activities || []).map((a) => ({
        ...a,
        description: redactString(a.description) || ''
      }))
    }
  })

  return {
    sanitized: {
      ...data,
      description: redactString(data.description),
      tasks: sanitizedTasks
    },
    redactedCount
  }
}

export type TaskTransactionOp =
  | { type: 'create'; task: TaskItem }
  | { type: 'update'; taskId: string; updates: Partial<TaskItem> }
  | { type: 'delete'; taskId: string }
  | { type: 'move'; taskId: string; targetStatus: TaskItem['status'] }

/**
 * Transactional task updates with atomic validation and rollback
 */
export async function executeTaskTransaction(
  rootPath: string,
  operations: TaskTransactionOp[]
): Promise<{ success: boolean; data?: ProjectMetadata; error?: string }> {
  try {
    const current = await loadProjectData(rootPath)
    const tasksMap = new Map<string, TaskItem>(current.tasks.map((t) => [t.id, { ...t }]))

    for (const op of operations) {
      if (op.type === 'create') {
        if (tasksMap.has(op.task.id)) {
          return { success: false, error: `Task ID already exists: ${op.task.id}` }
        }
        tasksMap.set(op.task.id, { ...op.task, updatedAt: Date.now() })
      } else if (op.type === 'update') {
        const existing = tasksMap.get(op.taskId)
        if (!existing) {
          return { success: false, error: `Task not found: ${op.taskId}` }
        }
        tasksMap.set(op.taskId, { ...existing, ...op.updates, updatedAt: Date.now() })
      } else if (op.type === 'delete') {
        if (!tasksMap.has(op.taskId)) {
          return { success: false, error: `Task not found to delete: ${op.taskId}` }
        }
        tasksMap.delete(op.taskId)
      } else if (op.type === 'move') {
        const existing = tasksMap.get(op.taskId)
        if (!existing) {
          return { success: false, error: `Task not found to move: ${op.taskId}` }
        }
        tasksMap.set(op.taskId, { ...existing, status: op.targetStatus, updatedAt: Date.now() })
      }
    }

    const updatedTasks = Array.from(tasksMap.values())
    const candidateData: ProjectMetadata = {
      ...current,
      tasks: updatedTasks
    }

    const validated = validateAndRepairProjectData(candidateData, current.name)
    const saved = await saveProjectData(rootPath, validated)
    if (!saved) {
      return { success: false, error: 'Failed writing project data to disk' }
    }

    return { success: true, data: validated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Transaction failed' }
  }
}

export interface ChangeJournalEntry {
  id: string
  timestamp: number
  action: 'create' | 'update' | 'delete' | 'sync'
  entityType: 'task' | 'sprint' | 'milestone' | 'project'
  entityId: string
  details?: string
}

/**
 * Appends entry to offline change journal in .maestro/journal.json
 */
export async function appendChangeJournal(
  rootPath: string,
  entry: Omit<ChangeJournalEntry, 'id' | 'timestamp'>
): Promise<void> {
  const dir = await ensureMaestroDir(rootPath)
  const journalPath = path.join(dir, 'journal.json')

  let journal: ChangeJournalEntry[] = []
  try {
    const raw = await fs.readFile(journalPath, 'utf-8')
    journal = JSON.parse(raw)
  } catch {
    journal = []
  }

  const newEntry: ChangeJournalEntry = {
    ...entry,
    id: `j-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now()
  }

  journal.push(newEntry)
  if (journal.length > 500) {
    journal = journal.slice(-500)
  }

  await fs.writeFile(journalPath, JSON.stringify(journal, null, 2), 'utf-8')
}

export async function getChangeJournal(rootPath: string): Promise<ChangeJournalEntry[]> {
  const journalPath = path.join(rootPath, MAESTRO_DIR, 'journal.json')
  try {
    const raw = await fs.readFile(journalPath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export async function clearChangeJournal(rootPath: string): Promise<boolean> {
  const journalPath = path.join(rootPath, MAESTRO_DIR, 'journal.json')
  try {
    await fs.unlink(journalPath).catch(() => {})
    return true
  } catch {
    return false
  }
}

export interface SyncHistoryEntry {
  id: string
  timestamp: number
  direction: 'push' | 'pull' | 'manual'
  success: boolean
  importedCount?: number
  exportedCount?: number
  conflictCount?: number
  message?: string
}

export async function recordSyncHistory(
  rootPath: string,
  entry: Omit<SyncHistoryEntry, 'id' | 'timestamp'>
): Promise<void> {
  const dir = await ensureMaestroDir(rootPath)
  const historyPath = path.join(dir, 'sync-history.json')

  let history: SyncHistoryEntry[] = []
  try {
    const raw = await fs.readFile(historyPath, 'utf-8')
    history = JSON.parse(raw)
  } catch {
    history = []
  }

  const record: SyncHistoryEntry = {
    ...entry,
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now()
  }

  history.unshift(record)
  if (history.length > 100) {
    history = history.slice(0, 100)
  }

  await fs.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8')
}

export async function getSyncHistory(rootPath: string): Promise<SyncHistoryEntry[]> {
  const historyPath = path.join(rootPath, MAESTRO_DIR, 'sync-history.json')
  try {
    const raw = await fs.readFile(historyPath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

import { describe, it, expect } from 'vitest'
import {
  validateTaskCodeLinks,
  filterTasksByLinkedFiles,
  sanitizeProjectMetadataSecrets,
  executeTaskTransaction,
  appendChangeJournal,
  getChangeJournal,
  clearChangeJournal,
  recordSyncHistory,
  getSyncHistory
} from '../src/main/services/projectService'
import { interpolateTaskVariables } from '../src/main/services/taskService'
import type { TaskItem, ProjectMetadata } from '../src/preload/index.d'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('Project Offline Data, Code Links & Sync Security (Sections 13.4 & 14)', () => {
  it('validates code links detecting broken files and line out-of-bounds', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-codelink-test-'))
    const validFile = path.join(tmpDir, 'valid.ts')
    await fs.writeFile(validFile, 'line1\nline2\nline3\nline4\nline5\n', 'utf-8')

    const tasks: TaskItem[] = [
      {
        id: 'T-1',
        title: 'Task 1',
        status: 'todo',
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        codeLinks: [
          { file: validFile, line: 3, endLine: 4 }, // valid
          { file: validFile, line: 99 }, // out of bounds
          { file: path.join(tmpDir, 'missing.ts'), line: 1 } // missing file
        ]
      }
    ]

    const res = await validateTaskCodeLinks(tmpDir, tasks)
    expect(res['T-1'].validLinks).toHaveLength(1)
    expect(res['T-1'].brokenLinks).toHaveLength(2)
    expect(res['T-1'].brokenLinks[0].reason).toContain('exceeds total file lines')
    expect(res['T-1'].brokenLinks[1].reason).toContain('does not exist')

    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })

  it('filters tasks by linked file for task-aware search', () => {
    const tasks: TaskItem[] = [
      {
        id: 'T-1',
        title: 'Task 1',
        status: 'todo',
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        codeLinks: [{ file: 'src/editor.ts' }]
      },
      {
        id: 'T-2',
        title: 'Task 2',
        status: 'in_progress',
        priority: 'high',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        linkedFile: 'src/terminal.ts'
      }
    ]

    const matchEditor = filterTasksByLinkedFiles(tasks, 'src/editor.ts')
    expect(matchEditor).toHaveLength(1)
    expect(matchEditor[0].id).toBe('T-1')

    const matchTerminal = filterTasksByLinkedFiles(tasks, 'src/terminal.ts')
    expect(matchTerminal).toHaveLength(1)
    expect(matchTerminal[0].id).toBe('T-2')

    const matchNone = filterTasksByLinkedFiles(tasks, 'src/missing.ts')
    expect(matchNone).toHaveLength(0)
  })

  it('sanitizes secrets preventing sensitive tokens from being written to repository', () => {
    const dataWithSecrets: ProjectMetadata = {
      name: 'Secret Project',
      description: 'Using secret token ghp_1234567890abcdefghijklmnopqrstuvwxyz and key sk-1234567890abcdefghijklmnopqrstuvwxyza',
      tasks: [
        {
          id: 'T-1',
          title: 'Deploy Task',
          description: 'Deploy using AWS key AKIAIOSFODNN7EXAMPLE and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token',
          status: 'todo',
          priority: 'urgent',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          comments: [
            {
              id: 'c-1',
              author: 'Alice',
              content: 'Private key is: -----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----',
              createdAt: Date.now()
            }
          ]
        }
      ]
    }

    const { sanitized, redactedCount } = sanitizeProjectMetadataSecrets(dataWithSecrets)
    expect(redactedCount).toBeGreaterThanOrEqual(4)
    expect(sanitized.description).not.toContain('ghp_')
    expect(sanitized.description).toContain('[REDACTED_SECRET]')
    expect(sanitized.tasks[0].description).not.toContain('AKIA')
    expect(sanitized.tasks[0].comments?.[0].content).not.toContain('BEGIN RSA PRIVATE KEY')
  })

  it('executes task transactions atomically with validation and rollback', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-trans-test-'))

    // 1. Transaction creating tasks
    const res1 = await executeTaskTransaction(tmpDir, [
      {
        type: 'create',
        task: {
          id: 'MST-10',
          title: 'Task 10',
          status: 'todo',
          priority: 'medium',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      },
      {
        type: 'create',
        task: {
          id: 'MST-11',
          title: 'Task 11',
          status: 'in_progress',
          priority: 'high',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      }
    ])
    expect(res1.success).toBe(true)
    expect(res1.data?.tasks.some((t) => t.id === 'MST-10')).toBe(true)
    expect(res1.data?.tasks.some((t) => t.id === 'MST-11')).toBe(true)

    // 2. Transaction moving and updating
    const res2 = await executeTaskTransaction(tmpDir, [
      { type: 'move', taskId: 'MST-10', targetStatus: 'done' },
      { type: 'update', taskId: 'MST-11', updates: { priority: 'urgent' } }
    ])
    expect(res2.success).toBe(true)
    expect(res2.data?.tasks.find((t) => t.id === 'MST-10')?.status).toBe('done')
    expect(res2.data?.tasks.find((t) => t.id === 'MST-11')?.priority).toBe('urgent')

    // 3. Transaction with non-existent task aborts with rollback
    const resFail = await executeTaskTransaction(tmpDir, [
      { type: 'move', taskId: 'NON-EXISTENT', targetStatus: 'done' }
    ])
    expect(resFail.success).toBe(false)
    expect(resFail.error).toContain('Task not found')

    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })

  it('manages change journal and sync history for offline tracking', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-journal-test-'))

    // Change Journal
    await appendChangeJournal(tmpDir, {
      action: 'create',
      entityType: 'task',
      entityId: 'MST-1',
      details: 'Created task via board'
    })
    const journal = await getChangeJournal(tmpDir)
    expect(journal).toHaveLength(1)
    expect(journal[0].action).toBe('create')
    expect(journal[0].entityId).toBe('MST-1')

    await clearChangeJournal(tmpDir)
    expect(await getChangeJournal(tmpDir)).toHaveLength(0)

    // Sync History
    await recordSyncHistory(tmpDir, {
      direction: 'push',
      success: true,
      exportedCount: 3,
      importedCount: 0,
      conflictCount: 0,
      message: 'Initial sync to git'
    })
    const history = await getSyncHistory(tmpDir)
    expect(history).toHaveLength(1)
    expect(history[0].direction).toBe('push')
    expect(history[0].exportedCount).toBe(3)

    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })

  it('interpolates active task context into task runner templates', () => {
    const template = 'echo "Running ${activeTaskId}: ${activeTaskTitle} [${activeTaskStatus}]"'
    const context = {
      activeTaskId: 'MST-99',
      activeTaskTitle: 'Deploy production release',
      activeTaskStatus: 'in_progress'
    }

    const output = interpolateTaskVariables(template, context)
    expect(output).toBe('echo "Running MST-99: Deploy production release [in_progress]"')
  })
})

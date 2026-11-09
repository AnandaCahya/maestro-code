import { describe, it, expect } from 'vitest'
import {
  validateAttachmentPolicy,
  saveTaskAttachment,
  listTaskAttachments,
  deleteTaskAttachment,
  recordTaskTombstone,
  getTaskTombstones,
  reconcileTasksWithTombstones,
  syncRepositoryWithRetry,
  getAutoSyncConfig,
  setAutoSyncConfig,
  saveUnsavedBufferSnapshot,
  getUnsavedBufferSnapshots,
  clearUnsavedBufferSnapshot,
  migrateProjectSchema
} from '../src/main/services/projectService'
import type { TaskItem } from '../src/preload/index.d'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('Sync Engine, Attachments & Crash Recovery (Sections 14 & 15)', () => {
  it('enforces attachment storage policy and manages task attachments', async () => {
    // Policy checks
    expect(validateAttachmentPolicy('screenshot.png', 1024).allowed).toBe(true)
    expect(validateAttachmentPolicy('logs.txt', 2048).allowed).toBe(true)
    expect(validateAttachmentPolicy('malware.exe', 500).allowed).toBe(false)
    expect(validateAttachmentPolicy('script.sh', 500).allowed).toBe(false)
    expect(validateAttachmentPolicy('huge.zip', 20 * 1024 * 1024).allowed).toBe(false)

    // Save and list attachments
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-att-test-'))
    const saveRes = await saveTaskAttachment(
      tmpDir,
      'MST-1',
      'design.png',
      Buffer.from('fake image data')
    )
    expect(saveRes.success).toBe(true)
    expect(saveRes.attachment?.fileName).toBe('design.png')

    const list = await listTaskAttachments(tmpDir, 'MST-1')
    expect(list).toHaveLength(1)
    expect(list[0].fileName).toBe('design.png')

    // Delete attachment
    const deleted = await deleteTaskAttachment(tmpDir, 'MST-1', 'design.png')
    expect(deleted).toBe(true)
    expect(await listTaskAttachments(tmpDir, 'MST-1')).toHaveLength(0)

    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })

  it('tracks deleted tasks with tombstones and reconciles against resurrected tasks', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-tomb-test-'))

    await recordTaskTombstone(tmpDir, 'MST-99')
    const tombstones = await getTaskTombstones(tmpDir)
    expect(tombstones).toHaveLength(1)
    expect(tombstones[0].id).toBe('MST-99')

    const incomingTasks: TaskItem[] = [
      {
        id: 'MST-1',
        title: 'Active Task',
        status: 'todo',
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'MST-99',
        title: 'Deleted Task Resurrected',
        status: 'todo',
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    const reconciled = reconcileTasksWithTombstones(incomingTasks, tombstones)
    expect(reconciled).toHaveLength(1)
    expect(reconciled[0].id).toBe('MST-1')

    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })

  it('handles sync retries and recovers from stale/interrupted sync locks', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-sync-test-'))
    const maestroDir = path.join(tmpDir, '.maestro')
    await fs.mkdir(maestroDir, { recursive: true })

    // Simulate stale lock from prior crashed sync (> 15s old)
    const lockPath = path.join(maestroDir, 'sync.lock')
    await fs.writeFile(lockPath, 'stale', 'utf-8')
    const past = new Date(Date.now() - 30000)
    await fs.utimes(lockPath, past, past)

    let runCount = 0
    const syncRes = await syncRepositoryWithRetry(
      tmpDir,
      async () => {
        runCount++
        if (runCount === 1) throw new Error('Transient network glitch')
        return true
      },
      3,
      10
    )

    expect(syncRes.success).toBe(true)
    expect(syncRes.attempts).toBe(2)

    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })

  it('configures and persists auto-sync policy', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-policy-test-'))

    const initial = await getAutoSyncConfig(tmpDir)
    expect(initial.policy).toBe('onSave')

    const updated = await setAutoSyncConfig(tmpDir, {
      policy: 'onInterval',
      intervalMinutes: 5
    })
    expect(updated.policy).toBe('onInterval')
    expect(updated.intervalMinutes).toBe(5)

    const reloaded = await getAutoSyncConfig(tmpDir)
    expect(reloaded.policy).toBe('onInterval')

    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })

  it('saves, retrieves, and clears unsaved buffer recovery snapshots', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-recovery-test-'))

    const file1 = path.join(tmpDir, 'src', 'App.tsx')
    await saveUnsavedBufferSnapshot(tmpDir, file1, 'const App = () => <div>Hello</div>')

    const file2 = path.join(tmpDir, 'src', 'main.ts')
    await saveUnsavedBufferSnapshot(tmpDir, file2, 'console.log("recovery test");')

    const snaps = await getUnsavedBufferSnapshots(tmpDir)
    expect(snaps).toHaveLength(2)
    expect(snaps.some((s) => s.filePath === file1)).toBe(true)

    // Clear single snapshot
    await clearUnsavedBufferSnapshot(tmpDir, file1)
    const afterOne = await getUnsavedBufferSnapshots(tmpDir)
    expect(afterOne).toHaveLength(1)
    expect(afterOne[0].filePath).toBe(file2)

    // Clear all
    await clearUnsavedBufferSnapshot(tmpDir)
    expect(await getUnsavedBufferSnapshots(tmpDir)).toHaveLength(0)

    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })

  it('migrates schema version forward and handles schema mismatches', () => {
    // Version 1 -> Version 2 migration
    const v1Data = {
      name: 'Legacy Project',
      schemaVersion: 1,
      tasks: [
        {
          id: 'MST-1',
          title: 'Legacy Task',
          branchName: 'feature/legacy',
          linkedFile: 'src/index.ts',
          linkedLine: 10
        }
      ]
    }

    const migrationRes = migrateProjectSchema(v1Data, 'Legacy Project')
    expect(migrationRes.migrated).toBe(true)
    expect(migrationRes.fromVersion).toBe(1)
    expect(migrationRes.toVersion).toBe(2)
    expect(migrationRes.data.tasks[0].branches).toEqual(['feature/legacy'])
    expect(migrationRes.data.tasks[0].codeLinks?.[0].file).toBe('src/index.ts')

    // Newer schema version from future
    const futureData = {
      name: 'Future Project',
      schemaVersion: 99,
      tasks: []
    }
    const futureRes = migrateProjectSchema(futureData, 'Future Project')
    expect(futureRes.migrated).toBe(false)
    expect(futureRes.warning).toContain('schema version (99) is newer')
  })
})

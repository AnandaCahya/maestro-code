import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import {
  validateAndRepairProjectData,
  saveProjectData,
  loadProjectData,
  detectPackageManager,
  createProjectBackup,
  listProjectBackups,
  restoreProjectBackup
} from '../src/main/services/projectService'
import type { ProjectMetadata } from '../src/preload/index.d'

describe('projectService', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-test-'))
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  })

  describe('validateAndRepairProjectData', () => {
    it('provides fallback project when data is null or corrupted', () => {
      const repaired = validateAndRepairProjectData(null, 'TestWorkspace')
      expect(repaired.name).toBe('TestWorkspace')
      expect(repaired.schemaVersion).toBe(1)
      expect(repaired.tasks).toEqual([])
    })

    it('deduplicates duplicate task IDs', () => {
      const corruptedTasks = {
        name: 'Dupe Test',
        tasks: [
          { id: 'MST-1', title: 'First Task', status: 'todo', priority: 'medium' },
          { id: 'MST-1', title: 'Duplicate ID Task', status: 'todo', priority: 'medium' }
        ]
      }

      const repaired = validateAndRepairProjectData(corruptedTasks, 'Fallback')
      expect(repaired.tasks.length).toBe(2)
      expect(repaired.tasks[0].id).toBe('MST-1')
      expect(repaired.tasks[1].id).toBe('MST-1-2')
    })

    it('corrects invalid status and priority to safe defaults', () => {
      const invalidData = {
        name: 'Invalid Test',
        tasks: [
          { id: 'MST-1', title: 'Bad Status', status: 'invalid_status_xyz', priority: 'ultra_crazy' }
        ]
      }

      const repaired = validateAndRepairProjectData(invalidData, 'Fallback')
      expect(repaired.tasks[0].status).toBe('todo')
      expect(repaired.tasks[0].priority).toBe('medium')
    })
  })

  describe('persistence and backups', () => {
    it('saves and loads project metadata crash-safely', async () => {
      const project: ProjectMetadata = {
        name: 'Saved Project',
        description: 'Test description',
        schemaVersion: 1,
        tasks: [
          {
            id: 'MST-1',
            title: 'Initial Task',
            status: 'in_progress',
            priority: 'high',
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        ]
      }

      const saveOk = await saveProjectData(tempDir, project)
      expect(saveOk).toBe(true)

      const loaded = await loadProjectData(tempDir)
      expect(loaded.name).toBe('Saved Project')
      expect(loaded.tasks.length).toBe(1)
      expect(loaded.tasks[0].title).toBe('Initial Task')
      expect(loaded.tasks[0].status).toBe('in_progress')
    })

    it('creates, lists, and restores project backups', async () => {
      const initialProject: ProjectMetadata = {
        name: 'Original State',
        tasks: [
          {
            id: 'MST-1',
            title: 'Original Task',
            status: 'todo',
            priority: 'medium',
            createdAt: 1000,
            updatedAt: 1000
          }
        ]
      }

      await saveProjectData(tempDir, initialProject)

      // Create backup
      const backupFile = await createProjectBackup(tempDir)
      expect(backupFile).toMatch(/^backup-\d+\.json$/)

      // List backups
      const backups = await listProjectBackups(tempDir)
      expect(backups.length).toBe(1)
      expect(backups[0].filename).toBe(backupFile)

      // Overwrite project with new data
      const modifiedProject: ProjectMetadata = {
        name: 'Modified State',
        tasks: []
      }
      await saveProjectData(tempDir, modifiedProject)

      const verifyModified = await loadProjectData(tempDir)
      expect(verifyModified.name).toBe('Modified State')
      expect(verifyModified.tasks.length).toBe(0)

      // Restore backup
      const restored = await restoreProjectBackup(tempDir, backupFile)
      expect(restored.name).toBe('Original State')
      expect(restored.tasks.length).toBe(1)
      expect(restored.tasks[0].title).toBe('Original Task')

      // Verify on disk after restore
      const reloaded = await loadProjectData(tempDir)
      expect(reloaded.name).toBe('Original State')
      expect(reloaded.tasks.length).toBe(1)
    })

    it('accurately detects package manager in workspace directory', async () => {
      // Empty directory
      const nonePm = await detectPackageManager(tempDir)
      expect(nonePm).toBe('none')

      // pnpm
      await fs.writeFile(path.join(tempDir, 'pnpm-lock.yaml'), '')
      expect(await detectPackageManager(tempDir)).toBe('pnpm')

      // loadProjectData should reflect detected package manager
      const loaded = await loadProjectData(tempDir)
      expect(loaded.packageManager).toBe('pnpm')
    })
  })
})

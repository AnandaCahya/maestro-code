import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import {
  discoverGitRepositories,
  createWorkspaceBackup,
  listWorkspaceBackups,
  restoreWorkspaceBackup,
  saveWorkspaceSessionState
} from '../src/main/services/workspaceService'
import { searchInFiles } from '../src/main/services/searchService'

describe('workspaceService - Git Discovery and Backups', () => {
  let testWorkspace: string

  beforeEach(async () => {
    testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-ws-test-'))
  })

  afterEach(async () => {
    try {
      await fs.rm(testWorkspace, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  it('discovers root and nested Git repositories/submodules', async () => {
    // Root git repo
    await fs.mkdir(path.join(testWorkspace, '.git'))

    // Nested submodule repo inside packages/submodule
    const submodulePath = path.join(testWorkspace, 'packages', 'submodule')
    await fs.mkdir(path.join(submodulePath, '.git'), { recursive: true })

    const repos = await discoverGitRepositories(testWorkspace)
    expect(repos.length).toBe(2)
    expect(repos).toContain(testWorkspace)
    expect(repos).toContain(submodulePath)
  })

  it('creates, lists, and restores workspace backups', async () => {
    // Set initial session state and project data
    const initialSession = {
      openFiles: [{ path: path.join(testWorkspace, 'index.ts'), name: 'index.ts' }],
      activeFilePath: path.join(testWorkspace, 'index.ts'),
      workspaceFolders: [{ path: testWorkspace, name: 'Root' }]
    }
    await saveWorkspaceSessionState(testWorkspace, initialSession)

    const initialProject = {
      name: 'Test Project',
      description: 'Backup test',
      tasks: [{ id: 'task-1', title: 'First Task', status: 'todo' as const, priority: 'medium' as const, type: 'task' as const, subtasks: [] }],
      schemaVersion: 1
    }
    const maestroDir = path.join(testWorkspace, '.maestro')
    await fs.mkdir(maestroDir, { recursive: true })
    await fs.writeFile(path.join(maestroDir, 'project.json'), JSON.stringify(initialProject), 'utf-8')

    // Create backup
    const backupFileName = await createWorkspaceBackup(testWorkspace)
    expect(backupFileName).toMatch(/^workspace-backup-\d+\.json$/)

    // List backups
    const backups = await listWorkspaceBackups(testWorkspace)
    expect(backups.length).toBe(1)
    expect(backups[0]).toBe(backupFileName)

    // Modify current state on disk to simulate change/corruption
    await fs.writeFile(path.join(maestroDir, 'project.json'), JSON.stringify({ name: 'Corrupted' }), 'utf-8')

    // Restore backup
    const ok = await restoreWorkspaceBackup(testWorkspace, backupFileName)
    expect(ok).toBe(true)

    // Verify restored project.json
    const restoredContent = JSON.parse(await fs.readFile(path.join(maestroDir, 'project.json'), 'utf-8'))
    expect(restoredContent.name).toBe('Test Project')
    expect(restoredContent.tasks.length).toBe(1)
    expect(restoredContent.tasks[0].id).toBe('task-1')
  })
})

describe('searchService - Search In Selection', () => {
  let searchDir: string

  beforeEach(async () => {
    searchDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-search-sel-'))
  })

  afterEach(async () => {
    try {
      await fs.rm(searchDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  it('restricts search results to lines within selectionRange', async () => {
    const file = path.join(searchDir, 'sample.ts')
    const content = [
      'const a = "target"; // line 1',
      'const b = "ignore"; // line 2',
      'const c = "target"; // line 3 (in selection)',
      'const d = "target"; // line 4 (in selection)',
      'const e = "target"; // line 5'
    ].join('\n')

    await fs.writeFile(file, content, 'utf-8')

    // Normal search finds all 4 matches
    const allResults = await searchInFiles(searchDir, 'target')
    expect(allResults[0].matches.length).toBe(4)

    // Search with searchInSelection lines 3 to 4
    const scopedResults = await searchInFiles(searchDir, 'target', {
      searchInSelection: true,
      selectionRange: {
        filePath: file,
        startLine: 3,
        endLine: 4
      }
    })

    expect(scopedResults.length).toBe(1)
    expect(scopedResults[0].matches.length).toBe(2)
    expect(scopedResults[0].matches[0].line).toBe(3)
    expect(scopedResults[0].matches[1].line).toBe(4)
  })
})

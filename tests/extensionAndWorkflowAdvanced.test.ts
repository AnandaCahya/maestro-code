import { describe, it, expect, beforeEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs/promises'
import * as os from 'os'
import {
  validateExtensionCompatibility,
  getContributedSnippets,
  getContributedLanguages,
  exportExtensionInventory,
  getExtensionStoragePath,
  loadExtensions
} from '../src/main/services/extensionService'
import {
  DEFAULT_WORKFLOW_POLICY,
  getWorkflowPolicy,
  saveWorkflowPolicy,
  validateTaskTransition,
  getTaskTemplates,
  createTaskFromTemplate,
  bulkUpdateTasks,
  loadProjectData,
  saveProjectData
} from '../src/main/services/projectService'
import type { TaskItem } from '../src/preload/index.d'

describe('Extension Ecosystem & VS Code Compatibility (Section 8)', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-ext-compat-'))
  })

  it('validates extension compatibility metadata and detects unsupported contributions', () => {
    const compatibleManifest = {
      name: 'awesome-tools',
      publisher: 'developer',
      version: '1.0.0',
      engines: { vscode: '^1.80.0' },
      contributes: {
        commands: [{ command: 'tools.run', title: 'Run Tools' }],
        snippets: [{ language: 'typescript', path: './snippets.json' }]
      }
    }

    const report1 = validateExtensionCompatibility(compatibleManifest)
    expect(report1.compatible).toBe(true)
    expect(report1.supportedContributions).toContain('commands')
    expect(report1.supportedContributions).toContain('snippets')
    expect(report1.unsupportedContributions.length).toBe(0)

    const unsupportedManifest = {
      name: 'unsupported-tool',
      publisher: 'developer',
      version: '1.0.0',
      contributes: {
        customUnsupportedProtocolHandler: { foo: 'bar' }
      }
    }

    const report2 = validateExtensionCompatibility(unsupportedManifest as any)
    expect(report2.compatible).toBe(false)
    expect(report2.unsupportedContributions).toContain('customUnsupportedProtocolHandler')
  })

  it('aggregates snippet and language contributions from active extensions', async () => {
    await loadExtensions(tempDir)

    const snippets = getContributedSnippets()
    expect(Array.isArray(snippets)).toBe(true)

    const languages = getContributedLanguages()
    expect(Array.isArray(languages)).toBe(true)
  })

  it('exports extension inventory and generates recommendation metadata', async () => {
    await loadExtensions(tempDir)

    const result = await exportExtensionInventory(tempDir)
    expect(result.inventory.length).toBeGreaterThan(0)
    expect(result.recommendationsPath).toBeDefined()

    const raw = await fs.readFile(result.recommendationsPath!, 'utf-8')
    const parsed = JSON.parse(raw)
    expect(Array.isArray(parsed.recommendations)).toBe(true)
  })

  it('creates and resolves isolated global and workspace extension storage directories', async () => {
    const globalPath = await getExtensionStoragePath('test.sample-ext')
    expect(globalPath).toContain('test.sample-ext')

    const workspacePath = await getExtensionStoragePath('test.sample-ext', tempDir)
    expect(workspacePath).toContain(tempDir)
    expect(workspacePath).toContain('extension-storage')
  })
})

describe('Project Management Workflow, Templates & Bulk Operations (Section 13)', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-pm-test-'))
  })

  it('validates task workflow transitions according to policy', () => {
    const task: TaskItem = {
      id: 'MST-100',
      title: 'Fix issue',
      status: 'backlog',
      subtasks: []
    }

    // backlog -> todo is permitted by default
    const validTransition = validateTaskTransition(task, 'todo', DEFAULT_WORKFLOW_POLICY)
    expect(validTransition.valid).toBe(true)

    // backlog -> done is not permitted directly without passing in_progress / review
    const invalidTransition = validateTaskTransition(task, 'done', DEFAULT_WORKFLOW_POLICY)
    expect(invalidTransition.valid).toBe(false)
    expect(invalidTransition.reason).toContain('not permitted')

    // Cannot move to done if subtasks are incomplete
    const taskWithOpenSubtasks: TaskItem = {
      id: 'MST-101',
      title: 'Complex task',
      status: 'review',
      subtasks: [
        { id: 'sub-1', title: 'Write tests', completed: false }
      ]
    }
    const blockedDone = validateTaskTransition(taskWithOpenSubtasks, 'done', DEFAULT_WORKFLOW_POLICY)
    expect(blockedDone.valid).toBe(false)
    expect(blockedDone.reason).toContain('subtask(s) are still uncompleted')
  })

  it('loads and saves custom project workflow policy', async () => {
    const customPolicy = {
      allowedTransitions: {
        backlog: ['todo'] as any[],
        todo: ['in_progress'] as any[],
        in_progress: ['done'] as any[],
        review: ['done'] as any[],
        done: ['backlog'] as any[]
      },
      requireSubtasksCompletedOnDone: false
    }

    const saved = await saveWorkflowPolicy(tempDir, customPolicy as any)
    expect(saved).toBe(true)

    const loaded = await getWorkflowPolicy(tempDir)
    expect(loaded.requireSubtasksCompletedOnDone).toBe(false)
    expect(loaded.allowedTransitions.done).toContain('backlog')
  })

  it('provides built-in task templates and instantiates tasks with checklists', () => {
    const templates = getTaskTemplates()
    expect(templates.length).toBeGreaterThanOrEqual(3)

    const bugTemplate = templates.find((t) => t.id === 'template-bug')
    expect(bugTemplate).toBeDefined()
    expect(bugTemplate?.defaultPriority).toBe('high')

    const newTask = createTaskFromTemplate('template-bug', {
      title: 'Crash when clicking refresh',
      assignee: 'Alice'
    })
    expect(newTask.title).toBe('Crash when clicking refresh')
    expect(newTask.priority).toBe('high')
    expect(newTask.labels).toContain('bug')
    expect(newTask.description).toContain('Steps to Reproduce')
    expect(newTask.subtasks && newTask.subtasks.length).toBeGreaterThan(0)
  })

  it('performs bulk task updates with transition validation', async () => {
    const initialData = {
      name: 'Bulk Test Project',
      schemaVersion: 2,
      tasks: [
        { id: 'T-1', title: 'Task 1', status: 'backlog' as const, priority: 'low' as const, labels: ['frontend'] },
        { id: 'T-2', title: 'Task 2', status: 'backlog' as const, priority: 'low' as const, labels: ['backend'] }
      ],
      sprints: [],
      milestones: []
    }
    await saveProjectData(tempDir, initialData)

    // Bulk update priority and transition status to todo
    const res = await bulkUpdateTasks(tempDir, ['T-1', 'T-2'], {
      status: 'todo',
      priority: 'high',
      labelsToAdd: ['urgent-batch']
    })

    expect(res.ok).toBe(true)
    expect(res.updatedCount).toBe(2)

    const updated = await loadProjectData(tempDir)
    const t1 = updated.tasks.find((t) => t.id === 'T-1')
    expect(t1?.status).toBe('todo')
    expect(t1?.priority).toBe('high')
    expect(t1?.labels).toContain('urgent-batch')
    expect(t1?.labels).toContain('frontend')
  })
})

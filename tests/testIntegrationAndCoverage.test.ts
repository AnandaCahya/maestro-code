import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import {
  discoverWorkspaceTests,
  getSupportedAdapters,
  loadCoverageSummary,
  getFileCoverageDecorations,
  debugWorkspaceTest
} from '../src/main/services/testService'
import {
  resolveTaskForProjectContext,
  injectProjectTaskEnvironment,
  runTaskForProjectItem,
  type MaestroTask
} from '../src/main/services/taskService'
import {
  defineCustomField,
  setTaskCustomField,
  validateTaskCustomFields,
  archiveTask,
  listArchivedTasks,
  restoreTask,
  softDeleteTask,
  calculateSprintBurndown,
  calculateSprintVelocity,
  saveProjectData,
  loadProjectData,
  type ProjectMetadata,
  type CustomFieldDefinition
} from '../src/main/services/projectService'
import {
  detectKeybindingConflicts,
  resolveEffectiveKeybinding,
  saveUserKeybindingOverride,
  type KeybindingEntry
} from '../src/main/services/settingsService'

describe('Testing Integration, Coverage, Project Tasks & Keybindings', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-compat-test-'))
  })

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true })
    } catch {
      // Ignore
    }
  })

  describe('Testing Integration & PHPUnit & Coverage (Section 11)', () => {
    it('discovers PHPUnit tests and parses test methods and docblocks', async () => {
      const phpContent = `<?php
namespace Tests\\Unit;

use PHPUnit\\Framework\\TestCase;

class OrderProcessingTest extends TestCase
{
    public function testOrderCalculatesTotalCorrectly()
    {
        $this->assertTrue(true);
    }

    /**
     * @test
     */
    public function customDocblockTestName()
    {
        $this->assertEquals(10, 10);
    }
}
`
      const testDir = path.join(tmpDir, 'tests')
      await fs.mkdir(testDir, { recursive: true })
      await fs.writeFile(path.join(testDir, 'OrderProcessingTest.php'), phpContent, 'utf-8')
      await fs.writeFile(
        path.join(tmpDir, 'composer.json'),
        JSON.stringify({ 'require-dev': { 'phpunit/phpunit': '^10.0' } }),
        'utf-8'
      )

      const discovery = await discoverWorkspaceTests(tmpDir)
      expect(discovery.framework).toBe('phpunit')
      expect(discovery.files.length).toBe(1)
      expect(discovery.files[0].suites.length).toBe(1)
      expect(discovery.files[0].suites[0].name).toBe('OrderProcessingTest')
      expect(discovery.files[0].suites[0].tests.length).toBe(2)
      expect(discovery.files[0].suites[0].tests[0].name).toContain('OrderCalculatesTotalCorrectly')
      expect(discovery.files[0].suites[0].tests[1].name).toBe('customDocblockTestName')
    })

    it('returns supported test adapters and version compatibility documentation', () => {
      const adapters = getSupportedAdapters()
      expect(adapters.length).toBeGreaterThanOrEqual(5)

      const vitestAdapter = adapters.find((a) => a.id === 'vitest')
      const phpunitAdapter = adapters.find((a) => a.id === 'phpunit')
      const jestAdapter = adapters.find((a) => a.id === 'jest')

      expect(vitestAdapter).toBeDefined()
      expect(vitestAdapter?.supportsCoverage).toBe(true)
      expect(vitestAdapter?.supportsDebug).toBe(true)

      expect(phpunitAdapter).toBeDefined()
      expect(phpunitAdapter?.supportedVersions).toContain('v10.x')

      expect(jestAdapter).toBeDefined()
    })

    it('loads coverage summary from Istanbul JSON format', async () => {
      const covDir = path.join(tmpDir, 'coverage')
      await fs.mkdir(covDir, { recursive: true })
      const summaryData = {
        total: {
          lines: { total: 100, covered: 85, skipped: 0, pct: 85 },
          statements: { total: 120, covered: 102, skipped: 0, pct: 85 },
          functions: { total: 20, covered: 18, skipped: 0, pct: 90 },
          branches: { total: 40, covered: 32, skipped: 0, pct: 80 }
        }
      }
      await fs.writeFile(path.join(covDir, 'coverage-summary.json'), JSON.stringify(summaryData), 'utf-8')

      const summary = await loadCoverageSummary(tmpDir)
      expect(summary).not.toBeNull()
      expect(summary?.lines.pct).toBe(85)
      expect(summary?.status).toBe('good')
    })

    it('generates file coverage decorations for editor gutters from coverage-final.json', async () => {
      const covDir = path.join(tmpDir, 'coverage')
      await fs.mkdir(covDir, { recursive: true })

      const sampleFile = path.join(tmpDir, 'src', 'calculator.ts')
      const finalCovData = {
        [sampleFile]: {
          path: sampleFile,
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 20 } },
            '1': { start: { line: 5, column: 2 }, end: { line: 5, column: 15 } },
            '2': { start: { line: 10, column: 2 }, end: { line: 10, column: 18 } }
          },
          s: {
            '0': 5,
            '1': 0,
            '2': 3
          }
        }
      }
      await fs.writeFile(path.join(covDir, 'coverage-final.json'), JSON.stringify(finalCovData), 'utf-8')

      const decorations = await getFileCoverageDecorations(tmpDir, sampleFile)
      expect(decorations.length).toBe(3)
      expect(decorations[0]).toEqual({ line: 1, status: 'covered', executionCount: 5 })
      expect(decorations[1]).toEqual({ line: 5, status: 'uncovered', executionCount: 0 })
      expect(decorations[2]).toEqual({ line: 10, status: 'covered', executionCount: 3 })
    })

    it('starts debug test session with DAP launch configuration', async () => {
      const testFile = path.join(tmpDir, 'math.test.ts')
      const result = await debugWorkspaceTest(tmpDir, testFile, 'adds numbers')
      expect(result.ok).toBe(true)
      expect(result.sessionId).toBeDefined()
    })
  })

  describe('Task Runner Integration with Project Management (Section 10 & 13.4)', () => {
    const mockTasks: MaestroTask[] = [
      {
        id: 'build-task',
        label: 'Build Project',
        type: 'shell',
        command: 'npm run build',
        source: 'tasks.json',
        group: 'build'
      },
      {
        id: 'test-task',
        label: 'Run Unit Tests',
        type: 'shell',
        command: 'npm test',
        source: 'tasks.json',
        group: 'test'
      },
      {
        id: 'custom-job',
        label: 'Deploy Staging',
        type: 'shell',
        command: 'npm run deploy',
        source: 'tasks.json'
      }
    ]

    it('resolves task by direct job name, ID or workflow trigger', () => {
      const match1 = resolveTaskForProjectContext(mockTasks, {
        taskId: 'MST-101',
        taskTitle: 'Deploy build',
        taskStatus: 'in_progress',
        linkedJobName: 'Deploy Staging'
      })
      expect(match1?.label).toBe('Deploy Staging')

      const match2 = resolveTaskForProjectContext(mockTasks, {
        taskId: 'MST-102',
        taskTitle: 'Verify PR',
        taskStatus: 'review',
        trigger: 'onReview'
      })
      expect(match2?.group).toBe('test')
    })

    it('injects Project Management context into task environment variables', () => {
      const task = mockTasks[0]
      const configured = injectProjectTaskEnvironment(task, {
        taskId: 'MST-55',
        taskTitle: 'Refactor Auth Engine',
        taskStatus: 'in_progress',
        branchName: 'feature/auth-engine',
        trigger: 'manual'
      })

      expect(configured.options?.env?.MAESTRO_TASK_ID).toBe('MST-55')
      expect(configured.options?.env?.MAESTRO_TASK_TITLE).toBe('Refactor Auth Engine')
      expect(configured.options?.env?.MAESTRO_TASK_BRANCH).toBe('feature/auth-engine')
      expect(configured.options?.env?.MAESTRO_TRIGGER).toBe('manual')
    })

    it('executes runTaskForProjectItem reading workspace configuration', async () => {
      const vscodeDir = path.join(tmpDir, '.vscode')
      await fs.mkdir(vscodeDir, { recursive: true })
      await fs.writeFile(
        path.join(vscodeDir, 'tasks.json'),
        JSON.stringify({
          version: '2.0.0',
          tasks: [
            {
              label: 'Verify MST-10',
              type: 'shell',
              command: 'pnpm test'
            }
          ]
        }),
        'utf-8'
      )

      const res = await runTaskForProjectItem(tmpDir, {
        taskId: 'MST-10',
        taskTitle: 'Verify Fix',
        taskStatus: 'in_progress'
      })

      expect(res.ran).toBe(true)
      expect(res.task?.label).toBe('Verify MST-10')
      expect(res.task?.options?.env?.MAESTRO_TASK_ID).toBe('MST-10')
    })
  })

  describe('Project Management: Custom Fields, Archive & Sprint Burndown / Velocity (Section 13)', () => {
    beforeEach(async () => {
      const initialData: ProjectMetadata = {
        name: 'Compat Project',
        schemaVersion: 2,
        estimationUnit: 'story_points',
        tasks: [
          {
            id: 'MST-1',
            title: 'Task 1',
            status: 'done',
            priority: 'high',
            storyPoints: 5,
            sprintId: 'sprint-1',
            createdAt: Date.now() - 3 * 86400000,
            updatedAt: Date.now() - 2 * 86400000
          },
          {
            id: 'MST-2',
            title: 'Task 2',
            status: 'in_progress',
            priority: 'medium',
            storyPoints: 3,
            sprintId: 'sprint-1',
            createdAt: Date.now() - 2 * 86400000,
            updatedAt: Date.now()
          }
        ],
        sprints: [
          {
            id: 'sprint-1',
            name: 'Sprint 1',
            status: 'active',
            startDate: new Date(Date.now() - 3 * 86400000).toISOString(),
            endDate: new Date(Date.now() + 4 * 86400000).toISOString()
          }
        ]
      }
      await saveProjectData(tmpDir, initialData)
    })

    it('defines custom fields and sets and validates task custom field values', async () => {
      const fieldDef: CustomFieldDefinition = {
        id: 'qa-tester',
        name: 'QA Tester',
        type: 'select',
        options: ['Alice', 'Bob', 'Charlie'],
        required: true
      }

      const defined = await defineCustomField(tmpDir, fieldDef)
      expect(defined).toBe(true)

      const setResult = await setTaskCustomField(tmpDir, 'MST-1', 'qa-tester', 'Alice')
      expect(setResult.ok).toBe(true)

      const updated = await loadProjectData(tmpDir)
      const task1 = updated.tasks.find((t) => t.id === 'MST-1')!
      expect(task1.customFields?.['qa-tester']).toBe('Alice')

      // Validation
      const valValid = validateTaskCustomFields(task1, [fieldDef])
      expect(valValid.valid).toBe(true)

      const invalidTask = { ...task1, customFields: { 'qa-tester': 'UnknownPerson' } }
      const valInvalid = validateTaskCustomFields(invalidTask, [fieldDef])
      expect(valInvalid.valid).toBe(false)
      expect(valInvalid.errors[0]).toContain('invalid option')
    })

    it('archives, lists, restores, and soft-deletes tasks', async () => {
      const archived = await archiveTask(tmpDir, 'MST-2', true)
      expect(archived).toBe(true)

      const archivedList = await listArchivedTasks(tmpDir)
      expect(archivedList.length).toBe(1)
      expect(archivedList[0].id).toBe('MST-2')

      const restored = await restoreTask(tmpDir, 'MST-2')
      expect(restored).toBe(true)

      const afterRestore = await listArchivedTasks(tmpDir)
      expect(afterRestore.length).toBe(0)

      const softDeleted = await softDeleteTask(tmpDir, 'MST-1')
      expect(softDeleted).toBe(true)
    })

    it('calculates sprint burndown points and velocity history', async () => {
      const burndown = await calculateSprintBurndown(tmpDir, 'sprint-1')
      expect(burndown).not.toBeNull()
      expect(burndown?.sprintId).toBe('sprint-1')
      expect(burndown?.totalScope).toBe(8) // 5 + 3 points
      expect(burndown?.points.length).toBeGreaterThan(0)
      expect(burndown?.points[0].idealRemaining).toBe(8)

      const velocity = await calculateSprintVelocity(tmpDir)
      expect(velocity.sprints.length).toBe(1)
      expect(velocity.sprints[0].plannedPoints).toBe(8)
      expect(velocity.sprints[0].completedPoints).toBe(5)
      expect(velocity.averageVelocity).toBe(5)
    })
  })

  describe('Keybinding Overrides & Conflict Detection (Section 12.4)', () => {
    const keybindings: KeybindingEntry[] = [
      { key: 'Ctrl+Shift+P', command: 'workbench.action.showCommands' },
      { key: 'Ctrl+Shift+P', command: 'editor.customAction' },
      { key: 'Ctrl+S', command: 'workbench.action.files.save', when: '!editorReadonly' },
      { key: 'Ctrl+S', command: 'workbench.action.files.saveAs', when: 'editorReadonly' }
    ]

    it('detects keybinding chord conflicts', () => {
      const conflicts = detectKeybindingConflicts(keybindings)
      expect(conflicts.length).toBe(2)

      const direct = conflicts.find((c) => c.key === 'Ctrl+Shift+P')
      expect(direct).toBeDefined()
      expect(direct?.hasDirectConflict).toBe(true)
      expect(direct?.commands).toContain('workbench.action.showCommands')
      expect(direct?.commands).toContain('editor.customAction')
    })

    it('resolves effective keybinding matching context when clause', () => {
      const effective1 = resolveEffectiveKeybinding(
        'workbench.action.files.save',
        { editorReadonly: false },
        keybindings
      )
      expect(effective1?.command).toBe('workbench.action.files.save')

      const effective2 = resolveEffectiveKeybinding(
        'workbench.action.files.saveAs',
        { editorReadonly: true },
        keybindings
      )
      expect(effective2?.command).toBe('workbench.action.files.saveAs')
    })

    it('saves user keybinding overrides into workspace keybindings.json', async () => {
      const override: KeybindingEntry = {
        key: 'Ctrl+K Ctrl+S',
        command: 'workbench.action.openGlobalKeybindings'
      }

      const saved = await saveUserKeybindingOverride(override, tmpDir)
      expect(saved).toBe(true)

      const raw = await fs.readFile(path.join(tmpDir, '.vscode', 'keybindings.json'), 'utf-8')
      const parsed = JSON.parse(raw)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed[0].key).toBe('Ctrl+K Ctrl+S')
    })
  })
})

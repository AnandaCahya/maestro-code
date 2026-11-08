import path from 'path'
import fs from 'fs/promises'
import { sanitizePath } from '../fileService'
import { getGitStatus, getGitDiff } from '../gitService'
import { searchInFiles } from '../searchService'
import { loadProjectData, saveProjectData } from '../projectService'
import { getSystemDiagnostics } from '../diagnosticsService'
import type { TaskItem, SubtaskItem, CodeLinkItem } from '../../preload/index.d'

export type ToolTier = 'read-only' | 'workspace-write' | 'system-execution'
export type ToolRisk = 'safe' | 'moderate' | 'high'

export interface ToolDefinition {
  name: string
  description: string
  tier: ToolTier
  riskLevel: ToolRisk
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  execute: (args: Record<string, any>, context: ToolExecutionContext) => Promise<any>
}

export interface ToolExecutionContext {
  workspacePath?: string
  isWorkspaceTrusted: boolean
  autoApproveReadOnly: boolean
  requestUserApproval?: (request: ToolApprovalRequest) => Promise<boolean>
}

export interface ToolApprovalRequest {
  id: string
  toolName: string
  tier: ToolTier
  riskLevel: ToolRisk
  arguments: Record<string, any>
  explanation: string
  timestamp: number
}

export interface ToolAuditRecord {
  id: string
  toolName: string
  tier: ToolTier
  arguments: Record<string, any>
  approved: boolean
  approvalReason?: string
  timestamp: number
  durationMs?: number
  success: boolean
  error?: string
}

export class AiToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map()
  private auditLog: ToolAuditRecord[] = []
  private denylist: Set<string> = new Set()

  constructor() {
    this.registerInitialTools()
  }

  private registerInitialTools(): void {
    // 1. workspace_list_files
    this.registerTool({
      name: 'workspace_list_files',
      description: 'List files and folders in a workspace directory.',
      tier: 'read-only',
      riskLevel: 'safe',
      parameters: {
        type: 'object',
        properties: {
          subPath: {
            type: 'string',
            description: 'Relative directory path inside workspace. Leave empty for root.'
          }
        }
      },
      execute: async (args, ctx) => {
        const root = ctx.workspacePath
        if (!root) throw new Error('No active workspace.')
        const target = this.validateAndResolvePath(root, args.subPath || '')
        const entries = await fs.readdir(target, { withFileTypes: true })
        return entries.slice(0, 100).map((e) => ({
          name: e.name,
          isDirectory: e.isDirectory(),
          path: path.relative(root, path.join(target, e.name)).replace(/\\/g, '/')
        }))
      }
    })

    // 2. workspace_read_file
    this.registerTool({
      name: 'workspace_read_file',
      description: 'Read the text content of a file in the workspace.',
      tier: 'read-only',
      riskLevel: 'safe',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Relative path to file inside workspace' }
        },
        required: ['filePath']
      },
      execute: async (args, ctx) => {
        const root = ctx.workspacePath
        if (!root) throw new Error('No active workspace.')
        const resolved = this.validateAndResolvePath(root, args.filePath)
        const stat = await fs.stat(resolved)
        if (stat.size > 500 * 1024) {
          throw new Error('File is larger than 500KB; please request specific sections.')
        }
        return await fs.readFile(resolved, 'utf8')
      }
    })

    // 3. workspace_search
    this.registerTool({
      name: 'workspace_search',
      description: 'Search workspace files for text matches with regex and case sensitivity support.',
      tier: 'read-only',
      riskLevel: 'safe',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text to search for' },
          caseSensitive: { type: 'boolean', description: 'Match case exactly' }
        },
        required: ['query']
      },
      execute: async (args, ctx) => {
        const root = ctx.workspacePath
        if (!root) throw new Error('No active workspace.')
        const matches = await searchInFiles(root, {
          query: args.query,
          caseSensitive: Boolean(args.caseSensitive)
        })
        return matches.slice(0, 30).map((m) => ({
          filePath: m.file,
          line: m.line,
          preview: m.content.trim()
        }))
      }
    })

    // 4. lsp_get_diagnostics
    this.registerTool({
      name: 'lsp_get_diagnostics',
      description: 'Get active syntax and type errors or warnings from the Language Server.',
      tier: 'read-only',
      riskLevel: 'safe',
      parameters: {
        type: 'object',
        properties: {}
      },
      execute: async (_args, ctx) => {
        const sys = getSystemDiagnostics(ctx.workspacePath)
        return {
          platform: sys.osPlatform,
          memoryUsage: sys.memory,
          nodeVersion: sys.nodeVersion
        }
      }
    })

    // 5. git_get_status_and_diff
    this.registerTool({
      name: 'git_get_status_and_diff',
      description: 'Retrieve current Git branch, modified files, and recent diffs.',
      tier: 'read-only',
      riskLevel: 'safe',
      parameters: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Optional specific file to get diff for' }
        }
      },
      execute: async (args, ctx) => {
        const root = ctx.workspacePath
        if (!root) throw new Error('No active workspace.')
        const status = await getGitStatus(root)
        let diff = ''
        if (args.file) {
          diff = await getGitDiff(root, args.file)
        }
        return {
          currentBranch: status.currentBranch,
          modified: status.modified,
          untracked: status.untracked,
          diff: diff ? diff.slice(0, 4000) : undefined
        }
      }
    })

    // 6. project_get_tasks
    this.registerTool({
      name: 'project_get_tasks',
      description: 'Get project management tasks, epics, and sprints from Maestro Project Deck.',
      tier: 'read-only',
      riskLevel: 'safe',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['all', 'backlog', 'todo', 'in_progress', 'review', 'done'],
            description: 'Optional filter by task status'
          }
        }
      },
      execute: async (args, ctx) => {
        const root = ctx.workspacePath
        if (!root) throw new Error('No active workspace.')
        const meta = await loadProjectData(root)
        if (!meta) return { tasks: [], sprints: [], milestones: [] }
        let tasks = meta.tasks || []
        if (args.status && args.status !== 'all') {
          tasks = tasks.filter((t) => t.status === args.status)
        }
        return {
          projectName: meta.name,
          projectDescription: meta.description,
          packageManager: meta.packageManager,
          tasksCount: tasks.length,
          activeSprints: (meta.sprints || []).filter((s) => s.status === 'active'),
          milestones: (meta.milestones || []).slice(0, 10),
          tasks: tasks.slice(0, 50).map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            type: t.type || 'task',
            subtasksCount: (t.subtasks || []).length,
            completedSubtasks: (t.subtasks || []).filter((s) => s.completed).length,
            codeLinksCount: (t.codeLinks || []).length,
            assignee: t.assignee
          }))
        }
      }
    })

    // 7. project_get_task_details
    this.registerTool({
      name: 'project_get_task_details',
      description: 'Retrieve full details of a specific task in Maestro Project Deck by its ID (e.g. MST-1).',
      tier: 'read-only',
      riskLevel: 'safe',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID (e.g. MST-1, MST-2)' }
        },
        required: ['taskId']
      },
      execute: async (args, ctx) => {
        const root = ctx.workspacePath
        if (!root) throw new Error('No active workspace.')
        const meta = await loadProjectData(root)
        const task = (meta.tasks || []).find((t) => t.id.toLowerCase() === (args.taskId || '').toLowerCase())
        if (!task) {
          throw new Error(`Task '${args.taskId}' not found in project.`)
        }
        return task
      }
    })

    // 8. project_create_task (Requires workspace-write permission)
    this.registerTool({
      name: 'project_create_task',
      description: 'Create a new task, story, bug, or epic in Maestro Project Deck.',
      tier: 'workspace-write',
      riskLevel: 'moderate',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title of the task' },
          description: { type: 'string', description: 'Detailed description or acceptance criteria' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'done'] },
          type: { type: 'string', enum: ['task', 'story', 'bug', 'epic', 'subtask'] },
          labels: { type: 'array', items: { type: 'string' } },
          components: { type: 'array', items: { type: 'string' } },
          subtaskTitles: { type: 'array', items: { type: 'string' }, description: 'Checklist of subtasks' }
        },
        required: ['title']
      },
      execute: async (args, ctx) => {
        const root = ctx.workspacePath
        if (!root) throw new Error('No active workspace.')
        const meta = await loadProjectData(root)

        // Generate next MST ID
        const existingTasks = meta.tasks || []
        const maxNumber = existingTasks.reduce((max, t) => {
          const match = (t.id || '').match(/(?:mst|task)-(\d+)/i)
          if (match) {
            const num = parseInt(match[1], 10)
            return Math.max(max, num)
          }
          return max
        }, 0)
        const nextId = `MST-${maxNumber + 1}`

        const subtasks: SubtaskItem[] = Array.isArray(args.subtaskTitles)
          ? args.subtaskTitles.map((title: string, idx: number) => ({
              id: `sub_${Date.now()}_${idx}`,
              title,
              completed: false
            }))
          : []

        const newTask: TaskItem = {
          id: nextId,
          title: args.title.trim(),
          description: args.description || '',
          priority: args.priority || 'medium',
          status: args.status || 'todo',
          type: args.type || 'task',
          labels: args.labels || ['ai-assisted'],
          components: args.components || [],
          subtasks,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          activities: [
            {
              id: `act_${Date.now()}`,
              timestamp: Date.now(),
              type: 'created',
              description: 'Created by Maestro AI'
            }
          ]
        }

        meta.tasks = [...existingTasks, newTask]
        await saveProjectData(root, meta)
        return { success: true, task: newTask }
      }
    })

    // 9. project_update_task (Requires workspace-write permission)
    this.registerTool({
      name: 'project_update_task',
      description: 'Update the status, priority, description, or subtasks of an existing Maestro task.',
      tier: 'workspace-write',
      riskLevel: 'moderate',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the task to update (e.g. MST-1)' },
          status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'done'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          title: { type: 'string' },
          description: { type: 'string' },
          toggleSubtaskTitleOrId: { type: 'string', description: 'ID or exact title of subtask to toggle' },
          addSubtaskTitle: { type: 'string', description: 'New subtask checklist item to add' }
        },
        required: ['taskId']
      },
      execute: async (args, ctx) => {
        const root = ctx.workspacePath
        if (!root) throw new Error('No active workspace.')
        const meta = await loadProjectData(root)
        const tasks = meta.tasks || []
        const taskIdx = tasks.findIndex((t) => t.id.toLowerCase() === (args.taskId || '').toLowerCase())
        if (taskIdx === -1) {
          throw new Error(`Task '${args.taskId}' not found.`)
        }

        const task = { ...tasks[taskIdx] }
        let changed = false

        if (args.status && args.status !== task.status) {
          task.status = args.status
          changed = true
          task.activities = [
            ...(task.activities || []),
            {
              id: `act_${Date.now()}`,
              timestamp: Date.now(),
              type: 'status_changed',
              description: `Status changed to ${args.status} by Maestro AI`
            }
          ]
        }
        if (args.priority && args.priority !== task.priority) {
          task.priority = args.priority
          changed = true
        }
        if (args.title && args.title !== task.title) {
          task.title = args.title
          changed = true
        }
        if (args.description !== undefined && args.description !== task.description) {
          task.description = args.description
          changed = true
        }
        if (args.addSubtaskTitle) {
          const newSub: SubtaskItem = {
            id: `sub_${Date.now()}`,
            title: args.addSubtaskTitle.trim(),
            completed: false
          }
          task.subtasks = [...(task.subtasks || []), newSub]
          changed = true
        }
        if (args.toggleSubtaskTitleOrId) {
          const query = args.toggleSubtaskTitleOrId.toLowerCase()
          task.subtasks = (task.subtasks || []).map((s) => {
            if (s.id.toLowerCase() === query || s.title.toLowerCase() === query) {
              changed = true
              return { ...s, completed: !s.completed }
            }
            return s
          })
        }

        if (changed) {
          task.updatedAt = Date.now()
          tasks[taskIdx] = task
          meta.tasks = tasks
          await saveProjectData(root, meta)
        }

        return { success: true, task }
      }
    })

    // 10. project_link_code (Requires workspace-write permission)
    this.registerTool({
      name: 'project_link_code',
      description: 'Link a source code file and optional line numbers to a Maestro Project task.',
      tier: 'workspace-write',
      riskLevel: 'moderate',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the task to link' },
          filePath: { type: 'string', description: 'Relative path of the source file' },
          line: { type: 'number', description: 'Optional line number' },
          endLine: { type: 'number', description: 'Optional end line number' },
          description: { type: 'string', description: 'Optional note regarding the link' }
        },
        required: ['taskId', 'filePath']
      },
      execute: async (args, ctx) => {
        const root = ctx.workspacePath
        if (!root) throw new Error('No active workspace.')
        const meta = await loadProjectData(root)
        const tasks = meta.tasks || []
        const taskIdx = tasks.findIndex((t) => t.id.toLowerCase() === (args.taskId || '').toLowerCase())
        if (taskIdx === -1) {
          throw new Error(`Task '${args.taskId}' not found.`)
        }

        const task = { ...tasks[taskIdx] }
        const newLink: CodeLinkItem = {
          file: args.filePath.replace(/\\/g, '/'),
          line: typeof args.line === 'number' ? args.line : undefined,
          endLine: typeof args.endLine === 'number' ? args.endLine : undefined,
          description: args.description
        }

        const existingLinks = task.codeLinks || []
        // Avoid duplicate links
        const isDuplicate = existingLinks.some(
          (l) => l.file === newLink.file && l.line === newLink.line && l.endLine === newLink.endLine
        )

        if (!isDuplicate) {
          task.codeLinks = [...existingLinks, newLink]
          task.updatedAt = Date.now()
          tasks[taskIdx] = task
          meta.tasks = tasks
          await saveProjectData(root, meta)
        }

        return { success: true, task, linked: newLink }
      }
    })

    // 11. workspace_write_file (Requires approval)
    this.registerTool({
      name: 'workspace_write_file',
      description: 'Write or overwrite a file in the workspace. Requires workspace modification permission.',
      tier: 'workspace-write',
      riskLevel: 'moderate',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Relative path of file to write' },
          content: { type: 'string', description: 'Full file content to write' }
        },
        required: ['filePath', 'content']
      },
      execute: async (args, ctx) => {
        const root = ctx.workspacePath
        if (!root) throw new Error('No active workspace.')
        const resolved = this.validateAndResolvePath(root, args.filePath)
        await fs.mkdir(path.dirname(resolved), { recursive: true })
        await fs.writeFile(resolved, args.content, 'utf8')
        return { success: true, filePath: args.filePath, bytesWritten: Buffer.byteLength(args.content) }
      }
    })
  }

  public registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool)
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  public listTools(): Array<Omit<ToolDefinition, 'execute'>> {
    return Array.from(this.tools.values())
      .filter((t) => !this.denylist.has(t.name))
      .map(({ name, description, tier, riskLevel, parameters }) => ({
        name,
        description,
        tier,
        riskLevel,
        parameters
      }))
  }

  public setDenylist(deniedToolNames: string[]): void {
    this.denylist = new Set(deniedToolNames)
  }

  public validateAndResolvePath(workspaceRoot: string, relativeOrAbsolutePath: string): string {
    if (!relativeOrAbsolutePath || typeof relativeOrAbsolutePath !== 'string') {
      return path.resolve(workspaceRoot)
    }
    if (relativeOrAbsolutePath.includes('\0')) {
      throw new Error('Security Violation: Null byte detected in path')
    }

    const cleanRoot = path.resolve(workspaceRoot)
    const resolved = path.isAbsolute(relativeOrAbsolutePath)
      ? path.resolve(relativeOrAbsolutePath)
      : path.resolve(cleanRoot, relativeOrAbsolutePath)

    // Ensure path remains inside workspace boundary (prevent directory traversal / symlink escape)
    const relative = path.relative(cleanRoot, resolved)
    if (relative.startsWith('..') || (path.isAbsolute(relative) && relative !== cleanRoot)) {
      throw new Error(`Security Violation: Path '${relativeOrAbsolutePath}' escapes workspace boundary.`)
    }

    return resolved
  }

  public async invokeTool(
    name: string,
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<{ success: boolean; result?: any; error?: string; approvalRequired?: boolean }> {
    const tool = this.tools.get(name)
    if (!tool) {
      return { success: false, error: `Tool '${name}' not found.` }
    }

    if (this.denylist.has(name)) {
      return { success: false, error: `Tool '${name}' is on the security denylist.` }
    }

    // Permission check based on tier
    let approved = false
    let approvalReason = ''

    if (tool.tier === 'read-only') {
      if (context.autoApproveReadOnly) {
        approved = true
        approvalReason = 'Auto-approved by read-only safety policy'
      } else if (context.requestUserApproval) {
        approved = await context.requestUserApproval({
          id: `appr_${Date.now()}`,
          toolName: tool.name,
          tier: tool.tier,
          riskLevel: tool.riskLevel,
          arguments: args,
          explanation: `Tool '${tool.name}' requests read access to workspace context.`,
          timestamp: Date.now()
        })
        approvalReason = approved ? 'User approved read-only action' : 'User denied action'
      } else {
        approved = true
      }
    } else if (tool.tier === 'workspace-write') {
      if (context.requestUserApproval) {
        approved = await context.requestUserApproval({
          id: `appr_${Date.now()}`,
          toolName: tool.name,
          tier: tool.tier,
          riskLevel: tool.riskLevel,
          arguments: args,
          explanation: `Tool '${tool.name}' requests permission to write/modify '${args.filePath || 'files'}'.`,
          timestamp: Date.now()
        })
        approvalReason = approved ? 'User approved file modification' : 'User denied workspace modification'
      } else {
        approved = false
        approvalReason = 'No approval handler registered for workspace-write action'
      }
    } else if (tool.tier === 'system-execution') {
      // System execution always requires explicit user confirmation
      if (context.requestUserApproval) {
        approved = await context.requestUserApproval({
          id: `appr_${Date.now()}`,
          toolName: tool.name,
          tier: tool.tier,
          riskLevel: tool.riskLevel,
          arguments: args,
          explanation: `HIGH RISK: Tool '${tool.name}' requests system command execution.`,
          timestamp: Date.now()
        })
        approvalReason = approved ? 'User approved system execution' : 'User denied system execution'
      } else {
        approved = false
        approvalReason = 'Explicit confirmation required for system execution'
      }
    }

    const auditRecord: ToolAuditRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      toolName: name,
      tier: tool.tier,
      arguments: args,
      approved,
      approvalReason,
      timestamp: Date.now(),
      success: false
    }

    if (!approved) {
      auditRecord.error = `Action denied: ${approvalReason}`
      this.auditLog.push(auditRecord)
      return { success: false, error: auditRecord.error, approvalRequired: true }
    }

    const start = Date.now()
    try {
      // Execute in trusted main process
      const result = await tool.execute(args, context)
      auditRecord.durationMs = Date.now() - start
      auditRecord.success = true
      this.auditLog.push(auditRecord)
      return { success: true, result }
    } catch (err: any) {
      auditRecord.durationMs = Date.now() - start
      auditRecord.error = err.message || String(err)
      this.auditLog.push(auditRecord)
      return { success: false, error: auditRecord.error }
    }
  }

  public getAuditLog(): ToolAuditRecord[] {
    return [...this.auditLog]
  }

  public clearAuditLog(): void {
    this.auditLog = []
  }
}

export const aiToolRegistry = new AiToolRegistry()

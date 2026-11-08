import type { AgentRoleProfile, OrchestrationTask } from './aiOrchestrationEngine'
import { aiToolRegistry, type ToolDefinition } from './aiToolRegistry'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'planning' | 'development' | 'quality' | 'operations' | 'security'
  roles: string[]
  stages: Array<{
    id: string
    name: string
    assignedRoleId: string
    requireApproval: boolean
  }>
  version: string
}

export interface McpServerConfig {
  id: string
  name: string
  command?: string
  args?: string[]
  url?: string
  enabled: boolean
}

export class AiWorkflowService {
  private templates: Map<string, WorkflowTemplate> = new Map()
  private mcpServers: Map<string, McpServerConfig> = new Map()

  constructor() {
    this.registerBuiltinTemplates()
  }

  private registerBuiltinTemplates(): void {
    const builtins: WorkflowTemplate[] = [
      {
        id: 'feature_development',
        name: 'Feature Development',
        description: 'End-to-end feature specification, architecture design, coding, and QA verification',
        category: 'development',
        roles: ['orchestrator', 'software_architect', 'backend_developer', 'frontend_developer', 'qa_engineer'],
        stages: [
          { id: 'spec', name: 'Requirement Specification', assignedRoleId: 'orchestrator', requireApproval: true },
          { id: 'arch', name: 'Architecture & Contracts', assignedRoleId: 'software_architect', requireApproval: false },
          { id: 'impl_backend', name: 'Backend Services', assignedRoleId: 'backend_developer', requireApproval: true },
          { id: 'impl_frontend', name: 'Frontend Components', assignedRoleId: 'frontend_developer', requireApproval: true },
          { id: 'qa', name: 'Automated Vitest Verification', assignedRoleId: 'qa_engineer', requireApproval: true }
        ],
        version: '1.0.0'
      },
      {
        id: 'bug_investigation',
        name: 'Bug Investigation & Resolution',
        description: 'Reproduce bug, perform root-cause analysis, generate minimal patch, and add regression test',
        category: 'quality',
        roles: ['qa_engineer', 'backend_developer', 'code_reviewer'],
        stages: [
          { id: 'repro', name: 'Reproduction & Diagnostic Log', assignedRoleId: 'qa_engineer', requireApproval: false },
          { id: 'patch', name: 'Propose Minimal Patch', assignedRoleId: 'backend_developer', requireApproval: true },
          { id: 'verify', name: 'Verify Regression Test Suite', assignedRoleId: 'qa_engineer', requireApproval: true }
        ],
        version: '1.0.0'
      },
      {
        id: 'security_review',
        name: 'Security & Secrets Audit',
        description: 'Comprehensive OWASP check, secrets leak scanning, and path traversal boundary audit',
        category: 'security',
        roles: ['security_engineer', 'code_reviewer'],
        stages: [
          { id: 'secrets', name: 'Secret & Credential Scrubbing', assignedRoleId: 'security_engineer', requireApproval: false },
          { id: 'boundary', name: 'Path Traversal & Boundary Audit', assignedRoleId: 'security_engineer', requireApproval: true },
          { id: 'signoff', name: 'Final Security Report', assignedRoleId: 'security_engineer', requireApproval: true }
        ],
        version: '1.0.0'
      },
      {
        id: 'product_planning',
        name: 'Product & Sprint Planning',
        description: 'Requirement discovery, story breakdown, and acceptance criteria generation',
        category: 'planning',
        roles: ['product_owner', 'software_architect'],
        stages: [
          { id: 'discovery', name: 'Scope & User Stories', assignedRoleId: 'product_owner', requireApproval: true },
          { id: 'breakdown', name: 'Technical Task Breakdown', assignedRoleId: 'software_architect', requireApproval: true }
        ],
        version: '1.0.0'
      },
      {
        id: 'refactoring',
        name: 'System Refactoring & Modernization',
        description: 'Refactor complex modules to clean architecture while preserving 100% test pass rate',
        category: 'development',
        roles: ['software_architect', 'code_reviewer', 'qa_engineer'],
        stages: [
          { id: 'audit', name: 'Code Smell Analysis', assignedRoleId: 'code_reviewer', requireApproval: false },
          { id: 'refactor', name: 'Modular Refactoring', assignedRoleId: 'software_architect', requireApproval: true },
          { id: 'regression', name: 'Regression Invariance Check', assignedRoleId: 'qa_engineer', requireApproval: true }
        ],
        version: '1.0.0'
      }
    ]

    for (const t of builtins) {
      this.templates.set(t.id, t)
    }
  }

  public listTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values())
  }

  public getTemplate(id: string): WorkflowTemplate | undefined {
    return this.templates.get(id)
  }

  public validateTemplate(t: WorkflowTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!t.id || typeof t.id !== 'string') errors.push('Template ID is required.')
    if (!t.name || typeof t.name !== 'string') errors.push('Template name is required.')
    if (!Array.isArray(t.roles) || t.roles.length === 0) errors.push('Template must have at least one role.')
    if (!Array.isArray(t.stages) || t.stages.length === 0) errors.push('Template must define at least one stage.')

    const stageIds = new Set<string>()
    for (const stage of t.stages || []) {
      if (stageIds.has(stage.id)) {
        errors.push(`Duplicate stage ID: ${stage.id}`)
      }
      stageIds.add(stage.id)
      if (!t.roles.includes(stage.assignedRoleId)) {
        errors.push(`Stage '${stage.name}' assigns unknown role '${stage.assignedRoleId}' not declared in roles list.`)
      }
    }

    return { valid: errors.length === 0, errors }
  }

  public registerCustomTemplate(template: WorkflowTemplate): { ok: boolean; errors?: string[] } {
    const validation = this.validateTemplate(template)
    if (!validation.valid) {
      return { ok: false, errors: validation.errors }
    }
    this.templates.set(template.id, template)
    return { ok: true }
  }

  // MCP Server Integration
  public listMcpServers(): McpServerConfig[] {
    return Array.from(this.mcpServers.values())
  }

  public configureMcpServer(config: McpServerConfig): void {
    this.mcpServers.set(config.id, config)
  }

  public removeMcpServer(id: string): boolean {
    return this.mcpServers.delete(id)
  }

  public registerMcpTool(
    serverId: string,
    toolName: string,
    description: string,
    parameters: any,
    handler: (params: any) => Promise<any>
  ): void {
    const server = this.mcpServers.get(serverId)
    if (!server || !server.enabled) return

    // Register into Maestro Tool Registry with safe defaults and explicit origin tag
    const qualifiedName = `mcp_${serverId}_${toolName}`
    aiToolRegistry.registerTool({
      name: qualifiedName,
      description: `[MCP: ${server.name}] ${description}`,
      tier: 'workspace-write', // Safe default for external tools
      riskLevel: 'moderate',
      parameters,
      execute: async (args, ctx) => {
        return await handler(args)
      }
    })
  }

  // Project Management Task Proposal Generator
  public generatePmTasksFromPlan(tasks: OrchestrationTask[]): Array<{
    id: string
    title: string
    description: string
    status: 'todo' | 'in_progress' | 'done'
    priority: 'low' | 'medium' | 'high'
  }> {
    return tasks.map((t, index) => ({
      id: `task-ai-${Date.now()}-${index + 1}`,
      title: t.title,
      description: `[Assigned Role: ${t.assignedRoleId}]\n${t.description}`,
      status: t.status === 'completed' ? 'done' : t.status === 'running' ? 'in_progress' : 'todo',
      priority: index === 0 ? 'high' : 'medium'
    }))
  }
}

export const aiWorkflowService = new AiWorkflowService()

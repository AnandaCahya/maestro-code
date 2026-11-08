import { describe, it, expect } from 'vitest'
import { AiWorkflowService, type WorkflowTemplate } from '../src/main/services/ai/aiWorkflowService'
import { aiToolRegistry } from '../src/main/services/ai/aiToolRegistry'

describe('AI Workflow Service & Integrations', () => {
  const service = new AiWorkflowService()

  it('provides built-in workflow templates for standard software engineering cycles', () => {
    const list = service.listTemplates()
    expect(list.length).toBeGreaterThanOrEqual(5)

    const featureDev = service.getTemplate('feature_development')
    expect(featureDev).toBeDefined()
    expect(featureDev?.category).toBe('development')
    expect(featureDev?.stages.length).toBeGreaterThanOrEqual(4)

    const secReview = service.getTemplate('security_review')
    expect(secReview).toBeDefined()
    expect(secReview?.roles).toContain('security_engineer')
  })

  it('validates workflow templates and reports structural errors', () => {
    const invalidTemplate: WorkflowTemplate = {
      id: '',
      name: 'Broken Workflow',
      description: 'Missing roles and broken stages',
      category: 'development',
      roles: [],
      stages: [
        { id: 's1', name: 'Step 1', assignedRoleId: 'ghost_role', requireApproval: false },
        { id: 's1', name: 'Step 2 (Duplicate ID)', assignedRoleId: 'ghost_role', requireApproval: false }
      ],
      version: '1.0.0'
    }

    const val = service.validateTemplate(invalidTemplate)
    expect(val.valid).toBe(false)
    expect(val.errors.length).toBeGreaterThanOrEqual(3)
    expect(val.errors.some((e) => e.includes('Duplicate stage ID'))).toBe(true)
    expect(val.errors.some((e) => e.includes('ghost_role'))).toBe(true)
  })

  it('registers and stores valid custom workflow templates', () => {
    const validCustom: WorkflowTemplate = {
      id: 'custom_ci_cd',
      name: 'CI/CD Pipeline Setup',
      description: 'Setup GitHub Actions and linting rules',
      category: 'operations',
      roles: ['devops_engineer', 'code_reviewer'],
      stages: [
        { id: 'step_1', name: 'Write Workflow YAML', assignedRoleId: 'devops_engineer', requireApproval: true },
        { id: 'step_2', name: 'Review Workflow Security', assignedRoleId: 'code_reviewer', requireApproval: true }
      ],
      version: '1.0.0'
    }

    const reg = service.registerCustomTemplate(validCustom)
    expect(reg.ok).toBe(true)

    const retrieved = service.getTemplate('custom_ci_cd')
    expect(retrieved).toBeDefined()
    expect(retrieved?.name).toBe('CI/CD Pipeline Setup')
  })

  it('manages MCP servers and bridges MCP tools into Maestro Tool Registry with permissions', () => {
    service.configureMcpServer({
      id: 'sqlite_mcp',
      name: 'SQLite Database Server',
      enabled: true
    })

    const servers = service.listMcpServers()
    expect(servers.some((s) => s.id === 'sqlite_mcp')).toBe(true)

    // Bridge an MCP tool
    service.registerMcpTool(
      'sqlite_mcp',
      'query_db',
      'Execute SQL query',
      { type: 'object', properties: { sql: { type: 'string' } } },
      async (params) => ({ rows: [`Result of ${params.sql}`] })
    )

    const tool = aiToolRegistry.getTool('mcp_sqlite_mcp_query_db')
    expect(tool).toBeDefined()
    expect(tool?.description).toContain('[MCP: SQLite Database Server]')
    expect(tool?.tier).toBe('workspace-write')
  })

  it('converts orchestration task graph to Maestro Project Management tasks', () => {
    const tasks = [
      {
        id: 'task_1',
        title: 'Create Auth Controller',
        description: 'Implement JWT login endpoint',
        assignedRoleId: 'backend_developer',
        status: 'pending' as const,
        dependencies: []
      },
      {
        id: 'task_2',
        title: 'Create Login Form',
        description: 'Build React component',
        assignedRoleId: 'frontend_developer',
        status: 'running' as const,
        dependencies: ['task_1']
      }
    ]

    const pmTasks = service.generatePmTasksFromPlan(tasks)
    expect(pmTasks).toHaveLength(2)
    expect(pmTasks[0].title).toBe('Create Auth Controller')
    expect(pmTasks[0].description).toContain('[Assigned Role: backend_developer]')
    expect(pmTasks[1].status).toBe('in_progress')
  })
})

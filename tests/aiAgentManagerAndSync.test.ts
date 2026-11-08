import { describe, it, expect, beforeEach } from 'vitest'
import { aiOrchestrationEngine } from '../src/main/services/ai/aiOrchestrationEngine'
import { aiToolRegistry } from '../src/main/services/ai/aiToolRegistry'
import { aiWorkflowService } from '../src/main/services/ai/aiWorkflowService'

describe('AI Agent Manager & Project Management Sync', () => {
  beforeEach(() => {
    aiToolRegistry.clearAuditLog()
  })

  it('manages software house role profiles with comprehensive coverage analysis', () => {
    const roles = aiOrchestrationEngine.listRoleTemplates()
    expect(roles.length).toBeGreaterThanOrEqual(8)

    const orchestrator = roles.find((r) => r.id === 'orchestrator')
    const architect = roles.find((r) => r.id === 'software_architect')
    const frontend = roles.find((r) => r.id === 'frontend_developer')
    const backend = roles.find((r) => r.id === 'backend_developer')
    const qa = roles.find((r) => r.id === 'qa_engineer')
    const sec = roles.find((r) => r.id === 'security_engineer')

    expect(orchestrator).toBeDefined()
    expect(architect).toBeDefined()
    expect(frontend).toBeDefined()
    expect(backend).toBeDefined()
    expect(qa).toBeDefined()
    expect(sec).toBeDefined()

    // Test coverage analyzer on full-stack web app request
    const coverage = aiOrchestrationEngine.analyzeRoleCoverage('Build fullstack authentication page with REST API')
    expect(coverage.requiredRoles.some((r) => r.id === 'frontend_developer')).toBe(true)
    expect(coverage.requiredRoles.some((r) => r.id === 'backend_developer')).toBe(true)
    expect(coverage.recommendedRoles.some((r) => r.id === 'qa_engineer')).toBe(true)
  })

  it('generates multi-stage task graph with dependency links and stage tracking', () => {
    const session = aiOrchestrationEngine.createSession('Implement user profile dashboard with database api')
    expect(session.stage).toBe('discovery')
    expect(session.approvalGates.planApproved).toBe(false)

    const tasks = aiOrchestrationEngine.generatePlan(session)
    expect(tasks.length).toBeGreaterThanOrEqual(3)
    expect(session.stage).toBe('planning')

    // First task should have no dependencies
    expect(tasks[0].dependencies).toEqual([])

    // Subsequent tasks should have dependencies
    const backendTask = tasks.find((t) => t.assignedRoleId === 'backend_developer')
    const frontendTask = tasks.find((t) => t.assignedRoleId === 'frontend_developer')
    if (backendTask && frontendTask) {
      expect(frontendTask.dependencies).toContain(backendTask.id)
    }

    // Task status updates
    aiOrchestrationEngine.updateTaskStatus(session.id, tasks[0].id, 'completed', 'Architecture verified')
    const updated = aiOrchestrationEngine.getSession(session.id)
    expect(updated?.tasks[0].status).toBe('completed')
    expect(updated?.tasks[0].resultSummary).toBe('Architecture verified')

    // Approval gates
    expect(aiOrchestrationEngine.approveGate(session.id, 'planApproved')).toBe(true)
    expect(session.approvalGates.planApproved).toBe(true)
    expect(session.stage).toBe('execution')

    expect(aiOrchestrationEngine.approveGate(session.id, 'executionApproved')).toBe(true)
    expect(session.approvalGates.executionApproved).toBe(true)
    expect(session.stage).toBe('completed')
  })

  it('records, inspects, and clears tool execution audit log entries', async () => {
    aiToolRegistry.registerTool({
      name: 'test_audit_tool',
      description: 'Tool for testing audit log',
      tier: 'workspace-write',
      riskLevel: 'low',
      parameters: {},
      execute: async (args) => ({ echo: args })
    })

    // Execute with autoApproveReadOnly: false for workspace-write tool (should require approval)
    const res = await aiToolRegistry.invokeTool('test_audit_tool', { foo: 'bar' }, { isWorkspaceTrusted: false })
    expect(res.approvalRequired).toBe(true)

    const log1 = aiToolRegistry.getAuditLog()
    expect(log1.length).toBe(1)
    expect(log1[0].toolName).toBe('test_audit_tool')
    expect(log1[0].tier).toBe('workspace-write')
    expect(log1[0].approved).toBe(false)
    expect(log1[0].success).toBe(false)

    // Execute with requestUserApproval returning true
    const res2 = await aiToolRegistry.invokeTool(
      'test_audit_tool',
      { hello: 'world' },
      { requestUserApproval: async () => true }
    )
    expect(res2.success).toBe(true)

    const log2 = aiToolRegistry.getAuditLog()
    expect(log2.length).toBe(2)
    expect(log2[1].approved).toBe(true)
    expect(log2[1].success).toBe(true)

    // Clear audit log
    aiToolRegistry.clearAuditLog()
    expect(aiToolRegistry.getAuditLog()).toHaveLength(0)
  })

  it('generates project management tasks from orchestration plan without duplicating existing features', () => {
    const session = aiOrchestrationEngine.createSession('Design user settings page')
    const tasks = aiOrchestrationEngine.generatePlan(session)
    const pmTasks = aiWorkflowService.generatePmTasksFromPlan(tasks)

    expect(pmTasks.length).toBe(tasks.length)
    pmTasks.forEach((pmTask, idx) => {
      expect(pmTask.id).toMatch(/^task-ai-/)
      expect(pmTask.title).toBe(tasks[idx].title)
      expect(pmTask.description).toContain(`[Assigned Role: ${tasks[idx].assignedRoleId}]`)
      expect(['todo', 'in_progress', 'done']).toContain(pmTask.status)
      expect(['low', 'medium', 'high']).toContain(pmTask.priority)
    })
  })
})

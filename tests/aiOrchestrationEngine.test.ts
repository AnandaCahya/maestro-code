import { describe, it, expect } from 'vitest'
import { AiOrchestrationEngine } from '../src/main/services/ai/aiOrchestrationEngine'

describe('AI Orchestration Engine', () => {
  const engine = new AiOrchestrationEngine()

  it('provides built-in Software House role templates', () => {
    const roles = engine.listRoleTemplates()
    expect(roles.length).toBeGreaterThanOrEqual(7)

    const orch = engine.getRoleTemplate('orchestrator')
    expect(orch).toBeDefined()
    expect(orch?.title).toContain('Orchestrator')

    const fe = engine.getRoleTemplate('frontend_developer')
    expect(fe).toBeDefined()
    expect(fe?.responsibilities.length).toBeGreaterThan(0)

    const qa = engine.getRoleTemplate('qa_engineer')
    expect(qa).toBeDefined()
    expect(qa?.expertise).toContain('Vitest')
  })

  it('analyzes role coverage based on user goal', () => {
    const uiGoal = 'Build a responsive dark mode settings modal with Tailwind CSS'
    const coverageUI = engine.analyzeRoleCoverage(uiGoal)

    expect(coverageUI.requiredRoles.some((r) => r.id === 'frontend_developer')).toBe(true)
    expect(coverageUI.recommendedRoles.some((r) => r.id === 'qa_engineer')).toBe(true)

    const apiGoal = 'Create a secure OAuth2 authentication service and token encryption'
    const coverageAuth = engine.analyzeRoleCoverage(apiGoal)
    expect(coverageAuth.requiredRoles.some((r) => r.id === 'backend_developer')).toBe(true)
    expect(coverageAuth.requiredRoles.some((r) => r.id === 'security_engineer')).toBe(true)
  })

  it('creates orchestration sessions and generates dependency-aware task graphs', () => {
    const session = engine.createSession('Build user profile page and backend endpoint with unit tests')
    expect(session.id).toBeDefined()
    expect(session.stage).toBe('discovery')

    const tasks = engine.generatePlan(session)
    expect(tasks.length).toBeGreaterThanOrEqual(3)

    // First task should be architecture contract
    expect(tasks[0].assignedRoleId).toBe('orchestrator')

    // Subsequent tasks depend on earlier tasks
    const dependentTask = tasks.find((t) => t.dependencies.length > 0)
    expect(dependentTask).toBeDefined()

    // Artifact created
    expect(session.artifacts).toHaveLength(1)
    expect(session.artifacts[0].type).toBe('plan')
  })

  it('enforces validation approval gates before moving to execution', () => {
    const session = engine.createSession('Refactor file service')
    engine.generatePlan(session)

    expect(session.stage).toBe('planning')
    expect(session.approvalGates.planApproved).toBe(false)

    // Approve plan gate
    const approved = engine.approveGate(session.id, 'planApproved')
    expect(approved).toBe(true)
    expect(session.stage).toBe('execution')
    expect(session.approvalGates.planApproved).toBe(true)

    // Update task status
    const firstTaskId = session.tasks[0].id
    engine.updateTaskStatus(session.id, firstTaskId, 'completed', 'Architecture contracts validated')
    expect(session.tasks[0].status).toBe('completed')
    expect(session.tasks[0].resultSummary).toBe('Architecture contracts validated')
  })
})

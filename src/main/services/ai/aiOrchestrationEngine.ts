export interface AgentRoleProfile {
  id: string
  name: string
  title: string
  avatar: string
  description: string
  responsibilities: string[]
  expertise: string[]
  systemInstructions: string
  allowedTools: string[]
  prohibitedActions?: string[]
  scope: 'global' | 'workspace'
  providerId?: string
  modelId?: string
}

export interface OrchestrationTask {
  id: string
  title: string
  description: string
  assignedRoleId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked'
  dependencies: string[]
  affectedFiles?: string[]
  resultSummary?: string
  error?: string
}

export type OrchestrationStage =
  | 'discovery'
  | 'planning'
  | 'role-confirmation'
  | 'execution'
  | 'verification'
  | 'completed'
  | 'paused'
  | 'failed'

export interface OrchestrationArtifact {
  id: string
  type: 'requirement-brief' | 'plan' | 'architecture-adr' | 'code-diff' | 'test-report'
  title: string
  content: string
  createdAt: number
}

export interface OrchestrationSession {
  id: string
  goal: string
  stage: OrchestrationStage
  orchestratorRoleId: string
  activeRoles: AgentRoleProfile[]
  tasks: OrchestrationTask[]
  artifacts: OrchestrationArtifact[]
  approvalGates: {
    requirementsApproved: boolean
    teamCompositionApproved: boolean
    planApproved: boolean
    executionApproved: boolean
  }
  clarifyingQuestions?: string[]
  createdAt: number
  updatedAt: number
}

export const BUILTIN_ROLE_TEMPLATES: AgentRoleProfile[] = [
  {
    id: 'orchestrator',
    name: 'Maestro Orchestrator',
    title: 'Lead Architect & Project Orchestrator',
    avatar: '🎯',
    description: 'Coordinates multi-agent workflows, requirement breakdown, and validation gates',
    responsibilities: [
      'Decompose high-level requests into dependency-aware task graphs',
      'Assign specialized tasks to domain agents',
      'Monitor status, resolve blockers, and enforce safety boundaries',
      'Conduct final integration verification'
    ],
    expertise: ['System Architecture', 'Task Scheduling', 'Handoff Contracts', 'Workflow Governance'],
    systemInstructions:
      'You are the Lead Software Architect and Orchestrator. Guide the implementation strictly through distinct phases: discovery, planning, delegation, execution, and verification.',
    allowedTools: ['workspace_list_files', 'workspace_search', 'lsp_get_diagnostics', 'git_get_status_and_diff'],
    scope: 'global'
  },
  {
    id: 'product_owner',
    name: 'Elena Vance',
    title: 'Product Owner & Business Analyst',
    avatar: '📋',
    description: 'Defines user stories, acceptance criteria, and scopes constraints',
    responsibilities: ['Clarify requirements', 'Define acceptance criteria', 'Identify scope boundaries'],
    expertise: ['Requirements Engineering', 'Acceptance Testing', 'Domain Modeling'],
    systemInstructions:
      'You are the Product Owner. Clarify ambiguity and specify clear, testable acceptance criteria.',
    allowedTools: ['workspace_list_files', 'project_get_tasks'],
    scope: 'global'
  },
  {
    id: 'software_architect',
    name: 'Marcus Chen',
    title: 'Software Architect',
    avatar: '🏛️',
    description: 'Designs modular software architecture, contracts, and ADRs',
    responsibilities: ['Define module contracts and data models', 'Assess technical debt', 'Draft ADRs'],
    expertise: ['Clean Architecture', 'API Design', 'Design Patterns'],
    systemInstructions: 'You are the Software Architect. Maintain modularity, clean boundaries, and idiomatic typing.',
    allowedTools: ['workspace_list_files', 'workspace_search'],
    scope: 'global'
  },
  {
    id: 'frontend_developer',
    name: 'Aria Song',
    title: 'Senior Frontend Developer',
    avatar: '🎨',
    description: 'Implements accessible, responsive UI with React and Tailwind CSS',
    responsibilities: ['Build UI components', 'Manage state flows', 'Ensure WCAG accessibility'],
    expertise: ['React 19', 'Tailwind CSS', 'TypeScript', 'Responsive Design'],
    systemInstructions:
      'You are the Frontend Developer. Build clean, ergonomic UI components following project styling rules and accessibility standards.',
    allowedTools: ['workspace_read_file', 'workspace_list_files', 'workspace_write_file'],
    scope: 'global'
  },
  {
    id: 'backend_developer',
    name: 'David Keller',
    title: 'Senior Backend Developer',
    avatar: '⚙️',
    description: 'Develops robust APIs, services, and system business logic',
    responsibilities: ['Implement services and controllers', 'Data validation and error handling'],
    expertise: ['Node.js', 'TypeScript', 'Concurrency', 'Security'],
    systemInstructions: 'You are the Backend Developer. Implement robust, secure, and performant backend logic.',
    allowedTools: ['workspace_read_file', 'workspace_list_files', 'workspace_write_file'],
    scope: 'global'
  },
  {
    id: 'qa_engineer',
    name: 'Maya Lin',
    title: 'QA & Test Automation Engineer',
    avatar: '🧪',
    description: 'Authors unit tests, edge-case validations, and verifies test suites',
    responsibilities: ['Write unit & integration tests', 'Identify regressions and boundary failures'],
    expertise: ['Vitest', 'Jest', 'TDD', 'Edge Case Analysis'],
    systemInstructions: 'You are the QA Engineer. Author comprehensive tests and verify standard adherence.',
    allowedTools: ['workspace_read_file', 'workspace_list_files', 'workspace_write_file', 'lsp_get_diagnostics'],
    scope: 'global'
  },
  {
    id: 'security_engineer',
    name: 'Cipher Vance',
    title: 'Security & Privacy Engineer',
    avatar: '🛡️',
    description: 'Audits code for vulnerabilities, path traversal, injection, and credential leaks',
    responsibilities: ['Security review', 'Secrets scrubbing', 'Input sanitization verification'],
    expertise: ['OWASP Top 10', 'Path Traversal Prevention', 'Secrets Auditing'],
    systemInstructions: 'You are the Security Engineer. Identify potential attack vectors, secret exposures, and injection risks.',
    allowedTools: ['workspace_read_file', 'workspace_search'],
    scope: 'global'
  },
  {
    id: 'code_reviewer',
    name: 'Sophia Sterling',
    title: 'Principal Code Reviewer',
    avatar: '🧐',
    description: 'Evaluates readability, idiomatic style, maintainability, and efficiency',
    responsibilities: ['Code quality audit', 'Style conformance', 'Performance checks'],
    expertise: ['Code Smells', 'Refactoring', 'Type Safety'],
    systemInstructions: 'You are the Code Reviewer. Ensure all changes meet elite software craft standards.',
    allowedTools: ['workspace_read_file', 'git_get_status_and_diff'],
    scope: 'global'
  }
]

export class AiOrchestrationEngine {
  private roleTemplates: Map<string, AgentRoleProfile> = new Map()
  private activeSessions: Map<string, OrchestrationSession> = new Map()

  constructor() {
    for (const r of BUILTIN_ROLE_TEMPLATES) {
      this.roleTemplates.set(r.id, r)
    }
  }

  public listRoleTemplates(): AgentRoleProfile[] {
    return Array.from(this.roleTemplates.values())
  }

  public getRoleTemplate(id: string): AgentRoleProfile | undefined {
    return this.roleTemplates.get(id)
  }

  public registerRoleTemplate(role: AgentRoleProfile): void {
    this.roleTemplates.set(role.id, role)
  }

  public analyzeRoleCoverage(goal: string): {
    requiredRoles: AgentRoleProfile[]
    recommendedRoles: AgentRoleProfile[]
    missingRoles: AgentRoleProfile[]
    warnings: string[]
  } {
    const text = goal.toLowerCase()
    const requiredIds = new Set<string>(['orchestrator'])
    const recommendedIds = new Set<string>()
    const warnings: string[] = []

    if (/ui|frontend|component|page|css|tailwind|button|view|style/i.test(text)) {
      requiredIds.add('frontend_developer')
    }
    if (/api|backend|service|server|database|endpoint|controller|route/i.test(text)) {
      requiredIds.add('backend_developer')
    }
    if (/test|vitest|jest|spec|coverage|regression/i.test(text) || requiredIds.size > 1) {
      recommendedIds.add('qa_engineer')
    }
    if (/auth|crypto|secret|token|security|credential|permission/i.test(text)) {
      requiredIds.add('security_engineer')
    } else {
      recommendedIds.add('code_reviewer')
    }

    const requiredRoles: AgentRoleProfile[] = []
    const recommendedRoles: AgentRoleProfile[] = []

    for (const id of requiredIds) {
      const r = this.getRoleTemplate(id)
      if (r) requiredRoles.push(r)
    }
    for (const id of recommendedIds) {
      const r = this.getRoleTemplate(id)
      if (r && !requiredIds.has(id)) recommendedRoles.push(r)
    }

    if (!requiredIds.has('qa_engineer') && !recommendedIds.has('qa_engineer')) {
      warnings.push('No QA Engineer assigned; implementation will lack automated test verification.')
    }

    return {
      requiredRoles,
      recommendedRoles,
      missingRoles: [],
      warnings
    }
  }

  public createSession(goal: string, orchestratorRoleId = 'orchestrator'): OrchestrationSession {
    const coverage = this.analyzeRoleCoverage(goal)
    const activeRoles = [
      ...coverage.requiredRoles,
      ...coverage.recommendedRoles
    ]

    const session: OrchestrationSession = {
      id: `orch_${Date.now()}`,
      goal,
      stage: 'discovery',
      orchestratorRoleId,
      activeRoles,
      tasks: [],
      artifacts: [],
      approvalGates: {
        requirementsApproved: false,
        teamCompositionApproved: false,
        planApproved: false,
        executionApproved: false
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    this.activeSessions.set(session.id, session)
    return session
  }

  public getSession(id: string): OrchestrationSession | undefined {
    return this.activeSessions.get(id)
  }

  public generatePlan(session: OrchestrationSession): OrchestrationTask[] {
    const tasks: OrchestrationTask[] = []
    const hasFrontend = session.activeRoles.some((r) => r.id === 'frontend_developer')
    const hasBackend = session.activeRoles.some((r) => r.id === 'backend_developer')
    const hasQA = session.activeRoles.some((r) => r.id === 'qa_engineer')
    const hasSecurity = session.activeRoles.some((r) => r.id === 'security_engineer')

    let step = 1
    // Task 1: Architecture Contract
    tasks.push({
      id: `task_${step++}`,
      title: 'Analyze architecture boundaries and interfaces',
      description: 'Review domain model and define contracts',
      assignedRoleId: 'orchestrator',
      status: 'pending',
      dependencies: []
    })

    if (hasBackend) {
      tasks.push({
        id: `task_${step++}`,
        title: 'Implement backend business logic & service handlers',
        description: 'Create core backend services and input validation',
        assignedRoleId: 'backend_developer',
        status: 'pending',
        dependencies: ['task_1']
      })
    }

    if (hasFrontend) {
      tasks.push({
        id: `task_${step++}`,
        title: 'Implement user interface components & state wiring',
        description: 'Build responsive UI components and integrate with service store',
        assignedRoleId: 'frontend_developer',
        status: 'pending',
        dependencies: hasBackend ? ['task_2'] : ['task_1']
      })
    }

    if (hasQA) {
      tasks.push({
        id: `task_${step++}`,
        title: 'Author automated unit and integration tests',
        description: 'Cover edge cases, regression paths, and verify Vitest suite',
        assignedRoleId: 'qa_engineer',
        status: 'pending',
        dependencies: tasks.map((t) => t.id)
      })
    }

    if (hasSecurity) {
      tasks.push({
        id: `task_${step++}`,
        title: 'Conduct security and input sanitization audit',
        description: 'Verify secret redaction and path traversal boundaries',
        assignedRoleId: 'security_engineer',
        status: 'pending',
        dependencies: tasks.map((t) => t.id)
      })
    }

    session.tasks = tasks
    session.stage = 'planning'
    session.updatedAt = Date.now()

    // Add plan artifact
    session.artifacts.push({
      id: `art_plan_${Date.now()}`,
      type: 'plan',
      title: 'Implementation Task Graph',
      content: JSON.stringify(tasks, null, 2),
      createdAt: Date.now()
    })

    return tasks
  }

  public approveGate(
    sessionId: string,
    gate: keyof OrchestrationSession['approvalGates']
  ): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    session.approvalGates[gate] = true
    session.updatedAt = Date.now()

    if (gate === 'planApproved') {
      session.stage = 'execution'
    } else if (gate === 'executionApproved') {
      session.stage = 'completed'
    }

    return true
  }

  public updateTaskStatus(
    sessionId: string,
    taskId: string,
    status: OrchestrationTask['status'],
    resultSummary?: string,
    error?: string
  ): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    const task = session.tasks.find((t) => t.id === taskId)
    if (!task) return false

    task.status = status
    if (resultSummary) task.resultSummary = resultSummary
    if (error) task.error = error

    session.updatedAt = Date.now()
    return true
  }
}

export const aiOrchestrationEngine = new AiOrchestrationEngine()

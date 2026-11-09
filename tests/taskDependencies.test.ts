import { describe, it, expect } from 'vitest'
import {
  resolveTaskExecutionPlan,
  MaestroTask
} from '../src/main/services/taskService'
import {
  setExceptionBreakpoints,
  getExceptionBreakpoints,
  shouldStopOnException,
  logDapTraffic,
  getDapTrafficLogs,
  clearDapTrafficLogs
} from '../src/main/services/dapService'

describe('Task Runner - Dependencies & Group Execution Plan', () => {
  const mockTasks: MaestroTask[] = [
    {
      id: 'task-clean',
      label: 'clean',
      type: 'shell',
      command: 'rimraf dist',
      source: 'tasks.json',
      group: 'clean'
    },
    {
      id: 'task-lint',
      label: 'lint',
      type: 'npm',
      command: 'npm run lint',
      source: 'package.json',
      group: 'test'
    },
    {
      id: 'task-build',
      label: 'build',
      type: 'shell',
      command: 'tsc',
      source: 'tasks.json',
      group: 'build',
      isDefault: true,
      dependsOn: ['clean', 'lint'],
      dependsOrder: 'parallel'
    },
    {
      id: 'task-deploy',
      label: 'deploy',
      type: 'shell',
      command: 'deploy.sh',
      source: 'tasks.json',
      dependsOn: ['build'],
      dependsOrder: 'sequence'
    }
  ]

  it('resolves execution plan with parallel dependencies', () => {
    const plan = resolveTaskExecutionPlan('build', mockTasks)

    expect(plan.hasCycle).toBe(false)
    expect(plan.resolvedTasks.map((t) => t.label)).toContain('clean')
    expect(plan.resolvedTasks.map((t) => t.label)).toContain('lint')
    expect(plan.resolvedTasks.map((t) => t.label)).toContain('build')

    // Prerequisite step contains clean and lint in parallel batch
    expect(plan.steps.length).toBe(2)
    expect(plan.steps[0].map((t) => t.label)).toEqual(['clean', 'lint'])
    // Final step is the target build task
    expect(plan.steps[1].map((t) => t.label)).toEqual(['build'])
  })

  it('resolves sequential dependencies transitively', () => {
    const plan = resolveTaskExecutionPlan('deploy', mockTasks)

    expect(plan.hasCycle).toBe(false)
    const labels = plan.resolvedTasks.map((t) => t.label)
    expect(labels.indexOf('clean')).toBeLessThan(labels.indexOf('build'))
    expect(labels.indexOf('build')).toBeLessThan(labels.indexOf('deploy'))
  })

  it('detects circular dependencies gracefully', () => {
    const cyclicTasks: MaestroTask[] = [
      {
        id: 'task-a',
        label: 'A',
        type: 'shell',
        command: 'echo A',
        source: 'tasks.json',
        dependsOn: 'B'
      },
      {
        id: 'task-b',
        label: 'B',
        type: 'shell',
        command: 'echo B',
        source: 'tasks.json',
        dependsOn: 'A'
      }
    ]

    const plan = resolveTaskExecutionPlan('A', cyclicTasks)
    expect(plan.hasCycle).toBe(true)
  })
})

describe('DAP - Exception Breakpoints and Protocol Logging', () => {
  it('manages exception breakpoint filters correctly', () => {
    setExceptionBreakpoints(['uncaught'])
    expect(getExceptionBreakpoints()).toEqual(['uncaught'])

    expect(shouldStopOnException(true)).toBe(true)
    expect(shouldStopOnException(false)).toBe(false)

    setExceptionBreakpoints(['all'])
    expect(shouldStopOnException(false)).toBe(true)
    expect(shouldStopOnException(true)).toBe(true)
  })

  it('records and clears DAP traffic logs', () => {
    clearDapTrafficLogs()
    expect(getDapTrafficLogs().length).toBe(0)

    logDapTraffic('in', 'request', 'stepNext', { threadId: 1 })
    logDapTraffic('out', 'response', 'stepNext', { success: true })

    const logs = getDapTrafficLogs()
    expect(logs.length).toBe(2)
    expect(logs[0].name).toBe('stepNext')
    expect(logs[0].direction).toBe('in')
    expect(logs[1].direction).toBe('out')

    clearDapTrafficLogs()
    expect(getDapTrafficLogs().length).toBe(0)
  })
})

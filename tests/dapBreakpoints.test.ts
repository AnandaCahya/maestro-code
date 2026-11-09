import { describe, it, expect } from 'vitest'
import {
  evaluateBreakpoint,
  setFunctionBreakpoints,
  getFunctionBreakpoints,
  DapBreakpoint,
  DebugSession
} from '../src/main/services/dapService'

describe('DAP - Conditional Breakpoints, Hit Conditions & Logpoints', () => {
  const dummySession: DebugSession = {
    id: 'test-session-1',
    workspacePath: '/mock/workspace',
    config: { type: 'node', request: 'launch', name: 'Mock' },
    status: 'running',
    threads: [{ id: 1, name: 'Main' }],
    activeThreadId: 1,
    stackFrames: [{ id: 1, name: 'main()', line: 10, column: 1, source: { path: '/mock/file.ts' } }],
    currentFrameId: 1,
    scopes: [],
    variables: {
      1: [
        { name: 'count', value: '42' },
        { name: 'user', value: 'Alice' },
        { name: 'isActive', value: 'true' }
      ]
    },
    breakpoints: new Map(),
    outputBuffer: []
  }

  it('standard breakpoint stops unconditionally and increments hit count', () => {
    const bp: DapBreakpoint = {
      id: 'bp-1',
      verified: true,
      filePath: '/mock/file.ts',
      line: 15
    }

    const res = evaluateBreakpoint(dummySession, bp)
    expect(res.shouldStop).toBe(true)
    expect(bp.hitCount).toBe(1)
  })

  it('conditional breakpoint evaluates expression against scope variables', () => {
    const matchingBp: DapBreakpoint = {
      id: 'bp-cond-match',
      verified: true,
      filePath: '/mock/file.ts',
      line: 20,
      condition: 'count === 42 && isActive === true'
    }

    const nonMatchingBp: DapBreakpoint = {
      id: 'bp-cond-nomatch',
      verified: true,
      filePath: '/mock/file.ts',
      line: 20,
      condition: 'count > 100'
    }

    const resMatch = evaluateBreakpoint(dummySession, matchingBp)
    expect(resMatch.shouldStop).toBe(true)

    const resNoMatch = evaluateBreakpoint(dummySession, nonMatchingBp)
    expect(resNoMatch.shouldStop).toBe(false)
  })

  it('hit condition only stops when hit count criterion is satisfied', () => {
    const bp: DapBreakpoint = {
      id: 'bp-hit',
      verified: true,
      filePath: '/mock/file.ts',
      line: 25,
      hitCondition: '>= 3'
    }

    // Hit 1
    const res1 = evaluateBreakpoint(dummySession, bp)
    expect(res1.shouldStop).toBe(false)
    expect(bp.hitCount).toBe(1)

    // Hit 2
    const res2 = evaluateBreakpoint(dummySession, bp)
    expect(res2.shouldStop).toBe(false)
    expect(bp.hitCount).toBe(2)

    // Hit 3
    const res3 = evaluateBreakpoint(dummySession, bp)
    expect(res3.shouldStop).toBe(true)
    expect(bp.hitCount).toBe(3)
  })

  it('logpoint does not pause execution and formats output with interpolated variables', () => {
    const bp: DapBreakpoint = {
      id: 'bp-log',
      verified: true,
      filePath: '/mock/file.ts',
      line: 30,
      logMessage: 'Hello {user}, current count is {count}!'
    }

    const res = evaluateBreakpoint(dummySession, bp)
    expect(res.shouldStop).toBe(false)
    expect(res.logOutput).toBe('[Logpoint line 30]: Hello Alice, current count is 42!\n')
  })

  it('manages function breakpoints registration and querying', () => {
    const registered = setFunctionBreakpoints([
      { name: 'calculateTotal', condition: 'total > 0' },
      { name: 'processPayment', hitCondition: '5' }
    ])

    expect(registered.length).toBe(2)
    expect(registered[0].name).toBe('calculateTotal')
    expect(registered[1].hitCondition).toBe('5')

    const current = getFunctionBreakpoints()
    expect(current.length).toBe(2)
  })
})

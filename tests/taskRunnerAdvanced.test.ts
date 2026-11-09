import { describe, it, expect, beforeEach } from 'vitest'
import {
  interpolateTaskVariables,
  validateTaskSafety,
  parseTaskProblems,
  recordTaskStart,
  recordTaskEnd,
  cancelTask,
  getTaskHistory,
  clearTaskHistory
} from '../src/main/services/taskService'

describe('Task Runner Advanced Features', () => {
  beforeEach(() => {
    clearTaskHistory()
  })

  it('interpolates standard VS Code variables correctly', () => {
    const context = {
      workspaceFolder: 'C:/projects/myapp',
      file: 'C:/projects/myapp/src/components/Button.tsx',
      lineNumber: 42,
      env: { API_KEY: 'secret-123' },
      config: { 'editor.tabSize': 4 }
    }

    const template = 'echo ${workspaceFolderBasename} ${fileBasename} ${fileExtname} ${lineNumber} ${env:API_KEY} ${config:editor.tabSize}'
    const result = interpolateTaskVariables(template, context)

    expect(result).toBe('echo myapp Button.tsx .tsx 42 secret-123 4')
  })

  it('validates task safety and prevents command injection in untrusted workspaces', () => {
    // Null byte injection rejected regardless of trust
    expect(validateTaskSafety('npm\0run build', [], true).safe).toBe(false)
    expect(validateTaskSafety('npm', ['run\0test'], true).safe).toBe(false)

    // Trusted workspace allows chained commands
    expect(validateTaskSafety('npm run build; rm -rf dist', [], true).safe).toBe(true)

    // Untrusted workspace blocks dangerous chaining
    const untrustedCheck = validateTaskSafety('npm run build; rm -rf dist', [], false)
    expect(untrustedCheck.safe).toBe(false)
    expect(untrustedCheck.reason).toContain('Untrusted workspace')

    // Untrusted workspace allows safe simple command
    expect(validateTaskSafety('npm run build', [], false).safe).toBe(true)
  })

  it('parses compiler diagnostics using problem matchers ($tsc, $eslint-stylish, $gcc)', () => {
    const ws = 'C:/projects/myapp'

    // $tsc output
    const tscOutput = `
src/index.ts(15,8): error TS2304: Cannot find name 'foo'.
src/utils.ts(20,4): warning TS2551: Property 'lenght' does not exist on type 'string'.
`
    const tscProblems = parseTaskProblems(tscOutput, ws, '$tsc')
    expect(tscProblems).toHaveLength(2)
    expect(tscProblems[0].line).toBe(15)
    expect(tscProblems[0].column).toBe(8)
    expect(tscProblems[0].severity).toBe('error')
    expect(tscProblems[0].code).toBe('TS2304')
    expect(tscProblems[0].message).toContain("Cannot find name 'foo'")
    expect(tscProblems[1].severity).toBe('warning')

    // $gcc output
    const gccOutput = `src/main.c:12:5: error: expected ';' before 'return'`
    const gccProblems = parseTaskProblems(gccOutput, ws, '$gcc')
    expect(gccProblems).toHaveLength(1)
    expect(gccProblems[0].line).toBe(12)
    expect(gccProblems[0].column).toBe(5)
    expect(gccProblems[0].severity).toBe('error')
    expect(gccProblems[0].source).toBe('gcc')
  })

  it('tracks task execution history, background tasks, and cancellation', () => {
    // Start task
    const rec1 = recordTaskStart('task-build', 'Build', 'pnpm build', 'term-1', false)
    expect(rec1.status).toBe('running')
    expect(getTaskHistory()).toHaveLength(1)

    // Complete task
    const ended = recordTaskEnd('task-build', 0)
    expect(ended?.status).toBe('success')

    // Background task
    const bg = recordTaskStart('task-watch', 'Watch', 'pnpm dev', 'term-2', true)
    expect(bg.status).toBe('background')

    // Cancel task
    const cancelled = cancelTask('task-watch')
    expect(cancelled?.status).toBe('cancelled')
    expect(cancelled?.exitCode).toBe(130)

    // History order
    const history = getTaskHistory()
    expect(history).toHaveLength(2)
    expect(history[0].id).toBe(bg.id)
  })
})

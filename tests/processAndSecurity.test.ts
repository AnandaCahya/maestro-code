import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  registerProcess,
  updateProcessStatus,
  getManagedProcesses,
  getActiveProcesses,
  sanitizeEnvironmentForWorkspace,
  validateExecutableAndArgs,
  killProcessTree
} from '../src/main/services/processManager'
import {
  logStructured,
  getStructuredLogs,
  clearStructuredLogs,
  ALLOWED_IPC_CHANNELS,
  validateIpcChannel,
  storeSecureSecret,
  getSecureSecret,
  deleteSecureSecret
} from '../src/main/services/securityService'

describe('Process Manager & Lifecycle Tracking', () => {
  it('registers and retrieves managed processes', () => {
    const proc = registerProcess('test-proc-1', 'TypeScript Server', 'lsp', 'tsserver --stdio', undefined, 12345)
    expect(proc.id).toBe('test-proc-1')
    expect(proc.name).toBe('TypeScript Server')
    expect(proc.status).toBe('running')
    expect(proc.pid).toBe(12345)

    const all = getManagedProcesses()
    expect(all.some((p) => p.id === 'test-proc-1')).toBe(true)

    const active = getActiveProcesses()
    expect(active.some((p) => p.id === 'test-proc-1')).toBe(true)
  })

  it('updates process status on normal termination or crash', () => {
    registerProcess('test-proc-2', 'Debug Adapter', 'dap', 'node adapter.js', undefined, 12346)
    updateProcessStatus('test-proc-2', 'exited', 0)

    const all = getManagedProcesses()
    const proc = all.find((p) => p.id === 'test-proc-2')
    expect(proc?.status).toBe('exited')
    expect(proc?.exitCode).toBe(0)

    const active = getActiveProcesses()
    expect(active.some((p) => p.id === 'test-proc-2')).toBe(false)
  })

  it('sanitizes environment variables for untrusted workspaces', () => {
    const dangerousEnv = {
      PATH: '/usr/bin',
      GITHUB_TOKEN: 'ghp_secretToken1234567890',
      AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      MAESTRO_CUSTOM_VAR: 'hello-world'
    }

    // Trusted workspace preserves sensitive tokens
    const trusted = sanitizeEnvironmentForWorkspace(dangerousEnv, true)
    expect(trusted.GITHUB_TOKEN).toBe('ghp_secretToken1234567890')
    expect(trusted.AWS_SECRET_ACCESS_KEY).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')

    // Untrusted workspace strips or redacts sensitive tokens
    const untrusted = sanitizeEnvironmentForWorkspace(dangerousEnv, false)
    expect(untrusted.PATH).toBe('/usr/bin')
    expect(untrusted.MAESTRO_CUSTOM_VAR).toBe('hello-world')
    expect(untrusted.GITHUB_TOKEN).toBeUndefined()
    expect(untrusted.AWS_SECRET_ACCESS_KEY).toBeUndefined()
  })

  it('validates executable paths and args against injection', () => {
    // Valid command
    const valid = validateExecutableAndArgs('git', ['status', '--short'])
    expect(valid.valid).toBe(true)

    // Dangerous null-byte
    const nullByte = validateExecutableAndArgs('node\0malicious', ['index.js'])
    expect(nullByte.valid).toBe(false)
    expect(nullByte.error).toContain('null byte')

    // Dangerous argument with null byte
    const nullByteArg = validateExecutableAndArgs('git', ['log\0--evil'])
    expect(nullByteArg.valid).toBe(false)

    // Dangerous command injection patterns in executable name
    const backtickCmd = validateExecutableAndArgs('cmd.exe;calc', ['test'])
    expect(backtickCmd.valid).toBe(false)
  })

  it('safely handles killProcessTree when pid does not exist', async () => {
    const result = await killProcessTree(0)
    expect(result).toBe(false)
  })
})

describe('Security Service & Structured Logging', () => {
  beforeEach(() => {
    clearStructuredLogs()
  })

  it('logs structured events and respects limits and filters', () => {
    logStructured('info', 'terminal', 'Terminal opened', { terminalId: 'term-1' })
    logStructured('warn', 'git', 'Git stash conflicted', { branch: 'feat' })
    logStructured('error', 'dap', 'Adapter failed to launch', { code: 1 })

    const logs = getStructuredLogs()
    expect(logs.length).toBe(3)
    expect(logs[0].category).toBe('dap') // unshift order (newest first)

    const gitLogs = getStructuredLogs(10, 'git')
    expect(gitLogs.length).toBe(1)
    expect(gitLogs[0].message).toBe('Git stash conflicted')
  })

  it('validates IPC channels using strict allowlist', () => {
    expect(validateIpcChannel('fs:readFile').allowed).toBe(true)
    expect(validateIpcChannel('git:getStatus').allowed).toBe(true)
    expect(validateIpcChannel('project:executeTransaction').allowed).toBe(true)
    expect(validateIpcChannel('process:getManaged').allowed).toBe(true)

    // Unknown/arbitrary channels are rejected
    expect(validateIpcChannel('eval:arbitraryCode').allowed).toBe(false)
    expect(validateIpcChannel('system:runRawBash').allowed).toBe(false)
  })

  it('stores and retrieves secrets safely with fallback', async () => {
    const key = 'test_api_token'
    const value = 'super-secret-token-val-987'

    const stored = await storeSecureSecret(key, value)
    expect(stored).toBe(true)

    const retrieved = await getSecureSecret(key)
    expect(retrieved).toBe(value)

    const deleted = await deleteSecureSecret(key)
    expect(deleted).toBe(true)

    const afterDelete = await getSecureSecret(key)
    expect(afterDelete).toBeNull()
  })
})

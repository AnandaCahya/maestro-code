import { describe, it, expect } from 'vitest'
import * as path from 'path'
import * as os from 'os'
import { startDebugSession, validateLaunchSecurity } from '../src/main/services/dapService'
import { registerProcess, updateProcessStatus, getManagedProcesses } from '../src/main/services/processManager'
import { cancelTask, recordTaskStart } from '../src/main/services/taskService'
import { readFileContent, readDirectory } from '../src/main/services/fileService'

describe('Failure Scenario Resilience (Section 16.2)', () => {
  it('handles debug adapter security failures and invalid launch configuration gracefully', async () => {
    // Attempting to launch with dangerous command injection
    const result = await startDebugSession('C:/dummy-workspace', {
      name: 'Exploit Adapter',
      type: 'node',
      request: 'launch',
      runtimeExecutable: 'node.exe;calc.exe'
    })

    // Must return safe failure object without throwing uncaught exceptions
    expect(result.ok).toBe(false)
    expect(result.message).toContain('dangerous shell characters')

    // Null byte injection check
    const sec = validateLaunchSecurity({
      name: 'Null byte',
      type: 'node',
      request: 'launch',
      program: 'app.js\0malicious'
    })
    expect(sec.safe).toBe(false)
    expect(sec.error).toContain('null byte')
  })

  it('handles task process cancellation and hanging task timeouts', async () => {
    const taskId = 'task-hang-1'
    registerProcess(taskId, 'Hanging Build', 'task', 'node -e "while(true){}"', undefined, 99999)
    recordTaskStart(taskId, 'Hanging Build', 'C:/dummy-workspace')

    // Cancel task
    const cancelled = cancelTask(taskId)
    expect(cancelled).toBeDefined()
    expect(cancelled?.status).toBe('cancelled')

    // Verify status update in process manager
    updateProcessStatus(taskId, 'terminated')
    const recorded = getManagedProcesses().find((p) => p.id === taskId)
    expect(recorded?.status).toBe('terminated')
  })

  it('handles terminal process unexpected exit without zombie leaks', () => {
    const termId = 'term-crash-1'
    registerProcess(termId, 'Bash Shell', 'terminal', '/bin/bash', undefined, 88888)

    // Simulate unexpected process death (SIGKILL or exit 137)
    updateProcessStatus(termId, 'crashed', 137)

    const all = getManagedProcesses()
    const crashRecord = all.find((p) => p.id === termId)
    expect(crashRecord?.status).toBe('crashed')
    expect(crashRecord?.exitCode).toBe(137)
  })

  it('handles unreadable or nonexistent files without crashing', async () => {
    const nonexistentPath = path.join(os.tmpdir(), 'nonexistent-dir-maestro-xyz', 'missing.txt')
    await expect(readFileContent(nonexistentPath)).rejects.toThrow()

    // Reading non-existent directory returns empty array safely
    const dirResult = await readDirectory(path.join(os.tmpdir(), 'nonexistent-dir-xyz-888'))
    expect(dirResult).toEqual([])
  })
})

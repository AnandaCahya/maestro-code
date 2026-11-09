import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateLaunchSecurity,
  getActiveDebugSessions,
  focusDebugSession,
  resolveSourceMapLocation,
  startDebugSession,
  stopAllDebugSessions
} from '../src/main/services/dapService'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('DAP Advanced Debugging & Security', () => {
  beforeEach(async () => {
    await stopAllDebugSessions()
  })

  it('validates launch configuration security rejecting null bytes and shell injections', () => {
    // Null byte injection in program
    expect(
      validateLaunchSecurity({
        name: 'Evil',
        type: 'node',
        request: 'launch',
        program: 'index.js\0.exe'
      }).safe
    ).toBe(false)

    // Null byte injection in runtimeExecutable
    expect(
      validateLaunchSecurity({
        name: 'Evil',
        type: 'node',
        request: 'launch',
        runtimeExecutable: 'node\0'
      }).safe
    ).toBe(false)

    // Null byte injection in args
    expect(
      validateLaunchSecurity({
        name: 'Evil',
        type: 'node',
        request: 'launch',
        args: ['--inspect', 'bad\0arg']
      }).safe
    ).toBe(false)

    // Dangerous characters in runtimeExecutable
    expect(
      validateLaunchSecurity({
        name: 'Evil',
        type: 'node',
        request: 'launch',
        runtimeExecutable: 'node; rm -rf /'
      }).safe
    ).toBe(false)

    // Valid configuration
    expect(
      validateLaunchSecurity({
        name: 'Good Node Launch',
        type: 'node',
        request: 'launch',
        program: '${workspaceFolder}/index.js',
        args: ['--port', '3000']
      }).safe
    ).toBe(true)
  })

  it('tracks multiple concurrent debug sessions and supports session focusing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-dap-test-'))
    const dummyScript = path.join(tmpDir, 'test1.js')
    await fs.writeFile(dummyScript, 'console.log("running");', 'utf-8')

    const res1 = await startDebugSession(tmpDir, {
      name: 'Session Alpha',
      type: 'node',
      request: 'launch',
      program: dummyScript
    })
    expect(res1.ok).toBe(true)

    const res2 = await startDebugSession(tmpDir, {
      name: 'Session Beta',
      type: 'node',
      request: 'launch',
      program: dummyScript
    })
    expect(res2.ok).toBe(true)

    const active = getActiveDebugSessions()
    expect(active.length).toBeGreaterThanOrEqual(2)
    expect(active.some((s) => s.id === res1.sessionId)).toBe(true)
    expect(active.some((s) => s.id === res2.sessionId)).toBe(true)

    expect(focusDebugSession(res1.sessionId!)).toBe(true)
    expect(focusDebugSession('non-existent-id')).toBe(false)

    await stopAllDebugSessions()
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })

  it('resolves source map locations when .map files are available', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-sourcemap-test-'))
    const jsFile = path.join(tmpDir, 'bundle.js')
    const mapFile = path.join(tmpDir, 'bundle.js.map')

    await fs.writeFile(jsFile, 'console.log("hello");', 'utf-8')
    await fs.writeFile(
      mapFile,
      JSON.stringify({
        version: 3,
        file: 'bundle.js',
        sources: ['src/index.ts'],
        mappings: 'AAAA'
      }),
      'utf-8'
    )

    const mapped = await resolveSourceMapLocation(jsFile, 10, 5)
    expect(mapped).not.toBeNull()
    expect(mapped?.sourcePath).toContain(path.normalize('src/index.ts'))
    expect(mapped?.line).toBe(10)

    // When map does not exist
    const unmapped = await resolveSourceMapLocation(path.join(tmpDir, 'missing.js'), 1, 1)
    expect(unmapped).toBeNull()

    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })
})

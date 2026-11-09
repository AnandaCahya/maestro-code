import { describe, it, expect, beforeEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs/promises'
import * as os from 'os'
import {
  loadExtensions,
  toggleExtension,
  installLocalExtension,
  uninstallExtension,
  getContributedCommands,
  executeExtensionCommand
} from '../src/main/services/extensionService'
import { validateIpcChannel, ALLOWED_IPC_CHANNELS } from '../src/main/services/securityService'

describe('Extension Ecosystem & Host Integration (Section 12 & 16)', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-ext-test-'))
  })

  it('loads built-in extensions and exposes contributed commands', async () => {
    const exts = await loadExtensions(tempDir)
    expect(exts.length).toBeGreaterThan(0)

    const cyberTheme = exts.find((e) => e.id === 'maestro.theme-cyber-bento')
    expect(cyberTheme).toBeDefined()
    expect(cyberTheme?.isBuiltin).toBe(true)
    expect(cyberTheme?.isEnabled).toBe(true)

    const commands = getContributedCommands()
    expect(commands.some((c) => c.command === 'maestro.theme.applyCyber')).toBe(true)
  })

  it('disables and re-enables an extension and manages command registration', async () => {
    await loadExtensions(tempDir)
    
    // Toggle off
    const toggledOff = await toggleExtension('maestro.theme-cyber-bento', false)
    expect(toggledOff).toBe(true)

    let commands = getContributedCommands()
    expect(commands.some((c) => c.command === 'maestro.theme.applyCyber')).toBe(false)

    // Toggle back on
    const toggledOn = await toggleExtension('maestro.theme-cyber-bento', true)
    expect(toggledOn).toBe(true)

    commands = getContributedCommands()
    expect(commands.some((c) => c.command === 'maestro.theme.applyCyber')).toBe(true)
  })

  it('executes contributed extension commands', async () => {
    await loadExtensions(tempDir)

    const res = await executeExtensionCommand('maestro.theme.applyCyber')
    expect(res.ok).toBe(true)
    expect(res.result).toContain('Cozy Cyber-Bento Theme')

    const unknownRes = await executeExtensionCommand('unknown.command.nonexistent')
    expect(unknownRes.ok).toBe(false)
    expect(unknownRes.message).toContain('not registered')
  })

  it('installs a valid local extension from folder', async () => {
    const extDir = path.join(tempDir, 'dummy-extension')
    await fs.mkdir(extDir, { recursive: true })
    const manifest = {
      name: 'hello-world',
      displayName: 'Hello World Extension',
      version: '1.0.0',
      publisher: 'testuser',
      description: 'A test extension',
      contributes: {
        commands: [
          {
            command: 'testuser.sayHello',
            title: 'Say Hello'
          }
        ]
      }
    }
    await fs.writeFile(path.join(extDir, 'package.json'), JSON.stringify(manifest), 'utf-8')

    const installResult = await installLocalExtension(extDir)
    expect(installResult.ok).toBe(true)
    expect(installResult.extension?.id).toBe('testuser.hello-world')

    // Clean up
    if (installResult.extension?.id) {
      await uninstallExtension(installResult.extension.id)
    }
  })
})

describe('Electron IPC Protocol & Security Surface (Section 15.1 & 16.1)', () => {
  it('covers all critical extension and process management channels in strict allowlist', () => {
    const expectedChannels = [
      'extension:load',
      'extension:toggle',
      'extension:install',
      'extension:uninstall',
      'extension:getCommands',
      'extension:executeCommand',
      'process:getManaged',
      'process:killTree',
      'security:storeSecret',
      'security:getSecret',
      'security:deleteSecret',
      'security:getLogs'
    ]

    for (const ch of expectedChannels) {
      expect(ALLOWED_IPC_CHANNELS.has(ch)).toBe(true)
      const validated = validateIpcChannel(ch)
      expect(validated.allowed).toBe(true)
    }
  })
})

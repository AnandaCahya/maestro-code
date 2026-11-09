import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { validateShellProfile } from '../src/main/services/terminalService'
import {
  getEffectiveSettingsForLanguage,
  validateSettings,
  loadWorkspaceSettings,
  defaultSettings,
  getEffectiveSettings,
  loadUserKeybindings,
  updateSettingsSafely
} from '../src/main/services/settingsService'
import {
  saveWorkspaceSessionState,
  loadWorkspaceSessionState
} from '../src/main/services/workspaceService'

describe('terminalService - Shell Profile Validation', () => {
  it('validates existing shell and falls back gracefully for missing shell', () => {
    // Valid standard shell
    const isWin = os.platform() === 'win32'
    const standardShell = isWin ? 'cmd.exe' : 'sh'
    const res = validateShellProfile(standardShell)
    expect(res.resolvedPath).toBeTruthy()

    // Missing shell
    const missingRes = validateShellProfile('totally-non-existent-shell-executable-123.bin')
    expect(missingRes.valid).toBe(false)
    expect(missingRes.error).toContain('not found in PATH')

    // Null byte injection attempt
    const evilRes = validateShellProfile('/bin/sh\0evil')
    expect(evilRes.valid).toBe(false)
    expect(evilRes.error).toContain('null byte')
  })
})

describe('settingsService - Language-Specific Overrides and Schema', () => {
  it('applies language-specific settings overrides correctly', () => {
    const base = {
      ...defaultSettings,
      tabSize: 2,
      insertSpaces: true,
      languageOverrides: {
        python: {
          tabSize: 4
        },
        markdown: {
          wordWrap: 'on'
        }
      }
    }

    const pySettings = getEffectiveSettingsForLanguage(base, 'python')
    expect(pySettings.tabSize).toBe(4)
    expect(pySettings.fontSize).toBe(base.fontSize)

    const tsSettings = getEffectiveSettingsForLanguage(base, 'typescript')
    expect(tsSettings.tabSize).toBe(2)
  })

  it('validates settings against schema definitions', () => {
    const validConfig = {
      'editor.tabSize': 4,
      'editor.wordWrap': 'off',
      'editor.formatOnSave': true
    }
    const validRes = validateSettings(validConfig)
    expect(validRes.valid).toBe(true)
    expect(validRes.errors.length).toBe(0)

    const invalidConfig = {
      'editor.tabSize': 'not-a-number' as any,
      'editor.wordWrap': 'invalid-enum' as any
    }
    const invalidRes = validateSettings(invalidConfig)
    expect(invalidRes.valid).toBe(false)
    expect(invalidRes.errors.length).toBe(2)
  })

  it('loads language-specific [python] blocks from .vscode/settings.json', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-settings-test-'))
    try {
      const vscodeDir = path.join(tempDir, '.vscode')
      await fs.mkdir(vscodeDir, { recursive: true })
      const rawJson = `
      {
        "editor.tabSize": 2,
        "[python]": {
          "editor.tabSize": 4
        },
        "terminal.integrated.defaultProfile.windows": "powershell.exe"
      }
      `
      await fs.writeFile(path.join(vscodeDir, 'settings.json'), rawJson, 'utf-8')

      const loaded = await loadWorkspaceSettings(tempDir)
      expect(loaded.tabSize).toBe(2)
      expect(loaded.defaultProfile).toBe('powershell.exe')
      expect(loaded.languageOverrides?.python?.tabSize).toBe(4)
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  })

  it('safely updates settings while preserving unknown user configuration keys', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-safe-update-'))
    const settingsFile = path.join(tempDir, 'settings.json')
    try {
      const initial = {
        'editor.tabSize': 4,
        'customPlugin.apiKey': 'secret-123',
        'unrecognized.setting.foo': true
      }
      await fs.writeFile(settingsFile, JSON.stringify(initial, null, 2), 'utf-8')

      // Update only editor.tabSize
      const success = await updateSettingsSafely(settingsFile, { 'editor.tabSize': 2 })
      expect(success).toBe(true)

      const updatedRaw = await fs.readFile(settingsFile, 'utf-8')
      const updated = JSON.parse(updatedRaw)
      expect(updated['editor.tabSize']).toBe(2)
      // Preserved unknown fields
      expect(updated['customPlugin.apiKey']).toBe('secret-123')
      expect(updated['unrecognized.setting.foo']).toBe(true)
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  })

  it('loads workspace keybindings from .vscode/keybindings.json', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-keybindings-'))
    const vscodeDir = path.join(tempDir, '.vscode')
    await fs.mkdir(vscodeDir, { recursive: true })
    const keybindingsFile = path.join(vscodeDir, 'keybindings.json')

    try {
      const customBindings = [
        { key: 'ctrl+alt+t', command: 'workbench.action.terminal.toggleTerminal' },
        { key: 'ctrl+shift+e', command: 'workbench.view.explorer', when: '!editorFocus' }
      ]
      await fs.writeFile(keybindingsFile, JSON.stringify(customBindings, null, 2), 'utf-8')

      const loaded = await loadUserKeybindings(tempDir)
      expect(loaded.length).toBeGreaterThanOrEqual(2)
      expect(loaded.some((k) => k.key === 'ctrl+alt+t')).toBe(true)
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  })
})

describe('workspaceService - Terminal Session Persistence Policy', () => {
  let wsDir: string

  beforeEach(async () => {
    wsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-term-persist-'))
  })

  afterEach(async () => {
    await fs.rm(wsDir, { recursive: true, force: true }).catch(() => {})
  })

  it('persists and restores terminal tabs and split state across sessions', async () => {
    const sessionState = {
      openFiles: [],
      activeFilePath: null,
      terminalTabs: [
        { id: 'term-1', title: 'Terminal 1', cwd: wsDir },
        { id: 'term-2', title: 'Python Env', cwd: path.join(wsDir, 'backend'), shell: 'python.exe' }
      ],
      activeTerminalId: 'term-2',
      terminalSplitMode: 'horizontal' as const
    }

    const saved = await saveWorkspaceSessionState(wsDir, sessionState)
    expect(saved).toBe(true)

    const restored = await loadWorkspaceSessionState(wsDir)
    expect(restored).not.toBeNull()
    expect(restored?.terminalTabs?.length).toBe(2)
    expect(restored?.terminalTabs?.[1].title).toBe('Python Env')
    expect(restored?.activeTerminalId).toBe('term-2')
    expect(restored?.terminalSplitMode).toBe('horizontal')
  })
})

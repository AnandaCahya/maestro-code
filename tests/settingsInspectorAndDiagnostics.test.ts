import { describe, it, expect } from 'vitest'
import {
  getEffectiveSetting,
  loadFolderSettings,
  validateSettingsJsonContent,
  validateEditorConfigContent,
  safeWriteSettingsFile
} from '../src/main/services/settingsService'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('Settings Inspector & Schema Diagnostics', () => {
  it('inspects effective setting values and identifies correct precedence origin', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-settings-test-'))
    const vscodeDir = path.join(tmpDir, '.vscode')
    await fs.mkdir(vscodeDir, { recursive: true })

    await fs.writeFile(
      path.join(vscodeDir, 'settings.json'),
      JSON.stringify({
        'editor.tabSize': 8,
        '[python]': {
          'editor.tabSize': 4
        }
      }),
      'utf-8'
    )

    // Workspace origin
    const inspectedWs = await getEffectiveSetting('editor.tabSize', tmpDir)
    expect(inspectedWs.effectiveValue).toBe(8)
    expect(inspectedWs.origin).toBe('workspace')

    // Language override origin
    const inspectedLang = await getEffectiveSetting('editor.tabSize', tmpDir, undefined, 'python')
    expect(inspectedLang.effectiveValue).toBe(4)
    expect(inspectedLang.origin).toBe('language')

    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })

  it('validates settings.json syntax and schema types, warning on unknown keys', () => {
    // Malformed JSON syntax
    const syntaxErr = validateSettingsJsonContent('{\n  "editor.tabSize": 4,\n}')
    expect(syntaxErr.valid).toBe(false)
    expect(syntaxErr.diagnostics[0].message).toContain('JSON syntax error')

    // Schema type mismatch
    const typeErr = validateSettingsJsonContent('{\n  "editor.tabSize": "four"\n}')
    expect(typeErr.valid).toBe(false)
    expect(typeErr.diagnostics[0].message).toContain('must be of type number')

    // Unknown setting key warning
    const unknownKey = validateSettingsJsonContent('{\n  "myCustomPlugin.secret": true\n}')
    expect(unknownKey.unknownKeys).toContain('myCustomPlugin.secret')
    expect(unknownKey.diagnostics[0].severity).toBe('warning')

    // Valid settings
    const valid = validateSettingsJsonContent('{\n  "editor.tabSize": 2,\n  "editor.wordWrap": "on"\n}')
    expect(valid.valid).toBe(true)
    expect(valid.diagnostics).toHaveLength(0)
  })

  it('validates .editorconfig syntax and directive values', () => {
    const invalidConfig = `
root = true

[*.ts
indent_style = invalid_style
indent_size = abc
end_of_line = unknown_eol
unknown_key = 123
`
    const res = validateEditorConfigContent(invalidConfig)
    expect(res.valid).toBe(false)

    const msgs = res.diagnostics.map((d) => d.message)
    expect(msgs.some((m) => m.includes('missing closing bracket'))).toBe(true)
    expect(msgs.some((m) => m.includes('Invalid indent_style'))).toBe(true)
    expect(msgs.some((m) => m.includes('Invalid indent_size'))).toBe(true)
    expect(msgs.some((m) => m.includes('Invalid end_of_line'))).toBe(true)
    expect(msgs.some((m) => m.includes('Unrecognized EditorConfig directive'))).toBe(true)
  })

  it('supports folder-level settings and prevents overwriting without confirmation', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-folder-test-'))
    const subFolder = path.join(tmpDir, 'packages', 'web')
    const subVscode = path.join(subFolder, '.vscode')
    await fs.mkdir(subVscode, { recursive: true })

    const folderSettingsFile = path.join(subVscode, 'settings.json')
    await fs.writeFile(folderSettingsFile, JSON.stringify({ 'editor.tabSize': 6 }), 'utf-8')

    const folderSettings = await loadFolderSettings(subFolder)
    expect(folderSettings.tabSize).toBe(6)

    // Attempting to overwrite existing file without confirmed flag requires confirmation
    const safeCheck = await safeWriteSettingsFile(folderSettingsFile, '{}', false)
    expect(safeCheck.ok).toBe(false)
    expect(safeCheck.requiresConfirmation).toBe(true)

    // With confirmation, writing succeeds
    const confirmedWrite = await safeWriteSettingsFile(folderSettingsFile, '{"updated": true}', true)
    expect(confirmedWrite.ok).toBe(true)

    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })
})

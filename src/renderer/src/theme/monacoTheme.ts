import type * as monaco from 'monaco-editor'

export const COZY_DARK_THEME = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6c7284', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'e0a96d', fontStyle: 'bold' },
    { token: 'string', foreground: '88c096' },
    { token: 'number', foreground: 'e5aa66' },
    { token: 'type', foreground: 'a79bc4' },
    { token: 'function', foreground: '82b0c4' },
    { token: 'variable', foreground: 'e6e8ec' },
    { token: 'delimiter', foreground: '8b90a0' }
  ],
  colors: {
    'editor.background': '#15171f',
    'editor.foreground': '#e6e8ec',
    'editorCursor.foreground': '#e0a96d',
    'editor.lineHighlightBackground': '#1a1c26',
    'editorLineNumber.foreground': '#4f5365',
    'editorLineNumber.activeForeground': '#e0a96d',
    'editor.selectionBackground': '#2d2b38',
    'editor.inactiveSelectionBackground': '#232532',
    'diffEditor.insertedTextBackground': 'rgba(136, 192, 150, 0.15)',
    'diffEditor.removedTextBackground': 'rgba(217, 127, 127, 0.15)'
  }
}

export function registerAndApplyCozyTheme(m: typeof monaco): void {
  if (!m || !m.editor) return
  try {
    m.editor.defineTheme('cozy-dark', COZY_DARK_THEME)
    m.editor.setTheme('cozy-dark')
  } catch (err) {
    console.warn('Failed to define/apply cozy-dark theme:', err)
  }
}

import React, { useState, useEffect } from 'react'
import {
  Settings,
  X,
  Type,
  FileCode2,
  WrapText,
  Save,
  Sliders,
  Sparkles,
  CheckCircle2,
  ListOrdered,
  Search,
  RotateCcw,
  Code,
  FileText,
  AlertCircle
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const DEFAULT_SETTINGS = {
  tabSize: 2,
  fontSize: 14,
  wordWrap: 'on' as const,
  formatOnSave: true,
  minimap: false,
  lineNumbers: 'on' as const,
  insertSpaces: true,
  fontLigatures: true,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  filesExclude: {
    '**/.git': true,
    '**/node_modules': true,
    '**/dist': true,
    '**/out': true
  }
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { editorSettings, updateEditorSettings, workspacePath, setStatusMessage } = useEditorStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeScope, setActiveScope] = useState<'workspace' | 'user'>('workspace')
  const [viewMode, setViewMode] = useState<'ui' | 'json'>('ui')
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Sync JSON text when switching to json view or when settings change
  useEffect(() => {
    if (viewMode === 'json') {
      const vscodeFormatted: Record<string, any> = {
        'editor.tabSize': editorSettings.tabSize,
        'editor.fontSize': editorSettings.fontSize,
        'editor.wordWrap': editorSettings.wordWrap,
        'editor.formatOnSave': editorSettings.formatOnSave,
        'editor.minimap.enabled': editorSettings.minimap,
        'editor.lineNumbers': editorSettings.lineNumbers,
        'editor.insertSpaces': editorSettings.insertSpaces,
        'editor.fontLigatures': editorSettings.fontLigatures ?? true,
        'editor.fontFamily': editorSettings.fontFamily || DEFAULT_SETTINGS.fontFamily,
        'files.exclude': editorSettings.filesExclude || DEFAULT_SETTINGS.filesExclude
      }
      setJsonText(JSON.stringify(vscodeFormatted, null, 2))
      setJsonError(null)
    }
  }, [viewMode, editorSettings])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',' && isOpen) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const fontSizes = [12, 13, 14, 15, 16]

  // Filter settings based on search
  const q = searchQuery.toLowerCase().trim()
  const matchSetting = (title: string, key: string, desc?: string) => {
    if (!q) return true
    return (
      title.toLowerCase().includes(q) ||
      key.toLowerCase().includes(q) ||
      (desc && desc.toLowerCase().includes(q))
    )
  }

  const handleResetDefaults = () => {
    updateEditorSettings(DEFAULT_SETTINGS)
    setStatusMessage('Settings reset to default values')
    setTimeout(() => setStatusMessage('Ready'), 2000)
  }

  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const updated: Partial<typeof editorSettings> = {}

      if (typeof parsed['editor.tabSize'] === 'number') {
        updated.tabSize = Math.max(1, Math.min(8, parsed['editor.tabSize']))
      }
      if (typeof parsed['editor.fontSize'] === 'number') {
        updated.fontSize = Math.max(9, Math.min(32, parsed['editor.fontSize']))
      }
      if (parsed['editor.wordWrap'] === 'on' || parsed['editor.wordWrap'] === 'off') {
        updated.wordWrap = parsed['editor.wordWrap']
      }
      if (typeof parsed['editor.formatOnSave'] === 'boolean') {
        updated.formatOnSave = parsed['editor.formatOnSave']
      }
      if (typeof parsed['editor.minimap.enabled'] === 'boolean') {
        updated.minimap = parsed['editor.minimap.enabled']
      }
      if (['on', 'off', 'relative'].includes(parsed['editor.lineNumbers'])) {
        updated.lineNumbers = parsed['editor.lineNumbers']
      }
      if (typeof parsed['editor.insertSpaces'] === 'boolean') {
        updated.insertSpaces = parsed['editor.insertSpaces']
      }
      if (typeof parsed['editor.fontLigatures'] === 'boolean') {
        updated.fontLigatures = parsed['editor.fontLigatures']
      }
      if (typeof parsed['editor.fontFamily'] === 'string') {
        updated.fontFamily = parsed['editor.fontFamily']
      }
      if (parsed['files.exclude'] && typeof parsed['files.exclude'] === 'object') {
        updated.filesExclude = parsed['files.exclude']
      }

      updateEditorSettings(updated)
      setJsonError(null)
      setStatusMessage('JSON Settings saved and applied')
      setTimeout(() => setStatusMessage('Ready'), 2000)
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON format')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl glass-panel bg-studio-card/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 px-5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-studio-amber/15 text-studio-amber border border-studio-amber/20">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Preferences & Settings</h2>
              <p className="text-[11px] text-studio-muted flex items-center gap-1.5">
                <span>Scope:</span>
                <span className="font-mono text-studio-amber">
                  {activeScope === 'workspace' ? '.vscode/settings.json' : 'User Preferences'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: UI vs JSON */}
            <div className="flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06]">
              <button
                onClick={() => setViewMode('ui')}
                className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'ui'
                    ? 'bg-studio-amber text-studio-bg font-semibold shadow-sm'
                    : 'text-studio-muted hover:text-white'
                }`}
                title="Visual Settings Editor"
              >
                <Sliders className="w-3 h-3" />
                <span>UI</span>
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'json'
                    ? 'bg-studio-amber text-studio-bg font-semibold shadow-sm'
                    : 'text-studio-muted hover:text-white'
                }`}
                title="Edit JSON settings directly"
              >
                <Code className="w-3 h-3" />
                <span>JSON</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar: Scope & Search Bar */}
        <div className="px-5 py-2.5 border-b border-white/[0.05] bg-white/[0.01] flex items-center justify-between gap-3">
          {/* Scope selection */}
          <div className="flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => setActiveScope('workspace')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeScope === 'workspace'
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-studio-muted hover:text-white hover:bg-white/5'
              }`}
            >
              Workspace
            </button>
            <button
              onClick={() => setActiveScope('user')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeScope === 'user'
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-studio-muted hover:text-white hover:bg-white/5'
              }`}
            >
              User
            </button>
          </div>

          {/* Search box (when in UI mode) */}
          {viewMode === 'ui' ? (
            <div className="flex items-center gap-2 bg-white/[0.04] px-3 py-1 rounded-lg border border-white/[0.06] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-studio-muted shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings (e.g. font, wrap, tabs)..."
                className="bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted w-full font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-studio-muted hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="text-xs text-studio-muted font-mono flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-studio-amber" />
              <span>Direct .vscode/settings.json editor</span>
            </div>
          )}

          {/* Reset button */}
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-studio-muted hover:text-white border border-white/[0.06] text-xs transition-colors cursor-pointer shrink-0"
            title="Reset settings to defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* Modal Body */}
        {viewMode === 'ui' ? (
          <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[65vh]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-studio-amber uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5" />
                <span>Editor Configuration</span>
              </div>

              {/* Font Size */}
              {matchSetting('Font Size', 'editor.fontSize') && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <Type className="w-4 h-4 text-studio-muted shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-white">Font Size</div>
                      <div className="text-[11px] text-studio-muted font-mono">editor.fontSize</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/[0.05]">
                    {fontSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => updateEditorSettings({ fontSize: size })}
                        className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                          editorSettings.fontSize === size
                            ? 'bg-studio-amber text-studio-bg font-bold shadow-sm'
                            : 'text-studio-muted hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {size}px
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Font Ligatures */}
              {matchSetting('Font Ligatures', 'editor.fontLigatures') && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-studio-muted shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-white">Font Ligatures</div>
                      <div className="text-[11px] text-studio-muted font-mono">
                        editor.fontLigatures (Arrow & symbol ligatures)
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      updateEditorSettings({
                        fontLigatures: !(editorSettings.fontLigatures ?? true)
                      })
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                      (editorSettings.fontLigatures ?? true) ? 'bg-studio-amber' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        (editorSettings.fontLigatures ?? true) ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Tab Size */}
              {matchSetting('Tab Indentation', 'editor.tabSize') && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <FileCode2 className="w-4 h-4 text-studio-muted shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-white">Tab Indentation</div>
                      <div className="text-[11px] text-studio-muted font-mono">editor.tabSize</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/[0.05]">
                    {[2, 4].map((size) => (
                      <button
                        key={size}
                        onClick={() => updateEditorSettings({ tabSize: size })}
                        className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                          editorSettings.tabSize === size
                            ? 'bg-studio-amber text-studio-bg font-bold shadow-sm'
                            : 'text-studio-muted hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {size} Spaces
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Insert Spaces */}
              {matchSetting('Insert Spaces', 'editor.insertSpaces') && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <FileCode2 className="w-4 h-4 text-studio-muted shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-white">Insert Spaces</div>
                      <div className="text-[11px] text-studio-muted font-mono">
                        editor.insertSpaces (Indent with spaces or tabs)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/[0.05]">
                    <button
                      onClick={() => updateEditorSettings({ insertSpaces: true })}
                      className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                        editorSettings.insertSpaces
                          ? 'bg-studio-amber text-studio-bg font-bold shadow-sm'
                          : 'text-studio-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Spaces
                    </button>
                    <button
                      onClick={() => updateEditorSettings({ insertSpaces: false })}
                      className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                        !editorSettings.insertSpaces
                          ? 'bg-studio-amber text-studio-bg font-bold shadow-sm'
                          : 'text-studio-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Tabs
                    </button>
                  </div>
                </div>
              )}

              {/* Word Wrap */}
              {matchSetting('Word Wrap', 'editor.wordWrap') && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <WrapText className="w-4 h-4 text-studio-muted shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-white">Word Wrap</div>
                      <div className="text-[11px] text-studio-muted font-mono">editor.wordWrap</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/[0.05]">
                    <button
                      onClick={() => updateEditorSettings({ wordWrap: 'on' })}
                      className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                        editorSettings.wordWrap === 'on'
                          ? 'bg-studio-amber text-studio-bg font-bold shadow-sm'
                          : 'text-studio-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      On
                    </button>
                    <button
                      onClick={() => updateEditorSettings({ wordWrap: 'off' })}
                      className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                        editorSettings.wordWrap === 'off'
                          ? 'bg-studio-amber text-studio-bg font-bold shadow-sm'
                          : 'text-studio-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Off
                    </button>
                  </div>
                </div>
              )}

              {/* Line Numbers */}
              {matchSetting('Line Numbers', 'editor.lineNumbers') && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <ListOrdered className="w-4 h-4 text-studio-muted shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-white">Line Numbers</div>
                      <div className="text-[11px] text-studio-muted font-mono">
                        editor.lineNumbers
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/[0.05]">
                    {(['on', 'relative', 'off'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => updateEditorSettings({ lineNumbers: mode })}
                        className={`px-2.5 py-1 rounded text-xs font-mono capitalize transition-all cursor-pointer ${
                          editorSettings.lineNumbers === mode
                            ? 'bg-studio-amber text-studio-bg font-bold shadow-sm'
                            : 'text-studio-muted hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Format On Save */}
              {matchSetting('Format on Save', 'editor.formatOnSave') && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <Save className="w-4 h-4 text-studio-muted shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-white">Format on Save</div>
                      <div className="text-[11px] text-studio-muted font-mono">
                        editor.formatOnSave (Auto-beautify via LSP)
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      updateEditorSettings({ formatOnSave: !editorSettings.formatOnSave })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      editorSettings.formatOnSave ? 'bg-studio-emerald' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editorSettings.formatOnSave ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Minimap */}
              {matchSetting('Code Minimap', 'editor.minimap.enabled') && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-studio-muted shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-white">Code Minimap</div>
                      <div className="text-[11px] text-studio-muted font-mono">
                        editor.minimap.enabled
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => updateEditorSettings({ minimap: !editorSettings.minimap })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      editorSettings.minimap ? 'bg-studio-amber' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editorSettings.minimap ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Sync status */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-studio-muted">
                <CheckCircle2 className="w-4 h-4 text-studio-emerald" />
                <span>
                  {workspacePath
                    ? 'All changes automatically saved to .vscode/settings.json'
                    : 'Workspace not open (changes active in memory)'}
                </span>
              </div>
              <span className="text-[10px] text-studio-subtle font-mono">
                Shortcut: <kbd className="text-white">Ctrl + ,</kbd>
              </span>
            </div>
          </div>
        ) : (
          /* JSON Raw Editor Mode */
          <div className="p-5 flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-studio-muted">
                Edit raw JSON settings below. Press Apply to save.
              </span>
              <button
                onClick={handleSaveJson}
                className="px-3 py-1 bg-studio-amber hover:bg-studio-amber/90 text-studio-bg font-semibold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Apply JSON</span>
              </button>
            </div>

            {jsonError && (
              <div className="p-2.5 rounded-lg bg-studio-rose/15 border border-studio-rose/25 text-studio-rose text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}

            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value)
                setJsonError(null)
              }}
              rows={14}
              className="w-full bg-[#14161f] p-3 rounded-xl border border-white/10 text-white font-mono text-xs leading-relaxed outline-none focus:border-studio-amber/50 resize-none"
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}

import React, { useEffect } from 'react'
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
  ListOrdered
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { editorSettings, updateEditorSettings, workspacePath } = useEditorStore()

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-xl glass-panel bg-studio-card/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
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
                <span>Synchronized with</span>
                <span className="font-mono text-studio-amber">.vscode/settings.json</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
          {/* Section: Editor Ergonomics */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-studio-amber uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5" />
              <span>Editor Ergonomics</span>
            </div>

            {/* Font Size */}
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

            {/* Tab Size */}
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

            {/* Insert Spaces */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="flex items-center gap-3">
                <FileCode2 className="w-4 h-4 text-studio-muted shrink-0" />
                <div>
                  <div className="text-xs font-medium text-white">Insert Spaces</div>
                  <div className="text-[11px] text-studio-muted font-mono">editor.insertSpaces (Indent with spaces or tabs)</div>
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

            {/* Word Wrap */}
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

            {/* Line Numbers */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="flex items-center gap-3">
                <ListOrdered className="w-4 h-4 text-studio-muted shrink-0" />
                <div>
                  <div className="text-xs font-medium text-white">Line Numbers</div>
                  <div className="text-[11px] text-studio-muted font-mono">editor.lineNumbers</div>
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

            {/* Format On Save */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="flex items-center gap-3">
                <Save className="w-4 h-4 text-studio-muted shrink-0" />
                <div>
                  <div className="text-xs font-medium text-white">Format on Save</div>
                  <div className="text-[11px] text-studio-muted font-mono">editor.formatOnSave (Auto-beautify via LSP)</div>
                </div>
              </div>

              <button
                onClick={() => updateEditorSettings({ formatOnSave: !editorSettings.formatOnSave })}
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

            {/* Minimap */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-studio-muted shrink-0" />
                <div>
                  <div className="text-xs font-medium text-white">Code Minimap</div>
                  <div className="text-[11px] text-studio-muted font-mono">editor.minimap.enabled</div>
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
          </div>

          {/* Section: Workspace Sync Status */}
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
      </div>
    </div>
  )
}

import React, { useState, useMemo } from 'react'
import { Search, X, Keyboard, Command } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

interface ShortcutItem {
  id: string
  command: string
  keybinding: string
  category: 'General' | 'Editor & Tabs' | 'Editing' | 'Git & Version Control' | 'LSP & Diagnostics'
}

const SHORTCUT_REGISTRY: ShortcutItem[] = [
  // General
  { id: 'quick-open', command: 'Quick Open, Go to File...', keybinding: 'Ctrl+P', category: 'General' },
  { id: 'command-palette', command: 'Show All Commands (Command Palette)', keybinding: 'Ctrl+Shift+P', category: 'General' },
  { id: 'toggle-sidebar', command: 'Toggle Primary Side Bar', keybinding: 'Ctrl+B', category: 'General' },
  { id: 'toggle-terminal', command: 'Toggle Integrated Terminal / Problems Deck', keybinding: 'Ctrl+`', category: 'General' },
  { id: 'open-settings', command: 'Open Preferences & Settings', keybinding: 'Ctrl+,', category: 'General' },
  { id: 'keyboard-shortcuts', command: 'Open Keyboard Shortcuts Reference', keybinding: 'Ctrl+K Ctrl+S', category: 'General' },
  { id: 'workspace-symbols', command: 'Go to Symbol in Workspace', keybinding: 'Ctrl+T', category: 'General' },
  { id: 'go-to-line', command: 'Go to Line / Column', keybinding: 'Ctrl+G', category: 'General' },
  { id: 'go-to-symbol', command: 'Go to Symbol in Document', keybinding: 'Ctrl+Shift+O', category: 'General' },

  // Editor & Tabs
  { id: 'save-file', command: 'Save Active File', keybinding: 'Ctrl+S', category: 'Editor & Tabs' },
  { id: 'close-editor', command: 'Close Active Editor Tab', keybinding: 'Ctrl+W', category: 'Editor & Tabs' },
  { id: 'next-editor', command: 'Cycle Next Editor Tab', keybinding: 'Ctrl+Tab', category: 'Editor & Tabs' },
  { id: 'prev-editor', command: 'Cycle Previous Editor Tab', keybinding: 'Ctrl+Shift+Tab', category: 'Editor & Tabs' },
  { id: 'reopen-closed', command: 'Reopen Recently Closed Editor', keybinding: 'Ctrl+Shift+T', category: 'Editor & Tabs' },

  // Editing
  { id: 'multi-cursor', command: 'Add Selection To Next Find Match (Multi-Cursor)', keybinding: 'Ctrl+D', category: 'Editing' },
  { id: 'move-line-up', command: 'Move Line / Selection Up', keybinding: 'Alt+Up', category: 'Editing' },
  { id: 'move-line-down', command: 'Move Line / Selection Down', keybinding: 'Alt+Down', category: 'Editing' },
  { id: 'copy-line-down', command: 'Copy Line Down', keybinding: 'Shift+Alt+Down', category: 'Editing' },
  { id: 'toggle-line-comment', command: 'Toggle Line Comment', keybinding: 'Ctrl+/', category: 'Editing' },
  { id: 'toggle-block-comment', command: 'Toggle Block Comment', keybinding: 'Shift+Alt+A', category: 'Editing' },
  { id: 'format-document', command: 'Format Document (Prettier / LSP)', keybinding: 'Shift+Alt+F', category: 'Editing' },
  { id: 'organize-imports', command: 'Organize Imports', keybinding: 'Shift+Alt+O', category: 'Editing' },

  // Git & Version Control
  { id: 'git-commit', command: 'Commit Staged Changes / Amend', keybinding: 'Ctrl+Enter', category: 'Git & Version Control' },
  { id: 'git-panel', command: 'Show Source Control Sidebar', keybinding: 'Ctrl+Shift+G', category: 'Git & Version Control' },
  { id: 'git-next-change', command: 'Go to Next Git Change (Gutter)', keybinding: 'Alt+F3', category: 'Git & Version Control' },
  { id: 'git-prev-change', command: 'Go to Previous Git Change (Gutter)', keybinding: 'Shift+Alt+F3', category: 'Git & Version Control' },

  // LSP & Diagnostics
  { id: 'go-to-def', command: 'Go to Definition', keybinding: 'F12 / Ctrl+Click', category: 'LSP & Diagnostics' },
  { id: 'find-refs', command: 'Find All References', keybinding: 'Shift+F12', category: 'LSP & Diagnostics' },
  { id: 'rename-symbol', command: 'Rename Symbol', keybinding: 'F2', category: 'LSP & Diagnostics' },
  { id: 'next-problem', command: 'Go to Next Problem (Error/Warning)', keybinding: 'F8', category: 'LSP & Diagnostics' },
  { id: 'prev-problem', command: 'Go to Previous Problem', keybinding: 'Shift+F8', category: 'LSP & Diagnostics' }
]

export const KeyboardShortcutsModal: React.FC = () => {
  const { isKeyboardShortcutsOpen, setKeyboardShortcutsOpen } = useEditorStore()
  const [query, setQuery] = useState('')

  const filteredShortcuts = useMemo(() => {
    if (!query.trim()) return SHORTCUT_REGISTRY
    const q = query.toLowerCase()
    return SHORTCUT_REGISTRY.filter(
      (item) =>
        item.command.toLowerCase().includes(q) ||
        item.keybinding.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    )
  }, [query])

  const grouped = useMemo(() => {
    const map = new Map<string, ShortcutItem[]>()
    for (const item of filteredShortcuts) {
      if (!map.has(item.category)) {
        map.set(item.category, [])
      }
      map.get(item.category)!.push(item)
    }
    return map
  }, [filteredShortcuts])

  if (!isKeyboardShortcutsOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4"
      onClick={() => setKeyboardShortcutsOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-studio-card/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06] bg-white/[0.01]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-studio-amber/15 text-studio-amber">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Keyboard Shortcuts</h2>
              <p className="text-[11px] text-studio-muted">
                Muscle memory keybindings mapped to VS Code ergonomics
              </p>
            </div>
          </div>
          <button
            onClick={() => setKeyboardShortcutsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
            title="Close (Escape)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-white/[0.04] bg-white/[0.02]">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <Search className="w-4 h-4 text-studio-muted shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search shortcuts by command or key..."
              className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted font-sans"
              autoFocus
            />
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category} className="flex flex-col gap-1.5">
              <div className="text-[11px] font-mono font-semibold text-studio-amber uppercase tracking-wider px-1">
                {category}
              </div>
              <div className="flex flex-col gap-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] transition-colors"
                  >
                    <span className="text-xs text-studio-text select-text">{item.command}</span>
                    <div className="flex items-center gap-1 font-mono text-[11px] shrink-0">
                      {item.keybinding.split(' ').map((chord, cIdx) => (
                        <React.Fragment key={cIdx}>
                          {cIdx > 0 && <span className="text-studio-muted text-[10px]">then</span>}
                          <div className="flex items-center gap-1">
                            {chord.split('+').map((key, kIdx) => (
                              <kbd
                                key={kIdx}
                                className="px-2 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-studio-amber shadow-sm text-[10px] font-semibold select-none"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredShortcuts.length === 0 && (
            <div className="p-8 text-center text-xs text-studio-muted">
              No shortcuts found matching &quot;{query}&quot;
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between text-[11px] text-studio-muted font-mono">
          <span>{filteredShortcuts.length} shortcuts available</span>
          <span>Press Escape to close</span>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect, useRef } from 'react'
import { OmniHeader } from './components/layout/OmniHeader'
import { WorkspaceDeck } from './components/layout/WorkspaceDeck'
import { EditorCanvas } from './components/editor/EditorCanvas'
import { ProjectDeck } from './components/project/ProjectDeck'
import { FloatingHUD } from './components/layout/FloatingHUD'
import { BottomDeck } from './components/terminal/BottomDeck'
import { OmniJumpModal } from './components/modals/OmniJumpModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { KeyboardShortcutsModal } from './components/modals/KeyboardShortcutsModal'
import { useEditorStore } from './store/useEditorStore'
import { useDebugStore } from './store/useDebugStore'

export const App: React.FC = () => {
  const {
    layoutMode,
    isBottomDeckOpen,
    toggleBottomDeck,
    setBottomDeckOpen,
    toggleSidebar,
    setActiveSidebarTab,
    isSettingsModalOpen,
    setSettingsModalOpen,
    toggleSettingsModal,
    isKeyboardShortcutsOpen,
    setKeyboardShortcutsOpen,
    toggleKeyboardShortcuts,
    isZenMode,
    toggleZenMode
  } = useEditorStore()
  const [isOmniJumpOpen, setIsOmniJumpOpen] = useState(false)
  const [omniJumpMode, setOmniJumpMode] = useState<'files' | 'commands' | 'symbols' | 'line'>('files')
  const chordPendingRef = useRef<string | null>(null)
  const chordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Listen to open-command-palette, open-symbol-jump, and open-goto-line events
  useEffect(() => {
    const handleOpenCmd = () => {
      setOmniJumpMode('commands')
      setIsOmniJumpOpen(true)
    }
    const handleOpenSymbol = () => {
      setOmniJumpMode('symbols')
      setIsOmniJumpOpen(true)
    }
    const handleOpenGotoLine = () => {
      setOmniJumpMode('line')
      setIsOmniJumpOpen(true)
    }
    window.addEventListener('open-command-palette', handleOpenCmd)
    window.addEventListener('open-symbol-jump', handleOpenSymbol)
    window.addEventListener('open-goto-line', handleOpenGotoLine)
    const unsubDap = useDebugStore.getState().initDapEventListener()
    return () => {
      window.removeEventListener('open-command-palette', handleOpenCmd)
      window.removeEventListener('open-symbol-jump', handleOpenSymbol)
      window.removeEventListener('open-goto-line', handleOpenGotoLine)
      unsubDap()
    }
  }, [])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check pending chord first
      if (chordPendingRef.current === 'ctrl+k') {
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
          return // modifier key pressed while waiting for second key
        }
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current)
        chordPendingRef.current = null
        if (e.key.toLowerCase() === 's') {
          e.preventDefault()
          toggleKeyboardShortcuts()
          return
        }
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault()
          toggleZenMode()
          return
        }
      }

      // Start chord: Ctrl+K
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current)
        chordPendingRef.current = 'ctrl+k'
        chordTimeoutRef.current = setTimeout(() => {
          chordPendingRef.current = null
        }, 1500)
        return
      }

      // Debug: Start or Continue via F5 / Restart via Ctrl+Shift+F5 / Stop via Shift+F5
      if (e.key === 'F5') {
        e.preventDefault()
        if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
          useDebugStore.getState().restartDebugging()
        } else if (e.shiftKey) {
          useDebugStore.getState().stopDebugging()
        } else {
          useDebugStore.getState().startDebugging()
        }
      }

      // Debug: Step Over via F10
      if (e.key === 'F10') {
        const dbgStatus = useDebugStore.getState().status
        if (dbgStatus === 'stopped') {
          e.preventDefault()
          useDebugStore.getState().stepOver()
        }
      }

      // Full Screen or Debug Step via F11 / Step Out via Shift+F11
      if (e.key === 'F11') {
        e.preventDefault()
        const dbgStatus = useDebugStore.getState().status
        if (dbgStatus === 'stopped') {
          if (e.shiftKey) {
            useDebugStore.getState().stepOut()
          } else {
            useDebugStore.getState().stepInto()
          }
        } else {
          window.maestroAPI?.toggleFullScreen?.()
        }
      }

      // Toggle Terminal/BottomDeck via Ctrl+` (backtick)
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        toggleBottomDeck()
      }
      // Open Command Palette via Ctrl+Shift+P
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setOmniJumpMode('commands')
        setIsOmniJumpOpen(true)
      }
      // Open Symbol Jump via Ctrl+Shift+O
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        setOmniJumpMode('symbols')
        setIsOmniJumpOpen(true)
      }
      // Open Omni Jump (Files/Tasks) via Ctrl+P
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setOmniJumpMode('files')
        setIsOmniJumpOpen(true)
      }
      // Go to line via Ctrl+G
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        setOmniJumpMode('line')
        setIsOmniJumpOpen(true)
      }
      // Workspace Symbols via Ctrl+T
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        setOmniJumpMode('workspace-symbols')
        setIsOmniJumpOpen(true)
      }
      // Reopen Closed Editor via Ctrl+Shift+T
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        useEditorStore.getState().reopenClosedFile()
      }
      // Switch Next/Previous Editor Tabs via Ctrl+Tab / Ctrl+Shift+Tab
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          useEditorStore.getState().previousEditor()
        } else {
          useEditorStore.getState().nextEditor()
        }
      }
      // Navigate Back via Alt+Left
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowLeft') {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          useEditorStore.getState().navigateBack()
        }
      }
      // Navigate Forward via Alt+Right
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowRight') {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          useEditorStore.getState().navigateForward()
        }
      }
      // Global Search in Files via Ctrl+Shift+F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setActiveSidebarTab('search')
      }
      // Explorer via Ctrl+Shift+E
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        setActiveSidebarTab('files')
      }
      // Source Control / Git via Ctrl+Shift+G
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        setActiveSidebarTab('git')
      }
      // Run and Debug Panel via Ctrl+Shift+D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setActiveSidebarTab('debug')
      }
      // Problems Panel via Ctrl+Shift+M
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault()
        setActiveBottomTab('problems')
        setBottomDeckOpen(true)
      }
      // Toggle Sidebar via Ctrl+B
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
      // Tasks: Run Build Task via Ctrl+Shift+B
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        useEditorStore.getState().runBuildTask()
      }
      // Toggle Settings Modal via Ctrl+,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        toggleSettingsModal()
      }
      // Navigate Problems via F8 / Shift+F8
      if (e.key === 'F8') {
        e.preventDefault()
        if (e.shiftKey) {
          useEditorStore.getState().jumpToPrevProblem()
        } else {
          useEditorStore.getState().jumpToNextProblem()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current)
    }
  }, [
    toggleBottomDeck,
    toggleSidebar,
    setActiveSidebarTab,
    toggleSettingsModal,
    toggleKeyboardShortcuts,
    toggleZenMode
  ])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-studio-bg text-studio-text font-sans relative">
      {/* Omni Floating Header (hidden in Zen Mode) */}
      {!isZenMode && <OmniHeader onOpenOmniJump={() => setIsOmniJumpOpen(true)} />}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Workspace Deck (File Tree & Stats Drawer) */}
        {!isZenMode && <WorkspaceDeck />}

        {/* Dynamic Canvas Container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {layoutMode === 'editor' && <EditorCanvas />}

            {layoutMode === 'project' && <ProjectDeck />}

            {layoutMode === 'split' && (
              <div className="flex-1 flex overflow-hidden">
                <div className="w-1/2 flex overflow-hidden border-r border-white/5">
                  <EditorCanvas />
                </div>
                <div className="w-1/2 flex overflow-hidden">
                  <ProjectDeck />
                </div>
              </div>
            )}
          </div>

          {/* Integrated Tabbed Bottom Deck (Terminal + Problems) */}
          {isBottomDeckOpen && !isZenMode && (
            <BottomDeck onClose={() => setBottomDeckOpen(false)} />
          )}
        </div>
      </div>

      {/* Floating Status HUD (hidden in Zen Mode) */}
      {!isZenMode && <FloatingHUD />}

      {/* Zen Mode Exit Pill */}
      {isZenMode && (
        <button
          onClick={() => toggleZenMode()}
          className="fixed top-3 right-4 z-40 px-3 py-1 rounded-lg bg-studio-card/85 border border-white/10 text-studio-muted hover:text-white text-xs backdrop-blur-md transition-all flex items-center gap-1.5 opacity-40 hover:opacity-100 cursor-pointer shadow-lg"
          title="Exit Zen Mode (Ctrl+K Z)"
        >
          <span>Exit Zen Mode (Ctrl+K Z)</span>
        </button>
      )}

      {/* Omni-Jump Quick Switcher & Command Palette Modal (Ctrl+P / Ctrl+Shift+P) */}
      <OmniJumpModal
        isOpen={isOmniJumpOpen}
        onClose={() => setIsOmniJumpOpen(false)}
        initialMode={omniJumpMode}
      />

      {/* Preferences & Settings Modal (Ctrl+,) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      {/* Keyboard Shortcuts Reference Modal (Ctrl+K Ctrl+S) */}
      <KeyboardShortcutsModal
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setKeyboardShortcutsOpen(false)}
      />
    </div>
  )
}

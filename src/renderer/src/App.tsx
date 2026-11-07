import React, { useState, useEffect } from 'react'
import { OmniHeader } from './components/layout/OmniHeader'
import { WorkspaceDeck } from './components/layout/WorkspaceDeck'
import { EditorCanvas } from './components/editor/EditorCanvas'
import { ProjectDeck } from './components/project/ProjectDeck'
import { FloatingHUD } from './components/layout/FloatingHUD'
import { BottomDeck } from './components/terminal/BottomDeck'
import { OmniJumpModal } from './components/modals/OmniJumpModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { useEditorStore } from './store/useEditorStore'

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
    toggleSettingsModal
  } = useEditorStore()
  const [isOmniJumpOpen, setIsOmniJumpOpen] = useState(false)
  const [omniJumpMode, setOmniJumpMode] = useState<'files' | 'commands' | 'symbols' | 'line'>('files')

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
    return () => {
      window.removeEventListener('open-command-palette', handleOpenCmd)
      window.removeEventListener('open-symbol-jump', handleOpenSymbol)
      window.removeEventListener('open-goto-line', handleOpenGotoLine)
    }
  }, [])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleBottomDeck, toggleSidebar, setActiveSidebarTab, toggleSettingsModal])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-studio-bg text-studio-text font-sans relative">
      {/* Omni Floating Header */}
      <OmniHeader onOpenOmniJump={() => setIsOmniJumpOpen(true)} />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Workspace Deck (File Tree & Stats Drawer) */}
        <WorkspaceDeck />

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
          {isBottomDeckOpen && (
            <BottomDeck onClose={() => setBottomDeckOpen(false)} />
          )}
        </div>
      </div>

      {/* Floating Status HUD */}
      <FloatingHUD />

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
    </div>
  )
}

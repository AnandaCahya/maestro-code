import React, { useState, useEffect } from 'react'
import { OmniHeader } from './components/layout/OmniHeader'
import { WorkspaceDeck } from './components/layout/WorkspaceDeck'
import { EditorCanvas } from './components/editor/EditorCanvas'
import { ProjectDeck } from './components/project/ProjectDeck'
import { FloatingHUD } from './components/layout/FloatingHUD'
import { BottomDeck } from './components/terminal/BottomDeck'
import { OmniJumpModal } from './components/modals/OmniJumpModal'
import { useEditorStore } from './store/useEditorStore'

export const App: React.FC = () => {
  const { layoutMode, isBottomDeckOpen, toggleBottomDeck, setBottomDeckOpen } = useEditorStore()
  const [isOmniJumpOpen, setIsOmniJumpOpen] = useState(false)

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Terminal/BottomDeck via Ctrl+` (backtick)
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        toggleBottomDeck()
      }
      // Open Omni Jump via Ctrl+P
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setIsOmniJumpOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleBottomDeck])

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

      {/* Omni-Jump Quick Switcher Modal (Ctrl+P) */}
      <OmniJumpModal
        isOpen={isOmniJumpOpen}
        onClose={() => setIsOmniJumpOpen(false)}
      />
    </div>
  )
}

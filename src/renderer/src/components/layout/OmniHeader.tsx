import React, { useState, useEffect } from 'react'
import {
  Code2,
  Columns2,
  KanbanSquare,
  Search,
  FolderTree,
  Minus,
  Square,
  Copy,
  X,
  Target,
  Coffee,
  Sparkles
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

interface OmniHeaderProps {
  onOpenOmniJump: () => void
}

export const OmniHeader: React.FC<OmniHeaderProps> = ({ onOpenOmniJump }) => {
  const {
    workspacePath,
    layoutMode,
    setLayoutMode,
    isSidebarOpen,
    toggleSidebar,
    focusTask,
    setFocusTask
  } = useEditorStore()

  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.maestroAPI?.isMaximized?.().then(setIsMaximized)
  }, [])

  const handleMinimize = () => window.maestroAPI?.minimizeWindow?.()
  const handleMaximize = async () => {
    const res = await window.maestroAPI?.maximizeWindow?.()
    setIsMaximized(res)
  }
  const handleClose = () => window.maestroAPI?.closeWindow?.()

  const workspaceName = workspacePath ? workspacePath.split(/[\\/]/).pop() : 'No Project'

  return (
    <header className="h-13 px-4 flex items-center justify-between app-drag select-none z-30 border-b border-white/[0.04]">
      {/* Left: Branding & Workspace */}
      <div className="flex items-center gap-3 app-no-drag">
        {/* Toggle Sidebar Button */}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            isSidebarOpen
              ? 'bg-studio-accent/10 text-studio-accent border border-studio-accent/20'
              : 'glass-pill text-studio-muted hover:text-white'
          }`}
          title="Toggle Sidebar"
        >
          <FolderTree className="w-3.5 h-3.5" />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-studio-accent/15 border border-studio-accent/30 flex items-center justify-center text-studio-accent">
            <Coffee className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wide text-white">
              Maestro
            </span>
            <span className="text-[10px] text-studio-muted font-mono truncate max-w-[150px]">
              / {workspaceName}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Omni-Mode Switcher (Code | Split | Project) */}
      <div className="flex items-center app-no-drag">
        <div className="glass-panel p-1 rounded-xl flex items-center gap-1">
          <button
            onClick={() => setLayoutMode('editor')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              layoutMode === 'editor'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-studio-muted hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>

          <button
            onClick={() => setLayoutMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              layoutMode === 'split'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-studio-muted hover:text-white'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Dual Deck</span>
          </button>

          <button
            onClick={() => setLayoutMode('project')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              layoutMode === 'project'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-studio-muted hover:text-white'
            }`}
          >
            <KanbanSquare className="w-3.5 h-3.5" />
            <span>Tasks</span>
          </button>

          <button
            onClick={() => setLayoutMode('ai')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              layoutMode === 'ai'
                ? 'bg-studio-accent/20 text-studio-accent font-semibold border border-studio-accent/30 shadow-glow-accent'
                : 'text-studio-muted hover:text-white'
            }`}
            title="AI Studio: Dedicated AI Chat and Orchestration"
          >
            <Sparkles className="w-3.5 h-3.5 text-studio-accent" />
            <span>AI Studio</span>
          </button>
        </div>
      </div>

      {/* Right: Active Focus Task & Window Controls */}
      <div className="flex items-center gap-2.5 app-no-drag">
        {/* Focus Task Chip */}
        {focusTask && (
          <div className="flex items-center gap-1.5 glass-pill px-2.5 py-1 rounded-lg text-xs text-studio-accent border-studio-accent/20">
            <Target className="w-3 h-3 text-studio-accent" />
            <span className="truncate max-w-[140px] font-medium">{focusTask.title}</span>
            <button
              onClick={() => setFocusTask(null)}
              className="text-studio-muted hover:text-white ml-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Command Search Launcher */}
        <button
          onClick={onOpenOmniJump}
          className="flex items-center gap-2 glass-pill px-2.5 py-1 rounded-lg text-xs text-studio-muted hover:text-white transition-all cursor-pointer"
          title="Command Palette (Ctrl+P)"
        >
          <Search className="w-3 h-3" />
          <span className="text-[11px]">Search</span>
          <kbd className="text-[9px] bg-white/5 px-1 py-0.2 rounded font-mono text-studio-muted">
            Ctrl+P
          </kbd>
        </button>

        {/* Window Controls */}
        <div className="flex items-center gap-1 ml-1.5">
          <button
            onClick={handleMinimize}
            className="w-6 h-6 rounded-md hover:bg-white/5 flex items-center justify-center text-studio-muted hover:text-white transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={handleMaximize}
            className="w-6 h-6 rounded-md hover:bg-white/5 flex items-center justify-center text-studio-muted hover:text-white transition-colors cursor-pointer"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Copy className="w-2.5 h-2.5" /> : <Square className="w-2.5 h-2.5" />}
          </button>
          <button
            onClick={handleClose}
            className="w-6 h-6 rounded-md hover:bg-rose-500/20 text-studio-muted hover:text-rose-300 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  )
}

import React, { useState, useEffect } from 'react'
import { Search, FileCode2, KanbanSquare, ArrowRight } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import type { FileItem } from '../../../../preload/index.d'

interface OmniJumpModalProps {
  isOpen: boolean
  onClose: () => void
}

export const OmniJumpModal: React.FC<OmniJumpModalProps> = ({ isOpen, onClose }) => {
  const { fileTree, openFile, setLayoutMode } = useEditorStore()
  const { projectData } = useProjectStore()
  const [query, setQuery] = useState('')

  const getAllFiles = (items: FileItem[]): FileItem[] => {
    let result: FileItem[] = []
    for (const item of items) {
      if (!item.isDirectory) {
        result.push(item)
      }
      if (item.children) {
        result = result.concat(getAllFiles(item.children))
      }
    }
    return result
  }

  const allFiles = getAllFiles(fileTree)
  const filteredFiles = allFiles
    .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6)

  const filteredTasks = projectData.tasks
    .filter(
      (t) =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.description?.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 4)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        if (isOpen) onClose()
        else setQuery('')
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSelectFile = async (filePath: string, name: string) => {
    try {
      const content = await window.maestroAPI.readFile(filePath)
      openFile({ path: filePath, name, content })
      onClose()
    } catch (err) {
      console.error('Failed to open file via jump:', err)
    }
  }

  const handleSelectTask = () => {
    setLayoutMode('project')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4 z-50 select-none">
      <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-studio-card">
        {/* Search Input */}
        <div className="p-3.5 border-b border-white/[0.04] flex items-center gap-2.5">
          <Search className="w-4 h-4 text-studio-amber shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type file or task name..."
            className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted"
            autoFocus
          />
          <kbd className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-studio-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
          {filteredFiles.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[9px] font-semibold tracking-wider text-studio-muted uppercase font-mono">
                Files
              </div>
              <div className="flex flex-col gap-0.5">
                {filteredFiles.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => handleSelectFile(file.path, file.name)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs group transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode2 className="w-3.5 h-3.5 text-studio-muted group-hover:text-studio-text transition-colors shrink-0" />
                      <span className="font-normal text-white truncate">{file.name}</span>
                      <span className="text-[10px] text-studio-muted font-mono truncate max-w-[180px]">
                        {file.path}
                      </span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredTasks.length > 0 && (
            <div className="mt-1 pt-1 border-t border-white/[0.04]">
              <div className="px-2 py-1 text-[9px] font-semibold tracking-wider text-studio-muted uppercase font-mono">
                Tasks
              </div>
              <div className="flex flex-col gap-0.5">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={handleSelectTask}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs group transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <KanbanSquare className="w-3.5 h-3.5 text-studio-amber shrink-0" />
                      <span className="font-normal text-white truncate">{task.title}</span>
                      <span className="text-[9px] text-studio-muted uppercase font-mono px-1 py-0.2 rounded bg-white/5">
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredFiles.length === 0 && filteredTasks.length === 0 && (
            <div className="p-4 text-center text-xs text-studio-muted font-mono">
              No matching results
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

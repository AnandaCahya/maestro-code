import React, { useState, useEffect } from 'react'
import { Globe, Plus, Trash2, Edit3, X, Check, RefreshCw } from 'lucide-react'
import type { GitRemote } from '../../../../preload/index.d'
import { useEditorStore } from '../../store/useEditorStore'

interface GitRemoteModalProps {
  isOpen: boolean
  onClose: () => void
}

export const GitRemoteModal: React.FC<GitRemoteModalProps> = ({ isOpen, onClose }) => {
  const { workspacePath, setStatusMessage } = useEditorStore()
  const [remotes, setRemotes] = useState<GitRemote[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [newName, setNewName] = useState<string>('')
  const [newUrl, setNewUrl] = useState<string>('')
  const [isAdding, setIsAdding] = useState<boolean>(false)
  const [editingRemote, setEditingRemote] = useState<string | null>(null)
  const [editName, setEditName] = useState<string>('')

  const loadRemotes = async () => {
    if (!workspacePath) return
    setIsLoading(true)
    try {
      const list = await window.maestroAPI.gitGetRemotes(workspacePath)
      setRemotes(list || [])
    } catch {
      setRemotes([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadRemotes()
      setIsAdding(false)
      setEditingRemote(null)
    }
  }, [isOpen, workspacePath])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleAddRemote = async () => {
    if (!workspacePath || !newName.trim() || !newUrl.trim()) return
    const res = await window.maestroAPI.gitAddRemote(workspacePath, newName.trim(), newUrl.trim())
    if (res.ok) {
      setStatusMessage(`Added remote '${newName.trim()}'`)
      setNewName('')
      setNewUrl('')
      setIsAdding(false)
      await loadRemotes()
    } else {
      setStatusMessage(`Error adding remote: ${res.message}`)
    }
  }

  const handleRenameRemote = async (oldName: string) => {
    if (!workspacePath || !editName.trim() || editName.trim() === oldName) {
      setEditingRemote(null)
      return
    }
    const res = await window.maestroAPI.gitRenameRemote(workspacePath, oldName, editName.trim())
    if (res.ok) {
      setStatusMessage(`Renamed remote to '${editName.trim()}'`)
      setEditingRemote(null)
      await loadRemotes()
    } else {
      setStatusMessage(`Error renaming remote: ${res.message}`)
    }
  }

  const handleRemoveRemote = async (name: string) => {
    if (!workspacePath) return
    if (!window.confirm(`Are you sure you want to remove Git remote '${name}'?`)) return
    const res = await window.maestroAPI.gitRemoveRemote(workspacePath, name)
    if (res.ok) {
      setStatusMessage(`Removed remote '${name}'`)
      await loadRemotes()
    } else {
      setStatusMessage(`Error removing remote: ${res.message}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#181a22] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white/90">
        {/* Header */}
        <div className="h-12 px-5 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#16181f]/80">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Globe className="w-4 h-4 text-studio-amber" />
            <span>Git Remotes</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={loadRemotes}
              disabled={isLoading}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Refresh Remotes"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          {remotes.length === 0 && !isAdding ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-studio-muted text-xs">
              <Globe className="w-8 h-8 text-white/20 mb-2" />
              <p>No Git remotes configured for this repository.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {remotes.map((remote) => (
                <div
                  key={remote.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] transition-colors"
                >
                  <div className="flex flex-col min-w-0 pr-3">
                    {editingRemote === remote.name ? (
                      <div className="flex items-center gap-1.5 mb-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-0.5 rounded bg-black/40 border border-studio-amber/40 text-xs font-mono text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameRemote(remote.name)
                            if (e.key === 'Escape') setEditingRemote(null)
                          }}
                        />
                        <button
                          onClick={() => handleRenameRemote(remote.name)}
                          className="p-1 rounded bg-studio-amber/20 hover:bg-studio-amber/30 text-studio-amber cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-semibold text-xs font-mono text-studio-amber flex items-center gap-2">
                        {remote.name}
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-white/50 truncate">
                      {remote.fetchUrl}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingRemote(remote.name)
                        setEditName(remote.name)
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors cursor-pointer"
                      title="Rename Remote"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveRemote(remote.name)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-white/60 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove Remote"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Remote Form */}
          {isAdding ? (
            <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-studio-amber/5 border border-studio-amber/20 mt-1">
              <span className="text-xs font-medium text-studio-amber">Add New Remote</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Remote name (e.g. origin, upstream)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-1/3 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.1] text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-studio-amber/50"
                />
                <input
                  type="text"
                  placeholder="URL (e.g. git@github.com:user/repo.git)"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.1] text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-studio-amber/50"
                />
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1 rounded-lg text-xs hover:bg-white/[0.06] text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRemote}
                  disabled={!newName.trim() || !newUrl.trim()}
                  className="px-3 py-1 rounded-lg text-xs bg-studio-amber text-[#121318] font-semibold hover:bg-studio-amber/90 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Save Remote
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-white/[0.1] hover:border-studio-amber/40 hover:bg-studio-amber/[0.04] text-xs text-white/70 hover:text-studio-amber transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Remote</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="h-11 px-5 border-t border-white/[0.06] bg-[#16181f]/40 flex items-center justify-between text-xs text-studio-muted">
          <span>{remotes.length} remote(s) configured</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

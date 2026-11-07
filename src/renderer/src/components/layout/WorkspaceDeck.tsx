import React, { useState, useEffect } from 'react'
import {
  FolderOpen,
  Folder,
  FileCode2,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Search,
  ListTodo,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit3,
  X,
  Check,
  Plus,
  Minus,
  RotateCcw,
  AlertCircle,
  GitBranch,
  GitCommit,
  ArrowUp,
  ArrowDown,
  FileDiff,
  Replace,
  CaseSensitive,
  WholeWord,
  Regex,
  ArrowRight,
  Copy,
  FolderSearch,
  Archive
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import type { FileItem, GitFileStatus, SearchMatch } from '../../../preload/index.d'

export const WorkspaceDeck: React.FC = () => {
  const {
    workspacePath,
    fileTree,
    setWorkspacePath,
    setFileTree,
    openFile,
    closeFile,
    isSidebarOpen,
    setLayoutMode,
    activeSidebarTab,
    setActiveSidebarTab,
    gitStatus,
    openDiff,
    refreshGitStatus,
    stageFile,
    unstageFile,
    stageAllFiles,
    unstageAllFiles,
    discardFileChanges,
    abortMerge,
    continueMerge,
    gitStashes,
    fetchGitStashes,
    gitStashSave,
    gitStashPop,
    gitStashApply,
    gitStashDrop,
    gitFetch,
    setStatusMessage,
    setCursorPosition,
    setActiveFile,
    globalSearchQuery,
    setGlobalSearchQuery,
    globalReplaceQuery,
    setGlobalReplaceQuery,
    globalSearchResults,
    isSearching,
    searchOptions,
    setSearchOptions,
    executeGlobalSearch,
    executeGlobalReplace,
    focusTask
  } = useEditorStore()

  const { projectData, setProjectData } = useProjectStore()
  const [filterQuery, setFilterQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const [subFolders, setSubFolders] = useState<Record<string, FileItem[]>>({})

  // Creation State
  const [creationMode, setCreationMode] = useState<'file' | 'folder' | null>(null)
  const [creationTargetDir, setCreationTargetDir] = useState<string>('')
  const [newItemName, setNewItemName] = useState('')

  // Rename State
  const [renamingItem, setRenamingItem] = useState<FileItem | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    item: FileItem
  } | null>(null)

  // Git Commit State
  const [commitMessage, setCommitMessage] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)

  // Search Replace Box toggle
  const [showReplaceInput, setShowReplaceInput] = useState(false)
  const [expandedSearchFiles, setExpandedSearchFiles] = useState<Record<string, boolean>>({})

  const handleOpenFolder = async () => {
    try {
      const selected = await window.maestroAPI.openDirectoryDialog()
      if (selected) {
        setWorkspacePath(selected)
        const entries = await window.maestroAPI.readDirectory(selected)
        setFileTree(entries)
        const proj = await window.maestroAPI.loadProjectData(selected)
        setProjectData(proj)
        await refreshGitStatus()
      }
    } catch (err) {
      console.error('Error opening folder:', err)
    }
  }

  const handleRefresh = async () => {
    if (!workspacePath) return
    const entries = await window.maestroAPI.readDirectory(workspacePath)
    setFileTree(entries)
    await refreshGitStatus()

    for (const folderPath of Object.keys(expandedFolders)) {
      if (expandedFolders[folderPath]) {
        try {
          const children = await window.maestroAPI.readDirectory(folderPath)
          setSubFolders((prev) => ({ ...prev, [folderPath]: children }))
        } catch {
          // ignore
        }
      }
    }
  }

  // Real-time File System Watcher
  useEffect(() => {
    if (!workspacePath) return

    window.maestroAPI?.watchWorkspace(workspacePath)

    const unsubscribe = window.maestroAPI?.onFileChanged(async (event) => {
      // Re-read file tree and subfolders
      await handleRefresh()

      // If an open file was modified externally, check if we need to reload it
      const currentOpenFiles = useEditorStore.getState().openFiles
      const match = currentOpenFiles.find((f) => {
        const norm = f.path.replace(/\\/g, '/')
        return norm.endsWith(event.filename) || event.filename.endsWith(f.name)
      })

      if (match) {
        try {
          const fresh = await window.maestroAPI.readFile(match.path)
          if (!match.isDirty) {
            useEditorStore.getState().updateFileContent(match.path, fresh)
            useEditorStore.getState().markFileSaved(match.path)
            useEditorStore.getState().setStatusMessage(`Synchronized ${match.name} from disk`)
            setTimeout(() => useEditorStore.getState().setStatusMessage('Ready'), 2000)
          } else {
            useEditorStore.getState().setExternalFileConflict({
              filePath: match.path,
              fileName: match.name,
              diskContent: fresh
            })
          }
        } catch {
          // ignore
        }
      }
    })

    return () => {
      unsubscribe?.()
    }
  }, [workspacePath, expandedFolders])

  const handleRevealInOS = (e: React.MouseEvent, targetPath: string) => {
    e.stopPropagation()
    window.maestroAPI?.revealInOS(targetPath)
  }

  const handleCopyPath = (e: React.MouseEvent, targetPath: string) => {
    e.stopPropagation()
    if (workspacePath && targetPath.startsWith(workspacePath)) {
      const rel = targetPath.replace(workspacePath, '').replace(/^[\\/]/, '')
      navigator.clipboard.writeText(rel)
      setStatusMessage(`Copied relative path: ${rel}`)
    } else {
      navigator.clipboard.writeText(targetPath)
      setStatusMessage('Copied path to clipboard')
    }
    setTimeout(() => setStatusMessage('Ready'), 2000)
  }

  const handleItemClick = async (item: FileItem) => {
    if (item.isDirectory) {
      const isExpanded = !expandedFolders[item.path]
      setExpandedFolders((prev) => ({ ...prev, [item.path]: isExpanded }))

      if (isExpanded && !subFolders[item.path]) {
        const children = await window.maestroAPI.readDirectory(item.path)
        setSubFolders((prev) => ({ ...prev, [item.path]: children }))
      }
    } else {
      try {
        const content = await window.maestroAPI.readFile(item.path)
        openFile({
          path: item.path,
          name: item.name,
          content
        })
      } catch (err) {
        console.error('Error reading file:', err)
      }
    }
  }

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null)
    if (contextMenu) {
      window.addEventListener('click', handleCloseMenu)
      window.addEventListener('contextmenu', handleCloseMenu)
    }
    return () => {
      window.removeEventListener('click', handleCloseMenu)
      window.removeEventListener('contextmenu', handleCloseMenu)
    }
  }, [contextMenu])

  const handleDuplicateItem = async (item: FileItem) => {
    try {
      const newPath = await window.maestroAPI.duplicatePath(item.path)
      setStatusMessage(`Duplicated: ${newPath.split(/[\\/]/).pop()}`)
      setTimeout(() => setStatusMessage('Ready'), 2000)
      if (workspacePath) {
        const entries = await window.maestroAPI.readDirectory(workspacePath)
        setFileTree(entries)
      }
    } catch (err) {
      console.error('Failed to duplicate:', err)
      setStatusMessage('Failed to duplicate item')
    }
  }

  const handleCreateSubmit = async () => {
    if (!newItemName.trim() || !workspacePath) return

    const targetDir = creationTargetDir || workspacePath
    const sep = targetDir.includes('\\') ? '\\' : '/'
    const fullPath = `${targetDir}${sep}${newItemName.trim()}`

    try {
      if (creationMode === 'file') {
        await window.maestroAPI.createFile(fullPath)
        openFile({ path: fullPath, name: newItemName.trim(), content: '' })
      } else if (creationMode === 'folder') {
        await window.maestroAPI.createDirectory(fullPath)
      }
      setNewItemName('')
      setCreationMode(null)
      await handleRefresh()
    } catch (err) {
      console.error('Failed to create item:', err)
    }
  }

  const handleDeleteItem = async (e: React.MouseEvent, item: FileItem) => {
    e.stopPropagation()
    const confirmDelete = window.confirm(`Delete ${item.name}? This action cannot be undone.`)
    if (!confirmDelete) return

    try {
      await window.maestroAPI.deletePath(item.path)
      if (!item.isDirectory) {
        closeFile(item.path)
      }
      await handleRefresh()
    } catch (err) {
      console.error('Failed to delete item:', err)
    }
  }

  const handleRenameSubmit = async () => {
    if (!renamingItem || !renameValue.trim() || !workspacePath) return
    const dir = renamingItem.path.substring(0, renamingItem.path.lastIndexOf(renamingItem.name))
    const newPath = `${dir}${renameValue.trim()}`

    try {
      await window.maestroAPI.renamePath(renamingItem.path, newPath)
      if (!renamingItem.isDirectory) {
        closeFile(renamingItem.path)
      }
      setRenamingItem(null)
      setRenameValue('')
      await handleRefresh()
    } catch (err) {
      console.error('Failed to rename path:', err)
    }
  }

  const handleOpenFileDiff = async (file: GitFileStatus) => {
    if (!workspacePath) return
    try {
      const diff = await window.maestroAPI.getGitDiff(workspacePath, file.path)
      const fileName = file.path.split(/[\\/]/).pop() || file.path
      openDiff({
        path: file.path,
        name: fileName,
        original: diff.original,
        modified: diff.modified
      })
    } catch (err) {
      console.error('Failed to open git diff:', err)
    }
  }

  const handleCommitSubmit = async () => {
    if (!workspacePath || !commitMessage.trim()) return
    setIsCommitting(true)
    try {
      const stagedCount = gitStatus.staged?.length || 0
      if (stagedCount === 0) {
        await window.maestroAPI.gitStageAll(workspacePath)
      }
      const res = await window.maestroAPI.gitCommit(workspacePath, commitMessage.trim())
      if (res.ok) {
        setCommitMessage('')
        setStatusMessage('Commit successful')
        await refreshGitStatus()
      } else {
        setStatusMessage(`Commit error: ${res.message}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsCommitting(false)
    }
  }

  const handlePush = async () => {
    if (!workspacePath) return
    setStatusMessage('Pushing commits...')
    const res = await window.maestroAPI.gitPush(workspacePath)
    setStatusMessage(res.ok ? 'Pushed successfully' : `Push failed: ${res.message}`)
    await refreshGitStatus()
  }

  const handleCreateBranchPrompt = async () => {
    if (!workspacePath) return
    const branch = window.prompt('Enter new Git branch name (e.g. feat/my-feature):')
    if (branch && branch.trim()) {
      setStatusMessage(`Creating branch ${branch.trim()}...`)
      const res = await window.maestroAPI.gitCreateBranch(workspacePath, branch.trim())
      if (res.ok) {
        await refreshGitStatus()
        setStatusMessage(`Switched to new branch '${branch.trim()}'`)
      } else {
        setStatusMessage(`Branch error: ${res.message}`)
      }
    }
  }

  const handlePull = async () => {
    if (!workspacePath) return
    setStatusMessage('Pulling changes...')
    const res = await window.maestroAPI.gitPull(workspacePath)
    setStatusMessage(res.ok ? 'Pulled successfully' : `Pull failed: ${res.message}`)
    await handleRefresh()
  }

  const handleJumpToSearchMatch = async (match: SearchMatch) => {
    try {
      const content = await window.maestroAPI.readFile(match.filePath)
      openFile({
        path: match.filePath,
        name: match.fileName,
        content
      })
      setActiveFile(match.filePath)
      setCursorPosition(match.line, match.column)
    } catch (err) {
      console.error('Failed to open search match file:', err)
    }
  }

  const getFileBadge = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'ts':
      case 'tsx':
        return <span className="text-[9px] font-mono text-studio-cyan">ts</span>
      case 'js':
      case 'jsx':
        return <span className="text-[9px] font-mono text-studio-amber">js</span>
      case 'json':
        return <span className="text-[9px] font-mono text-studio-muted">{}</span>
      case 'css':
        return <span className="text-[9px] font-mono text-studio-violet">#</span>
      case 'md':
        return <span className="text-[9px] font-mono text-studio-emerald">md</span>
      default:
        return null
    }
  }

  const totalTasks = projectData.tasks.length
  const completedTasks = projectData.tasks.filter((t) => t.status === 'done').length
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const totalSearchMatches = globalSearchResults.reduce((acc, r) => acc + r.matches.length, 0)

  const renderTree = (items: FileItem[], depth = 0) => {
    const filtered = items.filter((i) =>
      filterQuery ? i.name.toLowerCase().includes(filterQuery.toLowerCase()) : true
    )

    return filtered.map((item) => {
      const isExpanded = !!expandedFolders[item.path]
      const children = subFolders[item.path] || []

      return (
        <div key={item.path}>
          <div
            onClick={() => handleItemClick(item)}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setContextMenu({ x: e.clientX, y: e.clientY, item })
            }}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className="flex items-center justify-between py-1 px-2 my-0.5 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs transition-colors group select-none relative"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {item.isDirectory ? (
                <>
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-studio-muted shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-studio-muted shrink-0" />
                  )}
                  <Folder className="w-3.5 h-3.5 text-studio-amber/70 shrink-0 fill-studio-amber/10" />
                  <span className="font-normal text-studio-text truncate">{item.name}</span>
                </>
              ) : (
                <>
                  <span className="w-3" />
                  <FileCode2 className="w-3.5 h-3.5 text-studio-muted shrink-0 group-hover:text-studio-text transition-colors" />
                  <span className="text-studio-muted group-hover:text-studio-text transition-colors truncate">
                    {item.name}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-1">
              {!item.isDirectory && getFileBadge(item.name)}

              <button
                onClick={(e) => handleCopyPath(e, item.path)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-white text-studio-muted transition-opacity cursor-pointer"
                title="Copy Relative Path"
              >
                <Copy className="w-3 h-3" />
              </button>

              <button
                onClick={(e) => handleRevealInOS(e, item.path)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-white text-studio-muted transition-opacity cursor-pointer"
                title="Reveal in File Explorer"
              >
                <FolderSearch className="w-3 h-3" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setRenamingItem(item)
                  setRenameValue(item.name)
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-white text-studio-muted transition-opacity cursor-pointer"
                title="Rename (F2)"
              >
                <Edit3 className="w-3 h-3" />
              </button>

              <button
                onClick={(e) => handleDeleteItem(e, item)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-studio-rose text-studio-muted transition-opacity cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {item.isDirectory && isExpanded && (
            <div className="border-l border-white/[0.04] ml-2.5">
              {renderTree(children, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  if (!isSidebarOpen) return null

  return (
    <aside className="w-64 glass-panel m-2.5 mr-0 rounded-2xl flex flex-col overflow-hidden border border-white/[0.05] z-20">
      {/* Header Tabs: Files vs Search vs Git */}
      <div className="p-2 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSidebarTab('files')}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeSidebarTab === 'files'
                ? 'bg-white/10 text-white'
                : 'text-studio-muted hover:text-white'
            }`}
          >
            Files
          </button>
          <button
            onClick={() => setActiveSidebarTab('search')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeSidebarTab === 'search'
                ? 'bg-white/10 text-white'
                : 'text-studio-muted hover:text-white'
            }`}
          >
            <Search className="w-3 h-3 text-studio-amber" />
            <span>Search</span>
          </button>
          <button
            onClick={() => setActiveSidebarTab('git')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeSidebarTab === 'git'
                ? 'bg-white/10 text-white'
                : 'text-studio-muted hover:text-white'
            }`}
          >
            <GitBranch className="w-3 h-3 text-studio-amber" />
            <span>Git</span>
            {gitStatus.files.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-studio-amber/20 text-studio-amber text-[10px] flex items-center justify-center font-mono">
                {gitStatus.files.length}
              </span>
            )}
          </button>
        </div>

        {workspacePath && (
          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-white/5 text-studio-muted hover:text-white transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Mode 1: Files Explorer */}
      {activeSidebarTab === 'files' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-2.5 border-b border-white/[0.04] flex flex-col gap-2">
            {workspacePath && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-studio-muted font-mono truncate">
                  <span>/ {workspacePath.split(/[\\/]/).pop()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setCreationMode('file')
                      setCreationTargetDir(workspacePath)
                    }}
                    className="p-1 rounded hover:bg-white/5 text-studio-muted hover:text-white transition-colors cursor-pointer"
                    title="New File"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setCreationMode('folder')
                      setCreationTargetDir(workspacePath)
                    }}
                    className="p-1 rounded hover:bg-white/5 text-studio-muted hover:text-white transition-colors cursor-pointer"
                    title="New Folder"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {creationMode && (
              <div className="flex items-center gap-1 glass-pill px-2 py-1 rounded-lg text-xs border-studio-accent/30">
                {creationMode === 'file' ? (
                  <FileCode2 className="w-3 h-3 text-studio-amber shrink-0" />
                ) : (
                  <Folder className="w-3 h-3 text-studio-amber shrink-0" />
                )}
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={creationMode === 'file' ? 'New filename...' : 'New folder...'}
                  className="bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted w-full"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateSubmit()
                    if (e.key === 'Escape') setCreationMode(null)
                  }}
                />
                <button
                  onClick={handleCreateSubmit}
                  className="p-0.5 hover:text-studio-emerald text-studio-muted cursor-pointer"
                  title="Confirm"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setCreationMode(null)}
                  className="p-0.5 hover:text-studio-rose text-studio-muted cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {renamingItem && (
              <div className="flex items-center gap-1 glass-pill px-2 py-1 rounded-lg text-xs border-studio-accent/30">
                <Edit3 className="w-3 h-3 text-studio-amber shrink-0" />
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Rename to..."
                  className="bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted w-full"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit()
                    if (e.key === 'Escape') setRenamingItem(null)
                  }}
                />
                <button
                  onClick={handleRenameSubmit}
                  className="p-0.5 hover:text-studio-emerald text-studio-muted cursor-pointer"
                  title="Confirm"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setRenamingItem(null)}
                  className="p-0.5 hover:text-studio-rose text-studio-muted cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {workspacePath && (
              <div className="flex items-center gap-2 glass-pill px-2.5 py-1 rounded-lg text-xs">
                <Search className="w-3 h-3 text-studio-muted" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter files..."
                  className="bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted w-full"
                />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            {!workspacePath ? (
              <div className="h-full flex flex-col items-center justify-center p-4 text-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-studio-accent/10 border border-studio-accent/20 flex items-center justify-center text-studio-accent">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-white">No folder open</p>
                  <p className="text-[11px] text-studio-muted mt-0.5">Open a project to begin</p>
                </div>
                <button
                  onClick={handleOpenFolder}
                  className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-accent hover:bg-studio-accentHover text-studio-bg text-xs font-medium transition-all cursor-pointer"
                >
                  <FolderOpen className="w-3 h-3" />
                  <span>Open Folder</span>
                </button>
              </div>
            ) : (
              <div>{renderTree(fileTree)}</div>
            )}
          </div>

          {workspacePath && (
            <div className="p-2.5 border-t border-white/[0.04] bg-studio-card/60">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1 text-[11px] text-studio-muted">
                  <ListTodo className="w-3 h-3 text-studio-amber" />
                  <span>Tasks Progress</span>
                </div>
                <button
                  onClick={() => setLayoutMode('project')}
                  className="text-[10px] text-studio-accent hover:underline font-mono cursor-pointer"
                >
                  {progressPercent}%
                </button>
              </div>

              <div className="w-full bg-white/[0.05] rounded-full h-1 overflow-hidden">
                <div
                  className="h-full bg-studio-accent transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Global Search in Files */}
      {activeSidebarTab === 'search' && (
        <div className="flex-1 flex flex-col overflow-hidden p-2.5 gap-2">
          {/* Search Input Box */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 glass-pill px-2 py-1 rounded-lg text-xs">
              <Search className="w-3.5 h-3.5 text-studio-amber shrink-0" />
              <input
                type="text"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder="Search across files..."
                className="bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') executeGlobalSearch()
                }}
              />
              {/* Search Toggle Options */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    setSearchOptions({ isCaseSensitive: !searchOptions.isCaseSensitive })
                    executeGlobalSearch()
                  }}
                  className={`p-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                    searchOptions.isCaseSensitive ? 'text-studio-amber bg-white/10' : 'text-studio-muted'
                  }`}
                  title="Match Case"
                >
                  <CaseSensitive className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setSearchOptions({ isWholeWord: !searchOptions.isWholeWord })
                    executeGlobalSearch()
                  }}
                  className={`p-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                    searchOptions.isWholeWord ? 'text-studio-amber bg-white/10' : 'text-studio-muted'
                  }`}
                  title="Match Whole Word"
                >
                  <WholeWord className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setSearchOptions({ isRegex: !searchOptions.isRegex })
                    executeGlobalSearch()
                  }}
                  className={`p-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                    searchOptions.isRegex ? 'text-studio-amber bg-white/10' : 'text-studio-muted'
                  }`}
                  title="Use Regular Expression"
                >
                  <Regex className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Replace Box Toggle */}
            <div className="flex items-center justify-between px-1">
              <button
                onClick={() => setShowReplaceInput(!showReplaceInput)}
                className="flex items-center gap-1 text-[11px] text-studio-muted hover:text-white cursor-pointer"
              >
                <Replace className="w-3 h-3 text-studio-amber" />
                <span>Replace</span>
                {showReplaceInput ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>

              <button
                onClick={executeGlobalSearch}
                className="text-[11px] text-studio-amber hover:underline font-mono cursor-pointer"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {showReplaceInput && (
              <div className="flex items-center gap-1 glass-pill px-2 py-1 rounded-lg text-xs mt-0.5">
                <input
                  type="text"
                  value={globalReplaceQuery}
                  onChange={(e) => setGlobalReplaceQuery(e.target.value)}
                  placeholder="Replace with..."
                  className="bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted w-full"
                />
                <button
                  onClick={executeGlobalReplace}
                  className="px-2 py-0.5 rounded bg-studio-amber hover:bg-studio-accentHover text-studio-bg font-medium text-[10px] shrink-0 cursor-pointer"
                  title="Replace All"
                >
                  Replace All
                </button>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-[11px] text-studio-muted px-1 font-mono">
            <span>
              {totalSearchMatches} results in {globalSearchResults.length} files
            </span>
          </div>

          {/* Search Results List */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-1">
            {globalSearchResults.map((fileResult) => {
              const isExpanded = expandedSearchFiles[fileResult.filePath] !== false

              return (
                <div key={fileResult.filePath} className="flex flex-col">
                  {/* File Header */}
                  <div
                    onClick={() =>
                      setExpandedSearchFiles((prev) => ({
                        ...prev,
                        [fileResult.filePath]: !isExpanded
                      }))
                    }
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-studio-muted shrink-0" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-studio-muted shrink-0" />
                      )}
                      <FileCode2 className="w-3.5 h-3.5 text-studio-amber shrink-0" />
                      <span className="font-medium text-white truncate">{fileResult.fileName}</span>
                    </div>
                    <span className="text-[10px] font-mono text-studio-muted bg-white/5 px-1.5 py-0.2 rounded">
                      {fileResult.matches.length}
                    </span>
                  </div>

                  {/* Match Lines */}
                  {isExpanded && (
                    <div className="flex flex-col gap-0.5 ml-4 pl-1 border-l border-white/[0.04]">
                      {fileResult.matches.map((match, mIdx) => (
                        <div
                          key={`${match.line}-${match.column}-${mIdx}`}
                          onClick={() => handleJumpToSearchMatch(match)}
                          className="flex items-center justify-between p-1 rounded hover:bg-white/[0.04] cursor-pointer text-xs group transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 font-mono text-[11px]">
                            <span className="text-studio-muted shrink-0 text-[10px] w-6 text-right">
                              {match.line}:
                            </span>
                            <span className="truncate text-studio-text">
                              {match.preview.before}
                              <mark className="bg-studio-amber/25 text-studio-amber rounded px-0.5 font-bold">
                                {match.preview.match}
                              </mark>
                              {match.preview.after}
                            </span>
                          </div>
                          <ArrowRight className="w-3 h-3 text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mode 3: Source Control / Git */}
      {activeSidebarTab === 'git' && (
        <div className="flex-1 flex flex-col overflow-hidden p-2.5 gap-2.5">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-1.5 text-xs text-white min-w-0">
              <GitBranch className="w-3.5 h-3.5 text-studio-amber shrink-0" />
              <span className="font-medium font-mono truncate">{gitStatus.branch}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleCreateBranchPrompt}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                title="Create New Branch"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={handlePull}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                title="Git Pull"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              <button
                onClick={handlePush}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                title="Git Push"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                onClick={async () => {
                  await gitFetch()
                }}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                title="Git Fetch"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {focusTask && (
              <div className="flex items-center justify-between text-[11px] bg-studio-amber/10 border border-studio-amber/20 px-2 py-1 rounded-lg">
                <span className="truncate text-studio-amber font-medium">#{focusTask.id}: {focusTask.title}</span>
                <button
                  type="button"
                  onClick={() => {
                    const tag = `[#${focusTask.id}] `
                    if (!commitMessage.startsWith(tag)) {
                      setCommitMessage(`${tag}${commitMessage}`)
                    }
                  }}
                  className="text-[10px] text-white hover:text-studio-amber bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded transition-colors ml-1 shrink-0 font-mono cursor-pointer"
                  title="Link commit to active task"
                >
                  + Link Task
                </button>
              </div>
            )}
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message (Ctrl+Enter to commit)..."
              rows={2}
              className="w-full glass-pill rounded-xl p-2 text-xs text-white outline-none focus:border-studio-accent transition-colors resize-none placeholder-studio-muted"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  handleCommitSubmit()
                }
              }}
            />
            <button
              onClick={handleCommitSubmit}
              disabled={isCommitting || !commitMessage.trim()}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-studio-accent hover:bg-studio-accentHover disabled:opacity-40 text-studio-bg text-xs font-medium transition-all cursor-pointer"
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>{isCommitting ? 'Committing...' : 'Commit Changes'}</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
              {/* 0. Merge Conflicts Section */}
              {((gitStatus.conflicts || []).length > 0 || gitStatus.isMerging) && (
                <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-studio-rose/10 border border-studio-rose/20">
                  <div className="flex items-center justify-between text-[11px] text-studio-rose font-mono font-bold">
                    <span>CONFLICTS ({(gitStatus.conflicts || []).length})</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => abortMerge()}
                        className="px-1.5 py-0.5 rounded bg-studio-rose/20 hover:bg-studio-rose/30 text-[10px] text-white transition-colors cursor-pointer"
                        title="Abort Merge"
                      >
                        Abort
                      </button>
                      <button
                        onClick={() => continueMerge()}
                        className="px-1.5 py-0.5 rounded bg-studio-emerald/20 hover:bg-studio-emerald/30 text-[10px] text-white transition-colors cursor-pointer"
                        title="Continue Merge"
                      >
                        Continue
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    {(gitStatus.conflicts || []).map((file) => (
                      <div
                        key={`conflict-${file.path}`}
                        onClick={async () => {
                          const fullPath = workspacePath ? `${workspacePath}/${file.path}`.replace(/\\/g, '/') : file.path
                          try {
                            const content = await window.maestroAPI.readFile(fullPath)
                            openFile({ path: fullPath, name: file.path.split(/[\\/]/).pop() || file.path, content })
                          } catch {
                            // ignore
                          }
                        }}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs group transition-colors select-none"
                        title="Click to resolve conflict in Editor"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertCircle className="w-3.5 h-3.5 text-studio-rose shrink-0" />
                          <span className="text-white truncate">{file.path}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded text-studio-rose bg-studio-rose/20 shrink-0">
                          !
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 1. Staged Changes Section */}
              {(gitStatus.staged || []).length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] text-studio-emerald px-1 font-mono font-medium">
                    <span>STAGED CHANGES ({(gitStatus.staged || []).length})</span>
                    <button
                      onClick={() => unstageAllFiles()}
                      className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                      title="Unstage All Changes"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    {(gitStatus.staged || []).map((file) => (
                      <div
                        key={`staged-${file.path}`}
                        onClick={() => handleOpenFileDiff(file)}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs group transition-colors select-none"
                        title="Click to view Diff"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileDiff className="w-3.5 h-3.5 text-studio-emerald shrink-0" />
                          <span className="text-studio-text truncate">{file.path}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              unstageFile(file.path)
                            }}
                            className="p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Unstage file"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                              file.status === 'deleted'
                                ? 'text-studio-rose bg-studio-rose/10'
                                : 'text-studio-emerald bg-studio-emerald/10'
                            }`}
                          >
                            {file.status === 'added' ? 'A' : file.status === 'deleted' ? 'D' : 'M'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Unstaged Changes Section */}
              {(gitStatus.unstaged || []).length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] text-studio-amber px-1 font-mono font-medium">
                    <span>CHANGES ({(gitStatus.unstaged || []).length})</span>
                    <button
                      onClick={() => stageAllFiles()}
                      className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                      title="Stage All Changes"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    {(gitStatus.unstaged || []).map((file) => (
                      <div
                        key={`unstaged-${file.path}`}
                        onClick={() => handleOpenFileDiff(file)}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs group transition-colors select-none"
                        title="Click to view Diff"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileDiff className="w-3.5 h-3.5 text-studio-amber shrink-0" />
                          <span className="text-studio-text truncate">{file.path}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              discardFileChanges(file.path)
                            }}
                            className="p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-studio-rose opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Discard changes"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              stageFile(file.path)
                            }}
                            className="p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-studio-emerald opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Stage file"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                              file.status === 'deleted'
                                ? 'text-studio-rose bg-studio-rose/10'
                                : 'text-studio-amber bg-studio-amber/10'
                            }`}
                          >
                            {file.status === 'deleted' ? 'D' : 'M'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Untracked Files Section */}
              {(gitStatus.untracked || []).length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] text-studio-muted px-1 font-mono font-medium">
                    <span>UNTRACKED ({(gitStatus.untracked || []).length})</span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    {(gitStatus.untracked || []).map((file) => (
                      <div
                        key={`untracked-${file.path}`}
                        onClick={() => handleOpenFileDiff(file)}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs group transition-colors select-none"
                        title="Click to preview file"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCode2 className="w-3.5 h-3.5 text-studio-muted shrink-0" />
                          <span className="text-studio-text truncate">{file.path}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              discardFileChanges(file.path)
                            }}
                            className="p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-studio-rose opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Delete untracked file"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              stageFile(file.path)
                            }}
                            className="p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-studio-emerald opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Stage file"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded text-studio-emerald bg-studio-emerald/10 shrink-0">
                            U
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Stashes Section */}
              <div className="flex flex-col gap-1 border-t border-white/[0.04] pt-2">
                <div className="flex items-center justify-between text-[11px] text-studio-cyan px-1 font-mono font-medium">
                  <span>STASHES ({(gitStashes || []).length})</span>
                  <button
                    onClick={async () => {
                      const msg = window.prompt('Enter stash message (optional):')
                      if (msg !== null) {
                        await gitStashSave(msg.trim() || undefined)
                      }
                    }}
                    className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                    title="Stash Current Changes"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex flex-col gap-0.5">
                  {(gitStashes || []).map((stash) => (
                    <div
                      key={stash.name}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/[0.04] text-xs group transition-colors select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Archive className="w-3.5 h-3.5 text-studio-cyan shrink-0" />
                        <span className="text-studio-text truncate text-[11px]" title={stash.message}>
                          {stash.message || stash.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => gitStashApply(stash.index)}
                          className="px-1.5 py-0.2 rounded hover:bg-white/10 text-[10px] text-studio-muted hover:text-studio-cyan transition-colors cursor-pointer font-mono"
                          title="Apply stash (keep in stash list)"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => gitStashPop(stash.index)}
                          className="px-1.5 py-0.2 rounded hover:bg-white/10 text-[10px] text-studio-muted hover:text-studio-emerald transition-colors cursor-pointer font-mono"
                          title="Pop stash (apply & remove)"
                        >
                          Pop
                        </button>
                        <button
                          onClick={() => gitStashDrop(stash.index)}
                          className="p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-studio-rose transition-colors cursor-pointer"
                          title="Drop stash"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clean Working Tree */}
              {(gitStatus.staged || []).length === 0 &&
                (gitStatus.unstaged || []).length === 0 &&
                (gitStatus.untracked || []).length === 0 && (
                  <div className="p-6 text-center text-xs text-studio-muted font-mono flex flex-col items-center gap-2">
                    <Check className="w-5 h-5 text-studio-emerald/70" />
                    <span>Working tree clean</span>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* File / Folder Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${Math.min(contextMenu.y, window.innerHeight - 220)}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-48 glass-panel border border-white/10 rounded-xl shadow-2xl p-1 flex flex-col gap-0.5 animate-fade-in bg-studio-card/95 font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[10px] text-studio-muted font-mono truncate border-b border-white/[0.04] mb-0.5">
            {contextMenu.item.name}
          </div>

          <button
            onClick={() => {
              setRenamingItem(contextMenu.item)
              setRenameValue(contextMenu.item.name)
              setContextMenu(null)
            }}
            className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-text hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-studio-amber" />
            <span>Rename (F2)</span>
          </button>

          <button
            onClick={() => {
              handleDuplicateItem(contextMenu.item)
              setContextMenu(null)
            }}
            className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-text hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-studio-emerald" />
            <span>Duplicate</span>
          </button>

          <div className="h-px bg-white/[0.04] my-0.5" />

          <button
            onClick={(e) => {
              handleCopyPath(e, contextMenu.item.path)
              setContextMenu(null)
            }}
            className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-text hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-studio-muted" />
            <span>Copy Relative Path</span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.item.path)
              setStatusMessage('Copied absolute path')
              setTimeout(() => setStatusMessage('Ready'), 2000)
              setContextMenu(null)
            }}
            className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-text hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-studio-muted" />
            <span>Copy Full Path</span>
          </button>

          <button
            onClick={(e) => {
              handleRevealInOS(e, contextMenu.item.path)
              setContextMenu(null)
            }}
            className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-text hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <FolderSearch className="w-3.5 h-3.5 text-studio-cyan" />
            <span>Reveal in OS</span>
          </button>

          <div className="h-px bg-white/[0.04] my-0.5" />

          <button
            onClick={(e) => {
              handleDeleteItem(e, contextMenu.item)
              setContextMenu(null)
            }}
            className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-rose hover:bg-studio-rose/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </aside>
  )
}

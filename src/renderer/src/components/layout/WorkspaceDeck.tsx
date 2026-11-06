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
  FolderSearch
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

      if (match && !match.isDirty) {
        try {
          const fresh = await window.maestroAPI.readFile(match.path)
          useEditorStore.getState().updateFileContent(match.path, fresh)
          useEditorStore.getState().markFileSaved(match.path)
          useEditorStore.getState().setStatusMessage(`Synchronized ${match.name} from disk`)
          setTimeout(() => useEditorStore.getState().setStatusMessage('Ready'), 2000)
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
      await window.maestroAPI.gitStageAll(workspacePath)
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
            <div className="flex items-center justify-between text-[11px] text-studio-muted mb-1 px-1 font-mono">
              <span>CHANGES ({gitStatus.files.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
              {gitStatus.files.length === 0 ? (
                <div className="p-4 text-center text-xs text-studio-muted">
                  No changes detected
                </div>
              ) : (
                gitStatus.files.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => handleOpenFileDiff(file)}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs group transition-colors select-none"
                    title="Click to view Diff"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileDiff className="w-3.5 h-3.5 text-studio-muted group-hover:text-studio-amber transition-colors shrink-0" />
                      <span className="text-studio-text truncate">{file.path}</span>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                        file.status === 'untracked'
                          ? 'text-studio-emerald bg-studio-emerald/10'
                          : file.status === 'deleted'
                            ? 'text-studio-rose bg-studio-rose/10'
                            : 'text-studio-amber bg-studio-amber/10'
                      }`}
                    >
                      {file.status === 'untracked' ? 'U' : file.status === 'deleted' ? 'D' : 'M'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

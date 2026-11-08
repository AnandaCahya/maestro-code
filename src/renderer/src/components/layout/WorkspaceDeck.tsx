import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
  GitMerge,
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
  Archive,
  Filter,
  ShieldCheck,
  ShieldAlert,
  History,
  UploadCloud,
  Tag,
  Eye,
  EyeOff,
  Scissors,
  Clipboard,
  ExternalLink,
  Bug,
  FlaskConical,
  Puzzle,
  Globe,
  CheckSquare,
  CopyPlus
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { GitRemoteModal } from '../modals/GitRemoteModal'
import { useProjectStore } from '../../store/useProjectStore'
import { useDebugStore } from '../../store/useDebugStore'
import { useTestStore } from '../../store/useTestStore'
import { DebugDeck } from '../debug/DebugDeck'
import { TestDeck } from '../testing/TestDeck'
import { ExtensionsDeck } from '../extensions/ExtensionsDeck'
import type { FileItem, GitFileStatus, SearchMatch, ReplacePreviewItem } from '../../../preload/index.d'

export const WorkspaceDeck: React.FC = () => {
  const {
    workspacePath,
    openWorkspace,
    recentWorkspaces,
    fetchRecentWorkspaces,
    removeRecentWorkspace,
    isWorkspaceTrusted,
    toggleWorkspaceTrust,
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
    discardAllChanges,
    checkoutBranch,
    renameBranch,
    publishBranch,
    abortMerge,
    continueMerge,
    mergeBranch,
    rebaseBranch,
    gitStashes,
    fetchGitStashes,
    gitStashSave,
    gitStashPop,
    gitStashApply,
    gitStashDrop,
    gitFetch,
    gitTags,
    gitCreateTag,
    gitDeleteTag,
    gitCheckoutTag,
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
    cancelGlobalSearch,
    executeGlobalReplace,
    replaceInFile,
    replaceMatch,
    jumpToNextSearchResult,
    jumpToPrevSearchResult,
    focusTask,
    searchHistory,
    addToSearchHistory
  } = useEditorStore()

  const debugStatus = useDebugStore((s) => s.status)
  const { projectData, setProjectData } = useProjectStore()
  const [filterQuery, setFilterQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const [subFolders, setSubFolders] = useState<Record<string, FileItem[]>>({})
  const [searchHistoryIdx, setSearchHistoryIdx] = useState(-1)

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
  const [showSearchFilters, setShowSearchFilters] = useState(false)
  const [expandedSearchFiles, setExpandedSearchFiles] = useState<Record<string, boolean>>({})
  const [isAmend, setIsAmend] = useState(false)
  const [showHiddenFiles, setShowHiddenFiles] = useState(true)
  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false)
  const [pullStrategy, setPullStrategy] = useState<'merge' | 'rebase' | 'ff-only'>('merge')
  const [replacePreviewItems, setReplacePreviewItems] = useState<ReplacePreviewItem[] | null>(null)
  const [fileClipboard, setFileClipboard] = useState<{
    action: 'cut' | 'copy'
    path: string
    name: string
  } | null>(null)

  // Multi-select Explorer State
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null)

  const handleLoadReplacePreview = async () => {
    if (!workspacePath || !globalSearchQuery.trim()) return
    try {
      const previews = await window.maestroAPI.getReplacePreview(
        workspacePath,
        globalSearchQuery,
        globalReplaceQuery,
        searchOptions
      )
      setReplacePreviewItems(previews || [])
    } catch (err) {
      console.error('Failed to load replace preview:', err)
    }
  }

  useEffect(() => {
    fetchRecentWorkspaces()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPaths.length > 0) {
        setSelectedPaths([])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPaths])

  const handleOpenFolder = async () => {
    try {
      const selected = await window.maestroAPI.openDirectoryDialog()
      if (selected) {
        await openWorkspace(selected)
        const proj = await window.maestroAPI.loadProjectData(selected)
        setProjectData(proj)
      }
    } catch (err) {
      console.error('Error opening folder:', err)
    }
  }

  const handleOpenRecent = async (targetPath: string) => {
    try {
      await openWorkspace(targetPath)
      const proj = await window.maestroAPI.loadProjectData(targetPath)
      setProjectData(proj)
    } catch (err) {
      console.error('Error opening recent workspace:', err)
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
      const filenames = event.batch ? event.batch.map((b) => b.filename) : [event.filename]

      for (const fname of filenames) {
        const match = currentOpenFiles.find((f) => {
          const norm = f.path.replace(/\\/g, '/')
          return norm.endsWith(fname) || fname.endsWith(f.name)
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

        // Check if project metadata was modified externally
        if (fname.endsWith('project.json') || fname.includes('.maestro')) {
          const pStore = useProjectStore.getState()
          try {
            const freshProject = await window.maestroAPI.loadProjectData(workspacePath)
            if (!pStore.isDirty) {
              pStore.setProjectData(freshProject)
              useEditorStore.getState().setStatusMessage('Synchronized Project Deck from disk')
              setTimeout(() => useEditorStore.getState().setStatusMessage('Ready'), 2000)
            } else {
              pStore.setConflict(freshProject)
            }
          } catch {
            // ignore
          }
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

  const getVisibleItems = useCallback(() => {
    const list: FileItem[] = []
    const traverse = (items: FileItem[]) => {
      for (const item of items) {
        if (!showHiddenFiles && item.name.startsWith('.')) continue
        if (filterQuery && !item.name.toLowerCase().includes(filterQuery.toLowerCase())) continue
        list.push(item)
        if (item.isDirectory && expandedFolders[item.path]) {
          const children = subFolders[item.path] || []
          traverse(children)
        }
      }
    }
    traverse(fileTree)
    return list
  }, [fileTree, subFolders, expandedFolders, showHiddenFiles, filterQuery])

  const handleBatchDelete = async () => {
    if (selectedPaths.length === 0) return
    const count = selectedPaths.length
    const confirmDelete = window.confirm(
      `Delete ${count} selected item${count > 1 ? 's' : ''}? This action cannot be undone.`
    )
    if (!confirmDelete) return

    for (const p of selectedPaths) {
      try {
        await window.maestroAPI.deletePath(p)
        closeFile(p)
      } catch (err) {
        console.error('Failed to delete item:', p, err)
      }
    }
    setSelectedPaths([])
    setLastSelectedPath(null)
    await handleRefresh()
    setStatusMessage(`Deleted ${count} item${count > 1 ? 's' : ''}`)
    setTimeout(() => setStatusMessage('Ready'), 2000)
  }

  const handleBatchDuplicate = async () => {
    if (selectedPaths.length === 0) return
    let count = 0
    for (const p of selectedPaths) {
      try {
        await window.maestroAPI.duplicatePath(p)
        count++
      } catch (err) {
        console.error('Failed to duplicate item:', p, err)
      }
    }
    await handleRefresh()
    setStatusMessage(`Duplicated ${count} item${count > 1 ? 's' : ''}`)
    setTimeout(() => setStatusMessage('Ready'), 2000)
  }

  const handleBatchCopyPaths = async (relative = true) => {
    if (selectedPaths.length === 0) return
    const text = selectedPaths
      .map((p) => {
        if (relative && workspacePath) {
          return p.replace(workspacePath, '').replace(/^[/\\]/, '')
        }
        return p
      })
      .join('\n')
    await navigator.clipboard.writeText(text)
    setStatusMessage(
      `Copied ${selectedPaths.length} ${relative ? 'relative' : 'absolute'} path${
        selectedPaths.length > 1 ? 's' : ''
      }`
    )
    setTimeout(() => setStatusMessage('Ready'), 2000)
  }

  const handleItemClick = async (item: FileItem, e?: React.MouseEvent) => {
    if (e?.ctrlKey || e?.metaKey) {
      setSelectedPaths((prev) =>
        prev.includes(item.path) ? prev.filter((p) => p !== item.path) : [...prev, item.path]
      )
      setLastSelectedPath(item.path)
      return
    }

    if (e?.shiftKey && lastSelectedPath) {
      const visible = getVisibleItems()
      const startIdx = visible.findIndex((v) => v.path === lastSelectedPath)
      const endIdx = visible.findIndex((v) => v.path === item.path)
      if (startIdx !== -1 && endIdx !== -1) {
        const [low, high] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
        const rangePaths = visible.slice(low, high + 1).map((v) => v.path)
        setSelectedPaths(rangePaths)
        return
      }
    }

    setSelectedPaths([item.path])
    setLastSelectedPath(item.path)

    if (item.isDirectory) {
      const isExpanded = !expandedFolders[item.path]
      setExpandedFolders((prev) => ({ ...prev, [item.path]: isExpanded }))

      if (isExpanded && !subFolders[item.path]) {
        const children = await window.maestroAPI.readDirectory(item.path)
        setSubFolders((prev) => ({ ...prev, [item.path]: children }))
      }
    } else {
      try {
        const isImage = /\.(png|jpe?g|gif|svg|ico|webp|avif|bmp)$/i.test(item.name)
        const isBinary =
          !isImage &&
          /\.(exe|dll|so|dylib|bin|wasm|pdf|zip|tar|gz|7z|rar|mp3|mp4|wav|mov|iso|dmg)$/i.test(
            item.name
          )
        let content = ''
        if (!isImage && !isBinary) {
          content = await window.maestroAPI.readFile(item.path)
        }
        openFile({
          path: item.path,
          name: item.name,
          content,
          isPreview: true
        })
      } catch (err) {
        console.error('Error reading file:', err)
      }
    }
  }

  const handleItemDoubleClick = async (item: FileItem) => {
    if (!item.isDirectory) {
      try {
        const isImage = /\.(png|jpe?g|gif|svg|ico|webp|avif|bmp)$/i.test(item.name)
        const isBinary =
          !isImage &&
          /\.(exe|dll|so|dylib|bin|wasm|pdf|zip|tar|gz|7z|rar|mp3|mp4|wav|mov|iso|dmg)$/i.test(
            item.name
          )
        let content = ''
        if (!isImage && !isBinary) {
          content = await window.maestroAPI.readFile(item.path)
        }
        openFile({
          path: item.path,
          name: item.name,
          content,
          isPreview: false
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

  const handleOpenFileDiff = async (file: GitFileStatus, isStaged: boolean = false) => {
    if (!workspacePath) return
    try {
      const diff = isStaged
        ? await window.maestroAPI.getGitStagedDiff(workspacePath, file.path)
        : await window.maestroAPI.getGitDiff(workspacePath, file.path)
      const fileName = file.path.split(/[\\/]/).pop() || file.path
      openDiff({
        path: file.path,
        name: isStaged ? `${fileName} (Staged)` : fileName,
        original: diff.original,
        modified: diff.modified
      })
    } catch (err) {
      console.error('Failed to open git diff:', err)
    }
  }

  const handleCommitSubmit = async (forceCommitAll: boolean = false) => {
    if (!workspacePath) return
    if (!isAmend && !commitMessage.trim()) return
    setIsCommitting(true)
    try {
      if (isAmend) {
        const res = await window.maestroAPI.gitCommitAmend(workspacePath, commitMessage.trim() || undefined)
        if (res.ok) {
          setCommitMessage('')
          setIsAmend(false)
          setStatusMessage('Amend commit successful')
          await refreshGitStatus()
        } else {
          setStatusMessage(`Amend error: ${res.message}`)
        }
      } else {
        const stagedCount = gitStatus.staged?.length || 0
        if (forceCommitAll || stagedCount === 0) {
          await window.maestroAPI.gitStageAll(workspacePath)
        }
        const res = await window.maestroAPI.gitCommit(workspacePath, commitMessage.trim())
        if (res.ok) {
          const committedMsg = commitMessage.trim()
          setCommitMessage('')
          setStatusMessage('Commit successful')
          await refreshGitStatus()

          // Automatic Task Status Transition & Git Commit Linking:
          const taskMatch = committedMsg.match(/(?:fixes|closes|resolves)?\s*\[?#?(MST-\d+)\]?/i)
          if (taskMatch) {
            const taskId = taskMatch[1].toUpperCase()
            const isClosing = /(?:fixes|closes|resolves)/i.test(committedMsg)
            const pStore = useProjectStore.getState()
            const targetTask = (pStore.projectData?.tasks || []).find((t) => t.id.toUpperCase() === taskId)
            if (targetTask) {
              if (isClosing) {
                pStore.updateTaskStatus(targetTask.id, 'done')
                setStatusMessage(`Commit successful — Task ${targetTask.id} marked as Done`)
              } else if (targetTask.status === 'backlog' || targetTask.status === 'todo') {
                pStore.updateTaskStatus(targetTask.id, 'in_progress')
                setStatusMessage(`Commit successful — Task ${targetTask.id} moved to In Progress`)
              }
              pStore.saveToDisk(workspacePath)
            }
          }
        } else {
          setStatusMessage(`Commit error: ${res.message}`)
        }
      }
    } catch (e: any) {
      console.error(e)
      setStatusMessage(`Commit failed: ${e?.message || 'Unknown error'}`)
    } finally {
      setIsCommitting(false)
    }
  }

  const handleDiscardAll = async () => {
    if (!workspacePath) return
    const confirmed = window.confirm(
      'Are you sure you want to discard ALL unstaged changes and untracked files? This action cannot be undone.'
    )
    if (!confirmed) return
    await discardAllChanges()
    await handleRefresh()
  }

  const handleSwitchBranchPrompt = async () => {
    if (!workspacePath) return
    const branches = await window.maestroAPI.gitGetBranches(workspacePath)
    const promptMsg = `Available branches:\n${branches.map((b) => ` - ${b}`).join('\n')}\n\nEnter branch to checkout:`
    const target = window.prompt(promptMsg, gitStatus.branch || 'main')
    if (target && target.trim() && target.trim() !== gitStatus.branch) {
      await checkoutBranch(target.trim())
    }
  }

  const handleRenameBranchPrompt = async () => {
    if (!workspacePath || !gitStatus.branch) return
    const newName = window.prompt(`Rename branch '${gitStatus.branch}' to:`, gitStatus.branch)
    if (newName && newName.trim() && newName.trim() !== gitStatus.branch) {
      await renameBranch(gitStatus.branch, newName.trim())
    }
  }

  const handlePublishBranch = async () => {
    if (!workspacePath || !gitStatus.branch) return
    const confirmed = window.confirm(`Publish branch '${gitStatus.branch}' to remote (git push -u origin)?`)
    if (confirmed) {
      await publishBranch(gitStatus.branch)
    }
  }

  const handlePush = async () => {
    if (!workspacePath) return
    setStatusMessage('Pushing commits...')
    const res = await window.maestroAPI.gitPush(workspacePath)
    setStatusMessage(res.ok ? 'Pushed successfully' : `Push failed: ${res.message}`)
    await refreshGitStatus()
  }

  const handlePushWithUpstream = async () => {
    if (!workspacePath || !gitStatus.branch) return
    setStatusMessage(`Pushing '${gitStatus.branch}' to origin with upstream tracking...`)
    const res = await window.maestroAPI.gitPush(workspacePath, 'origin', gitStatus.branch, true)
    setStatusMessage(
      res.ok ? `Pushed '${gitStatus.branch}' with upstream tracking` : `Push failed: ${res.message}`
    )
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

  const handlePull = async (strategyOverride?: 'merge' | 'rebase' | 'ff-only') => {
    if (!workspacePath) return
    const activeStrategy = strategyOverride || pullStrategy
    setStatusMessage(`Pulling changes (${activeStrategy})...`)
    const res = await window.maestroAPI.gitPull(workspacePath, activeStrategy)
    setStatusMessage(
      res.ok ? `Pulled successfully (${activeStrategy})` : `Pull failed: ${res.message}`
    )
    await handleRefresh()
  }

  const handleMergeBranchPrompt = async () => {
    if (!workspacePath || !gitStatus.branch) return
    const target = window.prompt(`Enter branch name to MERGE into '${gitStatus.branch}':`)
    if (target && target.trim()) {
      await mergeBranch(target.trim())
    }
  }

  const handleRebaseBranchPrompt = async () => {
    if (!workspacePath || !gitStatus.branch) return
    const target = window.prompt(`Enter branch name to REBASE '${gitStatus.branch}' onto:`)
    if (target && target.trim()) {
      await rebaseBranch(target.trim())
    }
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

  const tasks = projectData?.tasks || []
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === 'done').length
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const totalSearchMatches = globalSearchResults.reduce((acc, r) => acc + r.matches.length, 0)

  const renderTree = (items: FileItem[], depth = 0) => {
    const filtered = items.filter((i) => {
      if (!showHiddenFiles && i.name.startsWith('.')) return false
      if (filterQuery && !i.name.toLowerCase().includes(filterQuery.toLowerCase())) return false
      return true
    })

    return filtered.map((item) => {
      const isExpanded = !!expandedFolders[item.path]
      const children = subFolders[item.path] || []
      const isCut = fileClipboard?.action === 'cut' && fileClipboard.path === item.path

      const isSelected = selectedPaths.includes(item.path)

      return (
        <div key={item.path}>
          <div
            onClick={(e) => handleItemClick(item, e)}
            onDoubleClick={() => handleItemDoubleClick(item)}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!selectedPaths.includes(item.path)) {
                setSelectedPaths([item.path])
                setLastSelectedPath(item.path)
              }
              setContextMenu({ x: e.clientX, y: e.clientY, item })
            }}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className={`flex items-center justify-between py-1 px-2 my-0.5 rounded-lg cursor-pointer text-xs transition-colors group select-none relative ${
              isSelected
                ? 'bg-studio-accent/20 border-l-2 border-studio-accent text-white font-medium'
                : 'hover:bg-white/[0.04]'
            } ${isCut ? 'opacity-40 italic' : ''}`}
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
                  <span className="font-normal text-studio-text truncate" title={item.name}>{item.name}</span>
                </>
              ) : (
                <>
                  <span className="w-3" />
                  <FileCode2 className="w-3.5 h-3.5 text-studio-muted shrink-0 group-hover:text-studio-text transition-colors" />
                  <span className="text-studio-muted group-hover:text-studio-text transition-colors truncate" title={item.name}>
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
            {(gitStatus?.files || []).length > 0 && (
              <span className="w-4 h-4 rounded-full bg-studio-amber/20 text-studio-amber text-[10px] flex items-center justify-center font-mono">
                {gitStatus.files.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSidebarTab('debug')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeSidebarTab === 'debug'
                ? 'bg-white/10 text-white'
                : 'text-studio-muted hover:text-white'
            }`}
            title="Run and Debug (Ctrl+Shift+D)"
          >
            <Bug className="w-3 h-3 text-studio-amber" />
            <span>Debug</span>
            {(debugStatus === 'running' || debugStatus === 'stopped') && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  debugStatus === 'running' ? 'bg-studio-accent animate-pulse' : 'bg-studio-amber'
                }`}
              />
            )}
          </button>
          <button
            onClick={() => setActiveSidebarTab('tests')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeSidebarTab === 'tests'
                ? 'bg-white/10 text-white'
                : 'text-studio-muted hover:text-white'
            }`}
            title="Testing (Test Explorer)"
          >
            <FlaskConical className="w-3 h-3 text-studio-amber" />
            <span>Tests</span>
          </button>
          <button
            onClick={() => setActiveSidebarTab('extensions')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeSidebarTab === 'extensions'
                ? 'bg-white/10 text-white'
                : 'text-studio-muted hover:text-white'
            }`}
            title="Extensions (Ctrl+Shift+X)"
          >
            <Puzzle className="w-3 h-3 text-studio-amber" />
            <span>Extensions</span>
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
                <div className="flex items-center gap-1.5 text-[11px] text-studio-muted font-mono truncate">
                  <span className="font-medium text-white truncate max-w-[120px]">
                    {workspacePath.split(/[\\/]/).pop()}
                  </span>
                  <button
                    onClick={toggleWorkspaceTrust}
                    className="flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-white/10 cursor-pointer transition-colors"
                    title={
                      isWorkspaceTrusted
                        ? 'Workspace is Trusted (Click to toggle)'
                        : 'Workspace is Restricted (Click to trust)'
                    }
                  >
                    {isWorkspaceTrusted ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-studio-emerald" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-studio-amber" />
                    )}
                  </button>
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
                  <button
                    onClick={() => setShowHiddenFiles(!showHiddenFiles)}
                    className={`p-1 rounded hover:bg-white/5 transition-colors cursor-pointer ${
                      showHiddenFiles ? 'text-studio-amber' : 'text-studio-muted hover:text-white'
                    }`}
                    title={showHiddenFiles ? 'Hide Hidden Files (.dotfiles)' : 'Show Hidden Files (.dotfiles)'}
                  >
                    {showHiddenFiles ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
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

            {/* Multi-Select Batch Operations Toolbar */}
            {selectedPaths.length > 1 && (
              <div className="px-2 py-1 rounded-xl bg-studio-accent/15 border border-studio-accent/30 flex items-center justify-between text-xs animate-fade-in shrink-0">
                <div className="flex items-center gap-1.5 text-studio-accent font-medium">
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{selectedPaths.length} items</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleBatchCopyPaths(true)}
                    className="p-1 rounded hover:bg-studio-accent/20 text-studio-accent transition-colors cursor-pointer"
                    title="Copy Relative Paths"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleBatchDuplicate}
                    className="p-1 rounded hover:bg-studio-accent/20 text-studio-accent transition-colors cursor-pointer"
                    title="Duplicate Selected"
                  >
                    <CopyPlus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                    title="Delete Selected"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setSelectedPaths([])}
                    className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                    title="Clear Selection (Esc)"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-auto p-1.5 min-h-0">
            {!workspacePath ? (
              <div className="h-full flex flex-col justify-start p-3 gap-3">
                <div className="flex flex-col items-center justify-center p-4 text-center gap-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="w-10 h-10 rounded-xl bg-studio-accent/10 border border-studio-accent/20 flex items-center justify-center text-studio-accent">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">No folder open</p>
                    <p className="text-[11px] text-studio-muted mt-0.5">Open a project or choose from recents</p>
                  </div>
                  <button
                    onClick={handleOpenFolder}
                    className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-accent hover:bg-studio-accentHover text-studio-bg text-xs font-medium transition-all cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Open Folder</span>
                  </button>
                </div>

                {recentWorkspaces.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex items-center gap-1 text-[11px] text-studio-muted font-mono px-1">
                      <History className="w-3 h-3 text-studio-amber" />
                      <span>Recent Projects</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      {recentWorkspaces.map((recent) => (
                        <div
                          key={recent.path}
                          onClick={() => handleOpenRecent(recent.path)}
                          className="group flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.05] cursor-pointer text-xs border border-transparent hover:border-white/[0.06] transition-all"
                          title={recent.path}
                        >
                          <div className="flex flex-col min-w-0 pr-1">
                            <span className="font-medium text-white group-hover:text-studio-amber truncate">
                              {recent.name}
                            </span>
                            <span className="text-[10px] text-studio-muted font-mono truncate">
                              {recent.path}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeRecentWorkspace(recent.path)
                            }}
                            className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            title="Remove from recents"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="min-w-fit">{renderTree(fileTree)}</div>
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
                  if (e.key === 'Enter') {
                    addToSearchHistory(globalSearchQuery)
                    setSearchHistoryIdx(-1)
                    executeGlobalSearch()
                  } else if (e.key === 'ArrowUp') {
                    if (searchHistory.length > 0) {
                      e.preventDefault()
                      const nextIdx = Math.min(searchHistoryIdx + 1, searchHistory.length - 1)
                      setSearchHistoryIdx(nextIdx)
                      setGlobalSearchQuery(searchHistory[nextIdx])
                    }
                  } else if (e.key === 'ArrowDown') {
                    if (searchHistoryIdx > 0) {
                      e.preventDefault()
                      const nextIdx = searchHistoryIdx - 1
                      setSearchHistoryIdx(nextIdx)
                      setGlobalSearchQuery(searchHistory[nextIdx])
                    } else if (searchHistoryIdx === 0) {
                      e.preventDefault()
                      setSearchHistoryIdx(-1)
                      setGlobalSearchQuery('')
                    }
                  }
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

              {isSearching ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-studio-amber font-mono animate-pulse">
                    Scanning...
                  </span>
                  <button
                    onClick={cancelGlobalSearch}
                    className="text-[11px] text-rose-400 hover:underline font-mono cursor-pointer"
                    title="Cancel active search"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={executeGlobalSearch}
                  className="text-[11px] text-studio-amber hover:underline font-mono cursor-pointer"
                >
                  Search
                </button>
              )}
            </div>

            {showReplaceInput && (
              <div className="flex flex-col gap-1 mt-0.5">
                <div className="flex items-center gap-1 glass-pill px-2 py-1 rounded-lg text-xs">
                  <input
                    type="text"
                    value={globalReplaceQuery}
                    onChange={(e) => setGlobalReplaceQuery(e.target.value)}
                    placeholder="Replace with..."
                    className="bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted w-full"
                  />
                  <button
                    onClick={handleLoadReplacePreview}
                    disabled={!globalSearchQuery.trim()}
                    className="px-2 py-0.5 rounded bg-white/[0.08] hover:bg-white/[0.15] text-white font-medium text-[10px] shrink-0 cursor-pointer disabled:opacity-40"
                    title="Preview Replace Diffs before applying"
                  >
                    Preview
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        window.confirm(
                          `Apply Replace All across files?\nQuery: "${globalSearchQuery}" -> "${globalReplaceQuery}"`
                        )
                      ) {
                        await executeGlobalReplace()
                      }
                    }}
                    disabled={!globalSearchQuery.trim()}
                    className="px-2 py-0.5 rounded bg-studio-amber hover:bg-studio-accentHover text-studio-bg font-medium text-[10px] shrink-0 cursor-pointer disabled:opacity-40"
                    title="Replace All across workspace"
                  >
                    Replace All
                  </button>
                </div>
              </div>
            )}

            {/* Search Filters Toggle (Include / Exclude globs) */}
            <div className="flex items-center justify-between px-1 mt-0.5">
              <button
                onClick={() => setShowSearchFilters(!showSearchFilters)}
                className="flex items-center gap-1 text-[11px] text-studio-muted hover:text-white cursor-pointer"
              >
                <Filter className="w-3 h-3 text-studio-accent" />
                <span>Filters</span>
                {(searchOptions.includePattern || searchOptions.excludePattern) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-studio-amber" />
                )}
                {showSearchFilters ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>

              {(searchOptions.includePattern || searchOptions.excludePattern) && (
                <button
                  onClick={() => {
                    setSearchOptions({ includePattern: '', excludePattern: '' })
                    executeGlobalSearch()
                  }}
                  className="text-[10px] text-studio-muted hover:text-studio-amber cursor-pointer font-mono"
                >
                  Clear filters
                </button>
              )}
            </div>

            {showSearchFilters && (
              <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-black/20 border border-white/[0.04] text-xs">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-studio-muted font-mono">files to include</label>
                  <input
                    type="text"
                    value={searchOptions.includePattern || ''}
                    onChange={(e) => setSearchOptions({ includePattern: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') executeGlobalSearch()
                    }}
                    placeholder="e.g. *.ts, src/**"
                    className="glass-pill px-2 py-1 rounded text-xs text-white placeholder-studio-muted border-none outline-none"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-studio-muted font-mono">files to exclude</label>
                  <input
                    type="text"
                    value={searchOptions.excludePattern || ''}
                    onChange={(e) => setSearchOptions({ excludePattern: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') executeGlobalSearch()
                    }}
                    placeholder="e.g. *.spec.ts, dist/**"
                    className="glass-pill px-2 py-1 rounded text-xs text-white placeholder-studio-muted border-none outline-none"
                  />
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-studio-muted hover:text-white mt-0.5 select-none">
                  <input
                    type="checkbox"
                    checked={!!searchOptions.searchHiddenFiles}
                    onChange={(e) => {
                      setSearchOptions({ searchHiddenFiles: e.target.checked })
                      executeGlobalSearch()
                    }}
                    className="rounded accent-studio-amber"
                  />
                  <span>Search hidden files</span>
                </label>
                <div className="text-[9px] text-studio-muted/70 font-mono mt-0.5">
                  Tip: .gitignore rules are applied automatically.
                </div>
              </div>
            )}
          </div>

          {/* Results Summary with Navigation */}
          <div className="flex items-center justify-between text-[11px] text-studio-muted px-1 font-mono">
            <span>
              {totalSearchMatches} results in {globalSearchResults.length} files
            </span>
            {totalSearchMatches > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={jumpToPrevSearchResult}
                  className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                  title="Previous Match"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={jumpToNextSearchResult}
                  className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                  title="Next Match"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            )}
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
                    <div className="flex items-center gap-1 shrink-0">
                      {showReplaceInput && globalReplaceQuery && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            replaceInFile(fileResult.filePath)
                          }}
                          className="px-1.5 py-0.2 rounded bg-studio-amber/20 hover:bg-studio-amber/30 text-studio-amber text-[9px] font-mono cursor-pointer transition-colors"
                          title={`Replace all occurrences in ${fileResult.fileName}`}
                        >
                          Replace in File
                        </button>
                      )}
                      <span className="text-[10px] font-mono text-studio-muted bg-white/5 px-1.5 py-0.2 rounded">
                        {fileResult.matches.length}
                      </span>
                    </div>
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
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            {showReplaceInput && globalReplaceQuery && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  replaceMatch(match.filePath, match.line, match.column, match.preview.match)
                                }}
                                className="p-0.5 rounded hover:bg-studio-amber/20 text-studio-muted hover:text-studio-amber cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Replace this match"
                              >
                                <Replace className="w-3 h-3" />
                              </button>
                            )}
                            <ArrowRight className="w-3 h-3 text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
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
            <div
              onClick={handleSwitchBranchPrompt}
              className="flex items-center gap-1.5 text-xs text-white min-w-0 cursor-pointer hover:text-studio-amber transition-colors"
              title="Click to switch or checkout branch"
            >
              <GitBranch className="w-3.5 h-3.5 text-studio-amber shrink-0" />
              <span className="font-medium font-mono truncate">{gitStatus.branch}</span>
              {(gitStatus.ahead || 0) > 0 && (
                <span className="text-[10px] font-mono text-studio-amber px-1 rounded bg-studio-amber/10 shrink-0" title={`${gitStatus.ahead} commits ahead of remote`}>
                  ↑{gitStatus.ahead}
                </span>
              )}
              {(gitStatus.behind || 0) > 0 && (
                <span className="text-[10px] font-mono text-studio-rose px-1 rounded bg-studio-rose/10 shrink-0" title={`${gitStatus.behind} commits behind remote`}>
                  ↓{gitStatus.behind}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleRenameBranchPrompt}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                title="Rename Current Branch"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={handlePublishBranch}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-studio-amber transition-colors cursor-pointer"
                title="Publish Branch (git push -u origin)"
              >
                <UploadCloud className="w-3 h-3" />
              </button>
              <button
                onClick={handleCreateBranchPrompt}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                title="Create New Branch"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={handleMergeBranchPrompt}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-studio-amber transition-colors cursor-pointer"
                title="Merge Branch into Active Branch"
              >
                <GitMerge className="w-3 h-3" />
              </button>
              <button
                onClick={() => setIsRemoteModalOpen(true)}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-studio-amber transition-colors cursor-pointer"
                title="Manage Git Remotes (Add / Remove / Rename)"
              >
                <Globe className="w-3 h-3" />
              </button>
              <button
                onClick={() => handlePull()}
                onContextMenu={(e) => {
                  e.preventDefault()
                  const next: Record<string, 'merge' | 'rebase' | 'ff-only'> = {
                    merge: 'rebase',
                    rebase: 'ff-only',
                    'ff-only': 'merge'
                  }
                  const nextStrat = next[pullStrategy]
                  setPullStrategy(nextStrat)
                  setStatusMessage(`Git Pull strategy switched to: ${nextStrat}`)
                }}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                title={`Git Pull (${pullStrategy}) - Left-click to pull, right-click to change strategy`}
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              <button
                onClick={handlePush}
                onContextMenu={(e) => {
                  e.preventDefault()
                  handlePushWithUpstream()
                }}
                className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                title="Git Push (Left-click normal push, right-click push with upstream -u origin)"
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
              placeholder={isAmend ? "Amend commit message (optional, Ctrl+Enter to commit)..." : "Commit message (Ctrl+Enter to commit)..."}
              rows={2}
              className="w-full glass-pill rounded-xl p-2 text-xs text-white outline-none focus:border-studio-accent transition-colors resize-none placeholder-studio-muted"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  handleCommitSubmit()
                }
              }}
            />
            <div className="flex items-center justify-between px-1 text-[11px] text-studio-muted select-none">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={isAmend}
                  onChange={(e) => setIsAmend(e.target.checked)}
                  className="w-3 h-3 rounded accent-studio-accent cursor-pointer"
                />
                <span>Amend previous commit</span>
              </label>
            </div>
            {isAmend ? (
              <button
                onClick={() => handleCommitSubmit(false)}
                disabled={isCommitting}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-studio-amber hover:bg-studio-amber/90 disabled:opacity-40 text-[#121318] text-xs font-semibold transition-all cursor-pointer"
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>{isCommitting ? 'Amending...' : 'Amend Commit'}</span>
              </button>
            ) : (gitStatus.staged?.length || 0) > 0 ? (
              <div className="flex items-center gap-1.5 w-full">
                <button
                  onClick={() => handleCommitSubmit(false)}
                  disabled={isCommitting || !commitMessage.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-studio-accent hover:bg-studio-accentHover disabled:opacity-40 text-studio-bg text-xs font-medium transition-all cursor-pointer truncate"
                  title="Commit only staged files"
                >
                  <GitCommit className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {isCommitting ? 'Committing...' : `Commit Staged (${gitStatus.staged?.length})`}
                  </span>
                </button>
                <button
                  onClick={() => handleCommitSubmit(true)}
                  disabled={isCommitting || !commitMessage.trim()}
                  className="px-2.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-40 text-white/90 text-xs font-mono transition-all cursor-pointer border border-white/[0.06] shrink-0"
                  title="Stage all modified/untracked files and commit"
                >
                  Commit All
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleCommitSubmit(true)}
                disabled={isCommitting || !commitMessage.trim()}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-studio-accent hover:bg-studio-accentHover disabled:opacity-40 text-studio-bg text-xs font-medium transition-all cursor-pointer"
                title="Stage all changes and commit"
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>{isCommitting ? 'Committing...' : 'Commit All Changes'}</span>
              </button>
            )}
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
                        onClick={() => handleOpenFileDiff(file, true)}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs group transition-colors select-none"
                        title="Click to view Staged Diff (HEAD vs Index)"
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleDiscardAll}
                        className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-studio-rose transition-colors cursor-pointer"
                        title="Discard All Changes (git restore . && git clean -fd)"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => stageAllFiles()}
                        className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                        title="Stage All Changes"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
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

              {/* 5. Tags Section */}
              <div className="flex flex-col gap-1 border-t border-white/[0.04] pt-2">
                <div className="flex items-center justify-between text-[11px] text-studio-amber px-1 font-mono font-medium">
                  <span>TAGS ({(gitTags || []).length})</span>
                  <button
                    onClick={async () => {
                      const name = window.prompt('Enter new tag name (e.g. v1.0.0):')
                      if (name && name.trim()) {
                        const msg = window.prompt('Enter tag message (optional, leave empty for lightweight tag):')
                        await gitCreateTag(name.trim(), msg?.trim() || undefined)
                      }
                    }}
                    className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                    title="Create New Tag"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                  {(gitTags || []).map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/[0.04] text-xs group transition-colors select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Tag className="w-3.5 h-3.5 text-studio-amber shrink-0" />
                        <span className="text-studio-text truncate text-[11px] font-mono">{tag}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => gitCheckoutTag(tag)}
                          className="px-1.5 py-0.2 rounded hover:bg-white/10 text-[10px] text-studio-muted hover:text-studio-amber transition-colors cursor-pointer font-mono"
                          title={`Checkout tag '${tag}'`}
                        >
                          Checkout
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Delete tag '${tag}'?`)) {
                              await gitDeleteTag(tag)
                            }
                          }}
                          className="p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-studio-rose transition-colors cursor-pointer"
                          title="Delete tag"
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

      {/* Mode 4: Run and Debug */}
      {activeSidebarTab === 'debug' && <DebugDeck />}

      {/* Mode 5: Test Explorer */}
      {activeSidebarTab === 'tests' && <TestDeck />}

      {/* Mode 6: Extensions Ecosystem */}
      {activeSidebarTab === 'extensions' && <ExtensionsDeck />}

      {/* File / Folder Context Menu via Portal to escape aside overflow-hidden */}
      {contextMenu &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              top: `${Math.max(8, Math.min(contextMenu.y, window.innerHeight - 380))}px`,
              left: `${Math.max(8, Math.min(contextMenu.x, window.innerWidth - 210))}px`
            }}
            className="fixed z-[9999] w-48 glass-panel border border-white/10 rounded-xl shadow-2xl p-1 flex flex-col gap-0.5 animate-fade-in bg-studio-card/95 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
          {selectedPaths.length > 1 ? (
            <>
              <div className="px-2 py-1 text-[10px] text-studio-accent font-mono truncate border-b border-white/[0.04] mb-0.5">
                {selectedPaths.length} items selected
              </div>

              <button
                onClick={() => {
                  handleBatchDuplicate()
                  setContextMenu(null)
                }}
                className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-text hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <CopyPlus className="w-3.5 h-3.5 text-studio-emerald" />
                <span>Duplicate Selected ({selectedPaths.length})</span>
              </button>

              <button
                onClick={() => {
                  handleBatchCopyPaths(true)
                  setContextMenu(null)
                }}
                className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-text hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-studio-muted" />
                <span>Copy Relative Paths</span>
              </button>

              <button
                onClick={() => {
                  handleBatchCopyPaths(false)
                  setContextMenu(null)
                }}
                className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-text hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-studio-muted" />
                <span>Copy Full Paths</span>
              </button>

              <button
                onClick={() => {
                  setSelectedPaths([])
                  setContextMenu(null)
                }}
                className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-text hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-studio-muted" />
                <span>Clear Selection</span>
              </button>

              <div className="h-px bg-white/[0.04] my-0.5" />

              <button
                onClick={() => {
                  handleBatchDelete()
                  setContextMenu(null)
                }}
                className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-rose hover:bg-studio-rose/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-studio-rose" />
                <span>Delete ({selectedPaths.length} items)</span>
              </button>
            </>
          ) : (
            <>
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

              <button
                onClick={() => {
                  setFileClipboard({ action: 'cut', path: contextMenu.item.path, name: contextMenu.item.name })
                  setStatusMessage(`Cut ${contextMenu.item.name}`)
                  setContextMenu(null)
                }}
                className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-text hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-studio-amber" />
                <span>Cut</span>
              </button>

              <button
                onClick={() => {
                  setFileClipboard({ action: 'copy', path: contextMenu.item.path, name: contextMenu.item.name })
                  setStatusMessage(`Copied ${contextMenu.item.name}`)
                  setContextMenu(null)
                }}
                className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-text hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-studio-emerald" />
                <span>Copy</span>
              </button>

              {fileClipboard && (
                <button
                  onClick={async () => {
                    const destDir = contextMenu.item.isDirectory
                      ? contextMenu.item.path
                      : contextMenu.item.path.split(/[\\/]/).slice(0, -1).join('/') || workspacePath || '.'
                    if (fileClipboard.action === 'cut') {
                      const res = await window.maestroAPI.movePath(fileClipboard.path, destDir)
                      if (res.ok) {
                        setStatusMessage(`Moved ${fileClipboard.name}`)
                        setFileClipboard(null)
                        await handleRefresh()
                      } else {
                        setStatusMessage(`Move error: ${res.error}`)
                      }
                    } else {
                      const res = await window.maestroAPI.copyPathTo(fileClipboard.path, destDir)
                      if (res.ok) {
                        setStatusMessage(`Pasted ${fileClipboard.name}`)
                        await handleRefresh()
                      } else {
                        setStatusMessage(`Paste error: ${res.error}`)
                      }
                    }
                    setContextMenu(null)
                  }}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-amber hover:bg-studio-amber/10 transition-colors cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5 text-studio-amber" />
                  <span>Paste ({fileClipboard.name})</span>
                </button>
              )}

              <div className="h-px bg-white/[0.04] my-0.5" />

              <button
                onClick={async () => {
                  const err = await window.maestroAPI.openWithExternalApp(contextMenu.item.path)
                  if (err) setStatusMessage(`Open error: ${err}`)
                  setContextMenu(null)
                }}
                className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-studio-text hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-studio-cyan" />
                <span>Open with Default App</span>
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
            </>
          )}
        </div>,
        document.body
      )}

      {/* Git Remote Management Modal */}
      <GitRemoteModal
        isOpen={isRemoteModalOpen}
        onClose={() => setIsRemoteModalOpen(false)}
      />

      {/* Replace Preview Modal */}
      {replacePreviewItems !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-[#181a22] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white/90 max-h-[80vh]">
            <div className="h-12 px-5 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#16181f]/80">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Replace className="w-4 h-4 text-studio-amber" />
                <span>Replace Preview</span>
                <span className="text-xs font-mono text-studio-muted">
                  ({replacePreviewItems.length} occurrences)
                </span>
              </div>
              <button
                onClick={() => setReplacePreviewItems(null)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-2">
              {replacePreviewItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-studio-muted">
                  No matching occurrences found for replacement.
                </div>
              ) : (
                replacePreviewItems.map((item, idx) => (
                  <div
                    key={`${item.filePath}-${item.line}-${idx}`}
                    className="flex flex-col gap-1 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-mono"
                  >
                    <div className="flex items-center justify-between text-[11px] text-studio-amber/90">
                      <span className="truncate">{item.fileName}:{item.line}</span>
                    </div>
                    <div className="text-rose-400/90 bg-rose-500/10 px-2 py-0.5 rounded truncate line-through">
                      - {item.originalLine}
                    </div>
                    <div className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded truncate">
                      + {item.previewReplacedLine}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="h-12 px-5 border-t border-white/[0.06] bg-[#16181f]/40 flex items-center justify-between shrink-0 text-xs">
              <span className="text-studio-muted truncate max-w-[280px]">
                "{globalSearchQuery}" → "{globalReplaceQuery}"
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReplacePreviewItems(null)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setReplacePreviewItems(null)
                    await executeGlobalReplace()
                  }}
                  disabled={replacePreviewItems.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-studio-amber text-[#121318] font-semibold hover:bg-studio-amber/90 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Apply Replace All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

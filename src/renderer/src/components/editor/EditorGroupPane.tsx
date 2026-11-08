import React, { useRef, useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Editor, { DiffEditor, OnMount } from '@monaco-editor/react'
import type * as monaco from 'monaco-editor'
import {
  Code2,
  X,
  FileCode2,
  Zap,
  Cpu,
  Code,
  GitMerge,
  AlertCircle,
  Pin,
  Copy,
  FolderOpen,
  RotateCcw,
  Columns2,
  Rows2,
  ArrowRightLeft
} from 'lucide-react'
import { useEditorStore, type EditorFile } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import { lspClient } from '../../services/lspClient'
import { registerAndApplyCozyTheme } from '../../theme/monacoTheme'
import { parseConflictBlocks, resolveConflict } from '../../services/conflictResolver'
import { useDebugStore } from '../../store/useDebugStore'
import { useTestStore } from '../../store/useTestStore'
import { useAiStore } from '../../store/useAiStore'
import type { GitGutterChange } from '../../../../preload/index.d'
import { ImageViewerPane } from './ImageViewerPane'
import { BinaryFilePane } from './BinaryFilePane'

interface EditorGroupPaneProps {
  group: 1 | 2
  isActive: boolean
  onFocus: () => void
}

export const EditorGroupPane: React.FC<EditorGroupPaneProps> = ({
  group,
  isActive,
  onFocus
}) => {
  const {
    openFiles,
    editorSplitMode,
    group1FilePaths,
    group2FilePaths,
    group1ActiveFilePath,
    group2ActiveFilePath,
    updateFileContent,
    markFileSaved,
    setCursorPosition,
    setStatusMessage,
    togglePinFile,
    makeFilePermanent,
    splitEditor,
    closeEditorSplit,
    setActiveFileInGroup,
    closeFileInGroup,
    closeOtherFilesInGroup,
    closeFilesToRightInGroup,
    closeSavedFilesInGroup,
    closeAllFilesInGroup,
    moveTabToGroup,
    reorderFilesInGroup,
    focusTask,
    lspStatus,
    diffSession,
    closeDiff,
    editorSettings,
    activeSymbol,
    workspacePath,
    gitStatus,
    externalFileConflict,
    reloadFileFromDisk,
    compareFileWithDisk,
    dismissExternalFileConflict,
    openThreeWayMerge
  } = useEditorStore()

  const [isDiffSideBySide, setIsDiffSideBySide] = useState(true)
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof monaco | null>(null)
  const gutterDecorationsRef = useRef<string[]>([])
  const debugDecorationsRef = useRef<string[]>([])
  const gutterChangesRef = useRef<GitGutterChange[]>([])
  const viewStatesRef = useRef<Map<string, monaco.editor.ICodeEditorViewState>>(new Map())
  const prevActiveFileRef = useRef<string | null>(null)

  const breakpoints = useDebugStore((s) => s.breakpoints)
  const currentFrame = useDebugStore((s) => s.currentFrame)
  const testFiles = useTestStore((s) => s.files)

  const groupFilePaths = group === 1 ? group1FilePaths : group2FilePaths
  const groupActiveFilePath = group === 1 ? group1ActiveFilePath : group2ActiveFilePath

  // Files currently open in this group in exact order
  const filesInGroup = useMemo(() => {
    return groupFilePaths
      .map((p) => openFiles.find((f) => f.path === p))
      .filter((f): f is EditorFile => !!f)
  }, [groupFilePaths, openFiles])

  const currentFile = useMemo(() => {
    return openFiles.find((f) => f.path === groupActiveFilePath) || null
  }, [openFiles, groupActiveFilePath])

  const [forcedTextPaths, setForcedTextPaths] = useState<Record<string, boolean>>({})

  const isImageFile = useMemo(() => {
    if (!currentFile) return false
    return /\.(png|jpe?g|gif|svg|ico|webp|avif|bmp)$/i.test(currentFile.name)
  }, [currentFile?.name])

  const isBinaryFile = useMemo(() => {
    if (!currentFile || isImageFile) return false
    if (forcedTextPaths[currentFile.path]) return false
    return /\.(exe|dll|so|dylib|bin|wasm|pdf|zip|tar|gz|7z|rar|mp3|mp4|wav|mov|iso|dmg)$/i.test(
      currentFile.name
    )
  }, [currentFile?.path, currentFile?.name, isImageFile, forcedTextPaths])

  // Preserve & restore view state per file within this independent group
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    if (prevActiveFileRef.current && prevActiveFileRef.current !== groupActiveFilePath) {
      const state = editor.saveViewState()
      if (state) {
        viewStatesRef.current.set(prevActiveFileRef.current, state)
      }
    }

    if (groupActiveFilePath) {
      const savedState = viewStatesRef.current.get(groupActiveFilePath)
      if (savedState) {
        editor.restoreViewState(savedState)
      }
    }

    prevActiveFileRef.current = groupActiveFilePath
  }, [groupActiveFilePath])

  // Apply EditorConfig per file
  useEffect(() => {
    if (!workspacePath || !groupActiveFilePath) return
    window.maestroAPI?.loadEditorConfig(workspacePath, groupActiveFilePath).then((ec) => {
      if (ec && editorRef.current) {
        const model = editorRef.current.getModel()
        if (model) {
          model.updateOptions({
            tabSize: ec.indentSize || ec.tabWidth || undefined,
            insertSpaces: ec.indentStyle ? ec.indentStyle === 'space' : undefined
          })
        }
      }
    })
  }, [workspacePath, groupActiveFilePath])

  const conflictBlocks = useMemo(
    () => parseConflictBlocks(currentFile?.content || ''),
    [currentFile?.content]
  )

  const isLargeFile = useMemo(() => {
    const len = currentFile?.content?.length || 0
    return len > 500000
  }, [currentFile?.content])

  const [tabContextMenu, setTabContextMenu] = useState<{
    x: number
    y: number
    file: EditorFile
  } | null>(null)

  useEffect(() => {
    const handleCloseTabMenu = () => setTabContextMenu(null)
    if (tabContextMenu) {
      window.addEventListener('click', handleCloseTabMenu)
      window.addEventListener('contextmenu', handleCloseTabMenu)
    }
    return () => {
      window.removeEventListener('click', handleCloseTabMenu)
      window.removeEventListener('contextmenu', handleCloseTabMenu)
    }
  }, [tabContextMenu])

  const handleResolveConflictBlock = (
    blockIndex: number,
    resolution: 'current' | 'incoming' | 'both'
  ) => {
    if (!currentFile || !groupActiveFilePath) return
    const block = conflictBlocks[blockIndex]
    if (!block) return
    const nextContent = resolveConflict(currentFile.content, block, resolution)
    updateFileContent(groupActiveFilePath, nextContent)
    setStatusMessage(`Conflict resolved: accepted ${resolution}`)
  }

  const handleJumpToConflict = (blockIndex: number) => {
    const block = conflictBlocks[blockIndex]
    if (block && editorRef.current) {
      editorRef.current.revealLineInCenter(block.startLine)
      editorRef.current.setPosition({ lineNumber: block.startLine, column: 1 })
      editorRef.current.focus()
    }
  }

  const editorModelPath = useMemo(() => {
    if (!currentFile?.path) return undefined
    if (monacoRef.current) {
      return monacoRef.current.Uri.file(currentFile.path).toString()
    }
    const clean = currentFile.path.replace(/\\/g, '/').replace(/^\/+/, '')
    return `file:///${clean}`
  }, [currentFile?.path])

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor
    monacoRef.current = monacoInstance
    registerAndApplyCozyTheme(monacoInstance)
    lspClient.setMonaco(monacoInstance)

    if (currentFile) {
      lspClient.ensureServerForFile(currentFile.path, currentFile.language || 'typescript').catch(() => {})
      lspClient.notifyDocOpen('ts-server', currentFile.path, currentFile.language || 'typescript', currentFile.content, 1)
    }

    editor.onDidFocusEditorText(() => {
      onFocus()
    })

    editor.onDidChangeCursorPosition((e) => {
      if (isActive) {
        setCursorPosition(e.position.lineNumber, e.position.column)
        if (groupActiveFilePath) {
          useEditorStore.getState().pushNavHistory({
            filePath: groupActiveFilePath,
            line: e.position.lineNumber,
            column: e.position.column
          })
        }
      }
    })

    // Shortcut Save (Ctrl+S)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, async () => {
      const state = useEditorStore.getState()
      const targetPath = group === 1 ? state.group1ActiveFilePath : state.group2ActiveFilePath
      const targetFile = state.openFiles.find((f) => f.path === targetPath)
      if (targetFile) {
        let ecRules: any = null
        if (state.workspacePath) {
          try {
            ecRules = await window.maestroAPI.loadEditorConfig(state.workspacePath, targetFile.path)
          } catch {
            // ignore
          }
        }

        if (ecRules?.trimTrailingWhitespace) {
          try {
            await editor.getAction('editor.action.trimTrailingWhitespace')?.run()
          } catch {
            // ignore
          }
        }

        if (state.editorSettings.formatOnSave) {
          try {
            await editor.getAction('editor.action.formatDocument')?.run()
          } catch {
            // ignore
          }
        }

        let val = editor.getValue()
        if (ecRules?.insertFinalNewline && !val.endsWith('\n')) {
          val = val + (ecRules.endOfLine === 'crlf' ? '\r\n' : '\n')
          editor.setValue(val)
        }
        if (ecRules?.endOfLine === 'crlf') {
          val = val.replace(/\r?\n/g, '\r\n')
        } else if (ecRules?.endOfLine === 'lf') {
          val = val.replace(/\r\n/g, '\n')
        }

        try {
          await window.maestroAPI.writeFile(targetFile.path, val)
          markFileSaved(targetFile.path)
          lspClient.notifyDocSave('ts-server', targetFile.path)
          setStatusMessage(`Saved ${targetFile.name}${ecRules ? ' (.editorconfig applied)' : ''}`)
          setTimeout(() => setStatusMessage('Ready'), 2000)
        } catch (err) {
          console.error('Failed to save file:', err)
          setStatusMessage('Failed to save file')
        }
      }
    })

    // Shortcut Close Tab (Ctrl+W)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyW, () => {
      if (groupActiveFilePath) {
        closeFileInGroup(group, groupActiveFilePath)
      }
    })

    // Shortcut Switch Next Editor Tab (Ctrl+Tab)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Tab, () => {
      useEditorStore.getState().nextEditor()
    })

    // Shortcut Format Document (Shift+Alt+F)
    editor.addCommand(
      monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.KeyF,
      () => {
        const sel = editor.getSelection()
        if (sel && !sel.isEmpty()) {
          editor.getAction('editor.action.formatSelection')?.run()
        } else {
          editor.getAction('editor.action.formatDocument')?.run()
        }
      }
    )

    // Shortcut Quick Fix (Ctrl+.)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Period,
      () => {
        editor.getAction('editor.action.quickFix')?.run()
      }
    )

    // Shortcut Organize Imports (Shift+Alt+O)
    editor.addCommand(
      monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.KeyO,
      async () => {
        if (groupActiveFilePath) {
          const success = await lspClient.organizeImports(groupActiveFilePath)
          if (success) {
            useEditorStore.getState().setStatusMessage('Organized imports')
            setTimeout(() => useEditorStore.getState().setStatusMessage('Ready'), 1500)
          }
        }
      }
    )

    // Shortcut Toggle Line Comment (Ctrl+/)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Slash, () => {
      editor.getAction('editor.action.commentLine')?.run()
    })

    // Shortcut Toggle Block Comment (Shift+Alt+A)
    editor.addCommand(
      monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.KeyA,
      () => {
        editor.getAction('editor.action.blockComment')?.run()
      }
    )

    // Shortcut Move Line Down (Alt+DownArrow)
    editor.addCommand(monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.DownArrow, () => {
      editor.getAction('editor.action.moveLinesDownAction')?.run()
    })

    // Shortcut Move Line Up (Alt+UpArrow)
    editor.addCommand(monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.UpArrow, () => {
      editor.getAction('editor.action.moveLinesUpAction')?.run()
    })

    // Shortcut Copy Line Down (Shift+Alt+DownArrow)
    editor.addCommand(
      monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.DownArrow,
      () => {
        editor.getAction('editor.action.copyLinesDownAction')?.run()
      }
    )

    // Shortcut Copy Line Up (Shift+Alt+UpArrow)
    editor.addCommand(
      monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.UpArrow,
      () => {
        editor.getAction('editor.action.copyLinesUpAction')?.run()
      }
    )

    // Shortcut Multi-Cursor: Add Next Occurrence (Ctrl+D)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyD, () => {
      editor.getAction('editor.action.addSelectionToNextFindMatch')?.run()
    })

    // Shortcut Rename Symbol (F2)
    editor.addCommand(monacoInstance.KeyCode.F2, () => {
      editor.getAction('editor.action.rename')?.run()
    })

    // Shortcut F9: Toggle Breakpoint
    editor.addCommand(monacoInstance.KeyCode.F9, () => {
      const pos = editor.getPosition()
      if (pos && groupActiveFilePath) {
        useDebugStore.getState().toggleBreakpoint(groupActiveFilePath, pos.lineNumber)
      }
    })

    // Gutter Click to Toggle Breakpoint
    editor.onMouseDown((e) => {
      onFocus()
      if (
        e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        const line = e.target.position?.lineNumber
        if (line && groupActiveFilePath) {
          useDebugStore.getState().toggleBreakpoint(groupActiveFilePath, line)
        }
      }
    })

    // Maestro Context Menu Actions:
    // 1. Create Task from Selected Code
    editor.addAction({
      id: 'maestro.createTaskFromSelection',
      label: 'Maestro: Create Task from Selection',
      contextMenuGroupId: 'maestro_pm',
      contextMenuOrder: 1,
      run: (ed) => {
        const selection = ed.getSelection()
        const selectedText = selection && !selection.isEmpty() ? ed.getModel()?.getValueInRange(selection) : ''
        const startLine = selection ? selection.startLineNumber : ed.getPosition()?.lineNumber || 1
        const activePath = groupActiveFilePath || ''
        const fileName = activePath.split(/[\\/]/).pop() || 'file'

        const firstLine = (selectedText || ed.getModel()?.getLineContent(startLine) || '').trim()
        const titleSnippet = firstLine.slice(0, 50) || `Task from ${fileName}:${startLine}`
        const taskTitle = `Implement/Refactor: ${titleSnippet}`
        const desc = selectedText
          ? `Selected code from \`${fileName}:${startLine}\`:\n\n\`\`\`\n${selectedText}\n\`\`\``
          : `Referenced code at \`${fileName}:${startLine}\``

        const projectStore = useProjectStore.getState()
        projectStore.addTask({
          title: taskTitle,
          description: desc,
          status: 'todo',
          priority: 'medium',
          type: 'task',
          linkedFile: activePath,
          linkedLine: startLine,
          codeLinks: [{ file: activePath, line: startLine }],
          subtasks: []
        })

        const editorState = useEditorStore.getState()
        if (editorState.workspacePath) {
          projectStore.saveToDisk(editorState.workspacePath)
        }
        editorState.setStatusMessage(`Created task from selection (${fileName}:${startLine})`)
        setTimeout(() => editorState.setStatusMessage('Ready'), 2500)
      }
    })

    // 2. Attach Current Selection to Active Focus Task
    editor.addAction({
      id: 'maestro.attachSelectionToTask',
      label: 'Maestro: Attach Selection / File to Active Task',
      contextMenuGroupId: 'maestro_pm',
      contextMenuOrder: 2,
      run: (ed) => {
        const editorState = useEditorStore.getState()
        const focusTask = editorState.focusTask
        if (!focusTask) {
          editorState.setStatusMessage('No active focus task! Set a focus task first.')
          setTimeout(() => editorState.setStatusMessage('Ready'), 2500)
          return
        }

        const selection = ed.getSelection()
        const startLine = selection ? selection.startLineNumber : ed.getPosition()?.lineNumber || 1
        const activePath = groupActiveFilePath || ''
        const fileName = activePath.split(/[\\/]/).pop() || 'file'

        const projectStore = useProjectStore.getState()
        projectStore.addCodeLink(focusTask.id, {
          file: activePath,
          line: startLine
        })

        if (editorState.workspacePath) {
          projectStore.saveToDisk(editorState.workspacePath)
        }
        editorState.setStatusMessage(`Attached ${fileName}:${startLine} to task ${focusTask.id}`)
        setTimeout(() => editorState.setStatusMessage('Ready'), 2500)
      }
    })

    // 3. Open Active Task in Project Deck
    editor.addAction({
      id: 'maestro.openTaskInProjectDeck',
      label: 'Maestro: Open Active Task in Project Deck',
      contextMenuGroupId: 'maestro_pm',
      contextMenuOrder: 3,
      run: () => {
        const editorState = useEditorStore.getState()
        editorState.setLayoutMode('split')
        editorState.setStatusMessage('Opened Project Deck split view')
        setTimeout(() => editorState.setStatusMessage('Ready'), 2000)
      }
    })

    // 4. Git: Stage Hunk at Cursor
    editor.addAction({
      id: 'maestro.stageHunkAtCursor',
      label: 'Maestro Git: Stage Hunk at Cursor',
      contextMenuGroupId: 'maestro_git',
      contextMenuOrder: 1,
      run: async (ed) => {
        const line = ed.getPosition()?.lineNumber || 1
        const activePath = groupActiveFilePath || ''
        const state = useEditorStore.getState()
        if (!state.workspacePath || !activePath) return

        const relPath = activePath.replace(state.workspacePath, '').replace(/^[/\\]/, '')
        try {
          const hunk = await window.maestroAPI.getGitHunkAtLine(state.workspacePath, relPath, line)
          if (!hunk) {
            state.setStatusMessage('No Git diff hunk at cursor')
            setTimeout(() => state.setStatusMessage('Ready'), 2000)
            return
          }
          const res = await window.maestroAPI.gitStageHunk(state.workspacePath, hunk.patch)
          if (res.ok) {
            state.setStatusMessage(`Staged Git hunk at line ${line}`)
            await state.refreshGitStatus()
            await updateGitGutterDecorations()
          } else {
            state.setStatusMessage(`Failed to stage hunk: ${res.message}`)
          }
        } catch (err: any) {
          state.setStatusMessage(`Error staging hunk: ${err?.message || err}`)
        }
        setTimeout(() => state.setStatusMessage('Ready'), 2500)
      }
    })

    // 5. Git: Discard / Revert Hunk at Cursor
    editor.addAction({
      id: 'maestro.discardHunkAtCursor',
      label: 'Maestro Git: Discard Hunk at Cursor',
      contextMenuGroupId: 'maestro_git',
      contextMenuOrder: 2,
      run: async (ed) => {
        const line = ed.getPosition()?.lineNumber || 1
        const activePath = groupActiveFilePath || ''
        const state = useEditorStore.getState()
        if (!state.workspacePath || !activePath) return

        const relPath = activePath.replace(state.workspacePath, '').replace(/^[/\\]/, '')
        try {
          const hunk = await window.maestroAPI.getGitHunkAtLine(state.workspacePath, relPath, line)
          if (!hunk) {
            state.setStatusMessage('No Git diff hunk at cursor')
            setTimeout(() => state.setStatusMessage('Ready'), 2000)
            return
          }
          const res = await window.maestroAPI.gitDiscardHunk(state.workspacePath, hunk.patch)
          if (res.ok) {
            state.setStatusMessage(`Discarded Git hunk at line ${line}`)
            const diskContent = await window.maestroAPI.readFile(activePath)
            state.updateFileContent(activePath, diskContent)
            await state.refreshGitStatus()
            await updateGitGutterDecorations()
          } else {
            state.setStatusMessage(`Failed to discard hunk: ${res.message}`)
          }
        } catch (err: any) {
          state.setStatusMessage(`Error discarding hunk: ${err?.message || err}`)
        }
        setTimeout(() => state.setStatusMessage('Ready'), 2500)
      }
    })

    // 6. Navigation: Peek Definition (Alt+F12)
    editor.addAction({
      id: 'maestro.peekDefinition',
      label: 'Peek Definition',
      keybindings: [monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.F12],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.1,
      run: (ed) => {
        ed.getAction('editor.action.peekDefinition')?.run()
      }
    })

    // 7. Navigation: Peek References (Shift+F12)
    editor.addAction({
      id: 'maestro.peekReferences',
      label: 'Peek References',
      keybindings: [monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.F12],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.2,
      run: (ed) => {
        ed.getAction('editor.action.referenceSearch.trigger')?.run()
      }
    })

    // 8. Navigation: Go to Definition (F12)
    editor.addAction({
      id: 'maestro.goToDefinition',
      label: 'Go to Definition',
      keybindings: [monacoInstance.KeyCode.F12],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.3,
      run: (ed) => {
        ed.getAction('editor.action.revealDefinition')?.run()
      }
    })

    // 9. AI: Explain Selection
    editor.addAction({
      id: 'maestro.ai.explain',
      label: 'Maestro AI: Explain Selection',
      keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyL],
      contextMenuGroupId: '1_ai',
      contextMenuOrder: 1.0,
      run: (ed) => {
        const model = ed.getModel()
        const selection = ed.getSelection()
        const selectedText = selection && model ? model.getValueInRange(selection) : ''
        const code = selectedText || model?.getValue() || ''
        if (!code) return
        const filePath = groupActiveFilePath || 'file'
        useAiStore.getState().addContextItem({
          id: `sel_${Date.now()}`,
          type: 'selection',
          label: `Selection in ${filePath.split(/[\\/]/).pop()}`,
          filePath,
          content: code,
          language: currentFile?.language
        })
        useEditorStore.getState().setActiveSidebarTab('ai')
        useAiStore.getState().sendMessage('Please explain the selected code thoroughly, including its intent and edge cases:')
      }
    })

    // 10. AI: Find Bugs
    editor.addAction({
      id: 'maestro.ai.findBugs',
      label: 'Maestro AI: Find Potential Bugs',
      contextMenuGroupId: '1_ai',
      contextMenuOrder: 1.1,
      run: (ed) => {
        const model = ed.getModel()
        const selection = ed.getSelection()
        const selectedText = selection && model ? model.getValueInRange(selection) : ''
        const code = selectedText || model?.getValue() || ''
        if (!code) return
        const filePath = groupActiveFilePath || 'file'
        useAiStore.getState().addContextItem({
          id: `sel_${Date.now()}`,
          type: 'selection',
          label: `Selection in ${filePath.split(/[\\/]/).pop()}`,
          filePath,
          content: code,
          language: currentFile?.language
        })
        useEditorStore.getState().setActiveSidebarTab('ai')
        useAiStore.getState().sendMessage('Carefully analyze this code for logical bugs, memory leaks, or race conditions:')
      }
    })

    // 11. AI: Generate Unit Tests
    editor.addAction({
      id: 'maestro.ai.generateTests',
      label: 'Maestro AI: Generate Unit Tests',
      contextMenuGroupId: '1_ai',
      contextMenuOrder: 1.2,
      run: (ed) => {
        const model = ed.getModel()
        const selection = ed.getSelection()
        const selectedText = selection && model ? model.getValueInRange(selection) : ''
        const code = selectedText || model?.getValue() || ''
        if (!code) return
        const filePath = groupActiveFilePath || 'file'
        useAiStore.getState().addContextItem({
          id: `sel_${Date.now()}`,
          type: 'selection',
          label: `Selection in ${filePath.split(/[\\/]/).pop()}`,
          filePath,
          content: code,
          language: currentFile?.language
        })
        useEditorStore.getState().setActiveSidebarTab('ai')
        useAiStore.getState().sendMessage('Generate comprehensive unit tests with boundary edge cases for this code:')
      }
    })

    // 12. AI: Propose Refactor (Edit Mode)
    editor.addAction({
      id: 'maestro.ai.refactor',
      label: 'Maestro AI: Propose Refactor',
      contextMenuGroupId: '1_ai',
      contextMenuOrder: 1.3,
      run: (ed) => {
        const model = ed.getModel()
        const selection = ed.getSelection()
        const selectedText = selection && model ? model.getValueInRange(selection) : ''
        const code = selectedText || model?.getValue() || ''
        if (!code) return
        const filePath = groupActiveFilePath || 'file'
        useAiStore.getState().setChatMode('edit')
        useAiStore.getState().addContextItem({
          id: `sel_${Date.now()}`,
          type: 'selection',
          label: `Selection in ${filePath.split(/[\\/]/).pop()}`,
          filePath,
          content: code,
          language: currentFile?.language
        })
        useEditorStore.getState().setActiveSidebarTab('ai')
        useAiStore.getState().sendMessage('Propose a clean, idiomatic refactored version of this code in unified diff format:')
      }
    })
  }

  const handleContentChange = (value: string | undefined) => {
    if (groupActiveFilePath && value !== undefined) {
      updateFileContent(groupActiveFilePath, value)
      lspClient.notifyDocChange('ts-server', groupActiveFilePath, Date.now(), value)
    }
  }

  // Git gutter decoration updates
  const updateGitGutterDecorations = async () => {
    if (!editorRef.current || !monacoRef.current || !workspacePath || !groupActiveFilePath) {
      if (editorRef.current && gutterDecorationsRef.current.length > 0) {
        gutterDecorationsRef.current = editorRef.current.deltaDecorations(
          gutterDecorationsRef.current,
          []
        )
      }
      return
    }
    try {
      const relPath = groupActiveFilePath.replace(workspacePath, '').replace(/^[/\\]/, '')
      const changes = await window.maestroAPI.getGitGutterChanges(workspacePath, relPath)
      gutterChangesRef.current = changes
      const m = monacoRef.current
      if (!m) return

      const newDecorations: monaco.editor.IModelDeltaDecoration[] = changes.map((c) => ({
        range: new m.Range(c.startLine, 1, c.endLine, 1),
        options: {
          isWholeLine: true,
          linesDecorationsClassName:
            c.type === 'added'
              ? 'git-gutter-added'
              : c.type === 'modified'
              ? 'git-gutter-modified'
              : 'git-gutter-deleted',
          hoverMessage: {
            value: `**Git ${c.type.toUpperCase()}** (Lines ${c.startLine}-${c.endLine})\n\nShortcut: \`Alt+F3\` (Next change) / \`Shift+Alt+F3\` (Previous change)`
          }
        }
      }))

      gutterDecorationsRef.current = editorRef.current.deltaDecorations(
        gutterDecorationsRef.current,
        newDecorations
      )
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    updateGitGutterDecorations()
    if (groupActiveFilePath && isActive) {
      useEditorStore.getState().fetchGitBlame(groupActiveFilePath)
    }
  }, [groupActiveFilePath, currentFile?.content, gitStatus])

  // Reveal line and commands for active editor
  useEffect(() => {
    if (!isActive) return

    const handleReveal = (e: any) => {
      const { line, column } = e.detail || {}
      if (editorRef.current && line) {
        editorRef.current.revealLineInCenter(line)
        editorRef.current.setPosition({ lineNumber: line, column: column || 1 })
        editorRef.current.focus()
      }
    }

    const handleEditorCommand = (e: any) => {
      const ed = editorRef.current
      if (!ed) return
      const cmd = e.detail?.command
      if (cmd === 'trim-trailing-whitespace') {
        ed.getAction('editor.action.trimTrailingWhitespace')?.run()
      } else if (cmd === 'transform-uppercase') {
        ed.getAction('editor.action.transformToUppercase')?.run()
      } else if (cmd === 'transform-lowercase') {
        ed.getAction('editor.action.transformToLowercase')?.run()
      } else if (cmd === 'transform-titlecase') {
        ed.getAction('editor.action.transformToTitlecase')?.run()
      } else if (cmd === 'surround-quotes') {
        const sel = ed.getSelection()
        if (sel) {
          const text = ed.getModel()?.getValueInRange(sel) || ''
          ed.executeEdits('surround', [{ range: sel, text: `"${text}"` }])
        }
      } else if (cmd === 'surround-parentheses') {
        const sel = ed.getSelection()
        if (sel) {
          const text = ed.getModel()?.getValueInRange(sel) || ''
          ed.executeEdits('surround', [{ range: sel, text: `(${text})` }])
        }
      } else if (cmd === 'surround-braces') {
        const sel = ed.getSelection()
        if (sel) {
          const text = ed.getModel()?.getValueInRange(sel) || ''
          ed.executeEdits('surround', [{ range: sel, text: `{${text}}` }])
        }
      }
    }

    window.addEventListener('editor-reveal-line', handleReveal)
    window.addEventListener('editor-run-command', handleEditorCommand)
    return () => {
      window.removeEventListener('editor-reveal-line', handleReveal)
      window.removeEventListener('editor-run-command', handleEditorCommand)
    }
  }, [isActive])

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: editorSettings.fontSize,
        tabSize: editorSettings.tabSize,
        wordWrap: editorSettings.wordWrap,
        minimap: { enabled: editorSettings.minimap, side: 'right' },
        lineNumbers: editorSettings.lineNumbers
      })
    }
  }, [editorSettings])

  useEffect(() => {
    if (currentFile) {
      lspClient.notifyDocOpen(
        'ts-server',
        currentFile.path,
        currentFile.language || 'plaintext',
        currentFile.content
      )
      lspClient.getDocumentSymbols(
        currentFile.path,
        currentFile.content,
        currentFile.language || 'plaintext'
      )
    }
  }, [currentFile?.path])

  // Breakpoints, execution arrows, and test gutter glyphs
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !groupActiveFilePath) {
      if (editorRef.current && debugDecorationsRef.current.length > 0) {
        debugDecorationsRef.current = editorRef.current.deltaDecorations(
          debugDecorationsRef.current,
          []
        )
      }
      return
    }

    const m = monacoRef.current
    const newDecs: monaco.editor.IModelDeltaDecoration[] = []

    // Breakpoints
    const fileBps = breakpoints.filter((b) => b.filePath === groupActiveFilePath)
    for (const bp of fileBps) {
      newDecs.push({
        range: new m.Range(bp.line, 1, bp.line, 1),
        options: {
          glyphMarginClassName: bp.verified
            ? 'debug-breakpoint-active'
            : 'debug-breakpoint-disabled',
          glyphMarginHoverMessage: { value: `Breakpoint (Line ${bp.line})` }
        }
      })
    }

    // Stopped execution frame
    if (currentFrame?.source?.path && currentFrame.source.path === groupActiveFilePath) {
      newDecs.push({
        range: new m.Range(currentFrame.line, 1, currentFrame.line, 1),
        options: {
          isWholeLine: true,
          className: 'debug-current-line-highlight',
          glyphMarginClassName: 'debug-current-frame-arrow',
          glyphMarginHoverMessage: { value: `Paused: ${currentFrame.name}` }
        }
      })
    }

    // Test cases
    const currentTestFile = testFiles.find((f) => f.filePath === groupActiveFilePath)
    if (currentTestFile) {
      const allFileTests = [
        ...currentTestFile.suites.flatMap((s) => s.tests),
        ...currentTestFile.isolatedTests
      ]
      for (const t of allFileTests) {
        newDecs.push({
          range: new m.Range(t.line, 1, t.line, 1),
          options: {
            glyphMarginClassName:
              t.status === 'passed'
                ? 'test-glyph-passed'
                : t.status === 'failed'
                ? 'test-glyph-failed'
                : 'test-glyph-run',
            glyphMarginHoverMessage: {
              value: `**Test: ${t.name}** [${t.status.toUpperCase()}]\n\nClick to run single test`
            }
          }
        })
      }
    }

    debugDecorationsRef.current = editorRef.current.deltaDecorations(
      debugDecorationsRef.current,
      newDecs
    )
  }, [groupActiveFilePath, breakpoints, currentFrame, testFiles])

  const shouldRenderDiff = diffSession && (isActive || group === 1)

  return (
    <div
      onClick={onFocus}
      className={`flex-1 w-full h-full flex flex-col overflow-hidden select-none transition-all duration-150 ${
        isActive && editorSplitMode !== 'none'
          ? 'ring-1 ring-studio-accent/40 rounded-xl'
          : ''
      }`}
    >
      {/* Tab Bar Header */}
      <div
        className="flex items-center justify-between min-h-8 px-1 pb-1 shrink-0 overflow-hidden"
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDrop={(e) => {
          e.preventDefault()
          const raw = e.dataTransfer.getData('application/maestro-tab')
          if (!raw) return
          try {
            const data = JSON.parse(raw)
            if (data.group !== group) {
              moveTabToGroup(data.path, group)
            }
          } catch {
            // ignore
          }
        }}
      >
        <div
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY
            }
          }}
          className="flex items-center gap-1.5 overflow-x-auto flex-1 py-0.5"
        >
          {/* Editor Group Indicator when Split is Active */}
          {editorSplitMode !== 'none' && (
            <div
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0 transition-colors ${
                isActive
                  ? 'bg-studio-accent/20 border-studio-accent/40 text-studio-accent font-semibold'
                  : 'bg-white/5 border-white/10 text-studio-muted'
              }`}
            >
              Group {group}
            </div>
          )}

          {filesInGroup.length === 0 ? (
            <div className="text-[11px] text-studio-muted/60 italic px-2 py-0.5">
              No files open in this group
            </div>
          ) : (
            filesInGroup.map((file, index) => {
              const isTabActive = !shouldRenderDiff && groupActiveFilePath === file.path

              return (
                <div
                  key={file.path}
                  draggable
                  onDragStart={(e) => {
                    setDraggedTabIndex(index)
                    e.dataTransfer.setData(
                      'application/maestro-tab',
                      JSON.stringify({ group, path: file.path, index })
                    )
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => setDraggedTabIndex(null)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const raw = e.dataTransfer.getData('application/maestro-tab')
                    if (!raw) return
                    try {
                      const data = JSON.parse(raw)
                      if (data.group === group) {
                        if (data.index !== index) {
                          reorderFilesInGroup(group, data.index, index)
                        }
                      } else {
                        moveTabToGroup(data.path, group)
                      }
                    } catch {
                      // ignore
                    }
                  }}
                  onClick={() => {
                    setActiveFileInGroup(group, file.path)
                    onFocus()
                  }}
                  onDoubleClick={() => makeFilePermanent(file.path)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setTabContextMenu({ x: e.clientX, y: e.clientY, file })
                  }}
                  title={file.path}
                  className={`group flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-mono transition-all duration-150 border cursor-pointer shrink-0 ${
                    isTabActive
                      ? 'bg-white/[0.08] text-white border-white/[0.1] shadow-sm'
                      : 'text-studio-muted hover:text-white hover:bg-white/[0.03] border-transparent'
                  } ${draggedTabIndex === index ? 'opacity-40 border-dashed border-studio-accent' : ''}`}
                >
                  <FileCode2
                    className={`w-3.5 h-3.5 ${
                      file.isDirty ? 'text-studio-amber' : 'text-studio-cyan'
                    }`}
                  />
                  <span
                    className={`truncate max-w-[140px] ${
                      file.isPreview ? 'italic text-studio-muted' : ''
                    }`}
                  >
                    {file.name}
                  </span>

                  {file.isPinned && (
                    <Pin className="w-2.5 h-2.5 text-studio-accent shrink-0 rotate-45" />
                  )}

                  {file.isDirty && !file.isPinned && (
                    <div className="w-1.5 h-1.5 rounded-full bg-studio-amber shrink-0 group-hover:hidden" />
                  )}

                  {!file.isPinned && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        closeFileInGroup(group, file.path)
                      }}
                      className={`p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-opacity ${
                        file.isDirty ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      title="Close"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Right side Group Controls */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Split Editor Right */}
          <button
            onClick={() => splitEditor('vertical')}
            title="Split Editor Right (Ctrl+\)"
            className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
          >
            <Columns2 className="w-3.5 h-3.5" />
          </button>

          {/* Split Editor Down */}
          <button
            onClick={() => splitEditor('horizontal')}
            title="Split Editor Down (Ctrl+K Ctrl+\)"
            className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
          >
            <Rows2 className="w-3.5 h-3.5" />
          </button>

          {/* Close Split when in Split mode */}
          {editorSplitMode !== 'none' && (
            <button
              onClick={closeEditorSplit}
              title="Close Editor Split"
              className="p-1 rounded hover:bg-white/10 text-studio-muted hover:text-studio-rose transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* LSP Status Indicator (Only on Group 1 when not split) */}
          {group === 1 && editorSplitMode === 'none' && (
            <div className="flex items-center gap-1.5 glass-pill px-2 py-0.5 rounded-md text-[10px] text-studio-muted shrink-0 font-mono ml-1">
              <Cpu className="w-3 h-3 text-studio-emerald" />
              <span>LSP: {lspStatus}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas Frame */}
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col border border-white/[0.05] relative">
        {shouldRenderDiff ? (
          <div className="flex-1 w-full h-full flex flex-col overflow-hidden">
            <div className="h-7 px-3 border-b border-white/[0.04] flex items-center justify-between text-[11px] text-studio-muted bg-studio-card/30 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-studio-amber">Comparing:</span>
                <span>HEAD (Index) ↔ Working Tree ({diffSession.path})</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsDiffSideBySide(!isDiffSideBySide)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white cursor-pointer transition-colors text-[10px]"
                >
                  {isDiffSideBySide ? 'Inline Diff' : 'Side-by-Side'}
                </button>
                <button
                  onClick={closeDiff}
                  className="text-studio-muted hover:text-white cursor-pointer"
                >
                  Close Diff
                </button>
              </div>
            </div>
            <div className="flex-1 w-full h-full overflow-hidden">
              <DiffEditor
                height="100%"
                width="100%"
                original={diffSession.original}
                modified={diffSession.modified}
                theme="cozy-dark"
                beforeMount={registerAndApplyCozyTheme}
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  renderSideBySide: isDiffSideBySide,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  readOnly: true
                }}
              />
            </div>
          </div>
        ) : currentFile ? (
          isImageFile ? (
            <ImageViewerPane file={currentFile} />
          ) : isBinaryFile ? (
            <BinaryFilePane
              file={currentFile}
              onForceText={() =>
                setForcedTextPaths((prev) => ({ ...prev, [currentFile.path]: true }))
              }
            />
          ) : (
            <div className="flex-1 w-full h-full flex flex-col overflow-hidden">
              {/* Breadcrumb Header */}
            <div className="h-7 px-3 border-b border-white/[0.04] flex items-center justify-between text-[11px] text-studio-muted bg-studio-card/30">
              <div className="flex items-center gap-1.5 font-mono text-[11px] overflow-hidden">
                <span className="text-studio-subtle">workspace /</span>
                <span className="text-studio-text font-normal truncate">{currentFile.name}</span>
                {activeSymbol && isActive && (
                  <>
                    <span className="text-studio-subtle">/</span>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('open-symbol-jump'))}
                      className="flex items-center gap-1 text-studio-cyan hover:underline cursor-pointer px-1 py-0.2 rounded hover:bg-studio-cyan/10 transition-colors truncate max-w-[200px]"
                      title={`Active Symbol: ${activeSymbol.name} (${activeSymbol.kind}) - Click to jump (Ctrl+Shift+O)`}
                    >
                      <Code className="w-3 h-3 shrink-0" />
                      <span className="truncate">{activeSymbol.name}</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isLargeFile && (
                  <span className="text-[10px] text-studio-amber bg-studio-amber/10 border border-studio-amber/20 px-1.5 py-0.5 rounded font-mono">
                    Large File Mode
                  </span>
                )}
                {focusTask && (
                  <div className="flex items-center gap-1 text-studio-amber text-[10px] font-medium bg-studio-amber/10 border border-studio-amber/20 px-2 py-0.5 rounded-md">
                    <Zap className="w-2.5 h-2.5 text-studio-amber" />
                    <span>Task: {focusTask.title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* External File Conflict Banner */}
            {externalFileConflict && externalFileConflict.filePath === groupActiveFilePath && (
              <div className="h-8 px-3 border-b border-studio-amber/40 bg-studio-amber/15 flex items-center justify-between text-xs animate-fade-in shrink-0">
                <div className="flex items-center gap-2 text-studio-amber font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>File modified on disk externally. Unsaved buffer changes detected.</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <button
                    onClick={() => reloadFileFromDisk(groupActiveFilePath)}
                    className="px-2 py-0.5 rounded bg-studio-amber/25 hover:bg-studio-amber/35 text-white transition-colors cursor-pointer"
                  >
                    Reload from Disk
                  </button>
                  <button
                    onClick={() => compareFileWithDisk(groupActiveFilePath)}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    Compare
                  </button>
                  <button
                    onClick={dismissExternalFileConflict}
                    className="px-2 py-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                  >
                    Keep Changes
                  </button>
                </div>
              </div>
            )}

            {/* Merge Conflict Resolver Action Bar */}
            {conflictBlocks.length > 0 && (
              <div className="h-8 px-3 border-b border-studio-rose/30 bg-studio-rose/10 flex items-center justify-between text-xs animate-fade-in shrink-0">
                <div className="flex items-center gap-2 text-studio-rose font-medium">
                  <GitMerge className="w-3.5 h-3.5" />
                  <span>Merge Conflict: {conflictBlocks.length} block(s) detected</span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  <button
                    onClick={() => handleResolveConflictBlock(0, 'current')}
                    className="px-2 py-0.5 rounded bg-studio-amber/20 hover:bg-studio-amber/30 text-studio-amber transition-colors cursor-pointer"
                  >
                    Accept Current
                  </button>
                  <button
                    onClick={() => handleResolveConflictBlock(0, 'incoming')}
                    className="px-2 py-0.5 rounded bg-studio-emerald/20 hover:bg-studio-emerald/30 text-studio-emerald transition-colors cursor-pointer"
                  >
                    Accept Incoming
                  </button>
                  <button
                    onClick={() => handleResolveConflictBlock(0, 'both')}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    Accept Both
                  </button>
                  <button
                    onClick={() => handleJumpToConflict(0)}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer ml-1"
                  >
                    Jump (Line {conflictBlocks[0]?.startLine})
                  </button>
                  <button
                    onClick={() => groupActiveFilePath && openThreeWayMerge(groupActiveFilePath)}
                    className="px-2 py-0.5 rounded bg-studio-rose/20 hover:bg-studio-rose/30 text-studio-rose transition-colors cursor-pointer ml-1"
                    title="Open in dedicated 3-Way Merge Editor"
                  >
                    3-Way Merge
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 w-full h-full overflow-hidden">
              <Editor
                height="100%"
                width="100%"
                path={editorModelPath}
                language={currentFile.language || 'plaintext'}
                value={currentFile.content}
                theme="cozy-dark"
                beforeMount={registerAndApplyCozyTheme}
                onChange={handleContentChange}
                onMount={handleEditorMount}
                options={{
                  fontSize: editorSettings.fontSize,
                  fontFamily:
                    editorSettings.fontFamily ||
                    "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  fontLigatures: editorSettings.fontLigatures ?? true,
                  lineHeight: 21,
                  minimap: { enabled: isLargeFile ? false : editorSettings.minimap, side: 'right' },
                  lineNumbers: editorSettings.lineNumbers,
                  glyphMargin: true,
                  scrollBeyondLastLine: false,
                  smoothScrolling: !isLargeFile,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  automaticLayout: true,
                  tabSize: editorSettings.tabSize,
                  insertSpaces: editorSettings.insertSpaces,
                  wordWrap: editorSettings.wordWrap,
                  padding: { top: 12, bottom: 12 },
                  hover: { enabled: true, delay: 250, sticky: true },
                  parameterHints: { enabled: true },
                  quickSuggestions: { other: true, comments: false, strings: true },
                  suggestOnTriggerCharacters: true,
                  formatOnPaste: true,
                  bracketPairColorization: { enabled: true },
                  autoClosingBrackets: 'always',
                  autoClosingQuotes: 'always',
                  guides: { bracketPairs: true, indentation: true },
                  stickyScroll: { enabled: !isLargeFile },
                  folding: !isLargeFile,
                  foldingStrategy: 'auto',
                  showFoldingControls: 'always',
                  renderWhitespace: 'selection',
                  renderLineHighlight: 'all',
                  matchBrackets: 'always',
                  rulers: [80, 120],
                  columnSelection: true,
                  multiCursorModifier: 'ctrlCmd',
                  tabCompletion: 'on',
                  snippetSuggestions: 'inline',
                  suggest: {
                    snippetsPreventQuickSuggestions: false,
                    showStatusBar: true,
                    preview: true
                  },
                  acceptSuggestionOnEnter: 'smart'
                }}
              />
            </div>
          </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-studio-accent/10 border border-studio-accent/20 flex items-center justify-center text-studio-accent">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">
                {editorSplitMode !== 'none'
                  ? `Editor Group ${group} Empty`
                  : 'Cozy Workspace Ready'}
              </h3>
              <p className="text-xs text-studio-muted mt-0.5 max-w-xs leading-relaxed">
                {editorSplitMode !== 'none'
                  ? `Select a file from the explorer or drag a tab from Group ${group === 1 ? 2 : 1}`
                  : 'Select a file from the left deck or check Git Source Control to view diffs'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-studio-muted font-mono mt-1">
              <span className="glass-pill px-2.5 py-1 rounded-lg">
                <kbd className="text-white">Ctrl+P</kbd> Jump
              </span>
              <span className="glass-pill px-2.5 py-1 rounded-lg">
                <kbd className="text-white">Ctrl+\</kbd> Split Right
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tab Context Menu via Portal to prevent container clipping */}
      {tabContextMenu &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              top: `${Math.max(8, Math.min(tabContextMenu.y, window.innerHeight - 340))}px`,
              left: `${Math.max(8, Math.min(tabContextMenu.x, window.innerWidth - 220))}px`
            }}
            className="fixed z-[9999] min-w-[200px] bg-studio-card/95 backdrop-blur-md border border-white/[0.12] rounded-xl shadow-2xl p-1 text-xs animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {tabContextMenu.file.isPreview && (
              <button
                onClick={() => {
                  makeFilePermanent(tabContextMenu.file.path)
                  setTabContextMenu(null)
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-studio-amber font-medium text-left cursor-pointer"
              >
                <FileCode2 className="w-3.5 h-3.5 text-studio-amber" />
                <span>Keep Open</span>
              </button>
            )}

            <button
              onClick={() => {
                togglePinFile(tabContextMenu.file.path)
                setTabContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-studio-muted hover:text-white text-left cursor-pointer"
            >
              <Pin className="w-3.5 h-3.5 text-studio-muted" />
              <span>{tabContextMenu.file.isPinned ? 'Unpin Tab' : 'Pin Tab'}</span>
            </button>

            <div className="h-px bg-white/[0.08] my-1" />

            <button
              onClick={() => {
                splitEditor('vertical')
                setTabContextMenu(null)
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-studio-muted hover:text-white text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Columns2 className="w-3.5 h-3.5" />
                <span>Split Right</span>
              </div>
              <kbd className="text-[10px] text-studio-muted font-mono">Ctrl+\</kbd>
            </button>

            <button
              onClick={() => {
                splitEditor('horizontal')
                setTabContextMenu(null)
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-studio-muted hover:text-white text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Rows2 className="w-3.5 h-3.5" />
                <span>Split Down</span>
              </div>
              <kbd className="text-[10px] text-studio-muted font-mono">Ctrl+K Ctrl+\</kbd>
            </button>

            <button
              onClick={() => {
                moveTabToGroup(tabContextMenu.file.path, group === 1 ? 2 : 1)
                setTabContextMenu(null)
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-studio-muted hover:text-white text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Move to Group {group === 1 ? 2 : 1}</span>
              </div>
              <kbd className="text-[10px] text-studio-muted font-mono">Ctrl+Alt+→</kbd>
            </button>

            <div className="h-px bg-white/[0.08] my-1" />

            <button
              onClick={() => {
                closeFileInGroup(group, tabContextMenu.file.path)
                setTabContextMenu(null)
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-studio-muted hover:text-white text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <X className="w-3.5 h-3.5" />
                <span>Close</span>
              </div>
              <kbd className="text-[10px] text-studio-muted font-mono">Ctrl+W</kbd>
            </button>

            <button
              onClick={() => {
                closeOtherFilesInGroup(group, tabContextMenu.file.path)
                setTabContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-studio-muted hover:text-white text-left cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 opacity-0" />
              <span>Close Others</span>
            </button>

            <button
              onClick={() => {
                closeFilesToRightInGroup(group, tabContextMenu.file.path)
                setTabContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-studio-muted hover:text-white text-left cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 opacity-0" />
              <span>Close to the Right</span>
            </button>

            <button
              onClick={() => {
                closeSavedFilesInGroup(group)
                setTabContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-studio-muted hover:text-white text-left cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 opacity-0" />
              <span>Close Saved</span>
            </button>

            <button
              onClick={() => {
                closeAllFilesInGroup(group)
                setTabContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-studio-rose/80 hover:text-studio-rose text-left cursor-pointer"
            >
              <X className="w-3.5 h-3.5 opacity-0" />
              <span>Close All</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  )
}

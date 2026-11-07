import React, { useRef, useEffect, useState, useMemo } from 'react'
import Editor, { DiffEditor, OnMount } from '@monaco-editor/react'
import type * as monaco from 'monaco-editor'
import {
  Code2,
  X,
  FileCode2,
  FileDiff,
  Zap,
  Cpu,
  Code,
  GitMerge,
  AlertCircle,
  Pin,
  Copy,
  FolderOpen,
  RotateCcw
} from 'lucide-react'
import { useEditorStore, type EditorFile } from '../../store/useEditorStore'
import { lspClient } from '../../services/lspClient'
import { parseConflictBlocks, resolveConflict } from '../../services/conflictResolver'
import type { GitGutterChange } from '../../../../preload/index.d'

export const EditorCanvas: React.FC = () => {
  const {
    openFiles,
    activeFilePath,
    updateFileContent,
    markFileSaved,
    setCursorPosition,
    setStatusMessage,
    closeFile,
    closeOtherFiles,
    closeFilesToRight,
    closeSavedFiles,
    closeAllFiles,
    togglePinFile,
    makeFilePermanent,
    reopenClosedFile,
    nextEditor,
    previousEditor,
    reorderOpenFiles,
    setActiveFile,
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
    dismissExternalFileConflict
  } = useEditorStore()

  const [isDiffSideBySide, setIsDiffSideBySide] = useState(true)
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof monaco | null>(null)
  const gutterDecorationsRef = useRef<string[]>([])
  const gutterChangesRef = useRef<GitGutterChange[]>([])
  const viewStatesRef = useRef<Map<string, monaco.editor.ICodeEditorViewState>>(new Map())
  const prevActiveFileRef = useRef<string | null>(null)
  const currentFile = openFiles.find((f) => f.path === activeFilePath)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    if (prevActiveFileRef.current && prevActiveFileRef.current !== activeFilePath) {
      const state = editor.saveViewState()
      if (state) {
        viewStatesRef.current.set(prevActiveFileRef.current, state)
      }
    }

    if (activeFilePath) {
      const savedState = viewStatesRef.current.get(activeFilePath)
      if (savedState) {
        editor.restoreViewState(savedState)
      }
    }

    prevActiveFileRef.current = activeFilePath
  }, [activeFilePath])

  useEffect(() => {
    if (!workspacePath || !activeFilePath) return
    window.maestroAPI?.loadEditorConfig(workspacePath, activeFilePath).then((ec) => {
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
  }, [workspacePath, activeFilePath])

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
    if (!currentFile || !activeFilePath) return
    const block = conflictBlocks[blockIndex]
    if (!block) return
    const nextContent = resolveConflict(currentFile.content, block, resolution)
    updateFileContent(activeFilePath, nextContent)
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

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor
    monacoRef.current = monacoInstance
    lspClient.setMonaco(monacoInstance)

    monacoInstance.editor.defineTheme('cozy-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6c7284', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'e0a96d', fontStyle: 'bold' },
        { token: 'string', foreground: '88c096' },
        { token: 'number', foreground: 'e5aa66' },
        { token: 'type', foreground: 'a79bc4' },
        { token: 'function', foreground: '82b0c4' },
        { token: 'variable', foreground: 'e6e8ec' },
        { token: 'delimiter', foreground: '8b90a0' }
      ],
      colors: {
        'editor.background': '#15171f',
        'editor.foreground': '#e6e8ec',
        'editorCursor.foreground': '#e0a96d',
        'editor.lineHighlightBackground': '#1a1c26',
        'editorLineNumber.foreground': '#4f5365',
        'editorLineNumber.activeForeground': '#e0a96d',
        'editor.selectionBackground': '#2d2b38',
        'editor.inactiveSelectionBackground': '#232532',
        'diffEditor.insertedTextBackground': 'rgba(136, 192, 150, 0.15)',
        'diffEditor.removedTextBackground': 'rgba(217, 127, 127, 0.15)'
      }
    })
    monacoInstance.editor.setTheme('cozy-dark')

    if (currentFile) {
      lspClient.notifyDocOpen(
        'ts-server',
        currentFile.path,
        currentFile.language || 'plaintext',
        currentFile.content
      )
    }

    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition(e.position.lineNumber, e.position.column)
      const currentActivePath = useEditorStore.getState().activeFilePath
      if (currentActivePath) {
        useEditorStore.getState().pushNavHistory({
          filePath: currentActivePath,
          line: e.position.lineNumber,
          column: e.position.column
        })
      }
    })

    // Shortcut Save (Ctrl+S)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, async () => {
      const state = useEditorStore.getState()
      const activeFile = state.openFiles.find((f) => f.path === state.activeFilePath)
      if (activeFile) {
        let ecRules: any = null
        if (state.workspacePath) {
          try {
            ecRules = await window.maestroAPI.loadEditorConfig(state.workspacePath, activeFile.path)
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
          await window.maestroAPI.writeFile(activeFile.path, val)
          markFileSaved(activeFile.path)
          lspClient.notifyDocSave('ts-server', activeFile.path)
          setStatusMessage(`Saved ${activeFile.name}${ecRules ? ' (.editorconfig applied)' : ''}`)
          setTimeout(() => setStatusMessage('Ready'), 2000)
        } catch (err) {
          console.error('Failed to save file:', err)
          setStatusMessage('Failed to save file')
        }
      }
    })

    // Shortcut Close Tab (Ctrl+W)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyW, () => {
      const activePath = useEditorStore.getState().activeFilePath
      if (activePath) {
        closeFile(activePath)
      }
    })

    // Shortcut Switch Next Editor Tab (Ctrl+Tab)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Tab, () => {
      useEditorStore.getState().nextEditor()
    })

    // Shortcut Format Document or Selection (Shift+Alt+F)
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

    // Shortcut Reopen Closed Editor (Ctrl+Shift+T)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyT,
      () => {
        useEditorStore.getState().reopenClosedFile()
      }
    )

    // Shortcut Organize Imports (Shift+Alt+O)
    editor.addCommand(
      monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.KeyO,
      async () => {
        const active = useEditorStore.getState().activeFilePath
        if (active) {
          const success = await lspClient.organizeImports(active)
          if (success) {
            useEditorStore.getState().setStatusMessage('Organized imports')
            setTimeout(() => useEditorStore.getState().setStatusMessage('Ready'), 1500)
          }
        }
      }
    )

    // Shortcut Navigate Back (Alt+LeftArrow)
    editor.addCommand(monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.LeftArrow, () => {
      useEditorStore.getState().navigateBack()
    })

    // Shortcut Navigate Forward (Alt+RightArrow)
    editor.addCommand(monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.RightArrow, () => {
      useEditorStore.getState().navigateForward()
    })

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

    // Shortcut Command Palette (Ctrl+Shift+P)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyP,
      () => {
        window.dispatchEvent(new CustomEvent('open-command-palette'))
      }
    )

    // Shortcut Toggle Sidebar (Ctrl+B)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyB, () => {
      useEditorStore.getState().toggleSidebar()
    })

    // Shortcut Toggle Bottom Deck (Ctrl+`)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Backquote, () => {
      useEditorStore.getState().toggleBottomDeck()
    })

    // Shortcut Preferences Modal (Ctrl+,)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Comma, () => {
      useEditorStore.getState().toggleSettingsModal()
    })

    // Shortcut Next Problem (F8)
    editor.addCommand(monacoInstance.KeyCode.F8, () => {
      useEditorStore.getState().jumpToNextProblem()
    })

    // Shortcut Previous Problem (Shift+F8)
    editor.addCommand(monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.F8, () => {
      useEditorStore.getState().jumpToPrevProblem()
    })

    // Shortcut Go to Symbol in Document (Ctrl+Shift+O)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyO,
      () => {
        window.dispatchEvent(new CustomEvent('open-symbol-jump'))
      }
    )

    // Shortcut Go to Line (Ctrl+G)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyG, () => {
      window.dispatchEvent(new CustomEvent('open-goto-line'))
    })

    // Shortcut Explorer (Ctrl+Shift+E)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyE,
      () => {
        useEditorStore.getState().setActiveSidebarTab('files')
      }
    )

    // Shortcut Source Control (Ctrl+Shift+G)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyG,
      () => {
        useEditorStore.getState().setActiveSidebarTab('git')
      }
    )

    // Shortcut Problems Panel (Ctrl+Shift+M)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyM,
      () => {
        useEditorStore.getState().setActiveBottomTab('problems')
        useEditorStore.getState().setBottomDeckOpen(true)
      }
    )

    // Shortcut Rename Symbol (F2)
    editor.addCommand(monacoInstance.KeyCode.F2, () => {
      editor.getAction('editor.action.rename')?.run()
    })

    // Shortcut Bracket Matching Navigation (Ctrl+Shift+\)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.Backslash,
      () => {
        editor.getAction('editor.action.jumpToBracket')?.run()
      }
    )

    // Shortcut Multi-Cursor: Insert Cursor Above (Ctrl+Alt+Up)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.UpArrow,
      () => {
        editor.getAction('editor.action.insertCursorAbove')?.run()
      }
    )

    // Shortcut Multi-Cursor: Insert Cursor Below (Ctrl+Alt+Down)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.DownArrow,
      () => {
        editor.getAction('editor.action.insertCursorBelow')?.run()
      }
    )

    // Shortcut Select All Occurrences (Ctrl+F2)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.F2,
      () => {
        editor.getAction('editor.action.changeAll')?.run()
      }
    )

    // Shortcut Insert Line Below (Ctrl+Enter)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter, () => {
      editor.getAction('editor.action.insertLineAfter')?.run()
    })

    // Shortcut Insert Line Above (Ctrl+Shift+Enter)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.Enter,
      () => {
        editor.getAction('editor.action.insertLineBefore')?.run()
      }
    )

    // Shortcut Join Lines (Ctrl+J)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyJ, () => {
      editor.getAction('editor.action.joinLines')?.run()
    })

    // Shortcut Expand Selection (Shift+Alt+Right)
    editor.addCommand(
      monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.RightArrow,
      () => {
        editor.getAction('editor.action.smartSelect.expand')?.run()
      }
    )

    // Shortcut Shrink Selection (Shift+Alt+Left)
    editor.addCommand(
      monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.LeftArrow,
      () => {
        editor.getAction('editor.action.smartSelect.shrink')?.run()
      }
    )

    // Shortcut Indent Lines (Ctrl+])
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.BracketRight,
      () => {
        editor.getAction('editor.action.indentLines')?.run()
      }
    )

    // Shortcut Outdent Lines (Ctrl+[)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.BracketLeft,
      () => {
        editor.getAction('editor.action.outdentLines')?.run()
      }
    )

    // Git Next Change (Alt+F3)
    editor.addAction({
      id: 'workbench.action.editor.nextChange',
      label: 'Git: Next Change',
      keybindings: [monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.F3],
      run: (ed) => {
        const changes = gutterChangesRef.current
        if (!changes || changes.length === 0) return
        const pos = ed.getPosition()
        const currentLine = pos ? pos.lineNumber : 0
        const next = changes.find((c) => c.startLine > currentLine) || changes[0]
        if (next) {
          ed.setPosition({ lineNumber: next.startLine, column: 1 })
          ed.revealLineInCenter(next.startLine)
          useEditorStore.getState().setStatusMessage(`Git Change: ${next.type} at line ${next.startLine}`)
        }
      }
    })

    // Git Previous Change (Shift+Alt+F3)
    editor.addAction({
      id: 'workbench.action.editor.previousChange',
      label: 'Git: Previous Change',
      keybindings: [monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.F3],
      run: (ed) => {
        const changes = gutterChangesRef.current
        if (!changes || changes.length === 0) return
        const pos = ed.getPosition()
        const currentLine = pos ? pos.lineNumber : 1
        const prev = [...changes].reverse().find((c) => c.endLine < currentLine) || changes[changes.length - 1]
        if (prev) {
          ed.setPosition({ lineNumber: prev.startLine, column: 1 })
          ed.revealLineInCenter(prev.startLine)
          useEditorStore.getState().setStatusMessage(`Git Change: ${prev.type} at line ${prev.startLine}`)
        }
      }
    })
  }

  const handleContentChange = (value: string | undefined) => {
    if (activeFilePath && value !== undefined) {
      updateFileContent(activeFilePath, value)
      lspClient.notifyDocChange('ts-server', activeFilePath, Date.now(), value)
    }
  }

  useEffect(() => {
    const handleReveal = (e: any) => {
      const { line, column } = e.detail || {}
      if (editorRef.current && line) {
        editorRef.current.revealLineInCenter(line)
        editorRef.current.setPosition({ lineNumber: line, column: column || 1 })
        editorRef.current.focus()
      }
    }
    window.addEventListener('editor-reveal-line', handleReveal)
    return () => window.removeEventListener('editor-reveal-line', handleReveal)
  }, [])

  useEffect(() => {
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
    window.addEventListener('editor-run-command', handleEditorCommand)
    return () => window.removeEventListener('editor-run-command', handleEditorCommand)
  }, [])

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

  const updateGitGutterDecorations = async () => {
    if (!editorRef.current || !monacoRef.current || !workspacePath || !activeFilePath) {
      if (editorRef.current && gutterDecorationsRef.current.length > 0) {
        gutterDecorationsRef.current = editorRef.current.deltaDecorations(
          gutterDecorationsRef.current,
          []
        )
      }
      return
    }
    try {
      const relPath = activeFilePath.replace(workspacePath, '').replace(/^[/\\]/, '')
      const changes = await window.maestroAPI.getGitGutterChanges(workspacePath, relPath)
      gutterChangesRef.current = changes
      const m = monacoRef.current

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
    if (activeFilePath) {
      useEditorStore.getState().fetchGitBlame(activeFilePath)
    }
  }, [activeFilePath, currentFile?.content, gitStatus])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-2.5 gap-2">
      {/* Sleek Tabs Bar */}
      <div className="flex items-center justify-between min-h-8 px-1">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {/* Diff Session Tab */}
          {diffSession && (
            <div className="group flex items-center gap-1.5 px-3 py-1 rounded-lg cursor-pointer text-xs transition-all shrink-0 select-none bg-studio-card text-white border border-studio-amber/30 font-medium">
              <FileDiff className="w-3.5 h-3.5 text-studio-amber" />
              <span className="truncate max-w-[130px] font-mono">Diff: {diffSession.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeDiff()
                }}
                className="p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Regular Open Files Tabs */}
          {openFiles.length === 0 && !diffSession ? (
            <span className="text-xs text-studio-muted font-mono px-1">No active files</span>
          ) : (
            openFiles.map((file, idx) => {
              const isActive = !diffSession && activeFilePath === file.path
              const isBeingDragged = draggedTabIndex === idx

              return (
                <div
                  key={file.path}
                  draggable
                  onDragStart={(e) => {
                    setDraggedTabIndex(idx)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (draggedTabIndex !== null && draggedTabIndex !== idx) {
                      reorderOpenFiles(draggedTabIndex, idx)
                    }
                    setDraggedTabIndex(null)
                  }}
                  onDragEnd={() => setDraggedTabIndex(null)}
                  onClick={() => setActiveFile(file.path)}
                  onDoubleClick={() => makeFilePermanent(file.path)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setTabContextMenu({ x: e.clientX, y: e.clientY, file })
                  }}
                  className={`group flex items-center gap-1.5 px-3 py-1 rounded-lg cursor-pointer text-xs transition-all shrink-0 select-none ${
                    isBeingDragged ? 'opacity-40 scale-95' : ''
                  } ${
                    isActive
                      ? 'bg-studio-card text-white border border-white/[0.08] font-medium'
                      : 'text-studio-muted hover:text-white hover:bg-white/[0.03]'
                  }`}
                  title={file.isPreview ? `${file.path} (Preview - double-click to keep open)` : file.path}
                >
                  {file.isPinned ? (
                    <Pin className="w-3 h-3 text-studio-amber shrink-0" />
                  ) : (
                    <FileCode2 className={`w-3.5 h-3.5 ${isActive ? 'text-studio-amber' : 'text-studio-muted'}`} />
                  )}
                  <span className={`truncate max-w-[130px] ${file.isPreview ? 'italic text-white/80' : ''}`}>
                    {file.name}
                  </span>

                  {file.isDirty ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-studio-amber group-hover:hidden" />
                  ) : null}

                  {!file.isPinned && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        closeFile(file.path)
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

        {/* LSP Status Indicator */}
        <div className="flex items-center gap-1.5 glass-pill px-2 py-0.5 rounded-md text-[10px] text-studio-muted shrink-0 font-mono">
          <Cpu className="w-3 h-3 text-studio-emerald" />
          <span>LSP: {lspStatus}</span>
        </div>
      </div>

      {/* Main Canvas Frame */}
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col border border-white/[0.05] relative">
        {/* Render Side-by-Side Diff Editor if Diff Session Active */}
        {diffSession ? (
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
          /* Render Regular Code Editor */
          <div className="flex-1 w-full h-full flex flex-col overflow-hidden">
            <div className="h-7 px-3 border-b border-white/[0.04] flex items-center justify-between text-[11px] text-studio-muted bg-studio-card/30">
              <div className="flex items-center gap-1.5 font-mono text-[11px] overflow-hidden">
                <span className="text-studio-subtle">workspace /</span>
                <span className="text-studio-text font-normal truncate">{currentFile.name}</span>
                {activeSymbol && (
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
            {externalFileConflict && externalFileConflict.filePath === activeFilePath && (
              <div className="h-8 px-3 border-b border-studio-amber/40 bg-studio-amber/15 flex items-center justify-between text-xs animate-fade-in shrink-0">
                <div className="flex items-center gap-2 text-studio-amber font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>File modified on disk externally. Unsaved buffer changes detected.</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <button
                    onClick={() => reloadFileFromDisk(activeFilePath)}
                    className="px-2 py-0.5 rounded bg-studio-amber/25 hover:bg-studio-amber/35 text-white transition-colors cursor-pointer"
                    title="Overwrite editor buffer with content from disk"
                  >
                    Reload from Disk
                  </button>
                  <button
                    onClick={() => compareFileWithDisk(activeFilePath)}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Compare current buffer with disk content in Diff editor"
                  >
                    Compare
                  </button>
                  <button
                    onClick={dismissExternalFileConflict}
                    className="px-2 py-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
                    title="Dismiss alert and keep current buffer changes"
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
                  <span>
                    Merge Conflict: {conflictBlocks.length} block(s) detected
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  <button
                    onClick={() => handleResolveConflictBlock(0, 'current')}
                    className="px-2 py-0.5 rounded bg-studio-amber/20 hover:bg-studio-amber/30 text-studio-amber transition-colors cursor-pointer"
                    title={`Accept: ${conflictBlocks[0]?.currentLabel}`}
                  >
                    Accept Current
                  </button>
                  <button
                    onClick={() => handleResolveConflictBlock(0, 'incoming')}
                    className="px-2 py-0.5 rounded bg-studio-emerald/20 hover:bg-studio-emerald/30 text-studio-emerald transition-colors cursor-pointer"
                    title={`Accept: ${conflictBlocks[0]?.incomingLabel}`}
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
                </div>
              </div>
            )}

            <div className="flex-1 w-full h-full overflow-hidden">
              <Editor
                height="100%"
                width="100%"
                path={currentFile.path}
                language={currentFile.language || 'plaintext'}
                value={currentFile.content}
                theme="cozy-dark"
                onChange={handleContentChange}
                onMount={handleEditorMount}
                options={{
                  fontSize: editorSettings.fontSize,
                  fontFamily: editorSettings.fontFamily || "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  fontLigatures: editorSettings.fontLigatures ?? true,
                  lineHeight: 21,
                  minimap: { enabled: isLargeFile ? false : editorSettings.minimap, side: 'right' },
                  lineNumbers: editorSettings.lineNumbers,
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
                  multiCursorModifier: 'ctrlCmd'
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-studio-accent/10 border border-studio-accent/20 flex items-center justify-center text-studio-accent">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Cozy Workspace Ready</h3>
              <p className="text-xs text-studio-muted mt-0.5 max-w-xs leading-relaxed">
                Select a file from the left deck or check Git Source Control to view diffs
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-studio-muted font-mono mt-1">
              <span className="glass-pill px-2.5 py-1 rounded-lg">
                <kbd className="text-white">Ctrl+P</kbd> Jump
              </span>
              <span className="glass-pill px-2.5 py-1 rounded-lg">
                <kbd className="text-white">Ctrl+S</kbd> Save
              </span>
            </div>
          </div>
        )}
      </div>
      {/* Tab Context Menu */}
      {tabContextMenu && (
        <div
          style={{ top: `${tabContextMenu.y}px`, left: `${tabContextMenu.x}px` }}
          className="fixed z-50 min-w-[190px] bg-studio-card/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl p-1 text-xs animate-in fade-in zoom-in-95 duration-100"
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
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/90 text-left cursor-pointer"
          >
            <Pin className="w-3.5 h-3.5 text-studio-amber" />
            <span>{tabContextMenu.file.isPinned ? 'Unpin Tab' : 'Pin Tab'}</span>
          </button>

          <button
            onClick={() => {
              closeFile(tabContextMenu.file.path)
              setTabContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/90 text-left cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-studio-muted" />
            <span>Close</span>
          </button>

          <button
            onClick={() => {
              reopenClosedFile()
              setTabContextMenu(null)
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/90 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5 text-studio-cyan" />
              <span>Reopen Closed Editor</span>
            </div>
            <kbd className="text-[10px] text-studio-muted font-mono">Ctrl+Shift+T</kbd>
          </button>

          <button
            onClick={() => {
              closeOtherFiles(tabContextMenu.file.path)
              setTabContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/90 text-left cursor-pointer"
          >
            <span className="w-3.5" />
            <span>Close Others</span>
          </button>

          <button
            onClick={() => {
              closeFilesToRight(tabContextMenu.file.path)
              setTabContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/90 text-left cursor-pointer"
          >
            <span className="w-3.5" />
            <span>Close to the Right</span>
          </button>

          <button
            onClick={() => {
              closeSavedFiles()
              setTabContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/90 text-left cursor-pointer"
          >
            <span className="w-3.5" />
            <span>Close Saved</span>
          </button>

          <button
            onClick={() => {
              closeAllFiles()
              setTabContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/90 text-left cursor-pointer"
          >
            <span className="w-3.5" />
            <span>Close All</span>
          </button>

          {(() => {
            const tabIdx = openFiles.findIndex((f) => f.path === tabContextMenu.file.path)
            return (
              <>
                {tabIdx > 0 && (
                  <button
                    onClick={() => {
                      reorderOpenFiles(tabIdx, tabIdx - 1)
                      setTabContextMenu(null)
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/90 text-left cursor-pointer"
                  >
                    <span className="w-3.5" />
                    <span>Move Tab Left</span>
                  </button>
                )}
                {tabIdx >= 0 && tabIdx < openFiles.length - 1 && (
                  <button
                    onClick={() => {
                      reorderOpenFiles(tabIdx, tabIdx + 1)
                      setTabContextMenu(null)
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/90 text-left cursor-pointer"
                  >
                    <span className="w-3.5" />
                    <span>Move Tab Right</span>
                  </button>
                )}
              </>
            )
          })()}

          <div className="h-px bg-white/[0.06] my-1" />

          <button
            onClick={() => {
              navigator.clipboard.writeText(tabContextMenu.file.path)
              setStatusMessage('Copied absolute path')
              setTimeout(() => setStatusMessage('Ready'), 2000)
              setTabContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/90 text-left cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-studio-muted" />
            <span>Copy Path</span>
          </button>

          <button
            onClick={() => {
              if (workspacePath && tabContextMenu.file.path.startsWith(workspacePath)) {
                const rel = tabContextMenu.file.path.replace(workspacePath, '').replace(/^[\\/]/, '')
                navigator.clipboard.writeText(rel)
                setStatusMessage(`Copied relative path: ${rel}`)
              } else {
                navigator.clipboard.writeText(tabContextMenu.file.path)
                setStatusMessage('Copied path')
              }
              setTimeout(() => setStatusMessage('Ready'), 2000)
              setTabContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/90 text-left cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-studio-muted" />
            <span>Copy Relative Path</span>
          </button>

          <button
            onClick={() => {
              window.maestroAPI?.revealInOS(tabContextMenu.file.path)
              setTabContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/90 text-left cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-studio-muted" />
            <span>Reveal in OS</span>
          </button>
        </div>
      )}
    </div>
  )
}

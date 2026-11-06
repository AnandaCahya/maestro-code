import React, { useRef, useEffect } from 'react'
import Editor, { DiffEditor, OnMount } from '@monaco-editor/react'
import type * as monaco from 'monaco-editor'
import {
  Code2,
  X,
  FileCode2,
  FileDiff,
  Zap,
  Cpu
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { lspClient } from '../../services/lspClient'

export const EditorCanvas: React.FC = () => {
  const {
    openFiles,
    activeFilePath,
    updateFileContent,
    markFileSaved,
    setCursorPosition,
    setStatusMessage,
    closeFile,
    setActiveFile,
    focusTask,
    lspStatus,
    diffSession,
    closeDiff,
    editorSettings
  } = useEditorStore()

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const currentFile = openFiles.find((f) => f.path === activeFilePath)

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor
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
    })

    // Shortcut Save (Ctrl+S)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, async () => {
      const state = useEditorStore.getState()
      const activeFile = state.openFiles.find((f) => f.path === state.activeFilePath)
      if (activeFile) {
        if (state.editorSettings.formatOnSave) {
          try {
            await editor.getAction('editor.action.formatDocument')?.run()
          } catch {
            // ignore
          }
        }
        const val = editor.getValue()
        try {
          await window.maestroAPI.writeFile(activeFile.path, val)
          markFileSaved(activeFile.path)
          lspClient.notifyDocSave('ts-server', activeFile.path)
          setStatusMessage(`Saved ${activeFile.name}`)
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

    // Shortcut Format Document (Shift+Alt+F)
    editor.addCommand(
      monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.KeyF,
      () => {
        editor.getAction('editor.action.formatDocument')?.run()
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
  }

  const handleContentChange = (value: string | undefined) => {
    if (activeFilePath && value !== undefined) {
      updateFileContent(activeFilePath, value)
      lspClient.notifyDocChange('ts-server', activeFilePath, Date.now(), value)
    }
  }

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
    }
  }, [currentFile?.path])

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
            openFiles.map((file) => {
              const isActive = !diffSession && activeFilePath === file.path

              return (
                <div
                  key={file.path}
                  onClick={() => setActiveFile(file.path)}
                  className={`group flex items-center gap-1.5 px-3 py-1 rounded-lg cursor-pointer text-xs transition-all shrink-0 select-none ${
                    isActive
                      ? 'bg-studio-card text-white border border-white/[0.08] font-medium'
                      : 'text-studio-muted hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <FileCode2 className={`w-3.5 h-3.5 ${isActive ? 'text-studio-amber' : 'text-studio-muted'}`} />
                  <span className="truncate max-w-[130px]">{file.name}</span>

                  {file.isDirty ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-studio-amber group-hover:hidden" />
                  ) : null}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeFile(file.path)
                    }}
                    className={`p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-opacity ${
                      file.isDirty ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
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
              <button
                onClick={closeDiff}
                className="text-studio-muted hover:text-white cursor-pointer"
              >
                Close Diff
              </button>
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
                  renderSideBySide: true,
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
              <div className="flex items-center gap-1 font-mono">
                <span className="text-studio-subtle">workspace /</span>
                <span className="text-studio-text font-normal">{currentFile.name}</span>
              </div>

              {focusTask && (
                <div className="flex items-center gap-1 text-studio-amber text-[10px] font-medium bg-studio-amber/10 border border-studio-amber/20 px-2 py-0.5 rounded-md">
                  <Zap className="w-2.5 h-2.5 text-studio-amber" />
                  <span>Task: {focusTask.title}</span>
                </div>
              )}
            </div>

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
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  lineHeight: 21,
                  minimap: { enabled: editorSettings.minimap, side: 'right' },
                  lineNumbers: editorSettings.lineNumbers,
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  automaticLayout: true,
                  tabSize: editorSettings.tabSize,
                  wordWrap: editorSettings.wordWrap,
                  padding: { top: 12, bottom: 12 },
                  hover: { enabled: true, delay: 250, sticky: true },
                  parameterHints: { enabled: true },
                  quickSuggestions: { other: true, comments: false, strings: true },
                  suggestOnTriggerCharacters: true,
                  formatOnPaste: true
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
    </div>
  )
}

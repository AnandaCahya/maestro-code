import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import {
  Search,
  ChevronUp,
  ChevronDown,
  X,
  CaseSensitive,
  Regex,
  SplitSquareVertical
} from 'lucide-react'
import { useEditorStore, TerminalSessionInfo } from '../../store/useEditorStore'

interface SingleTerminalProps {
  session: TerminalSessionInfo
  isActive: boolean
  isSearchOpen: boolean
  onCloseSearch: () => void
  onFocusPane?: () => void
}

const SingleTerminal: React.FC<SingleTerminalProps> = ({
  session,
  isActive,
  isSearchOpen,
  onCloseSearch,
  onFocusPane
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const searchAddonRef = useRef<SearchAddon | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [resultIndex, setResultIndex] = useState(0)
  const [resultCount, setResultCount] = useState(0)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Open file path from terminal output
  const handleOpenFileLink = useCallback(
    (filePath: string, line?: number, col?: number) => {
      let cleanPath = filePath.trim().replace(/^['"`]+|['"`]+$/g, '')
      let fullPath = cleanPath
      const isWindows = navigator.platform.toLowerCase().includes('win')
      const isAbsolute = isWindows ? /^[a-zA-Z]:[/\\]/.test(cleanPath) : cleanPath.startsWith('/')

      const currentWorkspace = useEditorStore.getState().workspacePath
      if (!isAbsolute && currentWorkspace) {
        const separator = currentWorkspace.includes('\\') ? '\\' : '/'
        fullPath = `${currentWorkspace.replace(/[/\\]+$/, '')}${separator}${cleanPath.replace(/^[./\\]+/, '')}`
      }

      window.maestroAPI
        ?.readFile(fullPath)
        .then((content) => {
          const fileName = fullPath.split(/[/\\]/).pop() || cleanPath
          const state = useEditorStore.getState()
          state.openFile({ path: fullPath, name: fileName, content })
          if (line !== undefined) {
            setTimeout(() => {
              state.setCursorPosition(line, col || 1)
              window.dispatchEvent(
                new CustomEvent('editor-reveal-line', {
                  detail: { line, col: col || 1 }
                })
              )
            }, 100)
          }
        })
        .catch((err) => {
          console.warn('Could not open file from terminal link:', fullPath, err)
        })
    },
    []
  )

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      theme: {
        background: '#14161f',
        foreground: '#e6e8ec',
        cursor: '#e0a96d',
        cursorAccent: '#14161f',
        selectionBackground: 'rgba(224, 169, 109, 0.25)',
        black: '#191b22',
        red: '#d97f7f',
        green: '#88c096',
        yellow: '#e5aa66',
        blue: '#82b0c4',
        magenta: '#a79bc4',
        cyan: '#82b0c4',
        white: '#e6e8ec',
        brightBlack: '#474b5b',
        brightRed: '#e58e8e',
        brightGreen: '#9ed3ab',
        brightYellow: '#f0be7f',
        brightBlue: '#96c4d8',
        brightMagenta: '#bcafdb',
        brightCyan: '#96c4d8',
        brightWhite: '#ffffff'
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 12.5,
      lineHeight: 1.35,
      cursorBlink: true,
      cursorStyle: 'bar',
      convertEol: true,
      screenReaderMode: true
    })

    const fitAddon = new FitAddon()
    const searchAddon = new SearchAddon()
    const webLinksAddon = new WebLinksAddon((_event, uri) => {
      window.open(uri, '_blank')
    })

    term.loadAddon(fitAddon)
    term.loadAddon(searchAddon)
    term.loadAddon(webLinksAddon)

    // Register File Path link provider
    term.registerLinkProvider({
      provideLinks(bufferLineNumber, callback) {
        const line = term.buffer.active.getLine(bufferLineNumber - 1)
        if (!line) {
          callback(undefined)
          return
        }
        const text = line.translateToString(true)
        const pathRegex =
          /(?:[a-zA-Z]:[\\/][^\s:'"<>\(\)\[\]]+|(?:\.\/|\.\.\/|[a-zA-Z0-9_\-\.]+[\/\\])[^\s:'"<>\(\)\[\]]+?\.[a-zA-Z0-9]+)(?::(\d+))?(?::(\d+))?/g
        const links: any[] = []
        let match: RegExpExecArray | null

        while ((match = pathRegex.exec(text)) !== null) {
          const rawMatch = match[0]
          const lineNum = match[1] ? parseInt(match[1], 10) : undefined
          const colNum = match[2] ? parseInt(match[2], 10) : undefined
          const cleanPath = rawMatch.replace(/(?::\d+){1,2}$/, '')
          const startIndex = match.index
          const length = rawMatch.length

          links.push({
            range: {
              start: { x: startIndex + 1, y: bufferLineNumber },
              end: { x: startIndex + length, y: bufferLineNumber }
            },
            text: rawMatch,
            decorations: {
              pointerStyle: 'pointer',
              underline: true
            },
            activate: () => {
              handleOpenFileLink(cleanPath, lineNum, colNum)
            }
          })
        }
        callback(links.length > 0 ? links : undefined)
      }
    })

    // Subscribe to search result changes
    searchAddon.onDidChangeResults((results) => {
      if (results) {
        setResultIndex(results.resultIndex + 1)
        setResultCount(results.resultCount)
      } else {
        setResultIndex(0)
        setResultCount(0)
      }
    })

    // Intercept keyboard events inside terminal for VS Code compatibility
    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      // 1. Search: Ctrl+F
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'f') {
        if (e.type === 'keydown') {
          e.preventDefault()
          useEditorStore.getState().toggleTerminalSearch(true)
        }
        return false
      }

      // 2. Ctrl+C: If text is selected, copy to clipboard; if no selection, send interrupt (\x03)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'c') {
        if (e.type === 'keydown') {
          if (term.hasSelection()) {
            navigator.clipboard.writeText(term.getSelection())
          } else {
            e.preventDefault()
            window.maestroAPI?.writeTerminal(session.id, '\x03')
          }
        }
        return false
      }

      // 3. Ctrl+D: EOF / Close
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'd') {
        if (e.type === 'keydown') {
          e.preventDefault()
          window.maestroAPI?.writeTerminal(session.id, '\x04')
        }
        return false
      }

      // 4. Ctrl+V: Paste from clipboard
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'v') {
        if (e.type === 'keydown') {
          e.preventDefault()
          navigator.clipboard.readText().then((text) => {
            if (text) {
              window.maestroAPI?.writeTerminal(session.id, text)
            }
          })
        }
        return false
      }

      // 5. Ctrl+K: Clear terminal
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        if (e.type === 'keydown') {
          e.preventDefault()
          term.clear()
        }
        return false
      }

      return true
    })

    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }
    term.open(containerRef.current)

    setTimeout(() => {
      try {
        fitAddon.fit()
        if (term.cols && term.rows) {
          window.maestroAPI?.resizeTerminal(session.id, term.cols, term.rows)
        }
      } catch {
        // ignore initial measurement
      }
    }, 50)

    termRef.current = term
    fitAddonRef.current = fitAddon
    searchAddonRef.current = searchAddon

    // Spawn the shell process via IPC
    const currentCwd = session.cwd || useEditorStore.getState().workspacePath || undefined
    window.maestroAPI?.createTerminal(
      session.id,
      currentCwd,
      session.shell,
      session.env,
      session.shellArgs
    )

    const cleanupData = window.maestroAPI?.onTerminalData((id, data) => {
      if (id === session.id) {
        term.write(data)
      }
    })

    const cleanupExit = window.maestroAPI?.onTerminalExit((id) => {
      if (id === session.id) {
        term.writeln('\r\n\x1b[90m--------------------------------------------------\x1b[0m')
        term.writeln('\x1b[31m[Process exited]\x1b[0m Click restart icon above to reload.')
        useEditorStore.getState().setTerminalSessionExited(session.id, true)
      }
    })

    const handleRestartEvent = (e: any) => {
      if (e.detail?.id === session.id) {
        term.clear()
        term.writeln('\x1b[33m[Restarting terminal session...]\x1b[0m\r\n')
      }
    }

    const handleClearEvent = (e: any) => {
      if (!e.detail?.id || e.detail?.id === session.id) {
        term.clear()
      }
    }

    window.addEventListener('terminal-restart', handleRestartEvent)
    window.addEventListener('terminal-clear', handleClearEvent)

    const onDataDisposable = term.onData((data) => {
      window.maestroAPI?.writeTerminal(session.id, data)
    })

    const handleResize = () => {
      if (containerRef.current && containerRef.current.offsetParent !== null) {
        try {
          fitAddon.fit()
          if (term.cols && term.rows) {
            window.maestroAPI?.resizeTerminal(session.id, term.cols, term.rows)
          }
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cleanupData?.()
      cleanupExit?.()
      window.removeEventListener('terminal-restart', handleRestartEvent)
      window.removeEventListener('terminal-clear', handleClearEvent)
      onDataDisposable.dispose()
      window.removeEventListener('resize', handleResize)
      term.dispose()
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [session.id])

  // Fit terminal when active or resized
  useEffect(() => {
    if (isActive && fitAddonRef.current && termRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit()
          termRef.current?.focus()
          if (termRef.current?.cols && termRef.current?.rows) {
            window.maestroAPI?.resizeTerminal(session.id, termRef.current.cols, termRef.current.rows)
          }
        } catch {
          // ignore
        }
      }, 50)
    }
  }, [isActive, session.id])

  // Focus search input when search opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }, 50)
    } else {
      searchAddonRef.current?.clearDecorations()
      setResultIndex(0)
      setResultCount(0)
    }
  }, [isSearchOpen])

  // Perform search
  const performSearch = (next = true) => {
    if (!searchAddonRef.current || !searchQuery) {
      searchAddonRef.current?.clearDecorations()
      setResultIndex(0)
      setResultCount(0)
      return
    }

    const options = {
      caseSensitive,
      regex: useRegex,
      incremental: false
    }

    if (next) {
      searchAddonRef.current.findNext(searchQuery, options)
    } else {
      searchAddonRef.current.findPrevious(searchQuery, options)
    }
  }

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    if (!val) {
      searchAddonRef.current?.clearDecorations()
      setResultIndex(0)
      setResultCount(0)
      return
    }
    searchAddonRef.current?.findNext(val, {
      caseSensitive,
      regex: useRegex,
      incremental: true
    })
  }

  return (
    <div
      className="w-full h-full relative overflow-hidden bg-[#14161f]"
      onClick={onFocusPane}
    >
      {/* Floating Terminal Search Bar */}
      {isSearchOpen && (
        <div className="absolute top-2 right-4 z-20 flex items-center gap-1 bg-studio-card/95 border border-white/10 rounded-lg shadow-xl px-2 py-1 backdrop-blur-md animate-fade-in text-xs font-mono">
          <Search className="w-3.5 h-3.5 text-studio-muted shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                performSearch(!e.shiftKey)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                onCloseSearch()
                termRef.current?.focus()
              }
            }}
            placeholder="Find in terminal..."
            className="bg-transparent border-none outline-none text-xs text-white placeholder-studio-muted w-36 font-sans"
          />

          {/* Results count */}
          <span className="text-[10px] text-studio-muted px-1">
            {searchQuery
              ? resultCount > 0
                ? `${resultIndex}/${resultCount}`
                : 'No results'
              : ''}
          </span>

          {/* Match Case */}
          <button
            onClick={() => {
              const next = !caseSensitive
              setCaseSensitive(next)
              if (searchQuery) {
                searchAddonRef.current?.findNext(searchQuery, {
                  caseSensitive: next,
                  regex: useRegex
                })
              }
            }}
            className={`p-1 rounded transition-colors cursor-pointer ${
              caseSensitive
                ? 'bg-studio-amber/25 text-studio-amber'
                : 'text-studio-muted hover:text-white hover:bg-white/5'
            }`}
            title="Match Case"
          >
            <CaseSensitive className="w-3.5 h-3.5" />
          </button>

          {/* Regex */}
          <button
            onClick={() => {
              const next = !useRegex
              setUseRegex(next)
              if (searchQuery) {
                searchAddonRef.current?.findNext(searchQuery, {
                  caseSensitive,
                  regex: next
                })
              }
            }}
            className={`p-1 rounded transition-colors cursor-pointer ${
              useRegex
                ? 'bg-studio-amber/25 text-studio-amber'
                : 'text-studio-muted hover:text-white hover:bg-white/5'
            }`}
            title="Use Regular Expression"
          >
            <Regex className="w-3.5 h-3.5" />
          </button>

          {/* Prev */}
          <button
            onClick={() => performSearch(false)}
            disabled={!searchQuery || resultCount === 0}
            className="p-1 rounded text-studio-muted hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Previous Match (Shift+Enter)"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          {/* Next */}
          <button
            onClick={() => performSearch(true)}
            disabled={!searchQuery || resultCount === 0}
            className="p-1 rounded text-studio-muted hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Next Match (Enter)"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Close */}
          <button
            onClick={() => {
              onCloseSearch()
              termRef.current?.focus()
            }}
            className="p-1 rounded text-studio-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer ml-0.5"
            title="Close Search (Escape)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Terminal Canvas with Screen Reader Accessibility */}
      <div
        className="w-full h-full p-2.5 overflow-hidden"
        ref={containerRef}
        role="region"
        aria-label={`Terminal ${session.title || session.id}`}
        aria-live="polite"
      />
    </div>
  )
}

interface CyberTerminalProps {
  onClose?: () => void
}

export const CyberTerminal: React.FC<CyberTerminalProps> = () => {
  const {
    terminalSessions,
    activeTerminalId,
    terminalSplitMode,
    splitTerminalId,
    setActiveTerminalId,
    closeTerminalSplit,
    isTerminalSearchOpen,
    toggleTerminalSearch
  } = useEditorStore()

  const activeSession = terminalSessions.find((s) => s.id === activeTerminalId) || terminalSessions[0]
  const splitSession = terminalSessions.find((s) => s.id === splitTerminalId)

  const isSplitActive =
    terminalSplitMode !== 'none' &&
    splitSession &&
    splitSession.id !== activeSession?.id

  // If split is not active, render all sessions stacked (hidden when inactive to preserve state)
  if (!isSplitActive || !activeSession || !splitSession) {
    return (
      <div className="w-full h-full relative overflow-hidden bg-[#14161f]">
        {terminalSessions.map((session) => (
          <div
            key={session.id}
            className={`w-full h-full ${
              session.id === activeTerminalId ? 'block' : 'hidden'
            }`}
          >
            <SingleTerminal
              session={session}
              isActive={session.id === activeTerminalId}
              isSearchOpen={isTerminalSearchOpen && session.id === activeTerminalId}
              onCloseSearch={() => toggleTerminalSearch(false)}
            />
          </div>
        ))}
      </div>
    )
  }

  // Split Horizontal (side by side)
  if (terminalSplitMode === 'horizontal') {
    return (
      <div className="w-full h-full flex flex-row divide-x divide-white/10 bg-[#14161f] overflow-hidden">
        {/* Pane 1: Active Terminal */}
        <div
          className={`w-1/2 h-full flex flex-col relative transition-all ${
            activeTerminalId === activeSession.id ? 'ring-1 ring-studio-amber/20' : ''
          }`}
          onClick={() => setActiveTerminalId(activeSession.id)}
        >
          <div className="flex items-center justify-between px-2.5 py-0.5 bg-white/[0.02] border-b border-white/[0.05] text-[10px] font-mono text-studio-muted shrink-0">
            <span className={activeTerminalId === activeSession.id ? 'text-studio-amber font-medium' : ''}>
              {activeSession.title}
            </span>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <SingleTerminal
              session={activeSession}
              isActive={activeTerminalId === activeSession.id}
              isSearchOpen={isTerminalSearchOpen && activeTerminalId === activeSession.id}
              onCloseSearch={() => toggleTerminalSearch(false)}
              onFocusPane={() => setActiveTerminalId(activeSession.id)}
            />
          </div>
        </div>

        {/* Pane 2: Split Terminal */}
        <div
          className={`w-1/2 h-full flex flex-col relative transition-all ${
            activeTerminalId === splitSession.id ? 'ring-1 ring-studio-amber/20' : ''
          }`}
          onClick={() => setActiveTerminalId(splitSession.id)}
        >
          <div className="flex items-center justify-between px-2.5 py-0.5 bg-white/[0.02] border-b border-white/[0.05] text-[10px] font-mono text-studio-muted shrink-0">
            <span className={activeTerminalId === splitSession.id ? 'text-studio-amber font-medium' : ''}>
              {splitSession.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTerminalSplit()
              }}
              className="p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-studio-rose transition-colors cursor-pointer"
              title="Close Split View"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <SingleTerminal
              session={splitSession}
              isActive={activeTerminalId === splitSession.id}
              isSearchOpen={isTerminalSearchOpen && activeTerminalId === splitSession.id}
              onCloseSearch={() => toggleTerminalSearch(false)}
              onFocusPane={() => setActiveTerminalId(splitSession.id)}
            />
          </div>
        </div>
      </div>
    )
  }

  // Split Vertical (stacked)
  return (
    <div className="w-full h-full flex flex-col divide-y divide-white/10 bg-[#14161f] overflow-hidden">
      {/* Pane 1: Active Terminal (Top) */}
      <div
        className={`w-full h-1/2 flex flex-col relative transition-all ${
          activeTerminalId === activeSession.id ? 'ring-1 ring-studio-amber/20' : ''
        }`}
        onClick={() => setActiveTerminalId(activeSession.id)}
      >
        <div className="flex items-center justify-between px-2.5 py-0.5 bg-white/[0.02] border-b border-white/[0.05] text-[10px] font-mono text-studio-muted shrink-0">
          <span className={activeTerminalId === activeSession.id ? 'text-studio-amber font-medium' : ''}>
            {activeSession.title}
          </span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <SingleTerminal
            session={activeSession}
            isActive={activeTerminalId === activeSession.id}
            isSearchOpen={isTerminalSearchOpen && activeTerminalId === activeSession.id}
            onCloseSearch={() => toggleTerminalSearch(false)}
            onFocusPane={() => setActiveTerminalId(activeSession.id)}
          />
        </div>
      </div>

      {/* Pane 2: Split Terminal (Bottom) */}
      <div
        className={`w-full h-1/2 flex flex-col relative transition-all ${
          activeTerminalId === splitSession.id ? 'ring-1 ring-studio-amber/20' : ''
        }`}
        onClick={() => setActiveTerminalId(splitSession.id)}
      >
        <div className="flex items-center justify-between px-2.5 py-0.5 bg-white/[0.02] border-b border-white/[0.05] text-[10px] font-mono text-studio-muted shrink-0">
          <span className={activeTerminalId === splitSession.id ? 'text-studio-amber font-medium' : ''}>
            {splitSession.title}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeTerminalSplit()
            }}
            className="p-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-studio-rose transition-colors cursor-pointer"
            title="Close Split View"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <SingleTerminal
            session={splitSession}
            isActive={activeTerminalId === splitSession.id}
            isSearchOpen={isTerminalSearchOpen && activeTerminalId === splitSession.id}
            onCloseSearch={() => toggleTerminalSearch(false)}
            onFocusPane={() => setActiveTerminalId(splitSession.id)}
          />
        </div>
      </div>
    </div>
  )
}

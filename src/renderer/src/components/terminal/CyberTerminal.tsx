import React, { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { Trash2 } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

interface CyberTerminalProps {
  onClose?: () => void
}

export const CyberTerminal: React.FC<CyberTerminalProps> = () => {
  const terminalRef = useRef<HTMLDivElement | null>(null)
  const xtermInstance = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const { workspacePath } = useEditorStore()
  const terminalId = 'default-shell'

  useEffect(() => {
    if (!terminalRef.current) return

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
      convertEol: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalRef.current)
    fitAddon.fit()

    xtermInstance.current = term
    fitAddonRef.current = fitAddon

    window.maestroAPI?.createTerminal(terminalId, workspacePath || undefined)

    const cleanupListener = window.maestroAPI?.onTerminalData((id, data) => {
      if (id === terminalId) {
        term.write(data)
      }
    })

    const onDataDisposable = term.onData((data) => {
      window.maestroAPI?.writeTerminal(terminalId, data)
    })

    const handleResize = () => {
      try {
        fitAddon.fit()
      } catch {
        // ignore
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cleanupListener?.()
      onDataDisposable.dispose()
      window.removeEventListener('resize', handleResize)
      term.dispose()
    }
  }, [workspacePath])

  const handleClear = () => {
    xtermInstance.current?.clear()
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative group">
      {/* Quick floating clear button on terminal corner */}
      <button
        onClick={handleClear}
        className="absolute top-2 right-4 z-10 opacity-0 group-hover:opacity-100 p-1 rounded bg-white/10 hover:bg-white/20 text-studio-muted hover:text-white transition-opacity cursor-pointer text-xs"
        title="Clear Terminal"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <div className="flex-1 p-2.5 overflow-hidden bg-[#14161f]" ref={terminalRef} />
    </div>
  )
}

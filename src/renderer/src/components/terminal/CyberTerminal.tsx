import React, { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useEditorStore, TerminalSessionInfo } from '../../store/useEditorStore'

interface SingleTerminalProps {
  session: TerminalSessionInfo
  isActive: boolean
}

const SingleTerminal: React.FC<SingleTerminalProps> = ({ session, isActive }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const { workspacePath } = useEditorStore()

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
      convertEol: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)

    // Slight delay to allow DOM to measure dimensions accurately
    setTimeout(() => {
      try {
        fitAddon.fit()
      } catch {
        // ignore initial layout measurement
      }
    }, 50)

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Spawn the shell process via IPC
    window.maestroAPI?.createTerminal(session.id, workspacePath || undefined, session.shell)

    const cleanupData = window.maestroAPI?.onTerminalData((id, data) => {
      if (id === session.id) {
        term.write(data)
      }
    })

    const onDataDisposable = term.onData((data) => {
      window.maestroAPI?.writeTerminal(session.id, data)
    })

    const handleResize = () => {
      if (containerRef.current && containerRef.current.offsetParent !== null) {
        try {
          fitAddon.fit()
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cleanupData?.()
      onDataDisposable.dispose()
      window.removeEventListener('resize', handleResize)
      term.dispose()
    }
  }, [session.id, session.shell, workspacePath])

  // Fit terminal when it becomes active
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit()
          termRef.current?.focus()
        } catch {
          // ignore
        }
      }, 50)
    }
  }, [isActive])

  return (
    <div
      className={`w-full h-full p-2.5 overflow-hidden bg-[#14161f] ${
        isActive ? 'block' : 'hidden'
      }`}
      ref={containerRef}
    />
  )
}

interface CyberTerminalProps {
  onClose?: () => void
}

export const CyberTerminal: React.FC<CyberTerminalProps> = () => {
  const { terminalSessions, activeTerminalId } = useEditorStore()

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#14161f]">
      {terminalSessions.map((session) => (
        <SingleTerminal
          key={session.id}
          session={session}
          isActive={session.id === activeTerminalId}
        />
      ))}
    </div>
  )
}

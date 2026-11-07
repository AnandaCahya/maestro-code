import React, { useState, useRef, useEffect } from 'react'
import { Trash2, Terminal, CornerDownLeft, ArrowRight, Sparkles } from 'lucide-react'
import { useDebugStore } from '../../store/useDebugStore'

export const DebugConsole: React.FC = () => {
  const { consoleOutputs, sendConsoleInput, clearConsole, status } = useDebugStore()
  const [inputVal, setInputVal] = useState('')
  const [inputHistory, setInputHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [consoleOutputs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputVal.trim()) return

    const text = inputVal.trim()
    setInputHistory((prev) => [...prev, text])
    setHistoryIndex(-1)
    setInputVal('')
    await sendConsoleInput(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      if (inputHistory.length === 0) return
      e.preventDefault()
      const nextIndex = historyIndex === -1 ? inputHistory.length - 1 : Math.max(0, historyIndex - 1)
      setHistoryIndex(nextIndex)
      setInputVal(inputHistory[nextIndex])
    } else if (e.key === 'ArrowDown') {
      if (historyIndex === -1) return
      e.preventDefault()
      const nextIndex = historyIndex + 1
      if (nextIndex >= inputHistory.length) {
        setHistoryIndex(-1)
        setInputVal('')
      } else {
        setHistoryIndex(nextIndex)
        setInputVal(inputHistory[nextIndex])
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121318]/90 font-mono text-xs overflow-hidden">
      {/* Top action bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-studio-amber" />
          <span className="text-white/80 font-medium">Debug Console</span>
          <span className="text-[10px] text-studio-muted">
            {status === 'stopped' ? '(Paused - evaluated in frame context)' : '(Interactive REPL)'}
          </span>
        </div>
        <button
          onClick={clearConsole}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 text-studio-muted hover:text-white transition-colors cursor-pointer"
          title="Clear Console"
        >
          <Trash2 className="w-3 h-3" />
          <span className="text-[11px]">Clear</span>
        </button>
      </div>

      {/* Output Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1">
        {consoleOutputs.map((item) => {
          let colorClass = 'text-studio-muted'
          let prefix = ''

          if (item.category === 'stdout') {
            colorClass = 'text-white/90'
          } else if (item.category === 'stderr') {
            colorClass = 'text-studio-rose'
          } else if (item.category === 'input') {
            colorClass = 'text-studio-cyan font-semibold'
          } else if (item.category === 'result') {
            colorClass = 'text-studio-amber'
            prefix = '<= '
          } else if (item.category === 'console') {
            colorClass = 'text-studio-accent'
          }

          return (
            <div key={item.id} className={`whitespace-pre-wrap leading-relaxed ${colorClass}`}>
              {prefix}
              {item.text}
            </div>
          )
        })}
      </div>

      {/* Input Prompt */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-2 border-t border-white/[0.04] bg-white/[0.02]"
      >
        <span className="text-studio-amber font-bold">{'>'}</span>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Evaluate expression (e.g. 1 + 1, process.env, this)..."
          className="flex-1 bg-transparent border-none outline-none text-white text-xs placeholder:text-studio-muted/50"
        />
        <button
          type="submit"
          disabled={!inputVal.trim()}
          className="p-1 rounded text-studio-muted hover:text-white disabled:opacity-30 cursor-pointer"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  )
}

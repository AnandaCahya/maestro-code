import React, { useRef, useEffect, useState } from 'react'
import {
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ArrowDownCircle,
  FileCode2,
  Terminal
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

export const OutputDeck: React.FC = () => {
  const {
    outputChannels,
    activeOutputChannelId,
    setActiveOutputChannelId,
    clearOutput,
    setStatusMessage
  } = useEditorStore()

  const [copied, setCopied] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  const activeChannel =
    outputChannels.find((c) => c.id === activeOutputChannelId) || outputChannels[0]

  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [activeChannel?.lines, autoScroll])

  const handleCopy = async () => {
    if (!activeChannel) return
    const text = activeChannel.lines.join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setStatusMessage(`Copied ${activeChannel.name} output to clipboard`)
    setTimeout(() => {
      setCopied(false)
      setStatusMessage('Ready')
    }, 2000)
  }

  const handleClear = () => {
    if (!activeChannel) return
    clearOutput(activeChannel.id)
    setStatusMessage(`Cleared ${activeChannel.name} output channel`)
    setTimeout(() => setStatusMessage('Ready'), 1500)
  }

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-studio-bg font-mono select-text">
      {/* Top Toolbar */}
      <div className="h-8 px-3 border-b border-white/[0.04] flex items-center justify-between bg-black/20 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-studio-amber" />
          <div className="flex items-center gap-1.5 glass-pill px-2 py-0.5 rounded-lg text-xs">
            <span className="text-studio-muted text-[10px]">Channel:</span>
            <select
              value={activeChannel?.id || ''}
              onChange={(e) => setActiveOutputChannelId(e.target.value)}
              className="bg-transparent text-white text-xs outline-none cursor-pointer font-sans"
            >
              {outputChannels.map((c) => (
                <option key={c.id} value={c.id} className="bg-studio-card">
                  {c.name} ({c.lines.length} lines)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`p-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-1 ${
              autoScroll ? 'text-studio-cyan bg-studio-cyan/10' : 'text-studio-muted hover:text-white'
            }`}
            title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll paused'}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
          </button>

          {/* Copy channel output */}
          <button
            onClick={handleCopy}
            className="p-1 rounded text-studio-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Copy channel content to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-studio-emerald" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Clear channel output */}
          <button
            onClick={handleClear}
            className="p-1 rounded text-studio-muted hover:text-studio-rose hover:bg-studio-rose/10 transition-colors cursor-pointer"
            title="Clear channel output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Output Content Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-3 overflow-y-auto overflow-x-auto text-[11.5px] leading-relaxed text-zinc-300 font-mono space-y-0.5 scrollbar-thin"
      >
        {activeChannel && activeChannel.lines.length > 0 ? (
          activeChannel.lines.map((line, idx) => (
            <div key={idx} className="whitespace-pre-wrap break-all hover:bg-white/[0.02] px-1 rounded">
              <span className="text-studio-muted/40 select-none inline-block w-8 text-right mr-3 text-[10px]">
                {idx + 1}
              </span>
              <span className="text-zinc-200">{line}</span>
            </div>
          ))
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-studio-muted italic select-none">
            Output channel '{activeChannel?.name || 'Output'}' is currently empty.
          </div>
        )}
      </div>
    </div>
  )
}

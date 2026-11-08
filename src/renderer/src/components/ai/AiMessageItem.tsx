import React, { useState } from 'react'
import {
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  User,
  FileCode,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import type { AiChatMessage } from '../../../preload/index.d'
import { useAiStore } from '../../store/useAiStore'

interface AiMessageItemProps {
  message: AiChatMessage
  isLast: boolean
  onRetry?: () => void
}

export const AiMessageItem: React.FC<AiMessageItemProps> = ({ message, isLast, onRetry }) => {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Parse markdown code blocks and render them cleanly
  const renderFormattedContent = (content: string) => {
    const parts: React.ReactNode[] = []
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index)
      if (textBefore) {
        parts.push(
          <span key={`text-${lastIndex}`} className="whitespace-pre-wrap leading-relaxed">
            {textBefore}
          </span>
        )
      }

      const lang = match[1] || 'text'
      const codeSnippet = match[2]
      parts.push(
        <CodeBlockSnippet
          key={`code-${match.index}`}
          language={lang}
          code={codeSnippet}
        />
      )
      lastIndex = match.index + match[0].length
    }

    const textRemaining = content.substring(lastIndex)
    if (textRemaining) {
      parts.push(
        <span key={`text-end`} className="whitespace-pre-wrap leading-relaxed">
          {textRemaining}
        </span>
      )
    }

    return parts
  }

  return (
    <div
      className={`group relative flex gap-3.5 px-4.5 py-4 rounded-xl transition-all duration-150 mb-2 ${
        isUser
          ? 'bg-studio-surface/50 border border-studio-border/40 ml-4'
          : 'bg-studio-card/90 border border-studio-border/70 shadow-sm mr-2'
      }`}
    >
      {/* Avatar Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {isUser ? (
          <div className="w-7 h-7 rounded-xl bg-studio-subtle/30 flex items-center justify-center text-studio-muted border border-studio-border/40">
            <User className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-xl bg-studio-accent/15 border border-studio-accent/30 flex items-center justify-center text-studio-accent shadow-glow-accent">
            <Sparkles className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0 text-xs text-studio-text space-y-2 overflow-hidden">
        <div className="flex items-center justify-between text-xs text-studio-muted mb-1">
          <span className="font-semibold text-studio-text">
            {isUser ? 'You' : 'Maestro AI'}
          </span>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopyMessage}
              title="Copy message"
              className="p-1.5 rounded-lg hover:bg-studio-surface text-studio-muted hover:text-studio-text cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-studio-emerald" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {isAssistant && isLast && onRetry && (
              <button
                onClick={onRetry}
                title="Retry response"
                className="p-1.5 rounded-lg hover:bg-studio-surface text-studio-muted hover:text-studio-text cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="text-[13px] font-sans leading-relaxed break-words selection:bg-studio-accent/20">
          {renderFormattedContent(message.content)}
        </div>
      </div>
    </div>
  )
}

interface CodeBlockSnippetProps {
  language: string
  code: string
}

const CodeBlockSnippet: React.FC<CodeBlockSnippetProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false)
  const isDiff = language.toLowerCase() === 'diff'

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="my-3 rounded-xl border border-studio-border/90 bg-[#0d0e12] overflow-hidden text-xs shadow-md">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-studio-card/85 border-b border-studio-border/70 text-xs text-studio-muted">
        <div className="flex items-center gap-2 font-mono font-medium text-studio-muted">
          <FileCode className="w-3.5 h-3.5 text-studio-accent" />
          <span>{language || 'code'}</span>
        </div>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-studio-surface text-studio-muted hover:text-studio-text cursor-pointer transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-studio-emerald" />
              <span className="text-studio-emerald font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <pre className="p-4 overflow-x-auto font-mono text-xs leading-relaxed text-studio-text/95 scrollbar-thin">
        {isDiff ? (
          <code>
            {code.split('\n').map((line, idx) => {
              let lineStyle = 'text-studio-text/80'
              if (line.startsWith('+') && !line.startsWith('+++')) {
                lineStyle = 'text-studio-emerald bg-studio-emerald/10 block px-1.5 -mx-1.5 rounded'
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                lineStyle = 'text-studio-rose bg-studio-rose/10 block px-1.5 -mx-1.5 rounded'
              } else if (line.startsWith('@@')) {
                lineStyle = 'text-studio-cyan font-semibold block px-1.5 -mx-1.5'
              }
              return (
                <span key={idx} className={lineStyle}>
                  {line}
                  {'\n'}
                </span>
              )
            })}
          </code>
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  )
}

import React, { useState } from 'react'
import {
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  User,
  CheckCircle2,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import type { AiChatMessage } from '../../../preload/index.d'
import { useAiStore } from '../../store/useAiStore'
import { MarkdownRenderer } from './MarkdownRenderer'

const formatTokens = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString()
}

interface AiMessageItemProps {
  message: AiChatMessage
  isLast: boolean
  onRetry?: () => void
}

export const AiMessageItem: React.FC<AiMessageItemProps> = ({ message, isLast, onRetry }) => {
  const [copied, setCopied] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

        {/* Live / Recorded Agent Activities */}
        {isAssistant && message.steps && message.steps.length > 0 && (
          <div className="pt-0.5 pb-1 select-none">
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-studio-surface/70 hover:bg-studio-surface border border-studio-border/60 text-[11px] font-mono text-studio-muted hover:text-studio-text cursor-pointer transition-colors"
            >
              <Activity className="w-3 h-3 text-studio-accent" />
              <span>{message.steps.length} agent {message.steps.length === 1 ? 'action' : 'actions'} executed</span>
              {showSteps ? <ChevronUp className="w-3 h-3 text-studio-muted" /> : <ChevronDown className="w-3 h-3 text-studio-muted" />}
            </button>

            {showSteps && (
              <div className="mt-1.5 p-2.5 rounded-lg bg-studio-surface/40 border border-studio-border/50 space-y-1.5 text-[11px] font-mono animate-in fade-in-50">
                {message.steps.map((st) => (
                  <div key={st.id} className="flex items-center gap-2 text-studio-muted">
                    <CheckCircle2 className="w-3.5 h-3.5 text-studio-emerald flex-shrink-0" />
                    <span className="text-studio-text/90 font-medium">{st.title}</span>
                    {typeof st.durationSeconds === 'number' && (
                      <span className="text-studio-muted/60 text-[10px]">({st.durationSeconds.toFixed(1)}s)</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Formatted Markdown Content */}
        <div className="text-[13px] font-sans leading-relaxed break-words selection:bg-studio-accent/20">
          {message.content ? (
            <MarkdownRenderer content={message.content} />
          ) : (
            <span className="italic text-studio-muted">No response content was generated.</span>
          )}
        </div>

        {/* Telemetry / Usage Badge */}
        {isAssistant && message.usage && (
          <div className="flex flex-wrap items-center gap-2 pt-2 mt-2 border-t border-studio-border/40 text-[10.5px] text-studio-muted font-mono select-none">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-studio-surface/80 border border-studio-border/60 text-studio-accent font-medium shadow-sm">
              <Zap className="w-3 h-3 text-studio-accent" />
              <span>{formatTokens(message.usage.promptTokens)} prompt</span>
              <span className="text-studio-muted/40">•</span>
              <span>{formatTokens(message.usage.completionTokens)} completion</span>
              {typeof message.usage.thinkingTokens === 'number' && message.usage.thinkingTokens > 0 && (
                <>
                  <span className="text-studio-muted/40">•</span>
                  <span className="text-studio-violet">{formatTokens(message.usage.thinkingTokens)} thought</span>
                </>
              )}
              {typeof message.usage.durationSeconds === 'number' && (
                <>
                  <span className="text-studio-muted/40">•</span>
                  <span className="text-studio-cyan">{message.usage.durationSeconds.toFixed(1)}s</span>
                </>
              )}
            </span>
            <span className="text-studio-muted/70 text-[10px]">
              Total: {message.usage.totalTokens.toLocaleString()} tokens
            </span>
          </div>
        )}
      </div>
    </div>
  )
}


import React, { useMemo, useState } from 'react'
import { marked, type Tokens } from 'marked'
import {
  FileCode,
  ExternalLink,
  Copy,
  Check,
  CheckSquare,
  Square
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'

const TaskBadge: React.FC<{ taskId: string }> = ({ taskId }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const { projectData } = useProjectStore.getState()
    const task = (projectData?.tasks || []).find(
      (t) => t.id.toLowerCase() === taskId.toLowerCase()
    )
    if (task) {
      useEditorStore.getState().setFocusTask({ id: task.id, title: task.title })
      useEditorStore.getState().setStatusMessage(`Focus Mode: [${task.id}] ${task.title}`)
      setTimeout(() => useEditorStore.getState().setStatusMessage('Ready'), 2500)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-studio-amber/15 text-studio-amber hover:bg-studio-amber/25 border border-studio-amber/35 text-[11px] font-mono font-medium mx-0.5 cursor-pointer transition-colors align-baseline"
      title={`Focus task [${taskId}] in Maestro Studio`}
    >
      <CheckSquare className="w-2.5 h-2.5 text-studio-amber inline-block" />
      <span>{taskId}</span>
    </button>
  )
}

function renderTextWithTaskLinks(text: string): React.ReactNode {
  if (!text || !/(MST-\d+)/i.test(text)) {
    return text
  }
  const parts = text.split(/(MST-\d+)/gi)
  return (
    <>
      {parts.map((part, idx) => {
        if (/^MST-\d+$/i.test(part)) {
          return <TaskBadge key={`tb-${idx}`} taskId={part.toUpperCase()} />
        }
        return <span key={`pt-${idx}`}>{part}</span>
      })}
    </>
  )
}

interface MarkdownRendererProps {
  content: string
  className?: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const tokens = useMemo(() => {
    try {
      return marked.lexer(content, { gfm: true, breaks: true })
    } catch {
      return []
    }
  }, [content])

  if (!tokens || tokens.length === 0) {
    return <span className="whitespace-pre-wrap">{content}</span>
  }

  return (
    <div className={`markdown-body space-y-2 leading-relaxed text-[13px] ${className}`}>
      {tokens.map((token, idx) => (
        <BlockTokenRenderer key={`blk-${idx}`} token={token} />
      ))}
    </div>
  )
}

const BlockTokenRenderer: React.FC<{ token: Tokens.Generic }> = ({ token }) => {
  switch (token.type) {
    case 'heading': {
      const headingToken = token as Tokens.Heading
      const depth = headingToken.depth
      const children = <InlineTokensRenderer tokens={headingToken.tokens} />
      if (depth === 1) {
        return (
          <h1 className="text-base font-bold text-studio-text mt-3.5 mb-2 pb-1.5 border-b border-studio-border/70 flex items-center gap-2">
            {children}
          </h1>
        )
      }
      if (depth === 2) {
        return (
          <h2 className="text-sm font-semibold text-studio-accent mt-3 mb-1.5 flex items-center gap-1.5">
            {children}
          </h2>
        )
      }
      if (depth === 3) {
        return (
          <h3 className="text-xs font-semibold text-studio-text mt-2.5 mb-1">
            {children}
          </h3>
        )
      }
      return (
        <h4 className="text-xs font-medium text-studio-muted mt-2 mb-1">
          {children}
        </h4>
      )
    }

    case 'paragraph': {
      const pToken = token as Tokens.Paragraph
      return (
        <p className="my-1.5 leading-relaxed text-studio-text/95">
          <InlineTokensRenderer tokens={pToken.tokens} />
        </p>
      )
    }

    case 'code': {
      const codeToken = token as Tokens.Code
      return (
        <CodeBlockSnippet
          language={codeToken.lang || 'text'}
          code={codeToken.text}
        />
      )
    }

    case 'blockquote': {
      const bqToken = token as Tokens.Blockquote
      return (
        <blockquote className="border-l-2 border-studio-accent/70 bg-studio-surface/40 rounded-r-lg px-3 py-1.5 my-2.5 text-studio-muted italic text-xs space-y-1">
          {bqToken.tokens.map((sub, i) => (
            <BlockTokenRenderer key={`bq-${i}`} token={sub} />
          ))}
        </blockquote>
      )
    }

    case 'list': {
      const listToken = token as Tokens.List
      if (listToken.ordered) {
        return (
          <ol
            start={typeof listToken.start === 'number' ? listToken.start : 1}
            className="list-decimal list-outside pl-5 my-2 space-y-1 text-xs text-studio-text leading-relaxed"
          >
            {listToken.items.map((item, i) => (
              <ListItemRenderer key={`ol-${i}`} item={item} />
            ))}
          </ol>
        )
      }
      return (
        <ul className="list-disc list-outside pl-5 my-2 space-y-1 text-xs text-studio-text leading-relaxed">
          {listToken.items.map((item, i) => (
            <ListItemRenderer key={`ul-${i}`} item={item} />
          ))}
        </ul>
      )
    }

    case 'table': {
      const tbl = token as Tokens.Table
      return (
        <div className="my-3 overflow-x-auto rounded-lg border border-studio-border/80 shadow-sm bg-studio-bg">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-studio-surface/90 border-b border-studio-border text-studio-text font-semibold">
                {tbl.header.map((col, i) => {
                  const alignClass =
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  return (
                    <th key={`th-${i}`} className={`px-3 py-2 ${alignClass}`}>
                      <InlineTokensRenderer tokens={col.tokens} />
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {tbl.rows.map((row, rIdx) => (
                <tr
                  key={`tr-${rIdx}`}
                  className="border-b border-studio-border/40 hover:bg-studio-surface/40 transition-colors"
                >
                  {row.map((cell, cIdx) => {
                    const alignClass =
                      cell.align === 'center'
                        ? 'text-center'
                        : cell.align === 'right'
                        ? 'text-right'
                        : 'text-left'
                    return (
                      <td key={`td-${rIdx}-${cIdx}`} className={`px-3 py-1.5 ${alignClass}`}>
                        <InlineTokensRenderer tokens={cell.tokens} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case 'hr': {
      return <hr className="my-3 border-studio-border/70" />
    }

    case 'space': {
      return null
    }

    default: {
      if ('tokens' in token && Array.isArray((token as any).tokens)) {
        return (
          <div className="my-1">
            <InlineTokensRenderer tokens={(token as any).tokens} />
          </div>
        )
      }
      return <span className="whitespace-pre-wrap">{token.raw || ''}</span>
    }
  }
}

const ListItemRenderer: React.FC<{ item: Tokens.ListItem }> = ({ item }) => {
  if (item.task) {
    return (
      <li className="flex items-start gap-2 my-1 list-none -ml-4">
        {item.checked ? (
          <CheckSquare className="w-3.5 h-3.5 text-studio-emerald mt-0.5 flex-shrink-0" />
        ) : (
          <Square className="w-3.5 h-3.5 text-studio-muted mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <InlineTokensRenderer tokens={item.tokens} />
        </div>
      </li>
    )
  }

  return (
    <li className="leading-relaxed my-0.5">
      <InlineTokensRenderer tokens={item.tokens} />
    </li>
  )
}

const InlineTokensRenderer: React.FC<{ tokens?: Tokens.Generic[] }> = ({ tokens }) => {
  if (!tokens || tokens.length === 0) return null

  return (
    <>
      {tokens.map((t, idx) => (
        <InlineTokenItem key={`in-${idx}`} token={t} />
      ))}
    </>
  )
}

const InlineTokenItem: React.FC<{ token: Tokens.Generic }> = ({ token }) => {
  const { openWorkspaceFile } = useEditorStore()

  switch (token.type) {
    case 'text': {
      const textToken = token as Tokens.Text
      if (textToken.tokens && textToken.tokens.length > 0) {
        return <InlineTokensRenderer tokens={textToken.tokens} />
      }
      return <span>{renderTextWithTaskLinks(textToken.text)}</span>
    }

    case 'strong': {
      const strongToken = token as Tokens.Strong
      return (
        <strong className="font-semibold text-studio-text">
          <InlineTokensRenderer tokens={strongToken.tokens} />
        </strong>
      )
    }

    case 'em': {
      const emToken = token as Tokens.Em
      return (
        <em className="italic text-studio-text/90">
          <InlineTokensRenderer tokens={emToken.tokens} />
        </em>
      )
    }

    case 'codespan': {
      const codeSpan = token as Tokens.Codespan
      if (/^MST-\d+$/i.test(codeSpan.text.trim())) {
        return <TaskBadge taskId={codeSpan.text.trim().toUpperCase()} />
      }
      return (
        <code className="px-1.5 py-0.5 rounded bg-studio-surface border border-studio-border/70 text-studio-accent font-mono text-[11.5px] select-all">
          {codeSpan.text}
        </code>
      )
    }

    case 'del': {
      const delToken = token as Tokens.Del
      return (
        <del className="line-through text-studio-muted/70">
          <InlineTokensRenderer tokens={delToken.tokens} />
        </del>
      )
    }

    case 'link': {
      const linkToken = token as Tokens.Link
      const href = linkToken.href || ''
      const isFileLink = href.startsWith('file:///') || href.startsWith('file://')

      if (isFileLink) {
        const cleanPath = href.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\')
        return (
          <button
            onClick={() => {
              if (cleanPath) openWorkspaceFile(cleanPath)
            }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-studio-accent/10 border border-studio-accent/30 text-studio-accent font-mono text-[11.5px] hover:bg-studio-accent/20 cursor-pointer transition-colors"
            title={`Open ${cleanPath} in editor`}
          >
            <FileCode className="w-3 h-3 text-studio-accent" />
            <span>
              <InlineTokensRenderer tokens={linkToken.tokens} />
            </span>
          </button>
        )
      }

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-studio-cyan underline hover:text-studio-cyan/80 transition-colors"
        >
          <span>
            <InlineTokensRenderer tokens={linkToken.tokens} />
          </span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )
    }

    case 'br': {
      return <br />
    }

    default: {
      if ('tokens' in token && Array.isArray((token as any).tokens)) {
        return <InlineTokensRenderer tokens={(token as any).tokens} />
      }
      return <span>{token.raw || (token as any).text || ''}</span>
    }
  }
}

interface CodeBlockSnippetProps {
  language: string
  code: string
}

export const CodeBlockSnippet: React.FC<CodeBlockSnippetProps> = ({ language, code }) => {
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

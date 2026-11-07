import React from 'react'

interface MarkdownRendererProps {
  content: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content || !content.trim()) {
    return <span className="text-studio-muted italic text-xs">No description provided.</span>
  }

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeBlockContent: string[] = []
  let codeBlockLang = ''

  lines.forEach((line, index) => {
    // Fenced Code Block
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <div
            key={`code-${index}`}
            className="my-2 p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-studio-cyan overflow-x-auto"
          >
            {codeBlockLang && (
              <div className="text-[10px] text-studio-muted uppercase tracking-wider mb-1">
                {codeBlockLang}
              </div>
            )}
            <pre className="whitespace-pre">{codeBlockContent.join('\n')}</pre>
          </div>
        )
        inCodeBlock = false
        codeBlockContent = []
        codeBlockLang = ''
      } else {
        // Start code block
        inCodeBlock = true
        codeBlockLang = line.trim().slice(3).trim()
        codeBlockContent = []
      }
      return
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      return
    }

    // Heading 1
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={index} className="text-base font-bold text-white mt-3 mb-1 border-b border-white/10 pb-1">
          {renderInlineMarkdown(line.slice(2))}
        </h1>
      )
      return
    }

    // Heading 2
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={index} className="text-sm font-semibold text-studio-accent mt-2.5 mb-1">
          {renderInlineMarkdown(line.slice(3))}
        </h2>
      )
      return
    }

    // Heading 3
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={index} className="text-xs font-semibold text-studio-cyan mt-2 mb-0.5">
          {renderInlineMarkdown(line.slice(4))}
        </h3>
      )
      return
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={index}
          className="border-l-2 border-studio-amber pl-2.5 my-1.5 text-xs italic text-studio-muted bg-white/[0.02] py-1 rounded-r"
        >
          {renderInlineMarkdown(line.slice(2))}
        </blockquote>
      )
      return
    }

    // Checkbox list
    if (line.trim().startsWith('- [ ] ') || line.trim().startsWith('- [x] ')) {
      const isChecked = line.trim().startsWith('- [x] ')
      const text = line.trim().slice(6)
      elements.push(
        <div key={index} className="flex items-center gap-2 text-xs my-0.5">
          <input
            type="checkbox"
            checked={isChecked}
            readOnly
            className="rounded border-white/20 bg-white/5 text-studio-accent accent-studio-accent w-3.5 h-3.5"
          />
          <span className={isChecked ? 'line-through text-studio-muted' : 'text-studio-text'}>
            {renderInlineMarkdown(text)}
          </span>
        </div>
      )
      return
    }

    // Unordered list
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      elements.push(
        <li key={index} className="list-disc list-inside text-xs text-studio-text my-0.5 ml-2">
          {renderInlineMarkdown(line.trim().slice(2))}
        </li>
      )
      return
    }

    // Horizontal rule
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={index} className="border-white/10 my-2" />)
      return
    }

    // Regular paragraph
    if (line.trim() === '') {
      elements.push(<div key={index} className="h-1.5" />)
    } else {
      elements.push(
        <p key={index} className="text-xs text-studio-text leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      )
    }
  })

  return <div className="space-y-0.5 select-text">{elements}</div>
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Bold **text**
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*|~~.*?~~)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-black/40 text-studio-cyan text-[11px] font-mono border border-white/10 mx-0.5"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="italic text-studio-muted">
          {part.slice(1, -1)}
        </em>
      )
    }
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return (
        <span key={i} className="line-through text-studio-muted">
          {part.slice(2, -2)}
        </span>
      )
    }
    return part
  })
}

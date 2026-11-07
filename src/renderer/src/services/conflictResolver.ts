export interface ConflictBlock {
  id: string
  startLine: number
  separatorLine: number
  endLine: number
  currentText: string
  incomingText: string
  currentLabel: string
  incomingLabel: string
}

export function parseConflictBlocks(content: string): ConflictBlock[] {
  if (!content.includes('<<<<<<<') || !content.includes('=======')) {
    return []
  }

  const lines = content.split('\n')
  const blocks: ConflictBlock[] = []

  let inConflict = false
  let startLine = 0
  let currentLabel = 'Current Change'
  let incomingLabel = 'Incoming Change'
  let currentLines: string[] = []
  let incomingLines: string[] = []
  let separatorLine = 0
  let readingIncoming = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    if (line.startsWith('<<<<<<<')) {
      inConflict = true
      startLine = lineNum
      currentLabel = line.replace('<<<<<<<', '').trim() || 'Current Change (Ours)'
      currentLines = []
      incomingLines = []
      readingIncoming = false
      continue
    }

    if (inConflict && line.startsWith('=======')) {
      separatorLine = lineNum
      readingIncoming = true
      continue
    }

    if (inConflict && line.startsWith('>>>>>>>')) {
      incomingLabel = line.replace('>>>>>>>', '').trim() || 'Incoming Change (Theirs)'
      blocks.push({
        id: `conflict-${startLine}-${lineNum}`,
        startLine,
        separatorLine,
        endLine: lineNum,
        currentText: currentLines.join('\n'),
        incomingText: incomingLines.join('\n'),
        currentLabel,
        incomingLabel
      })
      inConflict = false
      continue
    }

    if (inConflict) {
      if (readingIncoming) {
        incomingLines.push(line)
      } else {
        currentLines.push(line)
      }
    }
  }

  return blocks
}

export function resolveConflict(
  content: string,
  block: ConflictBlock,
  resolution: 'current' | 'incoming' | 'both'
): string {
  const lines = content.split('\n')
  const replacement =
    resolution === 'current'
      ? block.currentText
      : resolution === 'incoming'
        ? block.incomingText
        : `${block.currentText}\n${block.incomingText}`

  const before = lines.slice(0, block.startLine - 1)
  const after = lines.slice(block.endLine)

  return [...before, ...(replacement ? [replacement] : []), ...after].join('\n')
}

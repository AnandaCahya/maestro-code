import fs from 'fs/promises'
import path from 'path'

export interface SearchMatch {
  filePath: string
  fileName: string
  line: number
  column: number
  lineText: string
  preview: { before: string; match: string; after: string }
}

export interface FileSearchResult {
  filePath: string
  fileName: string
  matches: SearchMatch[]
}

export interface SearchOptions {
  isCaseSensitive?: boolean
  isWholeWord?: boolean
  isRegex?: boolean
}

const DEFAULT_EXCLUDES = ['node_modules', '.git', 'out', 'dist', '.agents']
const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.scss',
  '.md', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.txt',
  '.yaml', '.yml', '.toml', '.xml', '.svg', '.sh', '.bat', '.ps1'
])

async function collectFiles(dirPath: string): Promise<string[]> {
  const result: string[] = []
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (DEFAULT_EXCLUDES.includes(entry.name)) continue

      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        const nested = await collectFiles(fullPath)
        result.push(...nested)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (TEXT_EXTENSIONS.has(ext)) {
          result.push(fullPath)
        }
      }
    }
  } catch {
    // ignore directory read errors
  }
  return result
}

function buildSearchRegex(query: string, options: SearchOptions): RegExp {
  let pattern = options.isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (options.isWholeWord) {
    pattern = `\\b${pattern}\\b`
  }
  const flags = options.isCaseSensitive ? 'g' : 'gi'
  return new RegExp(pattern, flags)
}

export async function searchInFiles(
  workspacePath: string,
  query: string,
  options: SearchOptions = {}
): Promise<FileSearchResult[]> {
  if (!query || !query.trim() || !workspacePath) {
    return []
  }

  const allFiles = await collectFiles(workspacePath)
  const results: FileSearchResult[] = []
  let regex: RegExp

  try {
    regex = buildSearchRegex(query, options)
  } catch {
    return [] // Invalid regex
  }

  for (const filePath of allFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const lines = content.split('\n')
      const fileMatches: SearchMatch[] = []
      const fileName = path.basename(filePath)

      for (let i = 0; i < lines.length; i++) {
        const lineText = lines[i]
        regex.lastIndex = 0
        let match: RegExpExecArray | null

        while ((match = regex.exec(lineText)) !== null) {
          const matchIndex = match.index
          const matchLength = match[0].length
          const before = lineText.substring(Math.max(0, matchIndex - 30), matchIndex)
          const matchedStr = match[0]
          const after = lineText.substring(matchIndex + matchLength, matchIndex + matchLength + 30)

          fileMatches.push({
            filePath,
            fileName,
            line: i + 1,
            column: matchIndex + 1,
            lineText: lineText.trim(),
            preview: { before, match: matchedStr, after }
          })

          if (!regex.global) break
        }
      }

      if (fileMatches.length > 0) {
        results.push({
          filePath,
          fileName,
          matches: fileMatches
        })
      }
    } catch {
      // skip unreadable file
    }
  }

  return results
}

export async function replaceInFiles(
  workspacePath: string,
  query: string,
  replaceText: string,
  options: SearchOptions = {}
): Promise<{ replacedCount: number; filesCount: number }> {
  if (!query || !workspacePath) return { replacedCount: 0, filesCount: 0 }

  const searchResults = await searchInFiles(workspacePath, query, options)
  let totalReplaced = 0
  let filesCount = 0
  const regex = buildSearchRegex(query, options)

  for (const fileResult of searchResults) {
    try {
      const content = await fs.readFile(fileResult.filePath, 'utf-8')
      const newContent = content.replace(regex, replaceText)
      if (newContent !== content) {
        await fs.writeFile(fileResult.filePath, newContent, 'utf-8')
        totalReplaced += fileResult.matches.length
        filesCount++
      }
    } catch (err) {
      console.error(`Failed to replace in file ${fileResult.filePath}:`, err)
    }
  }

  return { replacedCount: totalReplaced, filesCount }
}

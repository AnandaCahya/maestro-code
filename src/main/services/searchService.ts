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
  includePattern?: string
  excludePattern?: string
}

const DEFAULT_EXCLUDES = ['node_modules', '.git', 'out', 'dist', '.agents']
const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.scss',
  '.md', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.txt',
  '.yaml', '.yml', '.toml', '.xml', '.svg', '.sh', '.bat', '.ps1',
  '.env', '.gitignore', '.editorconfig', '.prettierrc', '.eslintrc'
])

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.bmp', '.webp', '.tiff',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar', '.bz2', '.xz',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.iso', '.dmg', '.msi',
  '.mp3', '.mp4', '.wav', '.ogg', '.flac', '.avi', '.mov', '.mkv', '.webm',
  '.pyc', '.class', '.wasm', '.node', '.db', '.sqlite', '.sqlite3', '.dat'
])

function matchesPattern(relPath: string, rawPattern: string): boolean {
  const patterns = rawPattern.split(',').map((p) => p.trim()).filter(Boolean)
  if (patterns.length === 0) return true
  const norm = relPath.replace(/\\/g, '/')
  const baseName = path.basename(norm)

  return patterns.some((p) => {
    if (p.startsWith('*.')) {
      const ext = p.slice(1)
      return norm.endsWith(ext)
    }
    if (p.includes('*')) {
      const regexStr = p
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
      const regex = new RegExp(`^${regexStr}$`, 'i')
      return regex.test(norm) || regex.test(baseName)
    }
    return norm.includes(p) || norm.endsWith(p) || baseName === p
  })
}

async function loadGitignore(workspacePath: string): Promise<string[]> {
  try {
    const gitignorePath = path.join(workspacePath, '.gitignore')
    const content = await fs.readFile(gitignorePath, 'utf-8')
    return content
      .split('\n')
      .map((l) => l.trim().replace(/\/$/, ''))
      .filter((l) => l && !l.startsWith('#'))
  } catch {
    return []
  }
}

async function collectFiles(
  dirPath: string,
  workspacePath: string,
  options: SearchOptions,
  gitignorePatterns: string[]
): Promise<string[]> {
  const result: string[] = []
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (DEFAULT_EXCLUDES.includes(entry.name)) continue

      const fullPath = path.join(dirPath, entry.name)
      const relPath = path.relative(workspacePath, fullPath).replace(/\\/g, '/')

      // Check gitignore
      if (gitignorePatterns.some((p) => matchesPattern(relPath, p))) {
        continue
      }

      // Check user exclude pattern
      if (options.excludePattern && matchesPattern(relPath, options.excludePattern)) {
        continue
      }

      if (entry.isDirectory()) {
        const nested = await collectFiles(fullPath, workspacePath, options, gitignorePatterns)
        result.push(...nested)
      } else if (entry.isFile()) {
        // Check user include pattern
        if (options.includePattern && !matchesPattern(relPath, options.includePattern)) {
          continue
        }

        const ext = path.extname(entry.name).toLowerCase()
        if (BINARY_EXTENSIONS.has(ext)) {
          continue
        }
        result.push(fullPath)
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

  const gitignorePatterns = await loadGitignore(workspacePath)
  const allFiles = await collectFiles(workspacePath, workspacePath, options, gitignorePatterns)
  const results: FileSearchResult[] = []
  let regex: RegExp

  try {
    regex = buildSearchRegex(query, options)
  } catch {
    return [] // Invalid regex
  }

  for (const filePath of allFiles) {
    try {
      const buf = await fs.readFile(filePath)
      // Binary check: skip files containing null byte in first 8KB
      if (buf.subarray(0, 8192).includes(0)) {
        continue
      }
      const content = buf.toString('utf-8')
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

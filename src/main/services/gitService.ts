import { exec } from 'child_process'
import util from 'util'
import path from 'path'

const execPromise = util.promisify(exec)

export interface GitFileStatus {
  path: string
  status: 'modified' | 'untracked' | 'added' | 'deleted' | 'renamed' | 'conflict'
  staged?: boolean
}

export interface GitStatusResult {
  branch: string
  files: GitFileStatus[]
  staged: GitFileStatus[]
  unstaged: GitFileStatus[]
  untracked: GitFileStatus[]
  conflicts: GitFileStatus[]
  isMerging?: boolean
}

export async function getGitStatus(workspacePath: string): Promise<GitStatusResult> {
  try {
    // Ambil branch saat ini
    let branch = 'main'
    try {
      const { stdout: branchOut } = await execPromise('git rev-parse --abbrev-ref HEAD', {
        cwd: workspacePath
      })
      branch = branchOut.trim() || 'main'
    } catch {
      // ignore
    }

    // Ambil status file
    const { stdout: statusOut } = await execPromise('git status --porcelain', {
      cwd: workspacePath
    })

    const files: GitFileStatus[] = []
    const staged: GitFileStatus[] = []
    const unstaged: GitFileStatus[] = []
    const untracked: GitFileStatus[] = []
    const conflicts: GitFileStatus[] = []

    const lines = statusOut.split('\n')

    for (const line of lines) {
      if (!line.trim() || line.length < 3) continue
      const x = line[0]
      const y = line[1]
      const rawPath = line.substring(3).trim()
      const filePath = rawPath.includes(' -> ') ? rawPath.split(' -> ')[1] : rawPath

      // Conflict detection (unmerged paths: UU, AA, DD, AU, UA, UD, DU)
      if (x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D')) {
        const item: GitFileStatus = { path: filePath, status: 'conflict', staged: false }
        conflicts.push(item)
        files.push(item)
        continue
      }

      if (x === '?' && y === '?') {
        const item: GitFileStatus = { path: filePath, status: 'untracked', staged: false }
        untracked.push(item)
        files.push(item)
        continue
      }

      // Check Staged index
      if (x !== ' ' && x !== '?') {
        let st: GitFileStatus['status'] = 'modified'
        if (x === 'A') st = 'added'
        else if (x === 'D') st = 'deleted'
        else if (x === 'R') st = 'renamed'
        const stagedItem: GitFileStatus = { path: filePath, status: st, staged: true }
        staged.push(stagedItem)
        if (!files.some((f) => f.path === filePath)) {
          files.push(stagedItem)
        }
      }

      // Check Working Tree (unstaged)
      if (y !== ' ' && y !== '?') {
        let st: GitFileStatus['status'] = 'modified'
        if (y === 'D') st = 'deleted'
        const unstagedItem: GitFileStatus = { path: filePath, status: st, staged: false }
        unstaged.push(unstagedItem)
        if (!files.some((f) => f.path === filePath)) {
          files.push(unstagedItem)
        }
      }
    }

    const isMerging = conflicts.length > 0

    return { branch, files, staged, unstaged, untracked, conflicts, isMerging }
  } catch (error) {
    return { branch: 'main', files: [], staged: [], unstaged: [], untracked: [], conflicts: [], isMerging: false }
  }
}

export async function getGitDiff(workspacePath: string, relativeFilePath: string): Promise<{ original: string; modified: string }> {
  try {
    // Dapatkan konten file dari HEAD (versi sebelum diubah)
    let original = ''
    try {
      const { stdout: origOut } = await execPromise(`git show HEAD:"${relativeFilePath.replace(/\\/g, '/')}"`, {
        cwd: workspacePath
      })
      original = origOut
    } catch {
      original = '' // File baru (untracked/new)
    }

    // Dapatkan konten file saat ini dari disk
    const fs = await import('fs/promises')
    const fullPath = path.isAbsolute(relativeFilePath)
      ? relativeFilePath
      : path.join(workspacePath, relativeFilePath)

    let modified = ''
    try {
      modified = await fs.readFile(fullPath, 'utf-8')
    } catch {
      modified = ''
    }

    return { original, modified }
  } catch (err) {
    console.error('Failed to get git diff:', err)
    return { original: '', modified: '' }
  }
}

export async function getGitStagedDiff(
  workspacePath: string,
  relativeFilePath: string
): Promise<{ original: string; modified: string }> {
  try {
    let original = ''
    try {
      const { stdout: origOut } = await execPromise(
        `git show HEAD:"${relativeFilePath.replace(/\\/g, '/')}"`,
        { cwd: workspacePath }
      )
      original = origOut
    } catch {
      original = ''
    }

    let modified = ''
    try {
      const { stdout: modOut } = await execPromise(
        `git show :"${relativeFilePath.replace(/\\/g, '/')}"`,
        { cwd: workspacePath }
      )
      modified = modOut
    } catch {
      modified = ''
    }

    return { original, modified }
  } catch (err) {
    console.error('Failed to get git staged diff:', err)
    return { original: '', modified: '' }
  }
}

export async function gitStageFile(workspacePath: string, filePath: string): Promise<boolean> {
  try {
    await execPromise(`git add "${filePath}"`, { cwd: workspacePath })
    return true
  } catch {
    return false
  }
}

export async function gitUnstageFile(workspacePath: string, filePath: string): Promise<boolean> {
  try {
    await execPromise(`git restore --staged "${filePath}"`, { cwd: workspacePath })
    return true
  } catch {
    try {
      await execPromise(`git reset HEAD "${filePath}"`, { cwd: workspacePath })
      return true
    } catch {
      return false
    }
  }
}

export async function gitStageAll(workspacePath: string): Promise<boolean> {
  try {
    await execPromise('git add .', { cwd: workspacePath })
    return true
  } catch {
    return false
  }
}

export async function gitUnstageAll(workspacePath: string): Promise<boolean> {
  try {
    await execPromise('git restore --staged .', { cwd: workspacePath })
    return true
  } catch {
    try {
      await execPromise('git reset HEAD', { cwd: workspacePath })
      return true
    } catch {
      return false
    }
  }
}

export async function gitDiscardFile(workspacePath: string, filePath: string): Promise<boolean> {
  try {
    const { stdout } = await execPromise(`git status --porcelain "${filePath}"`, { cwd: workspacePath })
    if (stdout.trim().startsWith('??')) {
      const fs = await import('fs/promises')
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspacePath, filePath)
      await fs.rm(fullPath, { recursive: true, force: true })
      return true
    }
    await execPromise(`git restore "${filePath}"`, { cwd: workspacePath })
    return true
  } catch {
    try {
      await execPromise(`git checkout -- "${filePath}"`, { cwd: workspacePath })
      return true
    } catch {
      return false
    }
  }
}

export async function gitDiscardAll(workspacePath: string): Promise<boolean> {
  try {
    await execPromise('git restore .', { cwd: workspacePath })
    await execPromise('git clean -fd', { cwd: workspacePath })
    return true
  } catch {
    return false
  }
}

export async function gitCommit(workspacePath: string, message: string): Promise<{ ok: boolean; message: string }> {
  try {
    const escapedMsg = message.replace(/"/g, '\\"')
    const { stdout } = await execPromise(`git commit -m "${escapedMsg}"`, {
      cwd: workspacePath
    })
    return { ok: true, message: stdout.trim() }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Commit failed' }
  }
}

export async function gitCommitAmend(
  workspacePath: string,
  message?: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const cmd = message
      ? `git commit --amend -m "${message.replace(/"/g, '\\"')}"`
      : 'git commit --amend --no-edit'
    const { stdout } = await execPromise(cmd, { cwd: workspacePath })
    return { ok: true, message: stdout.trim() }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Amend failed' }
  }
}

export async function gitPush(workspacePath: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { stdout } = await execPromise('git push', { cwd: workspacePath })
    return { ok: true, message: stdout.trim() }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Push failed' }
  }
}

export async function gitPull(workspacePath: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { stdout } = await execPromise('git pull', { cwd: workspacePath })
    return { ok: true, message: stdout.trim() }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Pull failed' }
  }
}

export async function gitCreateBranch(workspacePath: string, branchName: string): Promise<{ ok: boolean; message: string }> {
  try {
    const sanitized = branchName.replace(/[^a-zA-Z0-9_\-\.\/]/g, '-')
    const { stdout } = await execPromise(`git checkout -b "${sanitized}"`, { cwd: workspacePath })
    return { ok: true, message: stdout.trim() || `Switched to a new branch '${sanitized}'` }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to create branch' }
  }
}

export async function gitCheckoutBranch(workspacePath: string, branchName: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { stdout } = await execPromise(`git checkout "${branchName}"`, { cwd: workspacePath })
    return { ok: true, message: stdout.trim() || `Switched to branch '${branchName}'` }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to checkout branch' }
  }
}

export async function gitGetBranches(workspacePath: string): Promise<string[]> {
  try {
    const { stdout } = await execPromise('git branch --list', { cwd: workspacePath })
    return stdout
      .split('\n')
      .map((b) => b.replace(/^\*?\s+/, '').trim())
      .filter((b) => b.length > 0)
  } catch {
    return ['main']
  }
}

export async function gitDeleteBranch(
  workspacePath: string,
  branchName: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const { stdout } = await execPromise(`git branch -D "${branchName}"`, { cwd: workspacePath })
    return { ok: true, message: stdout.trim() || `Deleted branch '${branchName}'` }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to delete branch' }
  }
}

export async function gitRenameBranch(
  workspacePath: string,
  oldName: string,
  newName: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const sanitized = newName.replace(/[^a-zA-Z0-9_\-\.\/]/g, '-')
    const { stdout } = await execPromise(`git branch -m "${oldName}" "${sanitized}"`, {
      cwd: workspacePath
    })
    return { ok: true, message: stdout.trim() || `Renamed branch to '${sanitized}'` }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to rename branch' }
  }
}

export async function gitPublishBranch(
  workspacePath: string,
  branchName: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const { stdout } = await execPromise(`git push -u origin "${branchName}"`, {
      cwd: workspacePath
    })
    return { ok: true, message: stdout.trim() || `Published branch '${branchName}' to remote` }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to publish branch' }
  }
}

export interface GitGutterChange {
  type: 'added' | 'modified' | 'deleted'
  startLine: number
  endLine: number
}

export function parseGitDiffGutter(diffOutput: string): GitGutterChange[] {
  const changes: GitGutterChange[] = []
  const hunkRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm
  let match: RegExpExecArray | null

  while ((match = hunkRegex.exec(diffOutput)) !== null) {
    const oldCount = match[2] !== undefined ? parseInt(match[2], 10) : 1
    const newStart = parseInt(match[3], 10)
    const newCount = match[4] !== undefined ? parseInt(match[4], 10) : 1

    if (oldCount === 0) {
      changes.push({
        type: 'added',
        startLine: newStart,
        endLine: newStart + Math.max(newCount - 1, 0)
      })
    } else if (newCount === 0) {
      changes.push({
        type: 'deleted',
        startLine: Math.max(1, newStart),
        endLine: Math.max(1, newStart)
      })
    } else {
      changes.push({
        type: 'modified',
        startLine: newStart,
        endLine: newStart + Math.max(newCount - 1, 0)
      })
    }
  }

  return changes
}

export async function getGitGutterChanges(
  workspacePath: string,
  relativeFilePath: string
): Promise<GitGutterChange[]> {
  try {
    const { stdout } = await execPromise(
      `git diff -U0 HEAD -- "${relativeFilePath.replace(/\\/g, '/')}"`,
      {
        cwd: workspacePath
      }
    )
    return parseGitDiffGutter(stdout)
  } catch {
    return []
  }
}

export async function gitAbortMerge(workspacePath: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { stdout } = await execPromise('git merge --abort', { cwd: workspacePath })
    return { ok: true, message: stdout.trim() || 'Merge aborted' }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to abort merge' }
  }
}

export async function gitContinueMerge(workspacePath: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { stdout } = await execPromise('git merge --continue', { cwd: workspacePath })
    return { ok: true, message: stdout.trim() || 'Merge continued' }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to continue merge' }
  }
}

export interface GitCommit {
  hash: string
  shortHash: string
  author: string
  email: string
  date: string
  message: string
}

export interface GitCommitDetail extends GitCommit {
  files: {
    status: 'A' | 'M' | 'D' | 'R'
    path: string
  }[]
}

export interface GitBlameLine {
  line: number
  commitHash: string
  author: string
  date: string
  summary: string
}

export interface GitStashItem {
  index: number
  name: string
  branch: string
  message: string
}

export async function gitGetHistory(
  workspacePath: string,
  maxCount = 50,
  filePath?: string
): Promise<GitCommit[]> {
  try {
    const fileFilter = filePath ? ` -- "${filePath.replace(/\\/g, '/')}"` : ''
    const { stdout } = await execPromise(
      `git log --pretty=format:"%H|%h|%an|%ae|%ad|%s" --date=short -n ${maxCount}${fileFilter}`,
      { cwd: workspacePath }
    )
    if (!stdout.trim()) return []

    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [hash, shortHash, author, email, date, ...rest] = line.split('|')
        return {
          hash: hash || '',
          shortHash: shortHash || '',
          author: author || '',
          email: email || '',
          date: date || '',
          message: rest.join('|') || ''
        }
      })
  } catch {
    return []
  }
}

export async function gitGetCommitDetail(
  workspacePath: string,
  hash: string
): Promise<GitCommitDetail | null> {
  try {
    const { stdout } = await execPromise(
      `git show --format="%H|%h|%an|%ae|%ad|%s" --name-status "${hash}"`,
      { cwd: workspacePath }
    )
    const lines = stdout.split('\n')
    if (lines.length === 0) return null

    const header = lines[0].trim()
    const [commitHash, shortHash, author, email, date, ...rest] = header.split('|')

    const files: GitCommitDetail['files'] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      const parts = line.split(/\s+/)
      if (parts.length >= 2) {
        const rawStatus = parts[0][0] as 'A' | 'M' | 'D' | 'R'
        files.push({
          status: rawStatus || 'M',
          path: parts.slice(1).join(' ')
        })
      }
    }

    return {
      hash: commitHash,
      shortHash,
      author,
      email,
      date,
      message: rest.join('|'),
      files
    }
  } catch {
    return null
  }
}

export async function gitGetFileAtCommit(
  workspacePath: string,
  hash: string,
  filePath: string
): Promise<string> {
  try {
    const { stdout } = await execPromise(`git show "${hash}:${filePath.replace(/\\/g, '/')}"`, {
      cwd: workspacePath
    })
    return stdout
  } catch {
    return ''
  }
}

export async function gitGetBlame(
  workspacePath: string,
  filePath: string
): Promise<GitBlameLine[]> {
  try {
    const { stdout } = await execPromise(
      `git blame --line-porcelain -- "${filePath.replace(/\\/g, '/')}"`,
      { cwd: workspacePath }
    )
    const lines = stdout.split('\n')
    const results: GitBlameLine[] = []

    let currentHash = ''
    let currentLine = 0
    let currentAuthor = ''
    let currentTime = ''
    let currentSummary = ''

    for (const l of lines) {
      if (!l) continue
      if (l.startsWith('\t')) {
        results.push({
          line: currentLine,
          commitHash: currentHash.slice(0, 8),
          author: currentAuthor,
          date: currentTime ? new Date(parseInt(currentTime, 10) * 1000).toISOString().split('T')[0] : '',
          summary: currentSummary
        })
        currentHash = ''
        currentAuthor = ''
        currentTime = ''
        currentSummary = ''
      } else if (!currentHash) {
        const headerParts = l.split(' ')
        currentHash = headerParts[0]
        currentLine = parseInt(headerParts[2] || headerParts[1], 10) || 1
      } else if (l.startsWith('author ')) {
        currentAuthor = l.substring(7).trim()
      } else if (l.startsWith('author-time ')) {
        currentTime = l.substring(12).trim()
      } else if (l.startsWith('summary ')) {
        currentSummary = l.substring(8).trim()
      }
    }

    return results
  } catch {
    return []
  }
}

export async function gitFetch(workspacePath: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { stdout } = await execPromise('git fetch', { cwd: workspacePath })
    return { ok: true, message: stdout.trim() || 'Fetch complete' }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Fetch failed' }
  }
}

export async function gitGetStashes(workspacePath: string): Promise<GitStashItem[]> {
  try {
    const { stdout } = await execPromise('git stash list', { cwd: workspacePath })
    if (!stdout.trim()) return []

    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^stash@\{(\d+)\}:\s*(?:(WIP on|On)\s+([^:]+):)?\s*(.*)$/)
        if (match) {
          return {
            index: parseInt(match[1], 10),
            name: `stash@{${match[1]}}`,
            branch: (match[3] || '').trim(),
            message: (match[4] || line).trim()
          }
        }
        return {
          index: 0,
          name: 'stash@{0}',
          branch: '',
          message: line
        }
      })
  } catch {
    return []
  }
}

export async function gitStashSave(
  workspacePath: string,
  message?: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const cmd = message ? `git stash push -m "${message.replace(/"/g, '\\"')}"` : 'git stash push'
    const { stdout } = await execPromise(cmd, { cwd: workspacePath })
    return { ok: true, message: stdout.trim() || 'Stash created' }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to create stash' }
  }
}

export async function gitStashPop(
  workspacePath: string,
  index = 0
): Promise<{ ok: boolean; message: string }> {
  try {
    const { stdout } = await execPromise(`git stash pop stash@{${index}}`, { cwd: workspacePath })
    return { ok: true, message: stdout.trim() || 'Stash popped' }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to pop stash' }
  }
}

export async function gitStashApply(
  workspacePath: string,
  index = 0
): Promise<{ ok: boolean; message: string }> {
  try {
    const { stdout } = await execPromise(`git stash apply stash@{${index}}`, { cwd: workspacePath })
    return { ok: true, message: stdout.trim() || 'Stash applied' }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to apply stash' }
  }
}

export async function gitStashDrop(
  workspacePath: string,
  index = 0
): Promise<{ ok: boolean; message: string }> {
  try {
    const { stdout } = await execPromise(`git stash drop stash@{${index}}`, { cwd: workspacePath })
    return { ok: true, message: stdout.trim() || 'Stash dropped' }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to drop stash' }
  }
}

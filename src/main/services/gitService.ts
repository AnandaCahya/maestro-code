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

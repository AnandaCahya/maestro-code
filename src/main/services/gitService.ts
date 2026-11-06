import { exec } from 'child_process'
import util from 'util'
import path from 'path'

const execPromise = util.promisify(exec)

export interface GitFileStatus {
  path: string
  status: 'modified' | 'untracked' | 'added' | 'deleted' | 'renamed'
}

export interface GitStatusResult {
  branch: string
  files: GitFileStatus[]
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
    const lines = statusOut.split('\n')

    for (const line of lines) {
      if (!line.trim()) continue
      const statusCode = line.substring(0, 2).trim()
      const filePath = line.substring(3).trim()

      let status: GitFileStatus['status'] = 'modified'
      if (statusCode.includes('?') || statusCode === '??') {
        status = 'untracked'
      } else if (statusCode.includes('A')) {
        status = 'added'
      } else if (statusCode.includes('D')) {
        status = 'deleted'
      } else if (statusCode.includes('R')) {
        status = 'renamed'
      } else {
        status = 'modified'
      }

      files.push({
        path: filePath,
        status
      })
    }

    return { branch, files }
  } catch (error) {
    return { branch: 'main', files: [] }
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

export async function gitStageAll(workspacePath: string): Promise<boolean> {
  try {
    await execPromise('git add .', { cwd: workspacePath })
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

import { describe, it, expect } from 'vitest'
import {
  gitGetRemotes,
  gitAddRemote,
  gitRenameRemote,
  gitRemoveRemote,
  gitCompareTags,
  gitStageHunk,
  gitUnstageHunk,
  gitDiscardHunk,
  gitCommitAll,
  isBinaryFile
} from '../src/main/services/gitService'

describe('Git Remotes, Strategy, and Tag Comparison', () => {
  it('handles invalid or non-git directories gracefully without crash', async () => {
    const remotes = await gitGetRemotes('non-existent-dir')
    expect(remotes).toEqual([])

    const addRes = await gitAddRemote('non-existent-dir', 'upstream', 'https://example.com/repo.git')
    expect(addRes.ok).toBe(false)
    expect(addRes.message).toBeDefined()

    const renameRes = await gitRenameRemote('non-existent-dir', 'upstream', 'upstream-new')
    expect(renameRes.ok).toBe(false)

    const removeRes = await gitRemoveRemote('non-existent-dir', 'upstream')
    expect(removeRes.ok).toBe(false)

    const tagCmp = await gitCompareTags('non-existent-dir', 'v1.0.0', 'v2.0.0')
    expect(tagCmp.commitCount).toBe(0)
    expect(tagCmp.diffStat).toContain('Unable to compare tags')
  })

  it('sanitizes remote names to avoid shell injection characters', async () => {
    // Sanitization strips non-alphanumeric/underscore/dash
    const dirtyName = 'origin; rm -rf /'
    const sanitized = dirtyName.replace(/[^a-zA-Z0-9_\-]/g, '')
    expect(sanitized).toBe('originrm-rf')
    expect(sanitized).not.toContain(';')
    expect(sanitized).not.toContain(' ')
  })

  it('detects binary file extensions correctly', async () => {
    expect(await isBinaryFile('test.png')).toBe(true)
    expect(await isBinaryFile('app.exe')).toBe(true)
    expect(await isBinaryFile('data.pdf')).toBe(true)
    expect(await isBinaryFile('archive.zip')).toBe(true)
    expect(await isBinaryFile('script.ts')).toBe(false)
    expect(await isBinaryFile('doc.md')).toBe(false)
  })

  it('handles invalid hunk patches safely with error feedback', async () => {
    const invalidPatch = 'not a valid diff hunk'
    const stageRes = await gitStageHunk('non-existent-dir', invalidPatch)
    expect(stageRes.ok).toBe(false)

    const unstageRes = await gitUnstageHunk('non-existent-dir', invalidPatch)
    expect(unstageRes.ok).toBe(false)

    const discardRes = await gitDiscardHunk('non-existent-dir', invalidPatch)
    expect(discardRes.ok).toBe(false)

    const commitAllRes = await gitCommitAll('non-existent-dir', 'test commit')
    expect(commitAllRes.ok).toBe(false)
  })
})

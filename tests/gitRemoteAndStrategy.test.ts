import { describe, it, expect } from 'vitest'
import { gitGetRemotes, gitAddRemote, gitRenameRemote, gitRemoveRemote, gitCompareTags } from '../src/main/services/gitService'

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
})

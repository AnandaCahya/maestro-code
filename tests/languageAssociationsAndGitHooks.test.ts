import { describe, it, expect } from 'vitest'
import { detectLanguageWithAssociations } from '../src/main/services/settingsService'

describe('Language Identification and File Associations', () => {
  it('correctly detects standard programming languages by extension', () => {
    expect(detectLanguageWithAssociations('main.ts')).toBe('typescript')
    expect(detectLanguageWithAssociations('Component.tsx')).toBe('typescript')
    expect(detectLanguageWithAssociations('index.js')).toBe('javascript')
    expect(detectLanguageWithAssociations('script.py')).toBe('python')
    expect(detectLanguageWithAssociations('server.go')).toBe('go')
    expect(detectLanguageWithAssociations('lib.rs')).toBe('rust')
    expect(detectLanguageWithAssociations('Program.cs')).toBe('csharp')
    expect(detectLanguageWithAssociations('App.java')).toBe('java')
    expect(detectLanguageWithAssociations('main.cpp')).toBe('cpp')
    expect(detectLanguageWithAssociations('script.sh')).toBe('shell')
    expect(detectLanguageWithAssociations('query.sql')).toBe('sql')
    expect(detectLanguageWithAssociations('styles.scss')).toBe('scss')
    expect(detectLanguageWithAssociations('config.yaml')).toBe('yaml')
  })

  it('correctly identifies special files like Dockerfile and .env', () => {
    expect(detectLanguageWithAssociations('Dockerfile')).toBe('dockerfile')
    expect(detectLanguageWithAssociations('dockerfile')).toBe('dockerfile')
    expect(detectLanguageWithAssociations('.env')).toBe('ini')
    expect(detectLanguageWithAssociations('.env.local')).toBe('ini')
  })

  it('respects exact and wildcard file associations from settings', () => {
    const associations = {
      '*.custom': 'json',
      'Config.*': 'yaml',
      'special-script': 'ruby',
      '*.myext': 'markdown'
    }

    expect(detectLanguageWithAssociations('data.custom', associations)).toBe('json')
    expect(detectLanguageWithAssociations('nested/dir/data.custom', associations)).toBe('json')
    expect(detectLanguageWithAssociations('Config.prod', associations)).toBe('yaml')
    expect(detectLanguageWithAssociations('special-script', associations)).toBe('ruby')
    expect(detectLanguageWithAssociations('notes.myext', associations)).toBe('markdown')
    // Unassociated files fall back to standard rules
    expect(detectLanguageWithAssociations('other.txt', associations)).toBe('plaintext')
  })
})

describe('Git Commit Signatures and Hooks', () => {
  it('correctly maps raw signature status flags to standardized GitCommit signatureStatus', () => {
    function parseSignatureStatus(flag: string): 'valid' | 'invalid' | 'unverified' | 'none' {
      if (flag === 'G') return 'valid'
      if (flag === 'B') return 'invalid'
      if (flag === 'U') return 'unverified'
      return 'none'
    }

    expect(parseSignatureStatus('G')).toBe('valid')
    expect(parseSignatureStatus('B')).toBe('invalid')
    expect(parseSignatureStatus('U')).toBe('unverified')
    expect(parseSignatureStatus('N')).toBe('none')
    expect(parseSignatureStatus('')).toBe('none')
  })

  it('formats git hook failure errors clearly for developer feedback', () => {
    function formatGitError(stderr: string): { ok: boolean; message: string } {
      const isHookFailure = stderr.includes('hook') || stderr.includes('pre-commit') || stderr.includes('commit-msg')
      return {
        ok: false,
        message: isHookFailure
          ? `Commit rejected by validation hook: ${stderr.trim()}`
          : stderr.trim()
      }
    }

    const preCommitFail = 'husky - pre-commit hook failed (add --no-verify to bypass)'
    const res = formatGitError(preCommitFail)
    expect(res.ok).toBe(false)
    expect(res.message).toContain('Commit rejected by validation hook')
    expect(res.message).toContain('pre-commit hook failed')

    const normalErr = 'fatal: pathspec did not match any files'
    const res2 = formatGitError(normalErr)
    expect(res2.ok).toBe(false)
    expect(res2.message).toBe('fatal: pathspec did not match any files')
  })
})

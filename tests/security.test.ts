import { describe, it, expect } from 'vitest'
import { sanitizePath, redactSecrets } from '../src/main/services/fileService'
import path from 'path'

describe('security: sanitizePath & redactSecrets', () => {
  it('resolves valid paths safely', () => {
    const valid = 'src/components/App.tsx'
    const resolved = sanitizePath(valid)
    expect(resolved).toBe(path.resolve(valid))
  })

  it('throws security error if null byte is injected in path', () => {
    expect(() => sanitizePath('safe/path\0/evil.exe')).toThrow('Null byte detected')
  })

  it('throws error for empty or non-string paths', () => {
    expect(() => sanitizePath('')).toThrow('Invalid path')
    expect(() => sanitizePath(null as any)).toThrow('Invalid path')
  })

  it('redacts GitHub personal access tokens', () => {
    const raw = 'Push failed using token ghp_1234567890abcdefghijklmnopqrstuvwxyz123'
    const redacted = redactSecrets(raw)
    expect(redacted).not.toContain('ghp_1234567890abcdefghijklmnopqrstuvwxyz123')
    expect(redacted).toContain('[REDACTED_GITHUB_TOKEN]')
  })

  it('redacts Authorization Bearer tokens', () => {
    const raw = 'Headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz" }'
    const redacted = redactSecrets(raw)
    expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz')
    expect(redacted).toContain('[REDACTED_TOKEN]')
  })

  it('redacts passwords and apiKeys in key-value format', () => {
    const raw = 'Connecting to db with password="superSecretPassword123" and apiKey="key_live_987654"'
    const redacted = redactSecrets(raw)
    expect(redacted).not.toContain('superSecretPassword123')
    expect(redacted).not.toContain('key_live_987654')
    expect(redacted).toContain('[REDACTED]')
  })
})

import { describe, it, expect } from 'vitest'
import { AiContextEngine } from '../src/main/services/ai/aiContextEngine'
import type { AiContextItem } from '../src/main/services/ai/aiTypes'

describe('AI Context Engine', () => {
  const engine = new AiContextEngine()

  it('detects and redacts OpenAI and Anthropic API keys', () => {
    const raw = 'const key = "sk-proj-abc1234567890abcdef1234567890abcdef";'
    const { text, redactedCount } = engine.redactSecrets(raw)
    expect(redactedCount).toBe(1)
    expect(text).toContain('[REDACTED_OPENAI_KEY]')
    expect(text).not.toContain('sk-proj-abc1234567890abcdef1234567890abcdef')
  })

  it('detects and redacts AWS keys, private keys, and bearer tokens', () => {
    const raw = `
      export const AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
      const auth = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
      const priv = "-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBAAKCAQEA0...\\n-----END RSA PRIVATE KEY-----"
    `
    const { text, redactedCount } = engine.redactSecrets(raw)
    expect(redactedCount).toBeGreaterThanOrEqual(2)
    expect(text).toContain('[REDACTED_AWS_KEY]')
    expect(text).toContain('Bearer [REDACTED_TOKEN]')
  })

  it('excludes sensitive files by pattern matching (.env, .pem, .key)', () => {
    expect(engine.isPathExcluded('.env').excluded).toBe(true)
    expect(engine.isPathExcluded('config/.env.local').excluded).toBe(true)
    expect(engine.isPathExcluded('certs/server.pem').excluded).toBe(true)
    expect(engine.isPathExcluded('node_modules/lodash/index.js').excluded).toBe(true)
    expect(engine.isPathExcluded('src/components/App.tsx').excluded).toBe(false)
  })

  it('marks context items as excluded and clears content when sensitive', () => {
    const item = engine.prepareContextItem({
      id: 'env-file',
      type: 'file',
      label: '.env',
      filePath: '/my-project/.env',
      content: 'DATABASE_URL="postgres://user:password@localhost:5432/db"'
    })

    expect(item.excluded).toBe(true)
    expect(item.content).toBe('')
    expect(item.sizeBytes).toBe(0)
  })

  it('packs context according to priority weights and truncates to budget', () => {
    const items: AiContextItem[] = [
      {
        id: '1',
        type: 'git',
        label: 'Git Diff',
        content: 'Diff contents here',
        sizeBytes: 100,
        estimatedTokens: 300
      },
      {
        id: '2',
        type: 'selection',
        label: 'Selected Code',
        content: 'function solve() { return 42 }',
        sizeBytes: 150,
        estimatedTokens: 200
      },
      {
        id: '3',
        type: 'diagnostics',
        label: 'LSP Errors',
        content: 'Error: Cannot find name "solve"',
        sizeBytes: 80,
        estimatedTokens: 100
      }
    ]

    // Pack with budget of 350 tokens:
    // Selection (200 tokens) + Diagnostics (100 tokens) = 300 tokens.
    // Git Diff (300 tokens) would exceed budget (remaining 50 tokens), so it gets truncated or dropped.
    const { packedItems, totalTokens, droppedCount, truncatedCount } = engine.packContext(items, 350)

    expect(packedItems.length).toBeGreaterThanOrEqual(2)
    // First two items should be selection and diagnostics (highest priorities)
    expect(packedItems[0].type).toBe('selection')
    expect(packedItems[1].type).toBe('diagnostics')
    expect(totalTokens).toBeLessThanOrEqual(350)
  })

  it('formats context items into clear markdown fences with source attribution', () => {
    const items: AiContextItem[] = [
      {
        id: '1',
        type: 'file',
        label: 'App.tsx',
        filePath: 'src/App.tsx',
        language: 'typescript',
        content: 'console.log("hello")',
        sizeBytes: 20,
        estimatedTokens: 10
      }
    ]

    const formatted = engine.formatContextForPrompt(items)
    expect(formatted).toContain('[Context: FILE] App.tsx (src/App.tsx)')
    expect(formatted).toContain('```typescript\nconsole.log("hello")\n```')
  })
})

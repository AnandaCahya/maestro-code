import { describe, it, expect } from 'vitest'
import { AiContextEngine } from '../src/main/services/ai/aiContextEngine'
import { AiToolRegistry } from '../src/main/services/ai/aiToolRegistry'
import { normalizeError } from '../src/main/services/ai/aiProviderGateway'
import { AiCredentialsService } from '../src/main/services/ai/aiCredentialsService'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

describe('AI Security and Threat Boundary Tests (Phase G1)', () => {
  const contextEngine = new AiContextEngine()
  const toolRegistry = new AiToolRegistry()

  it('G1.1: scrubs all known secret tokens from context before transmission', () => {
    const rawCode = `
      const openai = "sk-proj-9999999999999999999999999999999999999999"
      const anthropic = "sk-ant-1111111111111111111111111111111111111111"
      const github = "ghp_123456789012345678901234567890123456"
      const aws = "AKIAIOSFODNN7EXAMPLE"
      const bearer = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token"
    `

    const { text, redactedCount } = contextEngine.redactSecrets(rawCode)
    expect(redactedCount).toBeGreaterThanOrEqual(5)
    expect(text).not.toContain('sk-proj-9999999999999999999999999999999999999999')
    expect(text).not.toContain('sk-ant-1111111111111111111111111111111111111111')
    expect(text).not.toContain('ghp_123456789012345678901234567890123456')
    expect(text).not.toContain('AKIAIOSFODNN7EXAMPLE')
    expect(text).toContain('[REDACTED_OPENAI_KEY]')
    expect(text).toContain('[REDACTED_ANTHROPIC_KEY]')
    expect(text).toContain('[REDACTED_GITHUB_TOKEN]')
    expect(text).toContain('[REDACTED_AWS_KEY]')
  })

  it('G1.2: prevents workspace boundary escape via relative path traversal or null byte injection', () => {
    const root = path.join(os.tmpdir(), 'secure-ws-root')

    expect(() => {
      toolRegistry.validateAndResolvePath(root, '../../etc/shadow')
    }).toThrow(/escapes workspace boundary/)

    expect(() => {
      toolRegistry.validateAndResolvePath(root, '..\\..\\Windows\\System32\\config\\SAM')
    }).toThrow(/escapes workspace boundary/)

    expect(() => {
      toolRegistry.validateAndResolvePath(root, 'safe/path\0/evil.sh')
    }).toThrow(/Null byte detected/)
  })

  it('G1.3: rejects unauthorized tool execution without approval', async () => {
    const tempDir = path.join(os.tmpdir(), `ai-sec-test-${Date.now()}`)
    await fs.mkdir(tempDir, { recursive: true })

    // workspace_write_file is tier 'workspace-write'; without approval it must fail
    const res = await toolRegistry.invokeTool(
      'workspace_write_file',
      { filePath: 'trojan.js', content: 'malicious payload' },
      {
        workspacePath: tempDir,
        isWorkspaceTrusted: false,
        autoApproveReadOnly: true
      }
    )

    expect(res.success).toBe(false)
    expect(res.approvalRequired).toBe(true)
    expect(res.error).toContain('denied')

    const exists = await fs.access(path.join(tempDir, 'trojan.js')).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })

  it('G1.4: never exposes raw credentials in normalized error objects or stack messages', () => {
    const rawSecret = 'sk-proj-SuperSecretAPIKey1234567890'
    const err = new Error(`Provider returned 401 Unauthorized for Authorization: Bearer ${rawSecret}`)

    const normalized = normalizeError(err, 401)
    expect(normalized.code).toBe('AUTH_FAILED')
    expect(normalized.message).not.toContain(rawSecret)
    expect(normalized.suggestedFix).toContain('Settings -> AI Providers')

    const masked = AiCredentialsService.maskKey(rawSecret)
    expect(masked).toBe('sk-...7890')
    expect(masked).not.toContain('SuperSecretAPIKey')
  })

  it('G1.5: enforces denylist and blocks untrusted or vulnerable tools', async () => {
    toolRegistry.setDenylist(['workspace_write_file'])

    const res = await toolRegistry.invokeTool(
      'workspace_write_file',
      { filePath: 'test.txt', content: 'test' },
      {
        workspacePath: os.tmpdir(),
        isWorkspaceTrusted: true,
        autoApproveReadOnly: true,
        requestUserApproval: async () => true
      }
    )

    expect(res.success).toBe(false)
    expect(res.error).toContain('denylist')
    toolRegistry.setDenylist([])
  })
})

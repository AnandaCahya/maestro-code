import { describe, it, expect, beforeEach } from 'vitest'
import { AiCredentialsService } from '../src/main/services/ai/aiCredentialsService'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

describe('AI Credentials and Privacy Storage', () => {
  let credentialsService: AiCredentialsService
  let tempDir: string

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `maestro-ai-cred-test-${Date.now()}-${Math.random().toString(36).substring(7)}`)
    await fs.mkdir(tempDir, { recursive: true })
    credentialsService = new AiCredentialsService(tempDir)
  })

  it('stores and retrieves encrypted credentials safely', async () => {
    const provider = 'openai'
    const secretKey = 'sk-proj-test1234567890abcdef1234567890abcdef'

    await credentialsService.setCredential(provider, secretKey)
    const retrieved = await credentialsService.getCredential(provider)
    expect(retrieved).toBe(secretKey)

    const hasKey = await credentialsService.hasCredential(provider)
    expect(hasKey).toBe(true)
  })

  it('masks stored credentials for renderer consumption', async () => {
    const provider = 'anthropic'
    const secretKey = 'sk-ant-api03-abcdef1234567890'

    await credentialsService.setCredential(provider, secretKey)
    const masked = await credentialsService.getMaskedCredential(provider)
    expect(masked).toBe('sk-...7890')
    expect(masked).not.toContain('abcdef123456')
  })

  it('deletes credentials cleanly without lingering artifacts', async () => {
    const provider = 'gemini'
    await credentialsService.setCredential(provider, 'AIzaSyTest123456789')
    expect(await credentialsService.hasCredential(provider)).toBe(true)

    const deleted = await credentialsService.deleteCredential(provider)
    expect(deleted).toBe(true)
    expect(await credentialsService.getCredential(provider)).toBeNull()
    expect(await credentialsService.hasCredential(provider)).toBe(false)
  })

  it('lists summaries with masked keys and without exposing plaintext', async () => {
    await credentialsService.setCredential('openai', 'sk-test1234567890abcdef')
    await credentialsService.setCredential('anthropic', 'sk-ant-test9876543210')

    const summaries = await credentialsService.listCredentialSummaries(['openai', 'anthropic', 'ollama'])
    expect(summaries).toHaveLength(3)

    const openai = summaries.find((s) => s.providerId === 'openai')
    expect(openai?.hasKey).toBe(true)
    expect(openai?.maskedKey).toBe('sk-...cdef')

    const ollama = summaries.find((s) => s.providerId === 'ollama')
    expect(ollama?.hasKey).toBe(false)
    expect(ollama?.maskedKey).toBeUndefined()
  })
})

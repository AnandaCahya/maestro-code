import { describe, it, expect, beforeEach } from 'vitest'
import { AiConversationService } from '../src/main/services/ai/aiConversationService'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

describe('AI Conversation Service', () => {
  let convService: AiConversationService
  let tempDir: string

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `maestro-ai-conv-test-${Date.now()}-${Math.random().toString(36).substring(7)}`)
    await fs.mkdir(tempDir, { recursive: true })
    convService = new AiConversationService(tempDir)
  })

  it('saves and retrieves conversations with timestamps and messages', async () => {
    const id = 'conv-123'
    await convService.saveConversation({
      id,
      title: 'Fix React render loop',
      createdAt: Date.now() - 5000,
      updatedAt: Date.now(),
      providerId: 'openai',
      modelId: 'gpt-4o',
      mode: 'chat',
      messages: [
        { role: 'user', content: 'Why does useEffect run infinitely?' },
        { role: 'assistant', content: 'Missing dependency array or state update in effect.' }
      ]
    })

    const retrieved = await convService.getConversation(id)
    expect(retrieved).toBeDefined()
    expect(retrieved?.title).toBe('Fix React render loop')
    expect(retrieved?.messages).toHaveLength(2)
  })

  it('lists conversations sorted by updatedAt descending', async () => {
    await convService.saveConversation({
      id: 'conv-older',
      title: 'Older Conversation',
      createdAt: 1000,
      updatedAt: 2000,
      providerId: 'anthropic',
      modelId: 'claude-3-5-sonnet',
      mode: 'chat',
      messages: []
    })

    await convService.saveConversation({
      id: 'conv-newer',
      title: 'Newer Conversation',
      createdAt: 3000,
      updatedAt: 4000,
      providerId: 'openai',
      modelId: 'gpt-4o',
      mode: 'chat',
      messages: []
    })

    const list = await convService.listConversations()
    expect(list.length).toBe(2)
    expect(list[0].id).toBe('conv-newer')
    expect(list[1].id).toBe('conv-older')
  })

  it('exports conversation to formatted Markdown', async () => {
    const id = 'conv-export-test'
    await convService.saveConversation({
      id,
      title: 'Architecture Review',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      providerId: 'openai',
      modelId: 'gpt-4o',
      mode: 'chat',
      messages: [
        { role: 'user', content: 'Should we use Redis or PostgreSQL for caching?' },
        { role: 'assistant', content: 'Redis is better for low-latency in-memory caching.' }
      ]
    })

    const md = await convService.exportConversation(id, 'markdown')
    expect(md).toContain('# Architecture Review')
    expect(md).toContain('### 👤 User')
    expect(md).toContain('### 🤖 Maestro AI')
    expect(md).toContain('Redis is better for low-latency')
  })

  it('deletes conversations and clears all history', async () => {
    await convService.saveConversation({
      id: 'conv-del',
      title: 'To Delete',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      providerId: 'gemini',
      modelId: 'gemini-2.0-flash',
      mode: 'chat',
      messages: []
    })

    expect(await convService.deleteConversation('conv-del')).toBe(true)
    expect(await convService.getConversation('conv-del')).toBeNull()

    await convService.saveConversation({
      id: 'conv-clear-1',
      title: 'Clear 1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      providerId: 'gemini',
      modelId: 'gemini-2.0-flash',
      mode: 'chat',
      messages: []
    })

    await convService.clearAllConversations()
    const list = await convService.listConversations()
    expect(list).toHaveLength(0)
  })
})

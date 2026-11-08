import { describe, it, expect, vi } from 'vitest'
import {
  AiProviderGateway,
  normalizeError,
  OpenAICompatibleAdapter
} from '../src/main/services/ai/aiProviderGateway'
import { AiModelRegistry } from '../src/main/services/ai/aiModelRegistry'
import type { AiStreamChunk } from '../src/main/services/ai/aiTypes'

describe('AI Model Registry', () => {
  const registry = new AiModelRegistry()

  it('contains essential models for OpenAI, Anthropic, Gemini and Ollama', () => {
    const models = registry.listModels()
    expect(models.length).toBeGreaterThan(5)

    const gpt4o = registry.getModel('gpt-4o')
    expect(gpt4o).toBeDefined()
    expect(gpt4o?.capabilities.streaming).toBe(true)
    expect(gpt4o?.capabilities.toolCalling).toBe(true)

    const claude = registry.getModel('claude-3-5-sonnet')
    expect(claude).toBeDefined()
    expect(claude?.capabilities.contextWindow).toBe(200000)

    const gemini = registry.getModel('gemini-2.0-flash')
    expect(gemini).toBeDefined()
    expect(gemini?.capabilities.contextWindow).toBe(1048576)

    const ollama = registry.getModel('qwen2.5-coder:7b')
    expect(ollama).toBeDefined()
    expect(ollama?.isLocal).toBe(true)
  })

  it('validates capabilities and returns explanations for unsupported features', () => {
    const valid = registry.validateCapability('gpt-4o', 'toolCalling')
    expect(valid.supported).toBe(true)

    const invalid = registry.validateCapability('deepseek-r1:8b', 'toolCalling')
    expect(invalid.supported).toBe(false)
    expect(invalid.reason).toContain('does not support')
  })

  it('selects recommended models per feature', () => {
    const fast = registry.getRecommendedModel('fast')
    expect(['gpt-4o-mini', 'claude-3-5-haiku', 'gemini-2.0-flash']).toContain(fast.id)

    const orch = registry.getRecommendedModel('orchestration')
    expect(['claude-3-7-sonnet', 'gpt-4o', 'claude-3-5-sonnet']).toContain(orch.id)
  })
})

describe('AI Provider Gateway & Error Normalization', () => {
  it('normalizes 401/403 to AUTH_FAILED with actionable suggestions', () => {
    const err = normalizeError(new Error('Incorrect API key provided'), 401)
    expect(err.code).toBe('AUTH_FAILED')
    expect(err.retryable).toBe(false)
    expect(err.suggestedFix).toContain('Settings -> AI Providers')
  })

  it('normalizes 429 to RATE_LIMITED with retryable flag', () => {
    const err = normalizeError(new Error('Rate limit reached for requests'), 429)
    expect(err.code).toBe('RATE_LIMITED')
    expect(err.retryable).toBe(true)
  })

  it('normalizes network errors to NETWORK_ERROR', () => {
    const err = normalizeError(new Error('fetch failed: connect ECONNREFUSED 127.0.0.1:11434'))
    expect(err.code).toBe('NETWORK_ERROR')
    expect(err.retryable).toBe(true)
  })

  it('supports streaming and cancellation through AbortController', async () => {
    const gateway = new AiProviderGateway()

    // Test cancellation
    const streamId = 'stream_test_cancel'
    const abortSpy = vi.fn()

    // Setup an artificial slow stream mock
    const mockAdapter = {
      id: 'mock',
      name: 'Mock',
      testConnection: async () => ({ ok: true }),
      chatStream: async (
        _config: any,
        _key: any,
        _req: any,
        onChunk: (chunk: AiStreamChunk) => void,
        signal: AbortSignal
      ) => {
        onChunk({ deltaText: 'Hello' })
        return new Promise<any>((resolve, reject) => {
          signal.addEventListener('abort', () => {
            abortSpy()
            const err = new Error('aborted')
            err.name = 'AbortError'
            reject(err)
          })
        })
      }
    }

    ;(gateway as any).adapters.set('mock-type', mockAdapter)
    gateway.setProviderConfig({
      id: 'mock-prov',
      name: 'Mock Provider',
      type: 'mock-type' as any,
      enabled: true,
      isLocal: true
    })

    let chunkReceivedResolve: () => void
    const chunkReceived = new Promise<void>((r) => {
      chunkReceivedResolve = r
    })

    const streamPromise = gateway.chatStream(
      {
        providerId: 'mock-prov',
        modelId: 'mock-model',
        messages: [{ role: 'user', content: 'test' }]
      },
      () => {
        chunkReceivedResolve()
      },
      streamId
    )

    // Wait until stream has delivered a chunk and is active
    await chunkReceived
    const cancelled = gateway.cancelStream(streamId)
    expect(cancelled).toBe(true)

    await expect(streamPromise).rejects.toThrow()
    expect(abortSpy).toHaveBeenCalled()
  })
})

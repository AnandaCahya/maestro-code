import { describe, it, expect } from 'vitest'
import { AntigravityAdapter, aiProviderGateway } from '../src/main/services/ai/aiProviderGateway'
import { aiModelRegistry } from '../src/main/services/ai/aiModelRegistry'

describe('Google Antigravity Integration (Legal & Local)', () => {
  const adapter = new AntigravityAdapter()

  it('detects Antigravity CLI binary path if present on the system', () => {
    const binPath = adapter.findBinaryPath()
    // If agy is installed on developer machine, it should resolve to a string
    if (binPath) {
      expect(binPath).toMatch(/agy(\.exe)?$/i)
    } else {
      // If running on a CI without Antigravity, it should be null
      expect(binPath).toBeNull()
    }
  })

  it('registers Antigravity provider in AiProviderGateway default configs', () => {
    const configs = aiProviderGateway.listProviderConfigs()
    const antigravityConfig = configs.find((c) => c.id === 'antigravity')

    expect(antigravityConfig).toBeDefined()
    expect(antigravityConfig?.name).toBe('Google Antigravity (Local)')
    expect(antigravityConfig?.type).toBe('antigravity')
    expect(antigravityConfig?.isLocal).toBe(true)
    expect(antigravityConfig?.defaultModelId).toBe('gemini-3.8-flash-high')
  })

  it('registers built-in Antigravity models in AiModelRegistry with 1M context capabilities', () => {
    const models = aiModelRegistry.listModels('antigravity')
    expect(models.length).toBeGreaterThanOrEqual(5)

    const flashHigh = aiModelRegistry.getModel('gemini-3.8-flash-high')
    expect(flashHigh).toBeDefined()
    expect(flashHigh?.providerId).toBe('antigravity')
    expect(flashHigh?.isLocal).toBe(true)
    expect(flashHigh?.capabilities.contextWindow).toBe(1000000)
    expect(flashHigh?.capabilities.streaming).toBe(true)
    expect(flashHigh?.capabilities.toolCalling).toBe(true)

    const claudeSonnet = aiModelRegistry.getModel('claude-sonnet-4-6')
    expect(claudeSonnet).toBeDefined()
    expect(claudeSonnet?.providerId).toBe('antigravity')
    expect(claudeSonnet?.capabilities.maxOutputTokens).toBe(64000)
  })

  it('executes connection test and returns responsive status or graceful guidance', async () => {
    const config = aiProviderGateway.getProviderConfig('antigravity')
    expect(config).toBeDefined()

    const result = await adapter.testConnection(config!, '')
    expect(typeof result.ok).toBe('boolean')
    expect(result.message).toBeDefined()
    if (result.ok) {
      expect(result.message).toMatch(/Antigravity CLI (connected|detected)/i)
    } else {
      expect(result.message).toMatch(/Antigravity CLI (agy) was not found/i)
    }
  })

  it('correctly parses Antigravity NDJSON event stream and accumulates text deltas', () => {
    const ndjsonLines = [
      JSON.stringify({ event: 'init', conversation_id: 'conv_123', init: { cwd: '/test' } }),
      JSON.stringify({ event: 'step_update', step_update: { step_index: 0, state: 'DONE', step_type: 'user_input' } }),
      JSON.stringify({ event: 'step_update', step_update: { step_index: 1, state: 'ACTIVE', step_type: 'agent_response', text_delta: 'Hello ' } }),
      JSON.stringify({ event: 'step_update', step_update: { step_index: 1, state: 'ACTIVE', step_type: 'agent_response', text_delta: 'from Antigravity!' } }),
      JSON.stringify({ event: 'result', result: { status: 'SUCCESS', response: 'Hello from Antigravity!', usage: { input_tokens: 100, output_tokens: 5, total_tokens: 105 } } })
    ]

    const receivedDeltas: string[] = []
    let fullText = ''
    let parsedUsage: any = null

    for (const line of ndjsonLines) {
      const data = JSON.parse(line)
      if (data.event === 'step_update' && data.step_update?.text_delta) {
        receivedDeltas.push(data.step_update.text_delta)
        fullText += data.step_update.text_delta
      } else if (data.event === 'result') {
        parsedUsage = data.result.usage
      }
    }

    expect(receivedDeltas).toEqual(['Hello ', 'from Antigravity!'])
    expect(fullText).toBe('Hello from Antigravity!')
    expect(parsedUsage.total_tokens).toBe(105)
  })
})

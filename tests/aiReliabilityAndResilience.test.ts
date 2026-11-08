import { describe, it, expect } from 'vitest'
import { AiProviderGateway, normalizeError } from '../src/main/services/ai/aiProviderGateway'
import { AiModelRegistry } from '../src/main/services/ai/aiModelRegistry'
import { AiConversationService } from '../src/main/services/ai/aiConversationService'
import { AiEvaluationService } from '../src/main/services/ai/aiEvaluationService'
import { AiFineTuningService } from '../src/main/services/ai/aiFineTuningService'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

describe('AI Reliability, Resilience & Evaluation Tests (Phase G2 & F)', () => {
  it('G2.1: categorizes network timeouts and rate limits cleanly as retryable', () => {
    const timeoutErr = normalizeError(new Error('ESOCKETTIMEDOUT waiting for provider'), 408)
    expect(timeoutErr.code).toBe('TIMEOUT')
    expect(timeoutErr.retryable).toBe(true)

    const rateLimitErr = normalizeError(new Error('Rate limit exceeded: quota 0'), 429)
    expect(rateLimitErr.code).toBe('RATE_LIMITED')
    expect(rateLimitErr.retryable).toBe(true)

    const connRefused = normalizeError(new Error('connect ECONNREFUSED 127.0.0.1:11434'))
    expect(connRefused.code).toBe('NETWORK_ERROR')
    expect(connRefused.retryable).toBe(true)
  })

  it('G2.2: detects capability mismatch and provides actionable limitations', () => {
    const registry = new AiModelRegistry()
    const result = registry.validateCapability('deepseek-r1:8b', 'toolCalling')

    expect(result.supported).toBe(false)
    expect(result.reason).toContain('does not support')
  })

  it('G2.3: survives corrupted conversation files gracefully without crashing', async () => {
    const tempDir = path.join(os.tmpdir(), `corrupt-test-${Date.now()}`)
    await fs.mkdir(tempDir, { recursive: true })

    // Write a corrupt json file
    await fs.writeFile(path.join(tempDir, 'corrupt.json'), '{ broken: json [[] ', 'utf8')
    const convService = new AiConversationService(tempDir)

    // Should return null for corrupt id and not crash
    const res = await convService.getConversation('corrupt')
    expect(res).toBeNull()

    // listConversations should skip corrupt files
    const list = await convService.listConversations()
    expect(list).toHaveLength(0)
  })

  it('F1: runs synthetic benchmark evaluation and calculates model metrics', () => {
    const evalService = new AiEvaluationService()
    const suite = evalService.getBenchmarkSuite()
    expect(suite.length).toBeGreaterThanOrEqual(4)

    // Test a good response
    const goodResult = evalService.evaluateResponse(
      suite[0],
      'The empty dependency array [] tells React to run the effect only on initial mount and cleanup on unmount.',
      240,
      45
    )
    expect(goodResult.passed).toBe(true)
    expect(goodResult.score).toBe(1.0)

    // Test a response missing required keywords
    const poorResult = evalService.evaluateResponse(
      suite[0],
      'I do not know why it behaves that way.',
      300,
      10
    )
    expect(poorResult.passed).toBe(false)
    expect(poorResult.score).toBeLessThan(1.0)

    // Record summary
    const summary = evalService.recordBenchmarkRun('gpt-4o', [goodResult, poorResult])
    expect(summary.totalTests).toBe(2)
    expect(summary.passedTests).toBe(1)
    expect(summary.accuracyRate).toBe(50)
  })

  it('F2: enforces dataset licensing and explicit opt-in for fine-tuning', () => {
    const ftService = new AiFineTuningService()

    // Attempt without opt-in
    const noOptIn = ftService.validateDataset(
      [
        { messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] },
        { messages: [{ role: 'user', content: 'q2' }, { role: 'assistant', content: 'a2' }] },
        { messages: [{ role: 'user', content: 'q3' }, { role: 'assistant', content: 'a3' }] },
        { messages: [{ role: 'user', content: 'q4' }, { role: 'assistant', content: 'a4' }] },
        { messages: [{ role: 'user', content: 'q5' }, { role: 'assistant', content: 'a5' }] }
      ],
      'MIT',
      false // No opt-in
    )
    expect(noOptIn.valid).toBe(false)
    expect(noOptIn.errors.some((e) => e.includes('Explicit user opt-in is required'))).toBe(true)

    // Valid dataset with opt-in
    const valid = ftService.validateDataset(
      [
        { messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] },
        { messages: [{ role: 'user', content: 'q2' }, { role: 'assistant', content: 'a2' }] },
        { messages: [{ role: 'user', content: 'q3' }, { role: 'assistant', content: 'a3' }] },
        { messages: [{ role: 'user', content: 'q4' }, { role: 'assistant', content: 'a4' }] },
        { messages: [{ role: 'user', content: 'q5' }, { role: 'assistant', content: 'a5' }] }
      ],
      'Apache-2.0',
      true
    )
    expect(valid.valid).toBe(true)

    // Create and complete fine-tuning job
    const jobRes = ftService.createJob(
      'openai',
      'gpt-4o-mini',
      'unit_tests_dataset',
      [
        { messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] },
        { messages: [{ role: 'user', content: 'q2' }, { role: 'assistant', content: 'a2' }] },
        { messages: [{ role: 'user', content: 'q3' }, { role: 'assistant', content: 'a3' }] },
        { messages: [{ role: 'user', content: 'q4' }, { role: 'assistant', content: 'a4' }] },
        { messages: [{ role: 'user', content: 'q5' }, { role: 'assistant', content: 'a5' }] }
      ],
      'Apache-2.0',
      true
    )
    expect(jobRes.ok).toBe(true)
    expect(jobRes.job?.status).toBe('queued')

    ftService.completeJob(jobRes.job!.id, 'ft:gpt-4o-mini:org:v1')
    const completed = ftService.getJob(jobRes.job!.id)
    expect(completed?.status).toBe('succeeded')
    expect(completed?.fineTunedModelId).toBe('ft:gpt-4o-mini:org:v1')
  })
})

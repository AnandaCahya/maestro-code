import type {
  AiProviderConfig,
  AiChatRequest,
  AiChatResponse,
  AiStreamChunk,
  AiModelInfo,
  NormalizedAiError,
  AiErrorCode,
  AiModelCapability
} from './aiTypes'
import { aiCredentialsService } from './aiCredentialsService'
import { aiModelRegistry } from './aiModelRegistry'
import { spawn, execFile } from 'child_process'
import path from 'path'
import os from 'os'
import fs from 'fs'

export interface IAiProviderAdapter {
  id: string
  name: string
  testConnection(config: AiProviderConfig, apiKey: string): Promise<{ ok: boolean; message?: string; models?: AiModelInfo[] }>
  chatStream(
    config: AiProviderConfig,
    apiKey: string,
    request: AiChatRequest,
    onChunk: (chunk: AiStreamChunk) => void,
    signal: AbortSignal
  ): Promise<AiChatResponse>
}

export function normalizeError(err: any, status?: number): NormalizedAiError {
  const errMsg = err?.message || String(err)
  const statusNum = status || err?.status || err?.statusCode

  if (statusNum === 401 || statusNum === 403 || /api[ _-]?key|unauthorized|forbidden|credentials/i.test(errMsg)) {
    return {
      code: 'AUTH_FAILED',
      message: 'Authentication failed. Please verify your API key in AI Settings.',
      providerMessage: errMsg,
      status: statusNum,
      retryable: false,
      suggestedFix: 'Open Settings -> AI Providers and re-enter or test your API key.'
    }
  }

  if (statusNum === 429 || /rate limit|too many requests|quota/i.test(errMsg)) {
    return {
      code: 'RATE_LIMITED',
      message: 'Rate limit or quota exceeded for the chosen provider.',
      providerMessage: errMsg,
      status: statusNum,
      retryable: true,
      suggestedFix: 'Wait a few moments or switch to another provider/model in the model selector.'
    }
  }

  if (err?.name === 'AbortError' || /aborted/i.test(errMsg)) {
    return {
      code: 'UNKNOWN',
      message: 'Request was cancelled.',
      providerMessage: errMsg,
      retryable: false
    }
  }

  if (statusNum === 408 || /timeout|etimedout|esockettimedout/i.test(errMsg)) {
    return {
      code: 'TIMEOUT',
      message: 'Request timed out waiting for the provider response.',
      providerMessage: errMsg,
      status: statusNum,
      retryable: true,
      suggestedFix: 'Check your internet connection or increase the timeout setting.'
    }
  }

  if (statusNum === 404 || /model[ _-]?not[ _-]?found|unknown model/i.test(errMsg)) {
    return {
      code: 'MODEL_NOT_FOUND',
      message: 'The requested model was not found on this provider.',
      providerMessage: errMsg,
      status: statusNum,
      retryable: false,
      suggestedFix: 'Select an available model from the model registry dropdown.'
    }
  }

  if (/context length|maximum context|token limit/i.test(errMsg)) {
    return {
      code: 'CONTEXT_LENGTH_EXCEEDED',
      message: 'Context length exceeded the model’s context window.',
      providerMessage: errMsg,
      status: statusNum,
      retryable: false,
      suggestedFix: 'Remove some attached files or clear conversation history.'
    }
  }

  if (/econnrefused|enotfound|network|fetch failed/i.test(errMsg)) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection error or endpoint unreachable.',
      providerMessage: errMsg,
      status: statusNum,
      retryable: true,
      suggestedFix: 'Check that your local inference server (e.g. Ollama) is running or verify your network connection.'
    }
  }

  return {
    code: 'UNKNOWN',
    message: errMsg || 'An unexpected AI provider error occurred.',
    providerMessage: errMsg,
    status: statusNum,
    retryable: statusNum ? statusNum >= 500 : false
  }
}

// ---------------------------------------------------------
// Adapters
// ---------------------------------------------------------

export class OpenAICompatibleAdapter implements IAiProviderAdapter {
  id = 'openai-compatible'
  name = 'OpenAI Compatible'

  async testConnection(
    config: AiProviderConfig,
    apiKey: string
  ): Promise<{ ok: boolean; message?: string; models?: AiModelInfo[] }> {
    const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')
    try {
      const resp = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...(config.organization ? { 'OpenAI-Organization': config.organization } : {})
        }
      })
      if (!resp.ok) {
        const body = await resp.text().catch(() => '')
        return { ok: false, message: `HTTP ${resp.status}: ${body}` }
      }
      const data = await resp.json()
      const models: AiModelInfo[] = []
      if (Array.isArray(data.data)) {
        for (const item of data.data.slice(0, 50)) {
          models.push({
            id: item.id,
            name: item.id,
            providerId: config.id,
            isLocal: config.isLocal,
            capabilities: {
              streaming: true,
              toolCalling: true,
              structuredOutput: true,
              contextWindow: 128000,
              vision: false,
              codeCompletion: true
            }
          })
        }
      }
      return { ok: true, message: 'Connected successfully', models }
    } catch (err: any) {
      return { ok: false, message: err.message || 'Connection failed' }
    }
  }

  async chatStream(
    config: AiProviderConfig,
    apiKey: string,
    request: AiChatRequest,
    onChunk: (chunk: AiStreamChunk) => void,
    signal: AbortSignal
  ): Promise<AiChatResponse> {
    const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')
    const messages = [...request.messages]
    if (request.systemPrompt && !messages.some((m) => m.role === 'system')) {
      messages.unshift({ role: 'system', content: request.systemPrompt })
    }

    const payload: Record<string, any> = {
      model: request.modelId,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
        ...(m.toolCalls ? { tool_calls: m.toolCalls } : {})
      })),
      stream: true,
      temperature: request.temperature ?? 0.4
    }

    if (request.maxTokens) payload.max_tokens = request.maxTokens
    if (request.tools && request.tools.length > 0) {
      payload.tools = request.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }))
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(config.organization ? { 'OpenAI-Organization': config.organization } : {})
      },
      body: JSON.stringify(payload),
      signal
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      throw normalizeError(new Error(errBody || response.statusText), response.status)
    }

    if (!response.body) {
      throw new Error('Empty response body received from provider')
    }

    let fullText = ''
    let finishReason: string | undefined
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) continue
          if (trimmed === 'data: [DONE]') continue
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6))
              const choice = parsed.choices?.[0]
              if (choice) {
                const delta = choice.delta?.content || ''
                if (delta) {
                  fullText += delta
                  onChunk({ deltaText: delta })
                }
                if (choice.finish_reason) {
                  finishReason = choice.finish_reason
                }
              }
            } catch {
              // Ignore partial parse
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return {
      message: { role: 'assistant', content: fullText },
      finishReason
    }
  }
}

export class AnthropicAdapter implements IAiProviderAdapter {
  id = 'anthropic'
  name = 'Anthropic'

  async testConnection(
    config: AiProviderConfig,
    apiKey: string
  ): Promise<{ ok: boolean; message?: string }> {
    const baseUrl = (config.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '')
    try {
      // Test with minimal messages request
      const resp = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        })
      })
      if (resp.status === 200 || resp.status === 400) {
        // Even if bad request (e.g. invalid test param), 401/403 would show auth failure
        if (resp.status === 401 || resp.status === 403) {
          return { ok: false, message: 'Invalid Anthropic API Key' }
        }
        return { ok: true, message: 'Anthropic API credentials valid' }
      }
      return { ok: false, message: `Status ${resp.status}` }
    } catch (err: any) {
      return { ok: false, message: err.message || 'Connection failed' }
    }
  }

  async chatStream(
    config: AiProviderConfig,
    apiKey: string,
    request: AiChatRequest,
    onChunk: (chunk: AiStreamChunk) => void,
    signal: AbortSignal
  ): Promise<AiChatResponse> {
    const baseUrl = (config.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '')
    const systemPrompt = request.systemPrompt || ''
    const userMessages = request.messages.filter((m) => m.role !== 'system')

    const payload: Record<string, any> = {
      model: request.modelId,
      max_tokens: request.maxTokens ?? 4096,
      messages: userMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      stream: true,
      ...(systemPrompt ? { system: systemPrompt } : {})
    }

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload),
      signal
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      throw normalizeError(new Error(errBody || response.statusText), response.status)
    }

    if (!response.body) {
      throw new Error('Empty response body received from Anthropic')
    }

    let fullText = ''
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          try {
            const data = JSON.parse(trimmed.slice(6))
            if (data.type === 'content_block_delta' && data.delta?.text) {
              const delta = data.delta.text
              fullText += delta
              onChunk({ deltaText: delta })
            }
          } catch {
            // Partial
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return {
      message: { role: 'assistant', content: fullText }
    }
  }
}

export class GeminiAdapter implements IAiProviderAdapter {
  id = 'gemini'
  name = 'Google Gemini'

  async testConnection(
    config: AiProviderConfig,
    apiKey: string
  ): Promise<{ ok: boolean; message?: string }> {
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta'
    try {
      const resp = await fetch(`${baseUrl}/models?key=${encodeURIComponent(apiKey)}`)
      if (!resp.ok) {
        return { ok: false, message: `HTTP ${resp.status}` }
      }
      return { ok: true, message: 'Google Gemini connected successfully' }
    } catch (err: any) {
      return { ok: false, message: err.message || 'Connection failed' }
    }
  }

  async chatStream(
    config: AiProviderConfig,
    apiKey: string,
    request: AiChatRequest,
    onChunk: (chunk: AiStreamChunk) => void,
    signal: AbortSignal
  ): Promise<AiChatResponse> {
    const model = request.modelId.startsWith('gemini') ? request.modelId : 'gemini-2.0-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`

    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))

    const body: Record<string, any> = { contents }
    if (request.systemPrompt) {
      body.systemInstruction = { parts: [{ text: request.systemPrompt }] }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      throw normalizeError(new Error(errBody || response.statusText), response.status)
    }

    if (!response.body) throw new Error('Empty response body received from Gemini')

    let fullText = ''
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          try {
            const data = JSON.parse(trimmed.slice(6))
            const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text
            if (textPart) {
              fullText += textPart
              onChunk({ deltaText: textPart })
            }
          } catch {
            // Partial
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return {
      message: { role: 'assistant', content: fullText }
    }
  }
}

export class OllamaAdapter implements IAiProviderAdapter {
  id = 'ollama'
  name = 'Ollama (Local)'

  async testConnection(
    config: AiProviderConfig,
    _apiKey: string
  ): Promise<{ ok: boolean; message?: string; models?: AiModelInfo[] }> {
    const baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/+$/, '')
    try {
      const resp = await fetch(`${baseUrl}/api/tags`)
      if (!resp.ok) {
        return { ok: false, message: `Ollama returned HTTP ${resp.status}` }
      }
      const data = await resp.json()
      const models: AiModelInfo[] = []
      if (Array.isArray(data.models)) {
        for (const m of data.models) {
          models.push({
            id: m.name,
            name: m.name,
            providerId: 'ollama',
            isLocal: true,
            capabilities: {
              streaming: true,
              toolCalling: true,
              structuredOutput: true,
              contextWindow: 32768,
              vision: false,
              codeCompletion: true
            }
          })
        }
      }
      return { ok: true, message: `Connected to Ollama (${models.length} models detected)`, models }
    } catch (err: any) {
      return { ok: false, message: `Cannot connect to Ollama at ${baseUrl}: ${err.message}` }
    }
  }

  async chatStream(
    config: AiProviderConfig,
    _apiKey: string,
    request: AiChatRequest,
    onChunk: (chunk: AiStreamChunk) => void,
    signal: AbortSignal
  ): Promise<AiChatResponse> {
    const baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/+$/, '')
    const messages = [...request.messages]
    if (request.systemPrompt && !messages.some((m) => m.role === 'system')) {
      messages.unshift({ role: 'system', content: request.systemPrompt })
    }

    const payload = {
      model: request.modelId,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      stream: true
    }

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      throw normalizeError(new Error(errBody || response.statusText), response.status)
    }

    if (!response.body) throw new Error('Empty response from Ollama')

    let fullText = ''
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const data = JSON.parse(trimmed)
            const delta = data.message?.content || ''
            if (delta) {
              fullText += delta
              onChunk({ deltaText: delta })
            }
          } catch {
            // Partial
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return {
      message: { role: 'assistant', content: fullText }
    }
  }
}

// ---------------------------------------------------------
// Antigravity Local CLI Adapter
// ---------------------------------------------------------

export class AntigravityAdapter implements IAiProviderAdapter {
  public id = 'antigravity'
  public name = 'Google Antigravity'

  public findBinaryPath(): string | null {
    if (process.env.ANTIGRAVITY_BIN && fs.existsSync(process.env.ANTIGRAVITY_BIN)) {
      return process.env.ANTIGRAVITY_BIN
    }

    const home = os.homedir()
    const exeName = process.platform === 'win32' ? 'agy.exe' : 'agy'
    const defaultGeminiPath = path.join(home, '.gemini', 'bin', exeName)
    if (fs.existsSync(defaultGeminiPath)) {
      return defaultGeminiPath
    }

    if (process.platform === 'win32') {
      const localApp = process.env.LOCALAPPDATA
      if (localApp) {
        const localAgy = path.join(localApp, 'Google', 'Antigravity', 'bin', 'agy.exe')
        if (fs.existsSync(localAgy)) return localAgy
      }
    }

    return null
  }

  public async testConnection(
    _config: AiProviderConfig,
    _apiKey: string
  ): Promise<{ ok: boolean; message?: string; models?: AiModelInfo[] }> {
    const bin = this.findBinaryPath()
    if (!bin) {
      return {
        ok: false,
        message: 'Antigravity CLI (agy) was not found in ~/.gemini/bin or standard system paths.'
      }
    }

    return new Promise((resolve) => {
      execFile(bin, ['models'], { timeout: 6000 }, (err, stdout) => {
        if (err) {
          execFile(bin, ['--help'], { timeout: 3000 }, (helpErr) => {
            if (helpErr) {
              resolve({
                ok: false,
                message: `Failed to execute Antigravity CLI binary at ${bin}: ${helpErr.message}`
              })
            } else {
              resolve({
                ok: true,
                message: `Antigravity CLI detected at ${bin} (binary responsive)`
              })
            }
          })
          return
        }

        const lines = stdout.split('\n')
        const models: AiModelInfo[] = []
        for (const line of lines) {
          const parts = line.trim().split('\t')
          if (parts.length >= 2 && !parts[0].startsWith('Fetching')) {
            const modelId = parts[0].trim()
            const modelName = parts[1].trim()
            const isClaude = modelId.includes('claude')
            const isFlash = modelId.includes('flash')
            const modelInfo: AiModelInfo = {
              id: modelId,
              name: `${modelName} (Antigravity)`,
              providerId: 'antigravity',
              isLocal: true,
              capabilities: {
                streaming: true,
                toolCalling: true,
                structuredOutput: true,
                contextWindow: isFlash ? 1000000 : 200000,
                maxOutputTokens: isClaude ? 64000 : 32768,
                vision: true,
                codeCompletion: true
              },
              description: `Model provided locally via Google Antigravity CLI (${modelId})`
            }
            models.push(modelInfo)
            aiModelRegistry.registerModel(modelInfo)
          }
        }

        resolve({
          ok: true,
          message: `Antigravity CLI connected (${models.length > 0 ? models.length + ' models discovered' : 'ready'})`,
          models: models.length > 0 ? models : undefined
        })
      })
    })
  }

  public async chatStream(
    _config: AiProviderConfig,
    _apiKey: string,
    request: AiChatRequest,
    onChunk: (chunk: AiStreamChunk) => void,
    signal: AbortSignal
  ): Promise<AiChatResponse> {
    const bin = this.findBinaryPath()
    if (!bin) {
      throw new Error(
        'Google Antigravity CLI (agy) is not installed or not found. Install Antigravity or verify ~/.gemini/bin/agy.'
      )
    }

    let prompt = ''
    if (request.messages.length === 1) {
      prompt = request.messages[0].content
    } else {
      const parts: string[] = []
      for (const m of request.messages) {
        if (m.role === 'system') {
          parts.push(`[System Instructions]: ${m.content}\n`)
        } else if (m.role === 'user') {
          parts.push(`User: ${m.content}\n`)
        } else if (m.role === 'assistant') {
          parts.push(`Assistant: ${m.content}\n`)
        }
      }
      parts.push('Assistant: ')
      prompt = parts.join('\n')
    }

    const args = ['-p', prompt, '--output-format', 'stream-json']
    if (request.modelId) {
      args.push('--model', request.modelId)
    }

    return new Promise<AiChatResponse>((resolve, reject) => {
      const child = spawn(bin, args, {
        cwd: request.context?.workspacePath || process.cwd(),
        windowsHide: true
      })

      let fullText = ''
      let buffer = ''
      let usage: any = undefined
      let isAborted = false

      const abortHandler = () => {
        isAborted = true
        try {
          child.kill('SIGTERM')
        } catch {}
        reject(new Error('Antigravity request was cancelled.'))
      }

      signal.addEventListener('abort', abortHandler)

      child.stdout.on('data', (chunk: Buffer) => {
        if (isAborted) return
        buffer += chunk.toString('utf-8')
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const data = JSON.parse(trimmed)
            if (data.event === 'step_update' && data.step_update?.text_delta) {
              const delta = data.step_update.text_delta
              fullText += delta
              onChunk({ deltaText: delta })
            } else if (data.event === 'result') {
              if (data.result?.usage) {
                usage = data.result.usage
              }
              if (!fullText && data.result?.response) {
                fullText = data.result.response
                onChunk({ deltaText: fullText })
              }
            }
          } catch {
            // Partial or non-JSON chunk
          }
        }
      })

      child.stderr.on('data', (chunk: Buffer) => {
        const str = chunk.toString('utf-8')
        if (/error/i.test(str)) {
          console.warn('[Antigravity CLI stderr]', str)
        }
      })

      child.on('error', (err) => {
        signal.removeEventListener('abort', abortHandler)
        reject(err)
      })

      child.on('close', (code) => {
        signal.removeEventListener('abort', abortHandler)
        if (isAborted) return

        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer.trim())
            if (data.event === 'step_update' && data.step_update?.text_delta) {
              const delta = data.step_update.text_delta
              fullText += delta
              onChunk({ deltaText: delta })
            } else if (data.event === 'result' && data.result?.response && !fullText) {
              fullText = data.result.response
              onChunk({ deltaText: fullText })
            }
          } catch {}
        }

        if (code !== 0 && !fullText) {
          reject(new Error(`Antigravity CLI process exited with code ${code}`))
          return
        }

        resolve({
          message: { role: 'assistant', content: fullText },
          usage: usage
            ? {
                promptTokens: usage.input_tokens || 0,
                completionTokens: usage.output_tokens || 0,
                totalTokens: usage.total_tokens || 0
              }
            : undefined
        })
      })
    })
  }
}

// ---------------------------------------------------------
// Gateway Service
// ---------------------------------------------------------

export class AiProviderGateway {
  private adapters: Map<string, IAiProviderAdapter> = new Map()
  private providerConfigs: Map<string, AiProviderConfig> = new Map()
  private activeStreams: Map<string, AbortController> = new Map()
  private globalAiEnabled = true

  constructor() {
    this.registerDefaultAdapters()
    this.registerDefaultConfigs()
  }

  private registerDefaultAdapters(): void {
    const openai = new OpenAICompatibleAdapter()
    const anthropic = new AnthropicAdapter()
    const gemini = new GeminiAdapter()
    const ollama = new OllamaAdapter()
    const antigravity = new AntigravityAdapter()

    this.adapters.set('openai-compatible', openai)
    this.adapters.set('openai', openai)
    this.adapters.set('anthropic', anthropic)
    this.adapters.set('gemini', gemini)
    this.adapters.set('ollama', ollama)
    this.adapters.set('antigravity', antigravity)
    this.adapters.set('custom', openai)
  }

  private registerDefaultConfigs(): void {
    const configs: AiProviderConfig[] = [
      {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai-compatible',
        baseUrl: 'https://api.openai.com/v1',
        enabled: true,
        timeoutMs: 60000,
        defaultModelId: 'gpt-4o'
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        type: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        enabled: true,
        timeoutMs: 60000,
        defaultModelId: 'claude-3-5-sonnet'
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        type: 'gemini',
        baseUrl: 'https://generativelanguage.googleapis.com',
        enabled: true,
        timeoutMs: 60000,
        defaultModelId: 'gemini-2.0-flash'
      },
      {
        id: 'antigravity',
        name: 'Google Antigravity (Local)',
        type: 'antigravity',
        baseUrl: 'local://~/.gemini/bin/agy',
        enabled: true,
        timeoutMs: 120000,
        isLocal: true,
        defaultModelId: 'gemini-3.8-flash-high'
      },
      {
        id: 'ollama',
        name: 'Ollama (Local)',
        type: 'ollama',
        baseUrl: 'http://localhost:11434',
        enabled: true,
        timeoutMs: 90000,
        isLocal: true,
        defaultModelId: 'qwen2.5-coder:7b'
      },
      {
        id: 'custom',
        name: 'Custom OpenAI-Compatible',
        type: 'custom',
        baseUrl: 'http://localhost:1234/v1',
        enabled: false,
        timeoutMs: 60000,
        isLocal: true
      }
    ]

    for (const c of configs) {
      this.providerConfigs.set(c.id, c)
    }
  }

  public setGlobalAiEnabled(enabled: boolean): void {
    this.globalAiEnabled = enabled
  }

  public isGlobalAiEnabled(): boolean {
    return this.globalAiEnabled
  }

  public getProviderConfig(id: string): AiProviderConfig | undefined {
    return this.providerConfigs.get(id)
  }

  public listProviderConfigs(): AiProviderConfig[] {
    return Array.from(this.providerConfigs.values())
  }

  public setProviderConfig(config: AiProviderConfig): void {
    this.providerConfigs.set(config.id, config)
  }

  public async testProviderConnection(
    providerId: string,
    apiKeyOverride?: string
  ): Promise<{ ok: boolean; message?: string; models?: AiModelInfo[] }> {
    const config = this.getProviderConfig(providerId)
    if (!config) {
      return { ok: false, message: `Unknown provider '${providerId}'` }
    }

    const adapter = this.adapters.get(config.type) || this.adapters.get(config.id)
    if (!adapter) {
      return { ok: false, message: `No adapter found for provider type '${config.type}'` }
    }

    const key = apiKeyOverride !== undefined ? apiKeyOverride : (await aiCredentialsService.getCredential(providerId)) || ''
    if (!config.isLocal && !key) {
      return { ok: false, message: `No API key configured for ${config.name}. Please enter your key first.` }
    }

    try {
      const result = await adapter.testConnection(config, key)
      if (result.models && result.models.length > 0) {
        for (const m of result.models) {
          aiModelRegistry.registerModel(m)
        }
      }
      return result
    } catch (err: any) {
      return { ok: false, message: err.message || 'Connection test failed' }
    }
  }

  public async chatStream(
    request: AiChatRequest,
    onChunk: (chunk: AiStreamChunk) => void,
    streamId: string = `stream_${Date.now()}`
  ): Promise<AiChatResponse> {
    if (!this.globalAiEnabled) {
      const error: NormalizedAiError = {
        code: 'AI_DISABLED',
        message: 'AI features are disabled in workspace settings.',
        retryable: false,
        suggestedFix: 'Enable AI in Settings -> AI Privacy to use this feature.'
      }
      onChunk({ deltaText: '', error })
      throw error
    }

    const config = this.getProviderConfig(request.providerId)
    if (!config) {
      const error: NormalizedAiError = {
        code: 'INVALID_REQUEST',
        message: `Provider '${request.providerId}' is not configured.`,
        retryable: false
      }
      onChunk({ deltaText: '', error })
      throw error
    }

    if (!config.enabled) {
      const error: NormalizedAiError = {
        code: 'PROVIDER_DISABLED',
        message: `Provider '${config.name}' is currently disabled in settings.`,
        retryable: false
      }
      onChunk({ deltaText: '', error })
      throw error
    }

    const adapter = this.adapters.get(config.type) || this.adapters.get(config.id)
    if (!adapter) {
      const error: NormalizedAiError = {
        code: 'INVALID_REQUEST',
        message: `No adapter available for type '${config.type}'.`,
        retryable: false
      }
      onChunk({ deltaText: '', error })
      throw error
    }

    // Verify capability if tool calling is requested
    if (request.tools && request.tools.length > 0) {
      const cap = aiModelRegistry.validateCapability(request.modelId, 'toolCalling')
      if (!cap.supported) {
        const error: NormalizedAiError = {
          code: 'UNSUPPORTED_CAPABILITY',
          message: cap.reason || 'Model does not support tool calling.',
          retryable: false
        }
        onChunk({ deltaText: '', error })
        throw error
      }
    }

    // Setup abort controller and timeout immediately
    const abortController = new AbortController()
    this.activeStreams.set(streamId, abortController)
    const timeoutMs = config.timeoutMs || 60000
    const timeoutTimer = setTimeout(() => {
      abortController.abort(new Error(`AI Request timed out after ${timeoutMs / 1000}s`))
    }, timeoutMs)

    const apiKey = (await aiCredentialsService.getCredential(request.providerId)) || ''
    if (!config.isLocal && !apiKey) {
      clearTimeout(timeoutTimer)
      this.activeStreams.delete(streamId)
      const error: NormalizedAiError = {
        code: 'AUTH_FAILED',
        message: `Missing API key for '${config.name}'. Please configure your key in AI Settings.`,
        retryable: false,
        suggestedFix: 'Open Settings -> AI Providers and add an API key.'
      }
      onChunk({ deltaText: '', error })
      throw error
    }

    // Retry execution with exponential backoff for rate limits / transient errors
    let attempts = 0
    const maxRetries = 2
    let lastError: any = null

    try {
      while (attempts <= maxRetries) {
        attempts++
        try {
          const res = await adapter.chatStream(
            config,
            apiKey,
            request,
            onChunk,
            abortController.signal
          )
          clearTimeout(timeoutTimer)
          this.activeStreams.delete(streamId)
          return res
        } catch (err: any) {
          lastError = normalizeError(err)
          if (abortController.signal.aborted) {
            throw normalizeError(new Error('Generation cancelled by user'))
          }
          if (lastError.retryable && attempts <= maxRetries) {
            // Exponential backoff with small jitter
            const backoff = Math.pow(2, attempts) * 500 + Math.random() * 200
            await new Promise((r) => setTimeout(r, backoff))
            continue
          }
          throw lastError
        }
      }
      throw lastError
    } catch (err: any) {
      clearTimeout(timeoutTimer)
      this.activeStreams.delete(streamId)
      const normErr = normalizeError(err)
      onChunk({ deltaText: '', error: normErr })
      throw normErr
    }
  }

  public cancelStream(streamId: string): boolean {
    const controller = this.activeStreams.get(streamId)
    if (controller) {
      controller.abort(new Error('User stopped generation'))
      this.activeStreams.delete(streamId)
      return true
    }
    return false
  }

  public cancelAllStreams(): void {
    for (const [id, controller] of this.activeStreams.entries()) {
      controller.abort()
      this.activeStreams.delete(id)
    }
  }
}

export const aiProviderGateway = new AiProviderGateway()

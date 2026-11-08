import type { AiModelInfo, AiModelCapability } from './aiTypes'

export class AiModelRegistry {
  private models: Map<string, AiModelInfo> = new Map()

  constructor() {
    this.registerDefaults()
  }

  private registerDefaults(): void {
    const defaultModels: AiModelInfo[] = [
      // OpenAI Models
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        providerId: 'openai',
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 128000,
          maxOutputTokens: 16384,
          vision: true,
          codeCompletion: true
        },
        description: 'Flagship multimodal model with fast response and high reasoning ability'
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        providerId: 'openai',
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 128000,
          maxOutputTokens: 16384,
          vision: true,
          codeCompletion: true
        },
        description: 'Lightweight, affordable model optimized for fast chat and everyday tasks'
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        providerId: 'openai',
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 200000,
          maxOutputTokens: 100000,
          vision: false,
          codeCompletion: true
        },
        description: 'Reasoning model suited for deep algorithmic coding and architecture'
      },

      // Anthropic Models
      {
        id: 'claude-3-7-sonnet',
        name: 'Claude 3.7 Sonnet',
        providerId: 'anthropic',
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 200000,
          maxOutputTokens: 64000,
          vision: true,
          codeCompletion: true
        },
        description: 'Advanced hybrid reasoning model with high coding proficiency'
      },
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        providerId: 'anthropic',
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 200000,
          maxOutputTokens: 8192,
          vision: true,
          codeCompletion: true
        },
        description: 'Leading model for software engineering, refactoring and agentic tasks'
      },
      {
        id: 'claude-3-5-haiku',
        name: 'Claude 3.5 Haiku',
        providerId: 'anthropic',
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 200000,
          maxOutputTokens: 8192,
          vision: false,
          codeCompletion: true
        },
        description: 'Blazing fast, responsive model for quick explanations and assistance'
      },

      // Google Gemini Models
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        providerId: 'gemini',
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 1048576,
          maxOutputTokens: 8192,
          vision: true,
          codeCompletion: true
        },
        description: 'Ultra-fast multimodal model with 1M token context window'
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        providerId: 'gemini',
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 2097152,
          maxOutputTokens: 8192,
          vision: true,
          codeCompletion: true
        },
        description: 'Massive 2M token context window for full-repository understanding'
      },

      // Local / Ollama Models
      {
        id: 'qwen2.5-coder:7b',
        name: 'Qwen 2.5 Coder 7B (Local)',
        providerId: 'ollama',
        isLocal: true,
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 32768,
          maxOutputTokens: 8192,
          vision: false,
          codeCompletion: true
        },
        description: 'Powerful local code assistant running entirely on your machine'
      },
      {
        id: 'llama3.1:8b',
        name: 'Llama 3.1 8B (Local)',
        providerId: 'ollama',
        isLocal: true,
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 128000,
          maxOutputTokens: 8192,
          vision: false,
          codeCompletion: true
        },
        description: 'General local open model with long context support'
      },
      {
        id: 'deepseek-r1:8b',
        name: 'DeepSeek R1 8B (Local)',
        providerId: 'ollama',
        isLocal: true,
        capabilities: {
          streaming: true,
          toolCalling: false,
          structuredOutput: false,
          contextWindow: 65536,
          maxOutputTokens: 8192,
          vision: false,
          codeCompletion: true
        },
        description: 'Local reasoning model for step-by-step problem solving'
      },

      // Google Antigravity Models (Local CLI via agy)
      {
        id: 'gemini-3.8-flash-high',
        name: 'Gemini 3.8 Flash High (Antigravity)',
        providerId: 'antigravity',
        isLocal: true,
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 1000000,
          maxOutputTokens: 65536,
          vision: true,
          codeCompletion: true
        },
        description: 'Google Antigravity high-reasoning agent model with 1M token context'
      },
      {
        id: 'gemini-3.8-flash-medium',
        name: 'Gemini 3.8 Flash Medium (Antigravity)',
        providerId: 'antigravity',
        isLocal: true,
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 1000000,
          maxOutputTokens: 32768,
          vision: true,
          codeCompletion: true
        },
        description: 'Balanced latency and reasoning Antigravity agent model'
      },
      {
        id: 'gemini-3.8-flash-low',
        name: 'Gemini 3.8 Flash Fast (Antigravity)',
        providerId: 'antigravity',
        isLocal: true,
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 1000000,
          maxOutputTokens: 16384,
          vision: true,
          codeCompletion: true
        },
        description: 'Low-latency conversational agent model via Antigravity CLI'
      },
      {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6 (Antigravity)',
        providerId: 'antigravity',
        isLocal: true,
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 200000,
          maxOutputTokens: 64000,
          vision: true,
          codeCompletion: true
        },
        description: 'Anthropic Claude with deep thinking capabilities routed through Antigravity'
      },
      {
        id: 'claude-opus-4-6-thinking',
        name: 'Claude Opus 4.6 Thinking (Antigravity)',
        providerId: 'antigravity',
        isLocal: true,
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 200000,
          maxOutputTokens: 64000,
          vision: true,
          codeCompletion: true
        },
        description: 'Frontier reasoning model for advanced architecture via Antigravity'
      },
      {
        id: 'gpt-oss-120b-medium',
        name: 'GPT-OSS 120B (Antigravity)',
        providerId: 'antigravity',
        isLocal: true,
        capabilities: {
          streaming: true,
          toolCalling: true,
          structuredOutput: true,
          contextWindow: 128000,
          maxOutputTokens: 16384,
          vision: false,
          codeCompletion: true
        },
        description: 'Open-weights high parameter model routed through Antigravity'
      }
    ]

    for (const m of defaultModels) {
      this.models.set(m.id, m)
    }
  }

  public registerModel(model: AiModelInfo): void {
    this.models.set(model.id, model)
  }

  public getModel(id: string): AiModelInfo | undefined {
    return this.models.get(id)
  }

  public listModels(providerId?: string): AiModelInfo[] {
    const all = Array.from(this.models.values())
    if (providerId) {
      return all.filter((m) => m.providerId === providerId)
    }
    return all
  }

  public validateCapability(
    modelId: string,
    required: keyof AiModelCapability
  ): { supported: boolean; reason?: string } {
    const model = this.getModel(modelId)
    if (!model) {
      return {
        supported: false,
        reason: `Model '${modelId}' is not registered in the model registry.`
      }
    }

    const val = model.capabilities[required]
    if (!val) {
      return {
        supported: false,
        reason: `Model '${model.name}' does not support '${required}'. Please choose a model with '${required}' support.`
      }
    }

    return { supported: true }
  }

  public getRecommendedModel(feature: 'chat' | 'orchestration' | 'fast'): AiModelInfo {
    const all = Array.from(this.models.values())
    if (feature === 'fast') {
      return (
        all.find((m) => m.id === 'gpt-4o-mini' || m.id === 'claude-3-5-haiku' || m.id === 'gemini-2.0-flash') ||
        all[0]
      )
    }
    if (feature === 'orchestration') {
      return (
        all.find((m) => m.id === 'claude-3-7-sonnet' || m.id === 'gpt-4o' || m.id === 'claude-3-5-sonnet') ||
        all[0]
      )
    }
    // Default chat
    return (
      all.find((m) => m.id === 'gpt-4o' || m.id === 'claude-3-5-sonnet' || m.id === 'gemini-2.0-flash') ||
      all[0]
    )
  }
}

export const aiModelRegistry = new AiModelRegistry()

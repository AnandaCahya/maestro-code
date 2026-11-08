export type AiRole = 'system' | 'user' | 'assistant' | 'tool'

export interface AiChatMessage {
  role: AiRole
  content: string
  name?: string
  toolCallId?: string
  toolCalls?: Array<{
    id: string
    name: string
    arguments: string
  }>
}

export type AiProviderType = 'openai-compatible' | 'anthropic' | 'gemini' | 'ollama' | 'custom'

export interface AiModelCapability {
  streaming: boolean
  toolCalling: boolean
  structuredOutput: boolean
  contextWindow: number
  maxOutputTokens?: number
  vision: boolean
  codeCompletion: boolean
}

export interface AiModelInfo {
  id: string
  name: string
  providerId: string
  capabilities: AiModelCapability
  isLocal?: boolean
  description?: string
}

export interface AiProviderConfig {
  id: string
  name: string
  type: AiProviderType
  baseUrl?: string
  enabled: boolean
  timeoutMs?: number
  organization?: string
  defaultModelId?: string
  isLocal?: boolean
}

export interface AiCredentialSummary {
  providerId: string
  hasKey: boolean
  maskedKey?: string
}

export interface AiStreamChunk {
  deltaText: string
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' | null
  toolCalls?: Array<{
    id: string
    name: string
    arguments: string
  }>
  tokenUsage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  error?: NormalizedAiError
}

export interface AiChatRequest {
  providerId: string
  modelId: string
  messages: AiChatMessage[]
  temperature?: number
  maxTokens?: number
  tools?: Array<{
    name: string
    description: string
    parameters: Record<string, any>
  }>
  systemPrompt?: string
}

export interface AiChatResponse {
  message: AiChatMessage
  finishReason?: string
  tokenUsage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export type AiErrorCode =
  | 'AUTH_FAILED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'MODEL_NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'UNSUPPORTED_CAPABILITY'
  | 'PROVIDER_DISABLED'
  | 'AI_DISABLED'
  | 'UNKNOWN'

export interface NormalizedAiError {
  code: AiErrorCode
  message: string
  providerMessage?: string
  status?: number
  retryable: boolean
  suggestedFix?: string
}

export type AiContextType =
  | 'file'
  | 'selection'
  | 'diagnostics'
  | 'git'
  | 'terminal'
  | 'symbol'
  | 'workspace'
  | 'custom'

export interface AiContextItem {
  id: string
  type: AiContextType
  label: string
  content: string
  sizeBytes: number
  estimatedTokens: number
  filePath?: string
  language?: string
  metadata?: Record<string, any>
  excluded?: boolean
  exclusionReason?: string
}

export interface AiPrivacySettings {
  aiEnabled: boolean
  secretRedaction: boolean
  excludedPatterns: string[]
  allowExternalTelemetry: boolean
  localOnly: boolean
  retentionDays: number
  enablePromptAuditLog: boolean
}

export type AiRole = 'system' | 'user' | 'assistant' | 'tool'

export interface AiTokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  thinkingTokens?: number
  durationSeconds?: number
}

export interface AiAgentStep {
  id: string
  stepIndex: number
  type: 'agent_response' | 'tool' | 'thinking' | 'user_input'
  state: 'ACTIVE' | 'DONE'
  title: string
  detail?: string
  toolName?: string
  durationSeconds?: number
  thinkingTokens?: number
}

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
  usage?: AiTokenUsage
  steps?: AiAgentStep[]
}

export type AiProviderType = 'openai-compatible' | 'anthropic' | 'gemini' | 'ollama' | 'antigravity' | 'custom'

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
  tokenUsage?: AiTokenUsage
  agentStep?: AiAgentStep
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
  workspacePath?: string
}

export interface AiChatResponse {
  message: AiChatMessage
  finishReason?: string
  tokenUsage?: AiTokenUsage
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
  | 'task'
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

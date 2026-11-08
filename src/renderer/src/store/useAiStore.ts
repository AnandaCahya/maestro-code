import { create } from 'zustand'
import type {
  AiProviderConfig,
  AiModelInfo,
  AiCredentialSummary,
  AiPrivacySettings,
  AiChatMessage,
  AiContextItem,
  AiStreamChunk,
  AiAgentStep
} from '../../preload/index.d'
import { useProjectStore } from './useProjectStore'
import { useEditorStore } from './useEditorStore'

export interface ProposedDiff {
  id: string
  filePath: string
  originalContent: string
  proposedContent: string
  status: 'pending' | 'accepted' | 'rejected'
}

export interface AiConversationSummary {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  providerId: string
  modelId: string
  mode: 'chat' | 'orchestration'
  archived?: boolean
  taskId?: string
}

export interface PromptTemplate {
  id: string
  label: string
  description: string
  prompt: string
}

export const BUILTIN_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'explain',
    label: 'Explain Code',
    description: 'Explain logic, structure, and intent of the selected code',
    prompt: 'Please explain the following code thoroughly, including its main responsibility, edge cases, and algorithmic complexity:'
  },
  {
    id: 'debug',
    label: 'Find Bugs',
    description: 'Analyze code for potential errors, race conditions, and edge cases',
    prompt: 'Carefully review this code for logical errors, memory/resource leaks, off-by-one errors, or concurrency bugs:'
  },
  {
    id: 'test',
    label: 'Generate Tests',
    description: 'Write comprehensive unit tests with edge cases',
    prompt: 'Write clean, idiomatic unit tests for this code covering typical usage and tricky boundary edge cases:'
  },
  {
    id: 'refactor',
    label: 'Refactor',
    description: 'Improve readability, maintainability, and modularity',
    prompt: 'Propose a cleaner, more maintainable refactored version of this code while preserving identical behavior:'
  },
  {
    id: 'doc',
    label: 'Add Docs',
    description: 'Add JSDoc / TSDoc comments and typing annotations',
    prompt: 'Add high-quality documentation comments and improve type safety for this code:'
  },
  {
    id: 'pm_breakdown',
    label: 'Break Down Active Task',
    description: 'Decompose the active Maestro task into concrete subtasks and implementation steps',
    prompt: 'Review the active focused Maestro task and project context. Break down the remaining implementation work into structured subtasks with clear acceptance criteria and linked files:'
  },
  {
    id: 'pm_plan',
    label: 'Plan Next Feature / Task',
    description: 'Draft a structured Maestro task breakdown for Kanban',
    prompt: 'Help me plan the following feature or fix. Provide a clear Maestro task specification with title, priority, status, affected files, and test checklists suitable for our Kanban board:'
  },
  {
    id: 'pm_review_progress',
    label: 'Review Project & Blockers',
    description: 'Review project tasks, identify dependencies or blockers, and recommend next actions',
    prompt: 'Analyze our current Maestro project status and task backlog. Identify any potential blockers or bottlenecks, and recommend the most effective next steps:'
  }
]

export interface AiStoreState {
  // Config & Providers
  providers: AiProviderConfig[]
  models: AiModelInfo[]
  credentialSummaries: AiCredentialSummary[]
  privacySettings: AiPrivacySettings
  selectedProviderId: string
  selectedModelId: string

  // Conversations
  conversations: AiConversationSummary[]
  activeConversationId: string | null
  messages: AiChatMessage[]
  conversationTitle: string

  // Mode: 'ask' | 'edit' | 'orchestration'
  chatMode: 'ask' | 'edit' | 'orchestration'

  // Usage & Metrics
  sessionUsage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    thinkingTokens?: number
  }

  // Context
  attachedContext: AiContextItem[]

  // Streaming State & Live Agent Activities
  isStreaming: boolean
  activeStreamId: string | null
  streamingText: string
  errorMessage: string | null
  activeAgentSteps: AiAgentStep[]
  activeStepTitle: string | null

  // Diff / Edit Proposals
  proposedDiffs: ProposedDiff[]

  // Orchestration MVP State
  activeOrchestrationSession: any | null
  roleTemplates: any[]
  roleWarnings: string[]
  isOrchestrationDrawerOpen: boolean
  toolAuditLog: any[]
  workflowTemplates: any[]
  activeSpecialistTaskId: string | null

  // UI Drawer / Tabs
  isHistoryOpen: boolean
  isAiSettingsOpen: boolean
  searchQuery: string

  // Actions
  initialize: () => Promise<void>
  loadProvidersAndModels: () => Promise<void>
  loadConversations: (workspacePath?: string) => Promise<void>
  loadRoleTemplates: () => Promise<void>
  loadToolAuditLog: () => Promise<void>
  clearToolAuditLog: () => Promise<void>
  loadWorkflowTemplates: () => Promise<void>
  selectProvider: (providerId: string) => void
  selectModel: (modelId: string) => void
  setChatMode: (mode: 'ask' | 'edit' | 'orchestration') => void
  saveCredential: (providerId: string, apiKey: string) => Promise<boolean>
  deleteCredential: (providerId: string) => Promise<boolean>
  testConnection: (providerId: string, apiKeyOverride?: string) => Promise<{ ok: boolean; message?: string }>
  updatePrivacy: (settings: Partial<AiPrivacySettings>) => Promise<void>

  // Orchestration actions
  startOrchestration: (goal: string) => Promise<void>
  approveGate: (gate: string) => Promise<void>
  setOrchestrationDrawerOpen: (open: boolean) => void
  setActiveSpecialistTaskId: (taskId: string | null) => void
  updateOrchestrationTask: (taskId: string, status: string, resultSummary?: string, error?: string) => Promise<void>
  pushPlanToProjectDeck: (workspacePath?: string) => Promise<{ success: boolean; taskCount: number; message: string }>
  exportArtifactToFile: (artifact: any, workspacePath: string, relativePath?: string) => Promise<{ success: boolean; path?: string; error?: string }>

  // Context management
  addContextItem: (item: Omit<AiContextItem, 'sizeBytes' | 'estimatedTokens'>) => Promise<void>
  removeContextItem: (id: string) => void
  clearContext: () => void

  // Conversation lifecycle
  newConversation: (mode?: 'chat' | 'orchestration') => void
  openConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  renameConversation: (id: string, newTitle: string) => Promise<void>
  exportConversation: (format: 'markdown' | 'json') => Promise<string>
  clearAllHistory: () => Promise<void>

  // Messaging & Generation
  sendMessage: (userText: string) => Promise<void>
  stopGeneration: () => void
  retryLastMessage: () => Promise<void>

  // Edit / Diff Actions
  acceptDiff: (diffId: string) => Promise<boolean>
  rejectDiff: (diffId: string) => void

  // UI state toggles
  setHistoryOpen: (open: boolean) => void
  setAiSettingsOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
}

export function buildMaestroSystemInstruction(chatMode: 'ask' | 'edit' | 'orchestration'): string {
  const { workspacePath, focusTask } = useEditorStore.getState()
  const { projectData, activeTaskId } = useProjectStore.getState()

  const folderName = workspacePath ? workspacePath.split(/[\\/]/).filter(Boolean).pop() : null

  const activeId = focusTask?.id || activeTaskId
  const activeTaskObj = activeId
    ? (projectData.tasks || []).find((t) => t.id.toLowerCase() === activeId.toLowerCase())
    : null

  const taskStats = (projectData.tasks || []).reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const activeSprints = (projectData.sprints || []).filter((s) => s.status === 'active')

  let prompt =
    `You are Maestro AI, a premier AI pair programmer and software engineering architect embedded directly inside Maestro Studio IDE.\n` +
    `Maestro Studio combines a Monaco Editor coding environment with a native offline-first Project Management subsystem stored at .maestro/project.json.\n` +
    `\nCurrent Project / Workspace Context:\n` +
    `- Name: ${projectData.name || folderName || 'Untitled Project'}\n` +
    `- Workspace Root: ${workspacePath || 'No workspace open'}\n` +
    (projectData.description ? `- Description: ${projectData.description}\n` : '') +
    (projectData.packageManager ? `- Detected Package Manager: ${projectData.packageManager}\n` : '')

  if (activeTaskObj) {
    prompt +=
      `\n[Active Task in Focus Mode]:\n` +
      `- Task ID: [${activeTaskObj.id}]\n` +
      `- Title: ${activeTaskObj.title}\n` +
      `- Status: ${activeTaskObj.status} | Priority: ${activeTaskObj.priority} | Type: ${activeTaskObj.type || 'task'}\n` +
      (activeTaskObj.description ? `- Description: ${activeTaskObj.description}\n` : '') +
      (activeTaskObj.subtasks && activeTaskObj.subtasks.length > 0
        ? `- Subtasks Checklist:\n` +
          activeTaskObj.subtasks
            .map((s) => `  * [${s.completed ? 'x' : ' '}] ${s.title}`)
            .join('\n') +
          '\n'
        : '') +
      (activeTaskObj.codeLinks && activeTaskObj.codeLinks.length > 0
        ? `- Linked Code Files:\n` +
          activeTaskObj.codeLinks
            .map((cl) => `  * ${cl.file}${cl.line ? `:${cl.line}` : ''}${cl.description ? ` (${cl.description})` : ''}`)
            .join('\n') +
          '\n'
        : '') +
      `Note: The user is currently in Focus Mode on [${activeTaskObj.id}]. Orient your suggestions, code explanations, and next steps towards successfully completing this task and updating its subtasks.\n`
  } else if ((projectData.tasks || []).length > 0) {
    prompt +=
      `\n[Project Management Overview]:\n` +
      `- Total Tasks: ${projectData.tasks.length} (In Progress: ${taskStats.in_progress || 0}, Todo: ${taskStats.todo || 0}, Review: ${taskStats.review || 0}, Done: ${taskStats.done || 0})\n` +
      (activeSprints.length > 0 ? `- Active Sprint: ${activeSprints.map((s) => s.name).join(', ')}\n` : '')
  }

  prompt +=
    `\nMaestro Communication & Formatting Guidelines:\n` +
    `1. Format task references as [MST-X] (e.g. [MST-1]) so they appear as interactive clickable links in Maestro Studio.\n` +
    `2. Format code file references as clickable links: [filename.ext](file:///absolute/path/to/file#L1-L20) or relative workspace paths.\n` +
    `3. When proposing or breaking down work, recommend creating tasks or subtasks that map cleanly to Maestro's Kanban board.\n` +
    `4. Provide concise, high-signal, idiomatic code with clear rationale.`

  if (chatMode === 'edit') {
    prompt +=
      '\n\nEDIT MODE ACTIVE: Propose direct, concrete code changes. Format diffs clearly using ```diff\n--- path/to/file\n+++ path/to/file\n@@ ... @@\n``` syntax so the user can inspect and apply the patch.'
  } else if (chatMode === 'orchestration') {
    prompt +=
      '\n\nORCHESTRATION MODE: Act as Lead Architect and Orchestrator. Structure your responses with: 1) Requirement Analysis, 2) Task Breakdown, 3) Architecture/Implementation Steps, 4) Verification & Risk Assessment.'
  }

  return prompt
}

export const useAiStore = create<AiStoreState>((set, get) => ({
  providers: [],
  models: [],
  credentialSummaries: [],
  privacySettings: {
    aiEnabled: true,
    secretRedaction: true,
    excludedPatterns: ['**/.env*', '**/*.pem', '**/*.key'],
    allowExternalTelemetry: false,
    localOnly: false,
    retentionDays: 30,
    enablePromptAuditLog: false
  },
  selectedProviderId: 'antigravity',
  selectedModelId: 'gemini-3.8-flash-high',

  conversations: [],
  activeConversationId: null,
  messages: [],
  conversationTitle: 'New Conversation',

  chatMode: 'ask',
  sessionUsage: {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    thinkingTokens: 0
  },
  attachedContext: [],

  isStreaming: false,
  activeStreamId: null,
  streamingText: '',
  errorMessage: null,
  activeAgentSteps: [],
  activeStepTitle: null,

  proposedDiffs: [],

  activeOrchestrationSession: null,
  roleTemplates: [],
  roleWarnings: [],
  isOrchestrationDrawerOpen: false,
  toolAuditLog: [],
  workflowTemplates: [],
  activeSpecialistTaskId: null,

  isHistoryOpen: false,
  isAiSettingsOpen: false,
  searchQuery: '',

  initialize: async () => {
    if (!window.maestroAPI) return
    await get().loadProvidersAndModels()
    await get().loadConversations()
    try {
      const privacy = await window.maestroAPI.aiGetPrivacySettings()
      if (privacy) set({ privacySettings: privacy })
      await get().loadRoleTemplates()
    } catch {}
  },

  loadRoleTemplates: async () => {
    if (!window.maestroAPI) return
    try {
      const templates = await window.maestroAPI.aiListRoleTemplates()
      set({ roleTemplates: templates })
    } catch (err: any) {
      console.error('Failed to load role templates', err)
    }
  },

  loadProvidersAndModels: async () => {
    if (!window.maestroAPI) return
    try {
      const providers = await window.maestroAPI.aiListProviders()
      const models = await window.maestroAPI.aiListModels()
      const providerIds = providers.map((p) => p.id)
      const creds = await window.maestroAPI.aiGetCredentialSummaries(providerIds)

      let activeProv = get().selectedProviderId
      let activeMod = get().selectedModelId

      // Priority: Antigravity Local Engine if available and enabled
      const agy = providers.find((p) => p.id === 'antigravity' && p.enabled)
      if (agy) {
        activeProv = 'antigravity'
      } else if (!providers.some((p) => p.id === activeProv)) {
        activeProv = providers.find((p) => p.enabled)?.id || 'antigravity'
      }

      const provModels = models.filter((m) => m.providerId === activeProv)
      if (!provModels.some((m) => m.id === activeMod) && provModels.length > 0) {
        const preferred = provModels.find(
          (m) => m.id === 'gemini-3.8-flash-medium' || m.id === 'gemini-3.8-flash-high'
        )
        activeMod = preferred ? preferred.id : provModels[0].id
      }

      set({
        providers,
        models,
        credentialSummaries: creds,
        selectedProviderId: activeProv,
        selectedModelId: activeMod
      })
    } catch (err: any) {
      console.error('Failed to load AI providers and models', err)
    }
  },

  loadConversations: async (workspacePath) => {
    if (!window.maestroAPI) return
    try {
      const list = await window.maestroAPI.aiListConversations(workspacePath)
      set({ conversations: list })
    } catch (err: any) {
      console.error('Failed to list conversations', err)
    }
  },

  selectProvider: (providerId) => {
    const models = get().models.filter((m) => m.providerId === providerId)
    const prov = get().providers.find((p) => p.id === providerId)
    const nextModel = prov?.defaultModelId || (models[0]?.id ?? 'gpt-4o')
    set({ selectedProviderId: providerId, selectedModelId: nextModel })
  },

  selectModel: (modelId) => {
    set({ selectedModelId: modelId })
  },

  setChatMode: (mode) => {
    set({ chatMode: mode })
  },

  saveCredential: async (providerId, apiKey) => {
    if (!window.maestroAPI) return false
    try {
      await window.maestroAPI.aiSetCredential(providerId, apiKey)
      const creds = await window.maestroAPI.aiGetCredentialSummaries(
        get().providers.map((p) => p.id)
      )
      set({ credentialSummaries: creds })
      return true
    } catch (err: any) {
      console.error('Failed to save credential', err)
      return false
    }
  },

  deleteCredential: async (providerId) => {
    if (!window.maestroAPI) return false
    try {
      await window.maestroAPI.aiDeleteCredential(providerId)
      const creds = await window.maestroAPI.aiGetCredentialSummaries(
        get().providers.map((p) => p.id)
      )
      set({ credentialSummaries: creds })
      return true
    } catch (err: any) {
      console.error('Failed to delete credential', err)
      return false
    }
  },

  testConnection: async (providerId, apiKeyOverride) => {
    if (!window.maestroAPI) return { ok: false, message: 'Maestro API not available' }
    return await window.maestroAPI.aiTestConnection(providerId, apiKeyOverride)
  },

  updatePrivacy: async (settings) => {
    if (!window.maestroAPI) return
    await window.maestroAPI.aiUpdatePrivacySettings(settings)
    const updated = await window.maestroAPI.aiGetPrivacySettings()
    set({ privacySettings: updated })
  },

  addContextItem: async (rawItem) => {
    if (!window.maestroAPI) return
    const current = get().attachedContext
    // Deduplicate by id or filePath
    if (current.some((c) => c.id === rawItem.id || (rawItem.filePath && c.filePath === rawItem.filePath))) {
      return
    }

    try {
      const prep = await window.maestroAPI.aiPrepareContext([rawItem])
      if (prep.packedItems.length > 0) {
        set({ attachedContext: [...current, ...prep.packedItems] })
      }
    } catch {
      // Fallback local estimation
      const estTokens = Math.ceil(rawItem.content.length / 3.8)
      set({
        attachedContext: [
          ...current,
          {
            ...rawItem,
            sizeBytes: rawItem.content.length,
            estimatedTokens: estTokens
          }
        ]
      })
    }
  },

  removeContextItem: (id) => {
    set({ attachedContext: get().attachedContext.filter((c) => c.id !== id) })
  },

  clearContext: () => {
    set({ attachedContext: [] })
  },

  newConversation: (mode = 'chat') => {
    const newId = `conv_${Date.now()}`
    set({
      activeConversationId: newId,
      conversationTitle: 'New Conversation',
      messages: [],
      chatMode: mode === 'orchestration' ? 'orchestration' : 'ask',
      errorMessage: null,
      streamingText: '',
      isStreaming: false,
      proposedDiffs: [],
      activeAgentSteps: [],
      activeStepTitle: null,
      sessionUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        thinkingTokens: 0
      }
    })
  },

  openConversation: async (id) => {
    if (!window.maestroAPI) return
    try {
      const conv = await window.maestroAPI.aiGetConversation(id)
      if (conv) {
        set({
          activeConversationId: conv.id,
          conversationTitle: conv.title,
          selectedProviderId: conv.providerId,
          selectedModelId: conv.modelId,
          chatMode: conv.mode === 'orchestration' ? 'orchestration' : 'ask',
          messages: conv.messages || [],
          attachedContext: conv.attachedContext || [],
          errorMessage: null,
          isHistoryOpen: false
        })
      }
    } catch (err: any) {
      console.error('Failed to open conversation', err)
    }
  },

  deleteConversation: async (id) => {
    if (!window.maestroAPI) return
    await window.maestroAPI.aiDeleteConversation(id)
    if (get().activeConversationId === id) {
      get().newConversation()
    }
    await get().loadConversations()
  },

  renameConversation: async (id, newTitle) => {
    if (!window.maestroAPI) return
    const conv = await window.maestroAPI.aiGetConversation(id)
    if (conv) {
      conv.title = newTitle
      await window.maestroAPI.aiSaveConversation(conv)
      if (get().activeConversationId === id) {
        set({ conversationTitle: newTitle })
      }
      await get().loadConversations()
    }
  },

  exportConversation: async (format) => {
    const id = get().activeConversationId
    if (!id || !window.maestroAPI) return ''
    return await window.maestroAPI.aiExportConversation(id, format)
  },

  clearAllHistory: async () => {
    if (!window.maestroAPI) return
    await window.maestroAPI.aiClearAllConversations()
    get().newConversation()
    set({ conversations: [] })
  },

  sendMessage: async (userText) => {
    const trimmed = userText.trim()
    if (!trimmed || get().isStreaming || !window.maestroAPI) return

    const streamId = `stream_${Date.now()}`
    const userMsg: AiChatMessage = { role: 'user', content: trimmed }
    const nextMessages = [...get().messages, userMsg]

    let convId = get().activeConversationId
    if (!convId) {
      convId = `conv_${Date.now()}`
    }

    let title = get().conversationTitle
    if (title === 'New Conversation' && nextMessages.length === 1) {
      title = trimmed.slice(0, 32) + (trimmed.length > 32 ? '...' : '')
    }

    set({
      activeConversationId: convId,
      conversationTitle: title,
      messages: nextMessages,
      isStreaming: true,
      activeStreamId: streamId,
      streamingText: '',
      activeAgentSteps: [],
      activeStepTitle: 'Connecting to Antigravity Engine...',
      errorMessage: null
    })

    // Prepare system instructions with full Maestro ecosystem and Project Management context
    const { workspacePath } = useEditorStore.getState()
    const systemInstruction = buildMaestroSystemInstruction(get().chatMode)

    // Attach Context if present
    const contextItems = get().attachedContext
    let contextPrompt = ''
    if (contextItems.length > 0) {
      contextPrompt = contextItems
        .filter((c) => !c.excluded)
        .map((c) => `[Context: ${c.type.toUpperCase()}] ${c.label}\n\`\`\`${c.language || ''}\n${c.content}\n\`\`\``)
        .join('\n\n')
    }

    const requestMessages: AiChatMessage[] = []
    if (contextPrompt) {
      requestMessages.push({
        role: 'system',
        content: `Workspace and active context attachments:\n\n${contextPrompt}`
      })
    }
    requestMessages.push(...nextMessages)

    // Subscribe to stream chunks
    let accumulatedText = ''
    let chunkUsage: any = undefined
    const unsub = window.maestroAPI.onAiStreamChunk(streamId, (chunk: AiStreamChunk) => {
      if (chunk.error) {
        set({ errorMessage: chunk.error.message || 'Stream error occurred' })
      }
      if (chunk.deltaText) {
        accumulatedText += chunk.deltaText
        set({ streamingText: accumulatedText, activeStepTitle: 'Generating response...' })
      }
      if (chunk.agentStep) {
        const step = chunk.agentStep
        const currentSteps = get().activeAgentSteps
        const existingIdx = currentSteps.findIndex((s) => s.id === step.id)
        let updated: AiAgentStep[]
        if (existingIdx >= 0) {
          updated = [...currentSteps]
          updated[existingIdx] = step
        } else {
          updated = [...currentSteps, step]
        }
        set({
          activeAgentSteps: updated,
          activeStepTitle: step.state === 'ACTIVE' ? step.title : get().activeStepTitle
        })
      }
      if (chunk.tokenUsage) {
        chunkUsage = chunk.tokenUsage
      }
    })

    try {
      const response = await window.maestroAPI.aiChatStream(
        {
          providerId: get().selectedProviderId,
          modelId: get().selectedModelId,
          messages: requestMessages,
          systemPrompt: systemInstruction,
          workspacePath: workspacePath || undefined
        },
        streamId
      )

      unsub()
      let assistantText = (response?.message?.content || accumulatedText).trim()
      if (!assistantText) {
        assistantText =
          'Maestro AI did not receive text from Antigravity CLI. Please verify that Antigravity is active and authorized.'
      }
      const usage = response?.message?.usage || response?.tokenUsage || chunkUsage
      const capturedSteps =
        response?.message?.steps || (get().activeAgentSteps.length > 0 ? get().activeAgentSteps : undefined)

      const finalAssistantMsg: AiChatMessage = {
        role: 'assistant',
        content: assistantText,
        usage: usage,
        steps: capturedSteps
      }

      const allMessages = [...nextMessages, finalAssistantMsg]

      if (usage) {
        const cur = get().sessionUsage
        set({
          sessionUsage: {
            promptTokens: cur.promptTokens + (usage.promptTokens || 0),
            completionTokens: cur.completionTokens + (usage.completionTokens || 0),
            totalTokens: cur.totalTokens + (usage.totalTokens || 0),
            thinkingTokens: (cur.thinkingTokens || 0) + (usage.thinkingTokens || 0)
          }
        })
      }

      // Detect diff proposals in edit mode
      if (get().chatMode === 'edit' && assistantText.includes('```diff')) {
        const diffRegex = /```diff\s*\n--- a\/(.*?)\n\+\+\+ b\/(.*?)\n([\s\S]*?)```/g
        let match: RegExpExecArray | null
        const proposals: ProposedDiff[] = []
        while ((match = diffRegex.exec(assistantText)) !== null) {
          proposals.push({
            id: `diff_${Date.now()}_${proposals.length}`,
            filePath: match[2] || match[1],
            originalContent: '',
            proposedContent: match[0],
            status: 'pending'
          })
        }
        if (proposals.length > 0) {
          set({ proposedDiffs: [...get().proposedDiffs, ...proposals] })
        }
      }

      set({
        messages: allMessages,
        isStreaming: false,
        activeStreamId: null,
        streamingText: '',
        activeAgentSteps: [],
        activeStepTitle: null
      })

      // Persist conversation
      await window.maestroAPI.aiSaveConversation({
        id: convId,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        providerId: get().selectedProviderId,
        modelId: get().selectedModelId,
        mode: get().chatMode === 'orchestration' ? 'orchestration' : 'chat',
        messages: allMessages,
        attachedContext: contextItems
      })

      await get().loadConversations()
    } catch (err: any) {
      unsub()
      let msg = err?.message || 'Failed to complete AI response'
      if (msg.includes('[object Object]')) {
        msg = get().errorMessage || 'AI generation was interrupted or timed out. Please try again.'
      }
      set({
        isStreaming: false,
        activeStreamId: null,
        activeAgentSteps: [],
        activeStepTitle: null,
        errorMessage: msg
      })
    }
  },

  stopGeneration: () => {
    const streamId = get().activeStreamId
    if (streamId && window.maestroAPI) {
      window.maestroAPI.aiCancelStream(streamId)
      // Append what was received so far
      const text = get().streamingText
      if (text) {
        set({
          messages: [
            ...get().messages,
            { role: 'assistant', content: text + '\n\n*(Generation stopped by user)*' }
          ]
        })
      }
      set({ isStreaming: false, activeStreamId: null, streamingText: '' })
    }
  },

  retryLastMessage: async () => {
    const msgs = [...get().messages]
    if (msgs.length === 0) return
    const last = msgs[msgs.length - 1]
    if (last.role === 'assistant') {
      msgs.pop()
    }
    if (msgs.length === 0) return
    const lastUser = msgs.pop()
    if (!lastUser || lastUser.role !== 'user') return

    set({ messages: msgs })
    await get().sendMessage(lastUser.content)
  },

  acceptDiff: async (diffId) => {
    const diff = get().proposedDiffs.find((d) => d.id === diffId)
    if (!diff) return false
    set({
      proposedDiffs: get().proposedDiffs.map((d) =>
        d.id === diffId ? { ...d, status: 'accepted' } : d
      )
    })
    return true
  },

  rejectDiff: (diffId) => {
    set({
      proposedDiffs: get().proposedDiffs.map((d) =>
        d.id === diffId ? { ...d, status: 'rejected' } : d
      )
    })
  },

  setHistoryOpen: (open) => set({ isHistoryOpen: open }),
  setAiSettingsOpen: (open) => set({ isAiSettingsOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  startOrchestration: async (goal: string) => {
    if (!window.maestroAPI) return
    try {
      const coverage = await window.maestroAPI.aiAnalyzeRoleCoverage(goal)
      const session = await window.maestroAPI.aiCreateOrchestrationSession(goal)
      const { session: updatedSession } = await window.maestroAPI.aiGenerateOrchestrationPlan(session.id)
      set({
        activeOrchestrationSession: updatedSession,
        roleWarnings: coverage.warnings || [],
        chatMode: 'orchestration',
        isOrchestrationDrawerOpen: true
      })
    } catch (err: any) {
      console.error('Failed to start orchestration session', err)
    }
  },

  approveGate: async (gate: string) => {
    const session = get().activeOrchestrationSession
    if (!session || !window.maestroAPI) return
    try {
      await window.maestroAPI.aiApproveOrchestrationGate(session.id, gate)
      const updatedGates = { ...session.approvalGates, [gate]: true }
      let nextStage = session.stage
      if (gate === 'planApproved') nextStage = 'execution'
      if (gate === 'executionApproved') nextStage = 'completed'
      set({
        activeOrchestrationSession: {
          ...session,
          stage: nextStage,
          approvalGates: updatedGates
        }
      })
    } catch (err: any) {
      console.error('Failed to approve orchestration gate', err)
    }
  },

  setOrchestrationDrawerOpen: (open) => set({ isOrchestrationDrawerOpen: open }),

  setActiveSpecialistTaskId: (taskId) => set({ activeSpecialistTaskId: taskId }),

  loadToolAuditLog: async () => {
    if (!window.maestroAPI) return
    try {
      const log = await window.maestroAPI.aiGetToolAuditLog()
      set({ toolAuditLog: log || [] })
    } catch (err) {
      console.error('Failed to load tool audit log', err)
    }
  },

  clearToolAuditLog: async () => {
    if (!window.maestroAPI) return
    try {
      await window.maestroAPI.aiClearToolAuditLog()
      set({ toolAuditLog: [] })
    } catch (err) {
      console.error('Failed to clear tool audit log', err)
    }
  },

  loadWorkflowTemplates: async () => {
    if (!window.maestroAPI) return
    try {
      const templates = await window.maestroAPI.aiListWorkflowTemplates()
      set({ workflowTemplates: templates || [] })
    } catch (err) {
      console.error('Failed to load workflow templates', err)
    }
  },

  updateOrchestrationTask: async (taskId: string, status: string, resultSummary?: string, error?: string) => {
    const session = get().activeOrchestrationSession
    if (!session || !window.maestroAPI) return
    try {
      await window.maestroAPI.aiUpdateOrchestrationTask(session.id, taskId, status, resultSummary, error)
      const updatedTasks = (session.tasks || []).map((t: any) =>
        t.id === taskId ? { ...t, status, resultSummary, error } : t
      )
      set({
        activeOrchestrationSession: {
          ...session,
          tasks: updatedTasks
        }
      })
    } catch (err) {
      console.error('Failed to update orchestration task status', err)
    }
  },

  pushPlanToProjectDeck: async (workspacePath?: string) => {
    const session = get().activeOrchestrationSession
    if (!session || !session.tasks || session.tasks.length === 0) {
      return { success: false, taskCount: 0, message: 'No orchestration tasks found to export.' }
    }
    const projectStore = useProjectStore.getState()
    let count = 0
    for (const task of session.tasks) {
      projectStore.addTask({
        title: task.title,
        description: `Generated by Maestro AI Orchestrator (${task.assignedRoleId})\n\n${task.description}\n\nDependencies: ${task.dependencies && task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}`,
        status: task.status === 'completed' ? 'done' : task.status === 'running' ? 'in_progress' : 'todo',
        priority: 'high',
        type: 'task',
        labels: ['ai-orchestrated', task.assignedRoleId],
        components: task.affectedFiles || []
      })
      count++
    }
    if (workspacePath) {
      try {
        await projectStore.saveToDisk(workspacePath)
      } catch (err) {
        console.warn('Could not auto-save project deck to disk:', err)
      }
    }
    return { success: true, taskCount: count, message: `Successfully pushed ${count} tasks to Project Deck!` }
  },

  exportArtifactToFile: async (artifact: any, workspacePath: string, relativePath?: string) => {
    if (!window.maestroAPI || !workspacePath) {
      return { success: false, error: 'Workspace path not available' }
    }
    try {
      const subpath = relativePath || `docs/ai/${artifact.id}.md`
      const fullPath = workspacePath.replace(/\\/g, '/') + '/' + subpath.replace(/^(\.\/|\/)/, '')
      await window.maestroAPI.writeFile(fullPath, artifact.content)
      return { success: true, path: fullPath }
    } catch (err: any) {
      return { success: false, error: err.message || String(err) }
    }
  }
}))

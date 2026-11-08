import fs from 'fs/promises'
import path from 'path'
import { app } from 'electron'
import type { AiChatMessage, AiContextItem } from './aiTypes'

export interface AiConversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  providerId: string
  modelId: string
  workspacePath?: string
  mode: 'chat' | 'orchestration'
  messages: AiChatMessage[]
  attachedContext?: AiContextItem[]
  archived?: boolean
}

export class AiConversationService {
  private baseDir: string

  constructor(customDir?: string) {
    if (customDir) {
      this.baseDir = customDir
    } else {
      try {
        this.baseDir = path.join(app.getPath('userData'), 'ai_conversations')
      } catch {
        this.baseDir = path.join(process.cwd(), '.maestro', 'ai_conversations')
      }
    }
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true })
  }

  private getFilePath(id: string): string {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_')
    return path.join(this.baseDir, `${safeId}.json`)
  }

  public async saveConversation(conversation: AiConversation): Promise<void> {
    await this.ensureDir()
    const filePath = this.getFilePath(conversation.id)
    conversation.updatedAt = Date.now()
    await fs.writeFile(filePath, JSON.stringify(conversation, null, 2), 'utf8')
  }

  public async getConversation(id: string): Promise<AiConversation | null> {
    try {
      const filePath = this.getFilePath(id)
      const data = await fs.readFile(filePath, 'utf8')
      return JSON.parse(data) as AiConversation
    } catch {
      return null
    }
  }

  public async listConversations(workspacePath?: string): Promise<Array<Omit<AiConversation, 'messages'>>> {
    await this.ensureDir()
    try {
      const files = await fs.readdir(this.baseDir)
      const results: Array<Omit<AiConversation, 'messages'>> = []

      for (const file of files) {
        if (!file.endsWith('.json')) continue
        try {
          const content = await fs.readFile(path.join(this.baseDir, file), 'utf8')
          const conv = JSON.parse(content) as AiConversation
          if (!workspacePath || !conv.workspacePath || conv.workspacePath === workspacePath) {
            results.push({
              id: conv.id,
              title: conv.title,
              createdAt: conv.createdAt,
              updatedAt: conv.updatedAt,
              providerId: conv.providerId,
              modelId: conv.modelId,
              workspacePath: conv.workspacePath,
              mode: conv.mode,
              attachedContext: conv.attachedContext,
              archived: conv.archived
            })
          }
        } catch {
          // Skip corrupt file
        }
      }

      // Sort by updatedAt descending
      return results.sort((a, b) => b.updatedAt - a.updatedAt)
    } catch {
      return []
    }
  }

  public async deleteConversation(id: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(id)
      await fs.unlink(filePath)
      return true
    } catch {
      return false
    }
  }

  public async clearAllConversations(): Promise<void> {
    await this.ensureDir()
    const files = await fs.readdir(this.baseDir)
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(this.baseDir, file)).catch(() => {})
      }
    }
  }

  public async exportConversation(id: string, format: 'markdown' | 'json' = 'markdown'): Promise<string> {
    const conv = await this.getConversation(id)
    if (!conv) throw new Error(`Conversation '${id}' not found.`)

    if (format === 'json') {
      return JSON.stringify(conv, null, 2)
    }

    const lines: string[] = []
    lines.push(`# ${conv.title || 'Maestro AI Conversation'}`)
    lines.push(`**Date:** ${new Date(conv.createdAt).toLocaleString()} | **Model:** ${conv.modelId} (${conv.providerId})`)
    lines.push('')
    lines.push('---')
    lines.push('')

    for (const msg of conv.messages) {
      const author = msg.role === 'user' ? '### 👤 User' : msg.role === 'assistant' ? '### 🤖 Maestro AI' : `### ⚙️ ${msg.role}`
      lines.push(author)
      lines.push('')
      lines.push(msg.content)
      lines.push('')
    }

    return lines.join('\n')
  }

  public async purgeOlderThan(retentionDays: number): Promise<number> {
    if (retentionDays <= 0) return 0
    await this.ensureDir()
    const files = await fs.readdir(this.baseDir)
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
    let purgedCount = 0

    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        const filePath = path.join(this.baseDir, file)
        const content = await fs.readFile(filePath, 'utf8')
        const conv = JSON.parse(content) as AiConversation
        if (conv.updatedAt < cutoff) {
          await fs.unlink(filePath)
          purgedCount++
        }
      } catch {
        // Ignored
      }
    }

    return purgedCount
  }
}

export const aiConversationService = new AiConversationService()

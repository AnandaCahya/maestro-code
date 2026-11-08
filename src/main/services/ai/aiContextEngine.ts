import type { AiContextItem, AiPrivacySettings } from './aiTypes'

export const DEFAULT_AI_PRIVACY_SETTINGS: AiPrivacySettings = {
  aiEnabled: true,
  secretRedaction: true,
  excludedPatterns: [
    '**/.env*',
    '**/*.pem',
    '**/*.key',
    '**/*id_rsa*',
    '**/*id_ed25519*',
    '**/credentials*.json',
    '**/.git/**',
    '**/node_modules/**'
  ],
  allowExternalTelemetry: false,
  localOnly: false,
  retentionDays: 30,
  enablePromptAuditLog: false
}

// Regex patterns for secret detection
const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  {
    name: 'OpenAI API Key',
    pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{20,80}/g,
    replacement: '[REDACTED_OPENAI_KEY]'
  },
  {
    name: 'Anthropic API Key',
    pattern: /sk-ant-[A-Za-z0-9_-]{20,80}/g,
    replacement: '[REDACTED_ANTHROPIC_KEY]'
  },
  {
    name: 'GitHub Token',
    pattern: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}/g,
    replacement: '[REDACTED_GITHUB_TOKEN]'
  },
  {
    name: 'AWS Access Key ID',
    pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    replacement: '[REDACTED_AWS_KEY]'
  },
  {
    name: 'Private Key Block',
    pattern: /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z]+)? PRIVATE KEY-----/g,
    replacement: '[REDACTED_PRIVATE_KEY]'
  },
  {
    name: 'Authorization Bearer Token',
    pattern: /Bearer\s+([A-Za-z0-9\-._~+/]+=*)/gi,
    replacement: 'Bearer [REDACTED_TOKEN]'
  },
  {
    name: 'Password in URI',
    pattern: /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^:]+):([^@]+)@/g,
    replacement: '$1$2:[REDACTED_PASSWORD]@'
  }
]

export class AiContextEngine {
  private privacySettings: AiPrivacySettings

  constructor(settings?: Partial<AiPrivacySettings>) {
    this.privacySettings = { ...DEFAULT_AI_PRIVACY_SETTINGS, ...settings }
  }

  public getPrivacySettings(): AiPrivacySettings {
    return { ...this.privacySettings }
  }

  public updatePrivacySettings(settings: Partial<AiPrivacySettings>): void {
    this.privacySettings = { ...this.privacySettings, ...settings }
  }

  public isPathExcluded(filePath: string): { excluded: boolean; matchedPattern?: string } {
    const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '')
    const baseName = normalized.split('/').pop() || normalized

    for (const pattern of this.privacySettings.excludedPatterns) {
      const cleanPat = pattern.replace(/\\/g, '/').replace(/^\/+/, '')

      // Check direct base name match (e.g. .env, .env.local, id_rsa)
      const basePat = cleanPat.replace(/^\*\*\/+/, '')
      if (basePat.startsWith('*') || basePat.endsWith('*')) {
        const stripped = basePat.replace(/\*/g, '')
        if (stripped && (baseName.includes(stripped) || normalized.includes(stripped))) {
          return { excluded: true, matchedPattern: pattern }
        }
      }

      // Convert glob to regex
      let regexPattern = cleanPat
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
        .replace(/\*\*\//g, '(.+/)?') // **/ matches zero or more directories
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.')

      const regex = new RegExp(`^${regexPattern}$`, 'i')
      if (regex.test(normalized) || regex.test(baseName)) {
        return { excluded: true, matchedPattern: pattern }
      }

      // Check if path contains excluded folder (e.g. node_modules, .git)
      if (cleanPat.includes('node_modules') && normalized.includes('node_modules')) {
        return { excluded: true, matchedPattern: pattern }
      }
      if (cleanPat.includes('.git') && normalized.includes('.git')) {
        return { excluded: true, matchedPattern: pattern }
      }
    }
    return { excluded: false }
  }

  public redactSecrets(text: string): { text: string; redactedCount: number } {
    if (!this.privacySettings.secretRedaction) {
      return { text, redactedCount: 0 }
    }

    let result = text
    let totalRedacted = 0

    for (const rule of SECRET_PATTERNS) {
      const matches = result.match(rule.pattern)
      if (matches) {
        totalRedacted += matches.length
        result = result.replace(rule.pattern, rule.replacement)
      }
    }

    return { text: result, redactedCount: totalRedacted }
  }

  public estimateTokens(text: string): number {
    if (!text) return 0
    // Standard heuristic: ~ 3.8 chars per token for code/text mix
    return Math.ceil(text.length / 3.8)
  }

  public prepareContextItem(
    rawItem: Omit<AiContextItem, 'sizeBytes' | 'estimatedTokens' | 'excluded' | 'exclusionReason'>
  ): AiContextItem {
    // Check exclusion
    if (rawItem.filePath) {
      const exclusion = this.isPathExcluded(rawItem.filePath)
      if (exclusion.excluded) {
        return {
          ...rawItem,
          content: '',
          sizeBytes: 0,
          estimatedTokens: 0,
          excluded: true,
          exclusionReason: `Matched exclusion pattern: ${exclusion.matchedPattern}`
        }
      }
    }

    // Redact secrets
    const { text: cleanContent } = this.redactSecrets(rawItem.content)
    const sizeBytes = Buffer.byteLength(cleanContent, 'utf8')
    const estimatedTokens = this.estimateTokens(cleanContent)

    return {
      ...rawItem,
      content: cleanContent,
      sizeBytes,
      estimatedTokens,
      excluded: false
    }
  }

  public packContext(
    items: AiContextItem[],
    maxTokenBudget: number = 16000
  ): { packedItems: AiContextItem[]; totalTokens: number; droppedCount: number; truncatedCount: number } {
    // Priority order: selection (1) > diagnostics (2) > file (3) > git (4) > terminal (5) > symbol (6) > workspace (7) > custom (8)
    const priorityWeights: Record<string, number> = {
      selection: 10,
      diagnostics: 9,
      file: 8,
      git: 7,
      terminal: 6,
      symbol: 5,
      workspace: 4,
      custom: 3
    }

    // Filter excluded items
    const usableItems = items.filter((item) => !item.excluded)

    // Sort by priority descending
    usableItems.sort((a, b) => (priorityWeights[b.type] || 0) - (priorityWeights[a.type] || 0))

    let remainingTokens = maxTokenBudget
    const packed: AiContextItem[] = []
    let droppedCount = 0
    let truncatedCount = 0

    for (const item of usableItems) {
      if (remainingTokens <= 50) {
        droppedCount++
        continue
      }

      if (item.estimatedTokens <= remainingTokens) {
        packed.push(item)
        remainingTokens -= item.estimatedTokens
      } else {
        // Truncate to remaining budget
        const allowedChars = Math.floor(remainingTokens * 3.5)
        if (allowedChars > 200) {
          const truncatedContent =
            item.content.slice(0, allowedChars) +
            `\n\n[... truncated ${item.estimatedTokens - remainingTokens} tokens to respect budget ...]`
          const finalItem: AiContextItem = {
            ...item,
            content: truncatedContent,
            estimatedTokens: remainingTokens,
            sizeBytes: Buffer.byteLength(truncatedContent, 'utf8')
          }
          packed.push(finalItem)
          remainingTokens = 0
          truncatedCount++
        } else {
          droppedCount++
        }
      }
    }

    const totalTokens = packed.reduce((acc, it) => acc + it.estimatedTokens, 0)
    return { packedItems: packed, totalTokens, droppedCount, truncatedCount }
  }

  public formatContextForPrompt(items: AiContextItem[]): string {
    if (items.length === 0) return ''

    const sections: string[] = []
    sections.push('### Context provided by user and workspace:')

    for (const item of items) {
      if (item.excluded) continue
      const header = `[Context: ${item.type.toUpperCase()}] ${item.label}${item.filePath ? ` (${item.filePath})` : ''}`
      const fence = item.language ? `\`\`\`${item.language}` : '```'
      sections.push(`${header}\n${fence}\n${item.content}\n\`\`\``)
    }

    return sections.join('\n\n')
  }
}

export const aiContextEngine = new AiContextEngine()

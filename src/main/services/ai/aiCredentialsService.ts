import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import type { AiCredentialSummary } from './aiTypes'

let electronSafeStorage: typeof import('electron').safeStorage | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const electron = require('electron')
  if (electron && electron.safeStorage) {
    electronSafeStorage = electron.safeStorage
  }
} catch {
  electronSafeStorage = null
}

export class AiCredentialsService {
  private storagePath: string
  private memoryVault: Map<string, string> = new Map()
  private isTestOrFallbackMode = false

  constructor(customStorageDir?: string) {
    const baseDir =
      customStorageDir ||
      (process.env.APPDATA
        ? path.join(process.env.APPDATA, 'MaestroCode', 'ai')
        : path.join(process.cwd(), '.maestro', 'ai'))
    this.storagePath = path.join(baseDir, 'credentials.enc')
  }

  private getFallbackKey(): Buffer {
    // Machine/process-tied salt fallback when safeStorage is unavailable
    const machineId = process.env.COMPUTERNAME || process.env.HOSTNAME || 'maestro-local-dev'
    return crypto.scryptSync(machineId, 'maestro-ai-credentials-salt', 32)
  }

  private encrypt(value: string): Buffer {
    if (electronSafeStorage && typeof electronSafeStorage.isEncryptionAvailable === 'function' && electronSafeStorage.isEncryptionAvailable()) {
      return electronSafeStorage.encryptString(value)
    }
    // AES-256-GCM fallback
    const key = this.getFallbackKey()
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    // Prefix with fallback marker: [1 byte version (0xFA)][12 bytes iv][16 bytes tag][cipher text]
    return Buffer.concat([Buffer.from([0xfa]), iv, tag, encrypted])
  }

  private decrypt(buffer: Buffer): string {
    if (buffer.length > 0 && buffer[0] === 0xfa) {
      // Fallback format
      const iv = buffer.subarray(1, 13)
      const tag = buffer.subarray(13, 29)
      const encrypted = buffer.subarray(29)
      const key = this.getFallbackKey()
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    }

    if (electronSafeStorage && typeof electronSafeStorage.decryptString === 'function') {
      return electronSafeStorage.decryptString(buffer)
    }

    throw new Error('Safe storage is not available to decrypt stored credential')
  }

  private async loadVault(): Promise<Record<string, string>> {
    try {
      const data = await fs.readFile(this.storagePath)
      const rawJson = this.decrypt(data)
      return JSON.parse(rawJson)
    } catch {
      return {}
    }
  }

  private async saveVault(vault: Record<string, string>): Promise<void> {
    const dir = path.dirname(this.storagePath)
    await fs.mkdir(dir, { recursive: true })
    const serialized = JSON.stringify(vault)
    const encrypted = this.encrypt(serialized)
    await fs.writeFile(this.storagePath, encrypted)
  }

  public async setCredential(providerId: string, apiKey: string): Promise<void> {
    const trimmed = (apiKey || '').trim()
    if (!trimmed) {
      await this.deleteCredential(providerId)
      return
    }

    this.memoryVault.set(providerId, trimmed)
    try {
      const vault = await this.loadVault()
      vault[providerId] = trimmed
      await this.saveVault(vault)
    } catch {
      // If disk save fails in restricted env, memory vault still preserves for session
    }
  }

  public async getCredential(providerId: string): Promise<string | null> {
    if (this.memoryVault.has(providerId)) {
      return this.memoryVault.get(providerId) || null
    }
    const vault = await this.loadVault()
    if (vault[providerId]) {
      this.memoryVault.set(providerId, vault[providerId])
      return vault[providerId]
    }
    return null
  }

  public async hasCredential(providerId: string): Promise<boolean> {
    const key = await this.getCredential(providerId)
    return Boolean(key && key.length > 0)
  }

  public async deleteCredential(providerId: string): Promise<boolean> {
    this.memoryVault.delete(providerId)
    try {
      const vault = await this.loadVault()
      if (providerId in vault) {
        delete vault[providerId]
        await this.saveVault(vault)
        return true
      }
    } catch {
      // Ignored
    }
    return false
  }

  public static maskKey(key: string): string {
    if (!key) return ''
    if (key.length <= 8) return '********'
    const start = key.slice(0, 3)
    const end = key.slice(-4)
    return `${start}...${end}`
  }

  public async getMaskedCredential(providerId: string): Promise<string | null> {
    const key = await this.getCredential(providerId)
    if (!key) return null
    return AiCredentialsService.maskKey(key)
  }

  public async listCredentialSummaries(providerIds: string[]): Promise<AiCredentialSummary[]> {
    const summaries: AiCredentialSummary[] = []
    for (const pid of providerIds) {
      const key = await this.getCredential(pid)
      summaries.push({
        providerId: pid,
        hasKey: Boolean(key && key.length > 0),
        maskedKey: key ? AiCredentialsService.maskKey(key) : undefined
      })
    }
    return summaries
  }

  public clearMemoryVault(): void {
    this.memoryVault.clear()
  }
}

export const aiCredentialsService = new AiCredentialsService()

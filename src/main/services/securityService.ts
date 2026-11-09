import { safeStorage, app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

export interface StructuredLogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  category: string
  message: string
  meta?: any
}

const structuredLogsBuffer: StructuredLogEntry[] = []
const MAX_STRUCTURED_LOGS = 500

/**
 * Records structured log entries for diagnostics and audit trails
 */
export function logStructured(
  level: 'info' | 'warn' | 'error' | 'debug',
  category: string,
  message: string,
  meta?: any
): StructuredLogEntry {
  const entry: StructuredLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    meta
  }

  structuredLogsBuffer.unshift(entry)
  if (structuredLogsBuffer.length > MAX_STRUCTURED_LOGS) {
    structuredLogsBuffer.pop()
  }
  return entry
}

export function getStructuredLogs(limit = 100, category?: string): StructuredLogEntry[] {
  let list = structuredLogsBuffer
  if (category) {
    list = list.filter((l) => l.category === category)
  }
  return list.slice(0, limit)
}

export function clearStructuredLogs(): void {
  structuredLogsBuffer.length = 0
}

/**
 * Strict IPC Channel Allowlist
 */
export const ALLOWED_IPC_CHANNELS = new Set([
  // File operations
  'fs:readFile',
  'fs:writeFile',
  'fs:readDirectory',
  'fs:exists',
  'fs:createFile',
  'fs:createDirectory',
  'fs:deletePath',
  'fs:renamePath',
  'fs:copyPath',
  'fs:movePath',
  'fs:getProperties',
  'fs:showItemInFolder',
  'fs:searchFiles',
  // Git operations
  'git:getStatus',
  'git:stageFile',
  'git:unstageFile',
  'git:stageAll',
  'git:unstageAll',
  'git:discardFile',
  'git:discardAll',
  'git:stageHunk',
  'git:unstageHunk',
  'git:discardHunk',
  'git:commit',
  'git:commitAll',
  'git:commitAmend',
  'git:push',
  'git:pull',
  'git:createBranch',
  'git:checkoutBranch',
  'git:getBranches',
  'git:renameBranch',
  'git:publishBranch',
  'git:deleteBranch',
  'git:getHistory',
  'git:revert',
  'git:cherryPick',
  'git:reset',
  'git:formatTaskCommitMessage',
  'git:extractTaskIds',
  'git:getTaskTimeline',
  'git:previewBranchCleanup',
  'git:deleteMergedBranches',
  'git:verifyTaskBranches',
  'git:evaluateTransition',
  // Search
  'search:inFiles',
  'search:inWorkspaces',
  'search:replaceInWorkspaces',
  'search:cancel',
  // Project Management
  'project:loadData',
  'project:saveData',
  'project:detectPackageManager',
  'project:createBackup',
  'project:listBackups',
  'project:restoreBackup',
  'project:validateCodeLinks',
  'project:filterByFile',
  'project:executeTransaction',
  'project:appendJournal',
  'project:getJournal',
  'project:clearJournal',
  'project:recordSyncHistory',
  'project:getSyncHistory',
  'project:saveAttachment',
  'project:listAttachments',
  'project:deleteAttachment',
  'project:recordTombstone',
  'project:getTombstones',
  'project:getAutoSyncConfig',
  'project:setAutoSyncConfig',
  'project:saveBufferSnapshot',
  'project:getBufferSnapshots',
  'project:clearBufferSnapshot',
  'project:migrateSchema',
  // Settings & Workspaces
  'settings:load',
  'settings:save',
  'settings:loadFolder',
  'settings:getEffectiveInspector',
  'settings:validateJson',
  'settings:validateEditorConfig',
  'settings:safeWrite',
  'workspace:getRecent',
  'workspace:addRecent',
  'workspace:removeRecent',
  'workspace:isTrusted',
  'workspace:setTrusted',
  // Tasks & Terminal
  'tasks:get',
  'tasks:resolvePlan',
  'tasks:interpolateVariables',
  'tasks:validateSafety',
  'tasks:parseProblems',
  'tasks:recordStart',
  'tasks:recordEnd',
  'tasks:cancel',
  'tasks:getHistory',
  'tasks:clearHistory',
  'terminal:getShells',
  'terminal:validateShell',
  'terminal:create',
  'terminal:write',
  'terminal:interrupt',
  'terminal:resize',
  'terminal:kill',
  // LSP & DAP
  'lsp:start',
  'lsp:stop',
  'lsp:send',
  'lsp:cancel',
  'dap:startSession',
  'dap:stopSession',
  'dap:restartSession',
  'dap:pause',
  'dap:continue',
  'dap:next',
  'dap:stepIn',
  'dap:stepOut',
  'dap:setBreakpoints',
  'dap:getBreakpoints',
  'dap:validateSecurity',
  'dap:getActiveSessions',
  'dap:focusSession',
  'dap:resolveSourceMap',
  'dap:evaluate',
  // Testing
  'test:discover',
  'test:run',
  'test:cancel',
  // Extension Ecosystem & Extension Host
  'extension:load',
  'extension:toggle',
  'extension:install',
  'extension:uninstall',
  'extension:getCommands',
  'extension:executeCommand',
  // System diagnostics & Process manager
  'app:getSystemDiagnostics',
  'app:exportDiagnostics',
  'process:getManaged',
  'process:killTree',
  'security:storeSecret',
  'security:getSecret',
  'security:deleteSecret',
  'security:getLogs'
])

/**
 * Validates IPC channels and prevents arbitrary execution or unallowlisted calls
 */
export function validateIpcChannel(channel: string): { allowed: boolean; reason?: string } {
  if (!ALLOWED_IPC_CHANNELS.has(channel)) {
    return {
      allowed: false,
      reason: `IPC Channel "${channel}" is not on the strict security allowlist.`
    }
  }
  return { allowed: true }
}

function getSecureStorageDir(): string {
  try {
    return path.join(app.getPath('userData'), 'secure')
  } catch {
    return path.join(process.env.APPDATA || process.env.HOME || '.', '.maestro-studio', 'secure')
  }
}

/**
 * Stores a secret securely using electron safeStorage (DPAPI / Keychain / Secret Service)
 * with base64 fallback when safeStorage is not available.
 */
export async function storeSecureSecret(key: string, value: string): Promise<boolean> {
  const dir = getSecureStorageDir()
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, `${encodeURIComponent(key)}.enc`)

  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(value)
      await fs.writeFile(filePath, encrypted)
    } else {
      const obfuscated = Buffer.from(value, 'utf-8').toString('base64')
      await fs.writeFile(filePath, obfuscated, 'utf-8')
    }
    logStructured('info', 'security', `Stored secret for key: ${key}`)
    return true
  } catch (err: any) {
    logStructured('error', 'security', `Failed storing secret for key: ${key}`, { error: err.message })
    return false
  }
}

/**
 * Retrieves a decrypted secret by key
 */
export async function getSecureSecret(key: string): Promise<string | null> {
  const dir = getSecureStorageDir()
  const filePath = path.join(dir, `${encodeURIComponent(key)}.enc`)

  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const encrypted = await fs.readFile(filePath)
      return safeStorage.decryptString(encrypted)
    } else {
      const obfuscated = await fs.readFile(filePath, 'utf-8')
      return Buffer.from(obfuscated, 'base64').toString('utf-8')
    }
  } catch {
    return null
  }
}

/**
 * Deletes a stored secret
 */
export async function deleteSecureSecret(key: string): Promise<boolean> {
  const dir = getSecureStorageDir()
  const filePath = path.join(dir, `${encodeURIComponent(key)}.enc`)

  try {
    await fs.unlink(filePath)
    logStructured('info', 'security', `Deleted secret for key: ${key}`)
    return true
  } catch {
    return false
  }
}

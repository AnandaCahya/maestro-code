import os from 'os'
import fs from 'fs/promises'
import path from 'path'
import { app } from 'electron'
import { redactSecrets } from './fileService'

export interface SystemDiagnostics {
  app: {
    name: string
    version: string
    electron: string
    chrome: string
    node: string
    v8: string
  }
  system: {
    platform: string
    type: string
    release: string
    arch: string
    uptimeSeconds: number
    totalMemoryMB: number
    freeMemoryMB: number
    cpuCount: number
    cpuModel: string
  }
  process: {
    pid: number
    memoryUsageMB: {
      rss: number
      heapTotal: number
      heapUsed: number
      external: number
    }
  }
  workspace?: {
    path: string
  }
  timestamp: number
}

export function getSystemDiagnostics(workspacePath?: string): SystemDiagnostics {
  const mem = process.memoryUsage()
  const cpus = os.cpus()

  return {
    app: {
      name: app.getName(),
      version: app.getVersion(),
      electron: process.versions.electron || 'unknown',
      chrome: process.versions.chrome || 'unknown',
      node: process.versions.node,
      v8: process.versions.v8
    },
    system: {
      platform: os.platform(),
      type: os.type(),
      release: os.release(),
      arch: os.arch(),
      uptimeSeconds: Math.round(os.uptime()),
      totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
      cpuCount: cpus.length,
      cpuModel: cpus[0]?.model || 'unknown'
    },
    process: {
      pid: process.pid,
      memoryUsageMB: {
        rss: Math.round(mem.rss / (1024 * 1024)),
        heapTotal: Math.round(mem.heapTotal / (1024 * 1024)),
        heapUsed: Math.round(mem.heapUsed / (1024 * 1024)),
        external: Math.round(mem.external / (1024 * 1024))
      }
    },
    workspace: workspacePath ? { path: workspacePath } : undefined,
    timestamp: Date.now()
  }
}

export async function exportDiagnosticsBundle(
  workspacePath?: string
): Promise<{ ok: boolean; path: string; error?: string }> {
  try {
    const diag = getSystemDiagnostics(workspacePath)
    const jsonStr = redactSecrets(JSON.stringify(diag, null, 2))

    let targetDir = os.tmpdir()
    if (workspacePath) {
      targetDir = path.join(workspacePath, '.maestro')
      await fs.mkdir(targetDir, { recursive: true }).catch(() => {})
    }

    const filename = `diagnostics-${Date.now()}.json`
    const filePath = path.join(targetDir, filename)

    await fs.writeFile(filePath, jsonStr, 'utf-8')
    return { ok: true, path: filePath }
  } catch (err: any) {
    return { ok: false, path: '', error: err?.message || 'Failed to export bundle' }
  }
}

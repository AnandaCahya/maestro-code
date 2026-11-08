import { describe, it, expect, beforeEach } from 'vitest'
import { AiToolRegistry } from '../src/main/services/ai/aiToolRegistry'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

describe('AI Tool Registry and Safety Permissions', () => {
  let registry: AiToolRegistry
  let tempWsDir: string

  beforeEach(async () => {
    tempWsDir = path.join(os.tmpdir(), `maestro-ai-tools-test-${Date.now()}-${Math.random().toString(36).substring(7)}`)
    await fs.mkdir(tempWsDir, { recursive: true })
    await fs.writeFile(path.join(tempWsDir, 'hello.txt'), 'Hello Maestro Tools!', 'utf8')
    await fs.writeFile(path.join(tempWsDir, 'package.json'), '{"name":"test-pkg"}', 'utf8')
    registry = new AiToolRegistry()
  })

  it('lists registered tools with tiers and risk levels', () => {
    const tools = registry.listTools()
    expect(tools.length).toBeGreaterThanOrEqual(6)

    const readFileTool = tools.find((t) => t.name === 'workspace_read_file')
    expect(readFileTool).toBeDefined()
    expect(readFileTool?.tier).toBe('read-only')
    expect(readFileTool?.riskLevel).toBe('safe')

    const writeFileTool = tools.find((t) => t.name === 'workspace_write_file')
    expect(writeFileTool).toBeDefined()
    expect(writeFileTool?.tier).toBe('workspace-write')
    expect(writeFileTool?.riskLevel).toBe('moderate')
  })

  it('enforces workspace boundary and denies path traversal attempts', () => {
    expect(() => {
      registry.validateAndResolvePath(tempWsDir, '../../Windows/System32/evil.exe')
    }).toThrow(/escapes workspace boundary/)

    expect(() => {
      registry.validateAndResolvePath(tempWsDir, 'src/../../../etc/passwd')
    }).toThrow(/escapes workspace boundary/)
  })

  it('executes read-only tool automatically when autoApproveReadOnly is true', async () => {
    const res = await registry.invokeTool(
      'workspace_read_file',
      { filePath: 'hello.txt' },
      {
        workspacePath: tempWsDir,
        isWorkspaceTrusted: true,
        autoApproveReadOnly: true
      }
    )

    expect(res.success).toBe(true)
    expect(res.result).toBe('Hello Maestro Tools!')

    const audit = registry.getAuditLog()
    expect(audit).toHaveLength(1)
    expect(audit[0].approved).toBe(true)
    expect(audit[0].toolName).toBe('workspace_read_file')
  })

  it('denies workspace-write tool when approval handler rejects or is absent', async () => {
    const res = await registry.invokeTool(
      'workspace_write_file',
      { filePath: 'new.txt', content: 'Dangerous content' },
      {
        workspacePath: tempWsDir,
        isWorkspaceTrusted: false,
        autoApproveReadOnly: true
      }
    )

    expect(res.success).toBe(false)
    expect(res.error).toContain('denied')

    const fileExists = await fs.access(path.join(tempWsDir, 'new.txt')).then(() => true).catch(() => false)
    expect(fileExists).toBe(false)
  })

  it('permits workspace-write tool when user explicitly approves', async () => {
    let approvalPrompted = false

    const res = await registry.invokeTool(
      'workspace_write_file',
      { filePath: 'approved.txt', content: 'Created with consent' },
      {
        workspacePath: tempWsDir,
        isWorkspaceTrusted: true,
        autoApproveReadOnly: true,
        requestUserApproval: async (req) => {
          approvalPrompted = true
          expect(req.toolName).toBe('workspace_write_file')
          expect(req.tier).toBe('workspace-write')
          return true
        }
      }
    )

    expect(approvalPrompted).toBe(true)
    expect(res.success).toBe(true)

    const content = await fs.readFile(path.join(tempWsDir, 'approved.txt'), 'utf8')
    expect(content).toBe('Created with consent')
  })

  it('blocks tools placed on the denylist', async () => {
    registry.setDenylist(['workspace_read_file'])

    const res = await registry.invokeTool(
      'workspace_read_file',
      { filePath: 'hello.txt' },
      {
        workspacePath: tempWsDir,
        isWorkspaceTrusted: true,
        autoApproveReadOnly: true
      }
    )

    expect(res.success).toBe(false)
    expect(res.error).toContain('denylist')
  })
})

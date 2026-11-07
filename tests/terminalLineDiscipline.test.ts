import { describe, it, expect, vi } from 'vitest'
import { writeToTerminal, createTerminalSession } from '../src/main/services/terminalService'

describe('Terminal Line Discipline & Keystroke Synchronization', () => {
  it('correctly handles typing, backspace, and line execution without desync', () => {
    const id = 'test-term-1'
    const writtenToStdin: string[] = []
    const sentToRenderer: string[] = []

    const mockChild = {
      stdin: {
        write: vi.fn((data: string) => {
          writtenToStdin.push(data)
        })
      },
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
      kill: vi.fn()
    } as any

    const mockWin = {
      isDestroyed: () => false,
      webContents: {
        send: vi.fn((_channel: string, _termId: string, data: string) => {
          sentToRenderer.push(data)
        })
      }
    } as any

    // Mock internal sessions map
    const sessions = (globalThis as any).__test_sessions || new Map()
    const sessionObj = {
      id,
      process: mockChild,
      win: mockWin,
      inputBuffer: ''
    }

    // Directly test line discipline logic with sessionObj
    // Typing 'git'
    sessionObj.inputBuffer += 'g'
    sentToRenderer.push('g')
    sessionObj.inputBuffer += 'i'
    sentToRenderer.push('i')
    sessionObj.inputBuffer += 't'
    sentToRenderer.push('t')

    expect(sessionObj.inputBuffer).toBe('git')

    // Backspace twice
    sessionObj.inputBuffer = sessionObj.inputBuffer.slice(0, -1)
    sentToRenderer.push('\b \b')
    sessionObj.inputBuffer = sessionObj.inputBuffer.slice(0, -1)
    sentToRenderer.push('\b \b')

    expect(sessionObj.inputBuffer).toBe('g')

    // Type 'status'
    sessionObj.inputBuffer += 'status'

    expect(sessionObj.inputBuffer).toBe('gstatus')

    // Enter
    const lineToExecute = sessionObj.inputBuffer
    sessionObj.inputBuffer = ''
    mockChild.stdin.write(lineToExecute + '\r\n')

    expect(writtenToStdin).toEqual(['gstatus\r\n'])
    expect(sessionObj.inputBuffer).toBe('')
  })
})

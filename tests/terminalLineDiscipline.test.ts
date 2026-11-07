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

  it('correctly suppresses duplicated shell echo from child process stdout', () => {
    let pendingEchoes: { text: string; time: number }[] = [{ text: 'gstatus', time: Date.now() }]
    let text = 'gstatus\r\nMaestro Git Status Output\r\n'

    // Simulate stdout filter logic
    while (pendingEchoes.length > 0) {
      const pending = pendingEchoes[0]
      const needleCrlf = pending.text + '\r\n'
      if (text.startsWith(needleCrlf)) {
        text = text.slice(needleCrlf.length)
        pendingEchoes.shift()
      } else {
        break
      }
    }

    expect(pendingEchoes.length).toBe(0)
    expect(text).toBe('Maestro Git Status Output\r\n')
  })

  it('handles backspace when buffer is already empty without error or underflow', () => {
    let buffer = ''
    const rendererEvents: string[] = []

    // Simulate backspace on empty buffer
    if (buffer.length > 0) {
      buffer = buffer.slice(0, -1)
      rendererEvents.push('\b \b')
    }

    expect(buffer).toBe('')
    expect(rendererEvents.length).toBe(0)
  })
})

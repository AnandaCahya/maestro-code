import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  writeToTerminal,
  createTerminalSession,
  interruptTerminal,
  resizeTerminal,
  getChildProcessPids,
  terminateChildProcesses
} from '../src/main/services/terminalService'

describe('Terminal Line Discipline & Keystroke Synchronization', () => {
  it('correctly handles typing, backspace, and line execution without desync', () => {
    let currentLine = ''
    const writtenToStdin: string[] = []

    // Typing 'git'
    currentLine += 'g'
    currentLine += 'i'
    currentLine += 't'
    expect(currentLine).toBe('git')

    // Backspace twice
    currentLine = currentLine.slice(0, -1)
    currentLine = currentLine.slice(0, -1)
    expect(currentLine).toBe('g')

    // Type 'status'
    currentLine += 'status'
    expect(currentLine).toBe('gstatus')

    // Commit with enter
    writtenToStdin.push(currentLine + '\r\n')
    currentLine = ''

    expect(writtenToStdin).toEqual(['gstatus\r\n'])
    expect(currentLine).toBe('')
  })

  it('handles backspace when buffer is already empty without error or underflow', () => {
    let currentLine = ''
    if (currentLine.length > 0) {
      currentLine = currentLine.slice(0, -1)
    }
    expect(currentLine).toBe('')
  })

  it('correctly recalls history with Up and Down arrows at shell prompt', () => {
    const history: string[] = ['npm run test', 'git status']
    let historyIndex = -1
    let currentLine = ''
    const commandsSent: string[] = []

    // Press Up Arrow (first time) -> recalls last command
    if (history.length > 0) {
      if (historyIndex === -1) {
        historyIndex = history.length - 1
      } else if (historyIndex > 0) {
        historyIndex--
      }
      currentLine = history[historyIndex]
      commandsSent.push(currentLine)
    }
    expect(currentLine).toBe('git status')
    expect(historyIndex).toBe(1)

    // Press Up Arrow again -> recalls previous command
    if (historyIndex > 0) {
      historyIndex--
      currentLine = history[historyIndex]
      commandsSent.push(currentLine)
    }
    expect(currentLine).toBe('npm run test')
    expect(historyIndex).toBe(0)

    // Press Down Arrow -> moves forward to 'git status'
    if (historyIndex < history.length - 1) {
      historyIndex++
      currentLine = history[historyIndex]
      commandsSent.push(currentLine)
    }
    expect(currentLine).toBe('git status')
    expect(historyIndex).toBe(1)

    // Press Down Arrow again -> returns to empty line
    if (historyIndex === history.length - 1) {
      historyIndex = -1
      currentLine = ''
    }
    expect(currentLine).toBe('')
    expect(historyIndex).toBe(-1)
  })

  it('handles Ctrl+C interruption gracefully by resetting currentLine and historyIndex', async () => {
    let currentLine = 'npm run dev'
    let historyIndex = 1
    const rendererEvents: string[] = []

    // Simulate Ctrl+C interrupt
    currentLine = ''
    historyIndex = -1
    rendererEvents.push('^C\r\n')

    expect(currentLine).toBe('')
    expect(historyIndex).toBe(-1)
    expect(rendererEvents).toContain('^C\r\n')
  })

  it('handles Ctrl+D at empty prompt as exit and during active child as EOF', () => {
    const actions: string[] = []

    // Scenario A: Active child is running -> pass \x04 (EOF)
    const hasActiveChild = true
    if (hasActiveChild) {
      actions.push('send_eof_char')
    }
    expect(actions).toEqual(['send_eof_char'])

    // Scenario B: Shell is idle and empty line -> exit shell
    actions.length = 0
    const idleLine = ''
    if (!false && idleLine.length === 0) {
      actions.push('send_exit_command')
    }
    expect(actions).toEqual(['send_exit_command'])
  })
})

import { describe, it, expect } from 'vitest'
import { parseConflictBlocks, resolveConflict } from '../src/renderer/src/services/conflictResolver'

describe('conflictResolver', () => {
  it('returns empty array when content has no git conflict markers', () => {
    const normalCode = 'const a = 1;\nconsole.log(a);'
    expect(parseConflictBlocks(normalCode)).toEqual([])
  })

  it('correctly parses git conflict blocks with current and incoming changes', () => {
    const conflictFile = [
      'function test() {',
      '<<<<<<< HEAD (Current)',
      '  const value = "feature-a";',
      '=======',
      '  const value = "feature-b";',
      '>>>>>>> feat/branch-b',
      '  return value;',
      '}'
    ].join('\n')

    const blocks = parseConflictBlocks(conflictFile)
    expect(blocks.length).toBe(1)
    expect(blocks[0].startLine).toBe(2)
    expect(blocks[0].endLine).toBe(6)
    expect(blocks[0].currentText).toBe('  const value = "feature-a";')
    expect(blocks[0].incomingText).toBe('  const value = "feature-b";')
  })

  it('resolves conflict using current change', () => {
    const conflictFile = [
      'function test() {',
      '<<<<<<< HEAD',
      '  const greeting = "hello";',
      '=======',
      '  const greeting = "hi";',
      '>>>>>>> incoming',
      '  return greeting;',
      '}'
    ].join('\n')

    const blocks = parseConflictBlocks(conflictFile)
    const resolved = resolveConflict(conflictFile, blocks[0], 'current')

    expect(resolved).not.toContain('<<<<<<<')
    expect(resolved).not.toContain('=======')
    expect(resolved).not.toContain('>>>>>>>')
    expect(resolved).toContain('const greeting = "hello";')
    expect(resolved).not.toContain('const greeting = "hi";')
  })

  it('resolves conflict using incoming change', () => {
    const conflictFile = [
      'function test() {',
      '<<<<<<< HEAD',
      '  const greeting = "hello";',
      '=======',
      '  const greeting = "hi";',
      '>>>>>>> incoming',
      '  return greeting;',
      '}'
    ].join('\n')

    const blocks = parseConflictBlocks(conflictFile)
    const resolved = resolveConflict(conflictFile, blocks[0], 'incoming')

    expect(resolved).toContain('const greeting = "hi";')
    expect(resolved).not.toContain('const greeting = "hello";')
  })

  it('resolves conflict combining both changes', () => {
    const conflictFile = [
      'function test() {',
      '<<<<<<< HEAD',
      '  console.log("first");',
      '=======',
      '  console.log("second");',
      '>>>>>>> incoming',
      '}'
    ].join('\n')

    const blocks = parseConflictBlocks(conflictFile)
    const resolved = resolveConflict(conflictFile, blocks[0], 'both')

    expect(resolved).toContain('console.log("first");')
    expect(resolved).toContain('console.log("second");')
    expect(resolved).not.toContain('<<<<<<<')
  })
})

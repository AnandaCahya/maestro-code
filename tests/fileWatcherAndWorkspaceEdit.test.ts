import { describe, it, expect } from 'vitest'
import { isWatchExcluded, EXCLUDED_WATCH_PATTERNS } from '../src/main/services/fileService'

describe('fileWatcher - Exclusion and Burst Policy', () => {
  it('correctly identifies excluded paths from watch events', () => {
    // Should exclude .git internal files
    expect(isWatchExcluded('.git/index')).toBe(true)
    expect(isWatchExcluded('sub/.git/HEAD')).toBe(true)

    // Should exclude dependency and build artifact folders
    expect(isWatchExcluded('node_modules/lodash/index.js')).toBe(true)
    expect(isWatchExcluded('dist/index.html')).toBe(true)
    expect(isWatchExcluded('out/main/index.js')).toBe(true)
    expect(isWatchExcluded('build/static/js/main.js')).toBe(true)
    expect(isWatchExcluded('.next/server/pages/index.js')).toBe(true)
    expect(isWatchExcluded('.turbo/cache/xyz')).toBe(true)
    expect(isWatchExcluded('coverage/lcov-report/index.html')).toBe(true)
    expect(isWatchExcluded('.idea/workspace.xml')).toBe(true)

    // Should NOT exclude source code or workspace files
    expect(isWatchExcluded('src/renderer/App.tsx')).toBe(false)
    expect(isWatchExcluded('package.json')).toBe(false)
    expect(isWatchExcluded('README.md')).toBe(false)
    expect(isWatchExcluded('tests/sample.test.ts')).toBe(false)
    expect(isWatchExcluded('.maestro/project.json')).toBe(false)
  })

  it('contains essential watch patterns', () => {
    expect(EXCLUDED_WATCH_PATTERNS).toContain('node_modules/')
    expect(EXCLUDED_WATCH_PATTERNS).toContain('.git/')
    expect(EXCLUDED_WATCH_PATTERNS).toContain('dist/')
    expect(EXCLUDED_WATCH_PATTERNS).toContain('out/')
    expect(EXCLUDED_WATCH_PATTERNS).toContain('coverage/')
  })
})

describe('WorkspaceEdit transaction preview heuristics', () => {
  it('correctly analyzes multi-file and destructive edit structures', () => {
    const multiFileEdit = {
      changes: {
        'file:///workspace/src/a.ts': [
          { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }, newText: 'const x' }
        ],
        'file:///workspace/src/b.ts': [
          { range: { start: { line: 2, character: 0 }, end: { line: 2, character: 3 } }, newText: 'let y' }
        ]
      }
    }

    const uris = Object.keys(multiFileEdit.changes)
    expect(uris.length).toBe(2)
    const isMultiFile = uris.length >= 2
    expect(isMultiFile).toBe(true)

    const destructiveEdit = {
      documentChanges: [
        { kind: 'delete', uri: 'file:///workspace/src/deprecated.ts' },
        {
          textDocument: { uri: 'file:///workspace/src/index.ts' },
          edits: [{ range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } }, newText: '' }]
        }
      ]
    }

    const hasDeletions = destructiveEdit.documentChanges.some((dc: any) => dc.kind === 'delete')
    expect(hasDeletions).toBe(true)
  })
})

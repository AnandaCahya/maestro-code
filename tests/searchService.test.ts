import { describe, it, expect } from 'vitest'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'
import { searchInFiles, cancelSearch, getReplacePreview } from '../src/main/services/searchService'

describe('Search Service & Replace Previews', () => {
  it('searches text across files and returns grouped line matches', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-search-test-'))
    try {
      const file1 = path.join(tmpDir, 'file1.txt')
      const file2 = path.join(tmpDir, 'file2.js')
      await fs.writeFile(file1, 'hello world\ncyber bento maestro\nfoo bar')
      await fs.writeFile(file2, 'const studio = "maestro"\nconsole.log(studio)')

      const results = await searchInFiles(tmpDir, 'maestro', { isCaseSensitive: false })
      expect(results.length).toBe(2)
      const matchesTotal = results.reduce((acc, r) => acc + r.matches.length, 0)
      expect(matchesTotal).toBe(2)

      const previews = await getReplacePreview(tmpDir, 'maestro', 'composer')
      expect(previews.length).toBe(2)
      expect(previews[0].previewReplacedLine).toContain('composer')

      // Verify original file on disk was NOT modified by preview
      const content1 = await fs.readFile(file1, 'utf-8')
      expect(content1).toContain('maestro')
      expect(content1).not.toContain('composer')
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('supports cancellation of active search', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-search-cancel-'))
    try {
      for (let i = 0; i < 30; i++) {
        await fs.writeFile(path.join(tmpDir, `doc_${i}.txt`), `Line with search keyword sample ${i}`)
      }

      // Trigger search and cancel in-flight
      const searchPromise = searchInFiles(tmpDir, 'keyword')
      cancelSearch()
      const results = await searchPromise
      expect(results.length).toBeLessThan(30)
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })
})

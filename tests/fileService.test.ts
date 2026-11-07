import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import {
  writeFileContent,
  detectFileEncoding,
  readDirectory
} from '../src/main/services/fileService'
import { searchInWorkspaces } from '../src/main/services/searchService'
import { parseGitDiffHunks } from '../src/main/services/gitService'

describe('fileService - Hardening and Encoding', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-fs-test-'))
  })

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  it('performs atomic write without leaving temporary files', async () => {
    const targetFile = path.join(testDir, 'atomic-test.txt')
    const content = 'Hello Maestro Atomic File'

    const ok = await writeFileContent(targetFile, content, { atomic: true })
    expect(ok).toBe(true)

    const read = await fs.readFile(targetFile, 'utf-8')
    expect(read).toBe(content)

    // Ensure no .maestro-tmp files remain in directory
    const files = await fs.readdir(testDir)
    const tmpFiles = files.filter((f) => f.startsWith('.maestro-tmp'))
    expect(tmpFiles.length).toBe(0)
  })

  it('detects UTF-8, UTF-8 BOM, UTF-16, and Binary encodings', async () => {
    const utf8File = path.join(testDir, 'plain.txt')
    await fs.writeFile(utf8File, 'Hello ASCII and UTF-8 world')
    const utf8Res = await detectFileEncoding(utf8File)
    expect(utf8Res.encoding).toBe('utf-8')
    expect(utf8Res.hasBOM).toBe(false)
    expect(utf8Res.isBinary).toBe(false)

    // UTF-8 with BOM
    const bomFile = path.join(testDir, 'bom.txt')
    const bomBuf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('BOM text')])
    await fs.writeFile(bomFile, bomBuf)
    const bomRes = await detectFileEncoding(bomFile)
    expect(bomRes.encoding).toBe('utf-8-bom')
    expect(bomRes.hasBOM).toBe(true)
    expect(bomRes.isBinary).toBe(false)

    // UTF-16 LE
    const utf16leFile = path.join(testDir, 'utf16le.txt')
    const utf16leBuf = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from('H\0i\0', 'binary')
    ])
    await fs.writeFile(utf16leFile, utf16leBuf)
    const utf16leRes = await detectFileEncoding(utf16leFile)
    expect(utf16leRes.encoding).toBe('utf-16le')
    expect(utf16leRes.hasBOM).toBe(true)

    // Binary file (contains null byte without BOM)
    const binFile = path.join(testDir, 'sample.bin')
    const binBuf = Buffer.from([0x48, 0x65, 0x00, 0x6c, 0x6f])
    await fs.writeFile(binFile, binBuf)
    const binRes = await detectFileEncoding(binFile)
    expect(binRes.encoding).toBe('binary')
    expect(binRes.isBinary).toBe(true)
  })

  it('reads directory entries with proper ordering and directory detection', async () => {
    const folderA = path.join(testDir, 'subfolder')
    await fs.mkdir(folderA)
    await fs.writeFile(path.join(testDir, 'zeta.txt'), 'z')
    await fs.writeFile(path.join(testDir, 'alpha.txt'), 'a')

    const items = await readDirectory(testDir)
    expect(items.length).toBe(3)
    // Directories come first
    expect(items[0].name).toBe('subfolder')
    expect(items[0].isDirectory).toBe(true)
    // Files sorted alphabetically
    expect(items[1].name).toBe('alpha.txt')
    expect(items[1].isDirectory).toBe(false)
    expect(items[2].name).toBe('zeta.txt')
    expect(items[2].isDirectory).toBe(false)
  })
})

describe('searchService - Multi-root workspace search', () => {
  let rootA: string
  let rootB: string

  beforeEach(async () => {
    rootA = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-search-a-'))
    rootB = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-search-b-'))
    await fs.writeFile(path.join(rootA, 'fileA.ts'), 'const greeting = "Hello from Root A";\n')
    await fs.writeFile(path.join(rootB, 'fileB.ts'), 'const greeting = "Hello from Root B";\n')
  })

  afterEach(async () => {
    await fs.rm(rootA, { recursive: true, force: true }).catch(() => {})
    await fs.rm(rootB, { recursive: true, force: true }).catch(() => {})
  })

  it('searches across multiple workspace folders seamlessly', async () => {
    const results = await searchInWorkspaces([rootA, rootB], 'greeting')
    expect(results.length).toBe(2)
    const fileNames = results.map((r) => r.fileName)
    expect(fileNames).toContain('fileA.ts')
    expect(fileNames).toContain('fileB.ts')
  })
})

describe('gitService - Diff Hunk Parsing for Gutter Actions', () => {
  it('parses unified diff hunks correctly with headers and ranges', () => {
    const diff = `diff --git a/src/index.ts b/src/index.ts
index abc..def 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -10,3 +10,4 @@ function test() {
-  const x = 1
+  const x = 2
+  const y = 3
 }
@@ -30,2 +31,2 @@ export default {
-  name: 'old'
+  name: 'new'
 }`

    const hunks = parseGitDiffHunks(diff)
    expect(hunks.length).toBe(2)

    expect(hunks[0].startLine).toBe(10)
    expect(hunks[0].endLine).toBe(13)
    expect(hunks[0].patch).toContain('diff --git a/src/index.ts b/src/index.ts')
    expect(hunks[0].patch).toContain('@@ -10,3 +10,4 @@ function test() {')

    expect(hunks[1].startLine).toBe(31)
    expect(hunks[1].endLine).toBe(32)
    expect(hunks[1].patch).toContain('@@ -30,2 +31,2 @@ export default {')
  })
})

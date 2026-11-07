import { describe, it, expect } from 'vitest'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'
import { readFileBase64, getFileMetadata, sanitizePath } from '../src/main/services/fileService'

describe('Git & Binary File Handling', () => {
  const BINARY_EXTS = /\.(png|jpe?g|gif|ico|webp|exe|dll|so|dylib|bin|wasm|pdf|zip|tar|gz|7z)$/i
  const IMAGE_EXTS = /\.(png|jpe?g|gif|svg|ico|webp|avif|bmp)$/i

  it('correctly classifies binary and image file extensions', () => {
    expect(BINARY_EXTS.test('app.exe')).toBe(true)
    expect(BINARY_EXTS.test('library.dll')).toBe(true)
    expect(BINARY_EXTS.test('archive.tar.gz')).toBe(true)
    expect(BINARY_EXTS.test('document.pdf')).toBe(true)
    expect(BINARY_EXTS.test('script.ts')).toBe(false)
    expect(BINARY_EXTS.test('component.tsx')).toBe(false)

    expect(IMAGE_EXTS.test('logo.png')).toBe(true)
    expect(IMAGE_EXTS.test('photo.JPEG')).toBe(true)
    expect(IMAGE_EXTS.test('icon.svg')).toBe(true)
    expect(IMAGE_EXTS.test('animation.gif')).toBe(true)
    expect(IMAGE_EXTS.test('code.py')).toBe(false)
  })

  it('reads binary images into data URLs and extracts metadata', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-bin-test-'))
    try {
      const samplePng = path.join(tmpDir, 'test.png')
      // Create a dummy 4-byte buffer
      const dummyBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      await fs.writeFile(samplePng, dummyBuffer)

      const dataUrl = await readFileBase64(samplePng)
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true)
      expect(dataUrl).toContain(dummyBuffer.toString('base64'))

      const meta = await getFileMetadata(samplePng)
      expect(meta).not.toBeNull()
      expect(meta?.size).toBe(4)
      expect(meta?.mtime).toBeGreaterThan(0)
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('safely handles non-existent file metadata without throwing', async () => {
    const meta = await getFileMetadata('non_existent_file_path.xyz')
    expect(meta).toBeNull()
  })
})

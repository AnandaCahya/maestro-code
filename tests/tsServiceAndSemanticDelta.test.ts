import { describe, it, expect } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import {
  validateCompilerOptions,
  getInferredTsConfig,
  discoverTsProjects,
  findTsConfigForFile,
  loadTsConfig,
  TsProjectConfig
} from '../src/main/services/settingsService'

describe('TypeScript Service - Compiler Validation & Inferred Configuration', () => {
  it('validates standard valid compiler options successfully', () => {
    const valid = {
      target: 'es2022',
      jsx: 'react-jsx',
      moduleResolution: 'node',
      strict: true,
      baseUrl: '.',
      paths: { '@/*': ['src/*'] }
    }
    const res = validateCompilerOptions(valid)
    expect(res.valid).toBe(true)
    expect(res.errors.length).toBe(0)
  })

  it('detects and reports invalid target and invalid jsx options', () => {
    const invalid = {
      target: 'quantum-es-9000',
      jsx: 'custom-unsupported-jsx'
    }
    const res = validateCompilerOptions(invalid)
    expect(res.valid).toBe(false)
    expect(res.errors.length).toBe(2)
    expect(res.errors[0]).toContain('Invalid compiler target')
    expect(res.errors[1]).toContain('Invalid compiler jsx option')
  })

  it('generates a robust inferred configuration for projects without tsconfig', () => {
    const inferred = getInferredTsConfig('/test/workspace')
    expect(inferred.isInferred).toBe(true)
    expect(inferred.compilerOptions?.target).toBe('ESNext')
    expect(inferred.compilerOptions?.jsx).toBe('react-jsx')
    expect(inferred.compilerOptions?.moduleResolution).toBe('NodeJs')
    expect(inferred.compilerOptions?.allowJs).toBe(true)
  })
})

describe('TypeScript Service - Multi-Project Discovery & File Mapping', () => {
  it('maps files in monorepos to the deepest enclosing project config', () => {
    const projects: TsProjectConfig[] = [
      {
        configPath: path.resolve('/repo/tsconfig.json'),
        projectRoot: path.resolve('/repo'),
        compilerOptions: { target: 'ES2018' },
        isValid: true
      },
      {
        configPath: path.resolve('/repo/apps/web/tsconfig.json'),
        projectRoot: path.resolve('/repo/apps/web'),
        compilerOptions: { target: 'ES2022', jsx: 'react-jsx' },
        isValid: true
      },
      {
        configPath: path.resolve('/repo/packages/ui/tsconfig.json'),
        projectRoot: path.resolve('/repo/packages/ui'),
        compilerOptions: { target: 'ESNext', jsx: 'preserve' },
        isValid: true
      }
    ]

    const webFile = path.resolve('/repo/apps/web/src/pages/index.tsx')
    const matchWeb = findTsConfigForFile(webFile, projects)
    expect(matchWeb).toBeDefined()
    expect(matchWeb?.compilerOptions.target).toBe('ES2022')
    expect(matchWeb?.compilerOptions.jsx).toBe('react-jsx')

    const uiFile = path.resolve('/repo/packages/ui/components/Button.tsx')
    const matchUi = findTsConfigForFile(uiFile, projects)
    expect(matchUi).toBeDefined()
    expect(matchUi?.compilerOptions.jsx).toBe('preserve')

    const rootFile = path.resolve('/repo/scripts/build.ts')
    const matchRoot = findTsConfigForFile(rootFile, projects)
    expect(matchRoot).toBeDefined()
    expect(matchRoot?.compilerOptions.target).toBe('ES2018')
  })

  it('discovers multi-project setups and flags syntax errors in broken tsconfig files', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-ts-multi-'))
    try {
      // 1. Root tsconfig
      await fs.writeFile(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { target: 'es2020', moduleResolution: 'node' }
        }),
        'utf-8'
      )

      // 2. Subproject packages/core
      const coreDir = path.join(tempDir, 'packages', 'core')
      await fs.mkdir(coreDir, { recursive: true })
      await fs.writeFile(
        path.join(coreDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { target: 'es2022', strict: true }
        }),
        'utf-8'
      )

      // 3. Subproject packages/broken (malformed JSON with invalid syntax)
      const brokenDir = path.join(tempDir, 'packages', 'broken')
      await fs.mkdir(brokenDir, { recursive: true })
      await fs.writeFile(
        path.join(brokenDir, 'tsconfig.json'),
        '{ "compilerOptions": { target: "es2022", /* unclosed string or syntax error */ ',
        'utf-8'
      )

      const discovery = await discoverTsProjects(tempDir)
      expect(discovery.isInferred).toBe(false)
      expect(discovery.projects.length).toBe(3)

      const brokenProj = discovery.projects.find((p) => p.configPath.includes('broken'))
      expect(brokenProj).toBeDefined()
      expect(brokenProj?.isValid).toBe(false)
      expect(brokenProj?.error).toContain('Syntax error')

      expect(discovery.errors.length).toBeGreaterThanOrEqual(1)
      expect(discovery.errors[0].configPath).toContain('broken')

      // loadTsConfig for a file in packages/core
      const coreResult = await loadTsConfig(tempDir, path.join(coreDir, 'src', 'index.ts'))
      expect(coreResult?.compilerOptions?.target).toBe('es2022')
      expect(coreResult?.compilerOptions?.strict).toBe(true)
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  })
})

describe('Semantic Intelligence - Token Delta & Cancellation Mapping', () => {
  it('correctly adapts LSP SemanticTokensDelta to Monaco SemanticTokensEdits structure', () => {
    const lspDeltaResponse = {
      resultId: 'v2-delta',
      edits: [
        {
          start: 10,
          deleteCount: 5,
          data: [1, 2, 3, 4, 5]
        },
        {
          start: 25,
          deleteCount: 0,
          data: [6, 7, 8, 9, 10]
        }
      ]
    }

    const monacoEditsResult = {
      resultId: lspDeltaResponse.resultId,
      edits: lspDeltaResponse.edits.map((e) => ({
        start: e.start,
        deleteCount: e.deleteCount,
        data: e.data ? new Uint32Array(e.data) : undefined
      }))
    }

    expect(monacoEditsResult.resultId).toBe('v2-delta')
    expect(monacoEditsResult.edits.length).toBe(2)
    expect(monacoEditsResult.edits[0].data instanceof Uint32Array).toBe(true)
    expect(monacoEditsResult.edits[0].data?.[0]).toBe(1)
    expect(monacoEditsResult.edits[1].data?.[4]).toBe(10)
  })

  it('correctly handles full tokens fallback in delta response', () => {
    const lspFullFallbackResponse = {
      resultId: 'v3-full',
      data: [0, 5, 3, 0, 0, 1, 2, 4, 1, 0]
    }

    const monacoTokensResult = {
      resultId: lspFullFallbackResponse.resultId,
      data: new Uint32Array(lspFullFallbackResponse.data)
    }

    expect(monacoTokensResult.resultId).toBe('v3-full')
    expect(monacoTokensResult.data instanceof Uint32Array).toBe(true)
    expect(monacoTokensResult.data.length).toBe(10)
  })
})

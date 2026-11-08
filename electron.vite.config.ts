import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// Ensure Electron runs as a desktop application even if launched from an agent / IDE terminal
delete process.env.ELECTRON_RUN_AS_NODE

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: [
        { find: '@renderer', replacement: resolve('src/renderer/src') },
        { find: /^monaco-editor\/editor\/editor\.worker/, replacement: resolve('node_modules/monaco-editor/esm/vs/editor/editor.worker.js') },
        { find: /^monaco-editor\/language\/json\/json\.worker/, replacement: resolve('node_modules/monaco-editor/esm/vs/language/json/json.worker.js') },
        { find: /^monaco-editor\/language\/css\/css\.worker/, replacement: resolve('node_modules/monaco-editor/esm/vs/language/css/css.worker.js') },
        { find: /^monaco-editor\/language\/html\/html\.worker/, replacement: resolve('node_modules/monaco-editor/esm/vs/language/html/html.worker.js') },
        { find: /^monaco-editor\/language\/typescript\/ts\.worker/, replacement: resolve('node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js') },
        { find: /^monaco-editor\/esm\/vs\/editor\/editor\.worker/, replacement: resolve('node_modules/monaco-editor/esm/vs/editor/editor.worker.js') },
        { find: /^monaco-editor\/esm\/vs\/language\/json\/json\.worker/, replacement: resolve('node_modules/monaco-editor/esm/vs/language/json/json.worker.js') },
        { find: /^monaco-editor\/esm\/vs\/language\/css\/css\.worker/, replacement: resolve('node_modules/monaco-editor/esm/vs/language/css/css.worker.js') },
        { find: /^monaco-editor\/esm\/vs\/language\/html\/html\.worker/, replacement: resolve('node_modules/monaco-editor/esm/vs/language/html/html.worker.js') },
        { find: /^monaco-editor\/esm\/vs\/language\/typescript\/ts\.worker/, replacement: resolve('node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js') }
      ]
    },
    plugins: [react()]
  }
})

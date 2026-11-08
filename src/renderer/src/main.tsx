import React from 'react'
import ReactDOM from 'react-dom/client'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from './workers/editor.worker?worker'
import jsonWorker from './workers/json.worker?worker'
import cssWorker from './workers/css.worker?worker'
import htmlWorker from './workers/html.worker?worker'
import tsWorker from './workers/ts.worker?worker'
import { App } from './App'
import './styles/globals.css'

// Register Monaco web workers for TypeScript, JSON, CSS, and HTML
;(self as any).MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') {
      return new jsonWorker()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  }
}

// Configure @monaco-editor/react to use local bundled monaco instance rather than loading from CDN
loader.config({ monaco })

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Maestro Uncaught Render Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center p-8 bg-[#121318] text-white select-text">
          <div className="max-w-xl p-6 rounded-2xl bg-[#191b22] border border-rose-500/30 flex flex-col gap-4 shadow-2xl">
            <h1 className="text-base font-bold text-rose-400">Maestro Encountered a Render Error</h1>
            <p className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">{this.state.error?.message}</p>
            <pre className="text-[10px] text-zinc-500 font-mono max-h-40 overflow-y-auto p-2 bg-black/40 rounded-lg">
              {this.state.error?.stack}
            </pre>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs cursor-pointer transition-colors"
              >
                Try to Recover
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs cursor-pointer transition-colors"
              >
                Reload Window
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

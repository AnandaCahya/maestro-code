import React from 'react'
import ReactDOM from 'react-dom/client'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { App } from './App'
import './styles/globals.css'

// Configure @monaco-editor/react to use local bundled monaco instance rather than loading from CDN
loader.config({ monaco })

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

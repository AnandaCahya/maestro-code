import React, { useState, useEffect } from 'react'
import { Binary, ExternalLink, FolderOpen, AlertTriangle, FileCode } from 'lucide-react'
import type { EditorFile } from '../../store/useEditorStore'

interface BinaryFilePaneProps {
  file: EditorFile
  onForceText?: () => void
}

export const BinaryFilePane: React.FC<BinaryFilePaneProps> = ({ file, onForceText }) => {
  const [fileSize, setFileSize] = useState<number | null>(null)

  useEffect(() => {
    let isCancelled = false
    const loadMeta = async () => {
      const meta = await window.maestroAPI.getFileMetadata(file.path)
      if (!isCancelled && meta) {
        setFileSize(meta.size)
      }
    }
    loadMeta()
    return () => {
      isCancelled = true
    }
  }, [file.path])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const ext = file.name.split('.').pop()?.toUpperCase() || 'BIN'

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#121318] text-white/80 select-none">
      <div className="max-w-md w-full bg-[#181a22] border border-white/[0.08] rounded-xl p-6 shadow-2xl flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-studio-amber/10 border border-studio-amber/20 flex items-center justify-center text-studio-amber mb-4">
          <Binary className="w-7 h-7" />
        </div>

        <h3 className="text-base font-semibold text-white/95 mb-1 flex items-center gap-2">
          <span>{file.name}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-studio-amber border border-white/[0.06]">
            {ext}
          </span>
        </h3>

        {fileSize !== null && (
          <p className="text-xs font-mono text-studio-muted mb-3">
            Size: {formatBytes(fileSize)}
          </p>
        )}

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-studio-amber/10 border border-studio-amber/20 text-left mb-6 text-xs text-studio-amber/90">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            This file cannot be displayed in the editor because it is binary or uses an unsupported encoding.
          </span>
        </div>

        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={() => window.maestroAPI.openWithExternalApp(file.path)}
            className="w-full py-2 px-4 rounded-lg bg-studio-amber text-[#121318] font-semibold text-xs flex items-center justify-center gap-2 hover:bg-studio-amber/90 transition-all cursor-pointer shadow-md shadow-studio-amber/10"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open with Default Application</span>
          </button>

          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => window.maestroAPI.revealInOS(file.path)}
              className="flex-1 py-1.5 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/80 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/[0.06]"
            >
              <FolderOpen className="w-3.5 h-3.5 text-studio-amber" />
              <span>Reveal in Explorer</span>
            </button>

            {onForceText && (
              <button
                onClick={onForceText}
                className="py-1.5 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white/80 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/[0.06]"
                title="Force open in Monaco Editor"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Open as Text</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

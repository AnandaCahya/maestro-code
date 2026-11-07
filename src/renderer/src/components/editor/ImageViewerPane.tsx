import React, { useState, useEffect } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, ExternalLink, FolderOpen, Image as ImageIcon } from 'lucide-react'
import type { EditorFile } from '../../store/useEditorStore'

interface ImageViewerPaneProps {
  file: EditorFile
}

export const ImageViewerPane: React.FC<ImageViewerPaneProps> = ({ file }) => {
  const [dataUrl, setDataUrl] = useState<string>('')
  const [zoom, setZoom] = useState<number>(1)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false
    setIsLoading(true)
    setLoadError(null)

    const loadImage = async () => {
      try {
        if (file.content && file.content.startsWith('data:image/')) {
          setDataUrl(file.content)
        } else {
          const url = await window.maestroAPI.readFileBase64(file.path)
          if (!isCancelled) {
            setDataUrl(url)
          }
        }

        const meta = await window.maestroAPI.getFileMetadata(file.path)
        if (!isCancelled && meta) {
          setFileSize(meta.size)
        }
      } catch (err: any) {
        if (!isCancelled) {
          setLoadError(err?.message || 'Failed to load image')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      isCancelled = true
    }
  }, [file.path, file.content])

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.25))
  const handleResetZoom = () => setZoom(1)

  return (
    <div className="w-full h-full flex flex-col bg-[#121318] text-white/80 select-none overflow-hidden relative">
      {/* Floating Toolbar */}
      <div className="h-10 px-4 border-b border-white/[0.06] bg-[#16181f]/80 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-studio-amber">
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="font-semibold text-white/90">{file.name}</span>
          </div>

          {dimensions && (
            <span className="text-white/40">
              {dimensions.width} × {dimensions.height} px
            </span>
          )}

          {fileSize !== null && (
            <span className="text-white/40">
              ({formatBytes(fileSize)})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleZoomOut}
            className="p-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-studio-muted px-1.5 min-w-[45px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white transition-colors cursor-pointer ml-1"
            title="Reset Zoom (100%)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-3 w-[1px] bg-white/[0.1] mx-1" />

          <button
            onClick={() => window.maestroAPI.revealInOS(file.path)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-white/[0.05] hover:bg-white/[0.1] text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Reveal in OS File Explorer"
          >
            <FolderOpen className="w-3 h-3 text-studio-amber" />
            <span>Reveal</span>
          </button>

          <button
            onClick={() => window.maestroAPI.openWithExternalApp(file.path)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-studio-amber/20 hover:bg-studio-amber/30 text-studio-amber transition-colors cursor-pointer"
            title="Open in System Default Viewer"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open Externally</span>
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-6 relative bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 text-studio-muted text-xs animate-pulse">
            <ImageIcon className="w-6 h-6 text-studio-amber/50" />
            <span>Loading image...</span>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-2 text-rose-400 text-xs">
            <span>Failed to load preview: {loadError}</span>
            <button
              onClick={() => window.maestroAPI.openWithExternalApp(file.path)}
              className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white cursor-pointer"
            >
              Open with Default App
            </button>
          </div>
        ) : (
          <div
            className="transition-transform duration-100 ease-out flex items-center justify-center shadow-2xl rounded border border-white/[0.08] bg-[#181a20]/60 p-2"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          >
            <img
              src={dataUrl}
              alt={file.name}
              onLoad={handleImageLoaded}
              className="max-w-[85vw] max-h-[75vh] object-contain rounded select-none pointer-events-auto"
              draggable={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}

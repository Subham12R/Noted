"use client"

import { NodeViewWrapper, NodeViewProps } from "@tiptap/react"
import { useState, useCallback, useRef, useEffect, Component, ReactNode } from "react"
import dynamic from "next/dynamic"
import { Maximize2, Minimize2, Download, Trash2, GripVertical } from "lucide-react"

// Error boundary for Excalidraw component
class ExcalidrawErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.warn("Excalidraw error:", error.message)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then(mod => mod.Excalidraw),
  { ssr: false, loading: () => <ExcalidrawPlaceholder /> }
)

function ExcalidrawPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-800/50 rounded-lg min-h-[200px]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-zinc-400">Loading Excalidraw...</p>
      </div>
    </div>
  )
}

// Error fallback for Excalidraw
function ExcalidrawErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-800/50 rounded-lg min-h-[200px]">
      <div className="text-center">
        <p className="text-sm text-zinc-400">Drawing canvas unavailable</p>
        <p className="text-xs text-zinc-500 mt-1">Your browser may not support this canvas size</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-300 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}

export function ExcalidrawNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [dimensions, setDimensions] = useState({
    width: Math.min(node.attrs.width || 600, 900),
    height: Math.min(node.attrs.height || 400, 600),
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 })

  // Check if canvas would exceed browser limits
  const canRenderCanvas = useCallback(() => {
    // Most browsers have a max canvas size around 16384x16384 or 268 million pixels
    // With devicePixelRatio of 2-3, we need to be conservative
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    const maxSafeSize = 8000 / dpr // Be conservative
    return dimensions.width <= maxSafeSize && dimensions.height <= maxSafeSize
  }, [dimensions])

  // Delay rendering to ensure container is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current && canRenderCanvas()) {
        setIsReady(true)
      } else if (!canRenderCanvas()) {
        setHasError(true)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [canRenderCanvas])

  // Catch canvas errors at runtime
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes("Canvas exceeds max size") ||
          event.message?.includes("canvas") && event.message?.includes("size")) {
        event.preventDefault()
        setHasError(true)
      }
    }
    window.addEventListener("error", handleError)
    return () => window.removeEventListener("error", handleError)
  }, [])

  // Parse initial data with safe defaults
  const initialData = {
    elements: (() => {
      try {
        return JSON.parse(node.attrs.elements || "[]")
      } catch {
        return []
      }
    })(),
    appState: {
      theme: "dark" as const,
      viewBackgroundColor: "#1e1e1e",
      // Limit the zoom to prevent canvas size issues
      zoom: { value: 1 as number & { _brand: "normalizedZoom" } },
      // Constrain scroll to prevent large canvas
      scrollX: 0,
      scrollY: 0,
    },
    files: (() => {
      try {
        return JSON.parse(node.attrs.files || "{}")
      } catch {
        return {}
      }
    })(),
    scrollToContent: true,
  }

  // Debounce ref for saving changes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleChange = useCallback(
    (elements: readonly unknown[], appState: unknown, files: unknown) => {
      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Debounce save
      saveTimeoutRef.current = setTimeout(() => {
        try {
          const appStateObj = appState as Record<string, unknown>
          updateAttributes({
            elements: JSON.stringify(elements),
            appState: JSON.stringify({
              viewBackgroundColor: appStateObj?.viewBackgroundColor,
              currentItemFontFamily: appStateObj?.currentItemFontFamily,
              gridSize: appStateObj?.gridSize,
            }),
            files: JSON.stringify(files || {}),
          })
        } catch (e) {
          console.warn("Failed to save Excalidraw state:", e)
        }
      }, 500)
    },
    [updateAttributes]
  )

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: dimensions.width,
      height: dimensions.height,
    }
  }, [dimensions])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.current.x
      const deltaY = e.clientY - startPos.current.y

      const newWidth = Math.min(900, Math.max(300, startPos.current.width + deltaX))
      const newHeight = Math.min(600, Math.max(200, startPos.current.height + deltaY))

      setDimensions({ width: newWidth, height: newHeight })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      updateAttributes({
        width: dimensions.width,
        height: dimensions.height,
      })
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing, dimensions, updateAttributes])

  const handleExport = useCallback(async () => {
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw")
      const elements = JSON.parse(node.attrs.elements || "[]")

      if (elements.length === 0) return

      const blob = await exportToBlob({
        elements,
        appState: { exportBackground: true, viewBackgroundColor: "#1e1e1e" },
        files: JSON.parse(node.attrs.files || "{}"),
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "excalidraw-export.png"
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error("Failed to export:", e)
    }
  }, [node.attrs.elements, node.attrs.files])

  if (hasError) {
    return (
      <NodeViewWrapper className="excalidraw-wrapper my-4">
        <div style={{ width: dimensions.width, height: dimensions.height }}>
          <ExcalidrawErrorFallback />
        </div>
      </NodeViewWrapper>
    )
  }

  if (isFullscreen) {
    return (
      <NodeViewWrapper className="excalidraw-wrapper">
        <div className="fixed inset-0 z-50 bg-zinc-950">
          {/* Toolbar */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <button
              onClick={handleExport}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title="Export as PNG"
            >
              <Download size={18} />
            </button>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title="Exit Fullscreen"
            >
              <Minimize2 size={18} />
            </button>
          </div>

          {/* Excalidraw */}
          <div style={{ width: "100vw", height: "100vh" }}>
            <ExcalidrawErrorBoundary fallback={<ExcalidrawErrorFallback />}>
              <Excalidraw
                initialData={initialData}
                onChange={handleChange}
                theme="dark"
                UIOptions={{
                  canvasActions: {
                    saveAsImage: true,
                    export: { saveFileToDisk: true },
                  },
                }}
              />
            </ExcalidrawErrorBoundary>
          </div>
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="excalidraw-wrapper my-4">
      <div
        ref={containerRef}
        className={`relative rounded-xl overflow-hidden border-2 transition-colors ${
          selected ? "border-indigo-500" : "border-zinc-700"
        }`}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {/* Toolbar */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-zinc-800/90 backdrop-blur-sm rounded-lg p-1">
          <button
            onClick={handleExport}
            className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
            title="Export as PNG"
          >
            <Download size={14} />
          </button>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
            title="Fullscreen"
          >
            <Maximize2 size={14} />
          </button>
          <button
            onClick={deleteNode}
            className="p-1.5 hover:bg-red-500/20 rounded text-zinc-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Drag handle */}
        <div
          className="absolute top-2 left-2 z-10 p-1.5 bg-zinc-800/90 backdrop-blur-sm rounded cursor-move text-zinc-400"
          data-drag-handle
        >
          <GripVertical size={14} />
        </div>

        {/* Excalidraw Canvas */}
        <div
          style={{
            width: dimensions.width,
            height: dimensions.height,
            position: "absolute",
            top: 0,
            left: 0,
            overflow: "hidden",
          }}
        >
          {isReady ? (
            <ExcalidrawErrorBoundary fallback={<ExcalidrawErrorFallback />}>
              <Excalidraw
                initialData={initialData}
                onChange={handleChange}
                theme="dark"
                UIOptions={{
                  canvasActions: {
                    saveAsImage: false,
                    export: false,
                  },
                }}
              />
            </ExcalidrawErrorBoundary>
          ) : (
            <ExcalidrawPlaceholder />
          )}
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
          style={{
            background: "linear-gradient(135deg, transparent 50%, rgba(99, 102, 241, 0.5) 50%)",
          }}
        />
      </div>
    </NodeViewWrapper>
  )
}

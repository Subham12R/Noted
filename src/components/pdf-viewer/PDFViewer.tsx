"use client"

import { useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Loader2,
  FileText,
  Maximize2,
  Minimize2,
} from "lucide-react"

// Dynamically import react-pdf to avoid SSR issues
const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false }
)
const Page = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  { ssr: false }
)

interface PDFViewerProps {
  url: string
  fileName?: string
  onClose?: () => void
  onExtractText?: (text: string) => void
  isModal?: boolean
}

export function PDFViewer({
  url,
  fileName = "Document",
  onClose,
  onExtractText,
  isModal = false,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [isExtracting, setIsExtracting] = useState<boolean>(false)
  const [isReady, setIsReady] = useState<boolean>(false)

  // Initialize PDF.js worker and CSS on client side
  useEffect(() => {
    const init = async () => {
      // Import CSS
      await import("react-pdf/dist/Page/AnnotationLayer.css")
      await import("react-pdf/dist/Page/TextLayer.css")

      // Set up worker
      const pdfModule = await import("react-pdf")
      pdfModule.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfModule.pdfjs.version}/build/pdf.worker.min.mjs`
      setIsReady(true)
    }
    init()
  }, [])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
  }, [])

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("PDF load error:", error)
    setError("Failed to load PDF. The file may be corrupted or inaccessible.")
    setIsLoading(false)
  }, [])

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages))
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5))
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExtractText = async () => {
    if (!onExtractText) return

    setIsExtracting(true)
    try {
      const response = await fetch("/api/files/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error("Failed to extract text")
      }

      const { text } = await response.json()
      onExtractText(text)
    } catch (error) {
      console.error("Text extraction error:", error)
    } finally {
      setIsExtracting(false)
    }
  }

  const containerClass = isModal
    ? "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    : isFullscreen
    ? "fixed inset-0 z-50 bg-zinc-900"
    : "flex flex-col h-full bg-zinc-900 rounded-lg overflow-hidden"

  const viewerClass = isFullscreen || isModal
    ? "w-full h-full max-w-6xl max-h-[90vh] bg-zinc-900 rounded-lg overflow-hidden flex flex-col shadow-2xl"
    : "flex-1 flex flex-col"

  return (
    <div className={containerClass}>
      <div className={viewerClass}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 border-b border-zinc-700/50">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-red-400" />
            <span className="text-sm font-medium text-zinc-200 truncate max-w-[200px]">
              {fileName}
            </span>
            {numPages > 0 && (
              <span className="text-xs text-zinc-500">({numPages} pages)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Page navigation */}
            <div className="flex items-center gap-1 bg-zinc-700/50 rounded-lg px-2 py-1">
              <button
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-zinc-300 min-w-[60px] text-center">
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-zinc-700/50 rounded-lg px-2 py-1">
              <button
                onClick={zoomOut}
                disabled={scale <= 0.5}
                className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Zoom out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs text-zinc-300 min-w-[40px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                disabled={scale >= 3.0}
                className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Zoom in"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Actions */}
            {onExtractText && (
              <button
                onClick={handleExtractText}
                disabled={isExtracting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                title="Extract text for AI"
              >
                {isExtracting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FileText size={14} />
                )}
                {isExtracting ? "Extracting..." : "Extract for AI"}
              </button>
            )}

            <button
              onClick={handleDownload}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors"
              title="Download"
            >
              <Download size={16} />
            </button>

            {!isModal && (
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto bg-zinc-950 flex items-start justify-center p-4">
          {(!isReady || isLoading) && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
              <span className="text-sm text-zinc-500">
                {!isReady ? "Initializing PDF viewer..." : "Loading PDF..."}
              </span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <FileText size={48} className="text-zinc-600" />
              <span className="text-sm text-red-400">{error}</span>
              <button
                onClick={() => window.open(url, "_blank")}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                Try opening in new tab
              </button>
            </div>
          )}

          {isReady && (
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              error={null}
              className="flex flex-col items-center gap-4"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                className="shadow-2xl"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          )}
        </div>
      </div>

      {/* Backdrop click to close for modal */}
      {isModal && onClose && (
        <div className="absolute inset-0 -z-10" onClick={onClose} />
      )}
    </div>
  )
}

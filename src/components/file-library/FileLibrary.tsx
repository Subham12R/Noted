"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { useFileLibrary, FileItem } from "@/context/FileLibraryContext"
import { PDFViewer } from "@/components/pdf-viewer"
import {
  FolderOpen,
  Image,
  FileText,
  Video,
  Music,
  File,
  Grid,
  List,
  Star,
  StarOff,
  Trash2,
  Download,
  X,
  Upload,
  Search,
  ChevronRight,
  MoreVertical,
  Eye,
  MessageSquare,
  Sparkles,
} from "lucide-react"

// File type icons
const FILE_TYPE_ICONS = {
  image: Image,
  pdf: FileText,
  video: Video,
  audio: Music,
  document: FileText,
  file: File,
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Format date
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function FileLibrary() {
  const {
    files,
    storage,
    isLoading,
    error,
    viewMode,
    filterType,
    showStarred,
    selectedFiles,
    previewFile,
    fetchFiles,
    uploadFile,
    deleteFile,
    toggleStar,
    toggleFileSelection,
    clearSelection,
    deleteSelected,
    setViewMode,
    setFilterType,
    setShowStarred,
    setPreviewFile,
    closePanel,
  } = useFileLibrary()

  const [searchQuery, setSearchQuery] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Fetch files on mount
  useEffect(() => {
    fetchFiles({ type: filterType === "all" ? undefined : filterType, starred: showStarred })
  }, [fetchFiles, filterType, showStarred])

  // Filter files by search
  const filteredFiles = files.filter((file) =>
    file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle file upload
  const handleUpload = useCallback(
    async (fileList: FileList) => {
      for (let i = 0; i < fileList.length; i++) {
        await uploadFile(fileList[i])
      }
    },
    [uploadFile]
  )

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length > 0) {
        await handleUpload(e.dataTransfer.files)
      }
    },
    [handleUpload]
  )

  return (
    <div className="h-full flex flex-col bg-zinc-900 text-white">
      {/* Header */}
      <div className="flex-none p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FolderOpen size={20} />
            File Library
          </h2>
          <button
            onClick={closePanel}
            className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Storage bar */}
        {storage && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>{formatFileSize(storage.used)} used</span>
              <span>{formatFileSize(storage.limit)}</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  storage.percentage > 90
                    ? "bg-red-500"
                    : storage.percentage > 70
                    ? "bg-yellow-500"
                    : "bg-indigo-500"
                }`}
                style={{ width: `${Math.min(storage.percentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2">
          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Files</option>
            <option value="image">Images</option>
            <option value="pdf">PDFs</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="document">Documents</option>
          </select>

          {/* Starred toggle */}
          <button
            onClick={() => setShowStarred(!showStarred)}
            className={`p-2 rounded-lg transition-colors ${
              showStarred ? "bg-yellow-500/20 text-yellow-400" : "hover:bg-zinc-800 text-zinc-400"
            }`}
            title={showStarred ? "Show all" : "Show starred"}
          >
            <Star size={16} />
          </button>

          {/* View mode */}
          <div className="flex border border-zinc-700 rounded-lg overflow-hidden ml-auto">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-indigo-600" : "hover:bg-zinc-800"}`}
              title="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${viewMode === "list" ? "bg-indigo-600" : "hover:bg-zinc-800"}`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>

          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            title="Upload files"
          >
            <Upload size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Selected actions */}
      {selectedFiles.length > 0 && (
        <div className="flex-none px-4 py-2 bg-indigo-600/20 border-b border-indigo-500/30 flex items-center gap-4">
          <span className="text-sm">{selectedFiles.length} selected</span>
          <button
            onClick={deleteSelected}
            className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button onClick={clearSelection} className="text-sm text-zinc-400 hover:text-white ml-auto">
            Clear
          </button>
        </div>
      )}

      {/* Drop zone / File grid */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 overflow-y-auto p-4 transition-colors ${
          isDragging ? "bg-indigo-500/10 border-2 border-dashed border-indigo-500" : ""
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-400">{error}</div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400">
            <FolderOpen size={48} className="mb-4 opacity-50" />
            <p className="text-lg mb-2">No files yet</p>
            <p className="text-sm">Drag and drop files here or click upload</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                isSelected={selectedFiles.includes(file.id)}
                onSelect={() => toggleFileSelection(file.id)}
                onStar={() => toggleStar(file.id)}
                onDelete={() => deleteFile(file.id)}
                onPreview={() => setPreviewFile(file)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFiles.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                isSelected={selectedFiles.includes(file.id)}
                onSelect={() => toggleFileSelection(file.id)}
                onStar={() => toggleStar(file.id)}
                onDelete={() => deleteFile(file.id)}
                onPreview={() => setPreviewFile(file)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview panel */}
      {previewFile && (
        <FilePreviewPanel file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  )
}

// File card component
function FileCard({
  file,
  isSelected,
  onSelect,
  onStar,
  onDelete,
  onPreview,
}: {
  file: FileItem
  isSelected: boolean
  onSelect: () => void
  onStar: () => void
  onDelete: () => void
  onPreview: () => void
}) {
  const Icon = FILE_TYPE_ICONS[file.type] || File

  return (
    <div
      className={`group relative bg-zinc-800 rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
        isSelected ? "border-indigo-500" : "border-transparent hover:border-zinc-600"
      }`}
      onClick={onPreview}
    >
      {/* Thumbnail / Icon */}
      <div className="aspect-square flex items-center justify-center bg-zinc-900">
        {file.type === "image" && file.thumbnailUrl ? (
          <img
            src={file.thumbnailUrl}
            alt={file.originalName}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon size={48} className="text-zinc-500" />
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-sm font-medium truncate" title={file.originalName}>
          {file.originalName}
        </p>
        <p className="text-xs text-zinc-400">{formatFileSize(file.size)}</p>
      </div>

      {/* Actions overlay */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStar()
          }}
          className={`p-1.5 rounded ${
            file.isStarred ? "bg-yellow-500/20 text-yellow-400" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          {file.isStarred ? <Star size={14} /> : <StarOff size={14} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-red-400 rounded"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Selection checkbox */}
      <div
        className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          isSelected
            ? "bg-indigo-500 border-indigo-500"
            : "bg-zinc-800/80 border-zinc-600 opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        {isSelected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
  )
}

// File row component (list view)
function FileRow({
  file,
  isSelected,
  onSelect,
  onStar,
  onDelete,
  onPreview,
}: {
  file: FileItem
  isSelected: boolean
  onSelect: () => void
  onStar: () => void
  onDelete: () => void
  onPreview: () => void
}) {
  const Icon = FILE_TYPE_ICONS[file.type] || File

  return (
    <div
      className={`flex items-center gap-3 p-3 bg-zinc-800 rounded-lg border-2 transition-colors cursor-pointer ${
        isSelected ? "border-indigo-500" : "border-transparent hover:border-zinc-600"
      }`}
      onClick={onPreview}
    >
      {/* Checkbox */}
      <div
        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
          isSelected ? "bg-indigo-500 border-indigo-500" : "border-zinc-600"
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        {isSelected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Icon */}
      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-zinc-900 rounded">
        {file.type === "image" && file.thumbnailUrl ? (
          <img
            src={file.thumbnailUrl}
            alt={file.originalName}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <Icon size={20} className="text-zinc-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.originalName}</p>
        <p className="text-xs text-zinc-400">
          {formatFileSize(file.size)} • {formatDate(file.updatedAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStar()
          }}
          className={`p-2 rounded transition-colors ${
            file.isStarred ? "text-yellow-400" : "text-zinc-400 hover:text-white"
          }`}
        >
          {file.isStarred ? <Star size={16} /> : <StarOff size={16} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-2 text-zinc-400 hover:text-red-400 rounded transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

// File preview panel
function FilePreviewPanel({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const [showPDFViewer, setShowPDFViewer] = useState(false)
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [insertSuccess, setInsertSuccess] = useState(false)
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false)
  const [generatedNotes, setGeneratedNotes] = useState<string | null>(null)

  const handleExtractText = async () => {
    setIsExtracting(true)
    setInsertSuccess(false)
    try {
      // Use fileId for more reliable extraction
      const response = await fetch("/api/files/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to extract text")
      }

      const { text } = await response.json()
      setExtractedText(text)
    } catch (error) {
      console.error("Text extraction error:", error)
      alert(error instanceof Error ? error.message : "Failed to extract text")
    } finally {
      setIsExtracting(false)
    }
  }

  const handleInsertToPage = () => {
    if (extractedText) {
      // Dispatch event to insert text into the active page editor
      window.dispatchEvent(new CustomEvent("insertPDFText", { detail: { text: extractedText } }))
      setInsertSuccess(true)
      setTimeout(() => setInsertSuccess(false), 2000)
    }
  }

  const handleGenerateNotes = async () => {
    if (!extractedText) return

    setIsGeneratingNotes(true)
    setGeneratedNotes(null)

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Based on the following document content, create well-organized study notes. Include:
- A clear summary at the top
- Key points and concepts as bullet points
- Important definitions or terms
- Any notable facts or figures

Keep the notes concise but comprehensive. Format using markdown.

Document content:
${extractedText.substring(0, 30000)}`,
          mode: "answer",
          stream: true,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate notes")

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let notes = ""
      let buffer = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE events from buffer
          const lines = buffer.split("\n")
          buffer = lines.pop() || "" // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === "chunk" && data.content) {
                  notes += data.content
                  setGeneratedNotes(notes)
                } else if (data.type === "error") {
                  throw new Error(data.error)
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Note generation error:", error)
      alert("Failed to generate notes. Please try again.")
    } finally {
      setIsGeneratingNotes(false)
    }
  }

  const handleInsertGeneratedNotes = () => {
    if (generatedNotes) {
      window.dispatchEvent(new CustomEvent("insertPDFText", { detail: { text: generatedNotes } }))
      setInsertSuccess(true)
      setTimeout(() => setInsertSuccess(false), 2000)
    }
  }

  const copyToClipboard = async () => {
    if (extractedText) {
      await navigator.clipboard.writeText(extractedText)
    }
  }

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-80 bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="font-medium truncate">{file.originalName}</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
            <X size={18} />
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 p-4 overflow-y-auto">
          {file.type === "image" && file.url && (
            <img
              src={file.url}
              alt={file.originalName}
              className="w-full rounded-lg mb-4"
            />
          )}

          {file.type === "pdf" && (
            <div className="mb-4">
              <div
                onClick={() => setShowPDFViewer(true)}
                className="aspect-[3/4] bg-zinc-800 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-700/50 transition-colors group"
              >
                <FileText size={48} className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                <span className="text-sm text-zinc-400 mt-2 group-hover:text-indigo-300">Click to view PDF</span>
              </div>
              <button
                onClick={() => setShowPDFViewer(true)}
                className="w-full mt-2 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Eye size={16} />
                Open PDF Viewer
              </button>
            </div>
          )}

          {/* Extracted Text Section for PDFs */}
          {file.type === "pdf" && (
            <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400 font-medium">AI Text Extraction</span>
                {extractedText && (
                  <button
                    onClick={copyToClipboard}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Copy
                  </button>
                )}
              </div>
              {!extractedText ? (
                <button
                  onClick={handleExtractText}
                  disabled={isExtracting}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-wait rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isExtracting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <MessageSquare size={16} />
                      Extract Text
                    </>
                  )}
                </button>
              ) : (
                <>
                  <div className="max-h-40 overflow-y-auto text-xs text-zinc-300 bg-zinc-900 p-2 rounded mb-2">
                    {extractedText.substring(0, 500)}
                    {extractedText.length > 500 && "..."}
                  </div>
                  <button
                    onClick={handleInsertToPage}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      insertSuccess
                        ? "bg-green-600 text-white"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white"
                    }`}
                  >
                    {insertSuccess ? (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Inserted!
                      </>
                    ) : (
                      <>
                        <FileText size={16} />
                        Insert Raw Text
                      </>
                    )}
                  </button>

                  {/* AI Note Generation Section */}
                  <div className="mt-3 pt-3 border-t border-zinc-700">
                    <span className="text-xs text-zinc-400 font-medium block mb-2">AI-Powered Notes</span>
                    {!generatedNotes ? (
                      <button
                        onClick={handleGenerateNotes}
                        disabled={isGeneratingNotes}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-wait rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {isGeneratingNotes ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generating Notes...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            Generate AI Notes
                          </>
                        )}
                      </button>
                    ) : (
                      <>
                        <div className="max-h-48 overflow-y-auto text-xs text-zinc-300 bg-zinc-900 p-2 rounded mb-2 whitespace-pre-wrap">
                          {generatedNotes}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleInsertGeneratedNotes}
                            className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <FileText size={16} />
                            Insert Notes
                          </button>
                          <button
                            onClick={() => setGeneratedNotes(null)}
                            className="py-2 px-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Details */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400">Type</label>
              <p className="text-sm">{file.mimeType}</p>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Size</label>
              <p className="text-sm">{formatFileSize(file.size)}</p>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Uploaded</label>
              <p className="text-sm">{formatDate(file.createdAt)}</p>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Last accessed</label>
              <p className="text-sm">{formatDate(file.accessedAt)}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-zinc-800 flex gap-2">
          <a
            href={file.url}
            download={file.originalName}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-center text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Download
          </a>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {showPDFViewer && file.type === "pdf" && (
        <PDFViewer
          url={file.url}
          fileName={file.originalName}
          onClose={() => setShowPDFViewer(false)}
          onExtractText={(text) => setExtractedText(text)}
          isModal={true}
        />
      )}
    </>
  )
}

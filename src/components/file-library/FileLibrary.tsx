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
  Eye,
  MessageSquare,
  Sparkles,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

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

// Validate file before upload
function validateFile(file: File, storage: { used: number; limit: number } | null): string | null {
  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB per file
  const ALLOWED_TYPES = [
    "image/", "application/pdf", "video/", "audio/",
    "application/msword", "application/vnd.openxmlformats-officedocument",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml",
    "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml",
    "text/", "application/json", "application/zip", "application/x-zip-compressed",
  ]

  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`
  }

  if (storage && storage.limit > 0 && storage.used + file.size > storage.limit) {
    return "Not enough storage space. Please delete some files or upgrade your plan."
  }

  const isAllowed = ALLOWED_TYPES.some((type) => file.type.startsWith(type) || file.type === type)
  if (!isAllowed && file.type) {
    return "File type not supported."
  }

  return null
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
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
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
      const errors: string[] = []
      let successCount = 0

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        const validationError = validateFile(file, storage)
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`)
          continue
        }
        const result = await uploadFile(file)
        if (result) successCount++
      }

      if (errors.length > 0) {
        setUploadErrors(errors)
        toast.error(`Failed to upload ${errors.length} file(s)`)
      }
      if (successCount > 0) {
        toast.success(`${successCount} file(s) uploaded`)
      }
    },
    [uploadFile, storage]
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
    <div className="h-full flex flex-col bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex-none p-4 border-b border-zinc-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2 text-white">
            <FolderOpen size={18} className="text-zinc-400" />
            File Library
          </h2>
          <button
            onClick={closePanel}
            className="p-1.5 hover:bg-zinc-900 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Storage bar */}
        {storage && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
              <span>{formatFileSize(storage.used)} used</span>
              <span>{formatFileSize(storage.limit)}</span>
            </div>
            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  storage.percentage > 90
                    ? "bg-red-500"
                    : storage.percentage > 70
                    ? "bg-zinc-400"
                    : "bg-zinc-500"
                }`}
                style={{ width: `${Math.min(storage.percentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2">
          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer"
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
            className={`p-1.5 rounded-lg transition-colors ${
              showStarred ? "bg-zinc-800 text-zinc-200" : "hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300"
            }`}
            title={showStarred ? "Show all" : "Show starred"}
          >
            <Star size={14} />
          </button>

          {/* View mode */}
          <div className="flex border border-zinc-800 rounded-lg overflow-hidden ml-auto">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"}`}
              title="Grid view"
            >
              <Grid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"}`}
              title="List view"
            >
              <List size={14} />
            </button>
          </div>

          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded-lg transition-colors"
            title="Upload files"
          >
            <Upload size={14} />
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

      {/* Upload errors */}
      {uploadErrors.length > 0 && (
        <div className="flex-none px-4 py-2 bg-red-500/10 border-b border-red-500/20">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-red-400 font-medium mb-1">Upload issues</p>
              <div className="space-y-0.5">
                {uploadErrors.map((err, i) => (
                  <p key={i} className="text-[11px] text-red-300">{err}</p>
                ))}
              </div>
              <button
                onClick={() => setUploadErrors([])}
                className="text-[11px] text-red-400 hover:text-red-300 mt-1 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected actions */}
      {selectedFiles.length > 0 && (
        <div className="flex-none px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center gap-4">
          <span className="text-xs text-zinc-400">{selectedFiles.length} selected</span>
          <button
            onClick={deleteSelected}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
          >
            <Trash2 size={12} />
            Delete
          </button>
          <button onClick={clearSelection} className="text-xs text-zinc-500 hover:text-zinc-300 ml-auto transition-colors">
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
          isDragging ? "bg-zinc-900/50 border-2 border-dashed border-zinc-600" : ""
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-400 text-sm">{error}</div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <FolderOpen size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No files yet</p>
            <p className="text-xs mt-1">Drag and drop files here or click upload</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
          <div className="space-y-1.5">
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
      className={`group relative bg-zinc-900 rounded-xl overflow-hidden border transition-colors cursor-pointer ${
        isSelected ? "border-zinc-500" : "border-zinc-800 hover:border-zinc-700"
      }`}
      onClick={onPreview}
    >
      {/* Thumbnail / Icon */}
      <div className="aspect-square flex items-center justify-center bg-zinc-950">
        {file.type === "image" && file.thumbnailUrl ? (
          <img
            src={file.thumbnailUrl}
            alt={file.originalName}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon size={32} className="text-zinc-600" />
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-medium truncate text-zinc-200" title={file.originalName}>
          {file.originalName}
        </p>
        <p className="text-[11px] text-zinc-500 mt-0.5">{formatFileSize(file.size)}</p>
      </div>

      {/* Actions overlay */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStar()
          }}
          className={`p-1.5 rounded-md transition-colors ${
            file.isStarred ? "bg-zinc-800 text-zinc-200" : "bg-zinc-950/80 text-zinc-400 hover:text-white"
          }`}
        >
          {file.isStarred ? <Star size={12} /> : <StarOff size={12} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-1.5 bg-zinc-950/80 text-zinc-400 hover:text-red-400 rounded-md transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Selection checkbox */}
      <div
        className={`absolute top-2 left-2 w-4 h-4 rounded border flex items-center justify-center transition-all ${
          isSelected
            ? "bg-white border-white"
            : "bg-zinc-950/80 border-zinc-600 opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        {isSelected && (
          <svg className="w-3 h-3 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      className={`flex items-center gap-3 p-2.5 bg-zinc-900 rounded-xl border transition-colors cursor-pointer ${
        isSelected ? "border-zinc-500" : "border-zinc-800 hover:border-zinc-700"
      }`}
      onClick={onPreview}
    >
      {/* Checkbox */}
      <div
        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
          isSelected ? "bg-white border-white" : "border-zinc-600"
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        {isSelected && (
          <svg className="w-3 h-3 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Icon */}
      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-zinc-950 rounded-lg">
        {file.type === "image" && file.thumbnailUrl ? (
          <img
            src={file.thumbnailUrl}
            alt={file.originalName}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <Icon size={16} className="text-zinc-500" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate text-zinc-200">{file.originalName}</p>
        <p className="text-[11px] text-zinc-500">
          {formatFileSize(file.size)} &middot; {formatDate(file.updatedAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStar()
          }}
          className={`p-1.5 rounded transition-colors ${
            file.isStarred ? "text-zinc-200" : "text-zinc-500 hover:text-white"
          }`}
        >
          {file.isStarred ? <Star size={14} /> : <StarOff size={14} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-1.5 text-zinc-500 hover:text-red-400 rounded transition-colors"
        >
          <Trash2 size={14} />
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
      toast.error(error instanceof Error ? error.message : "Failed to extract text")
    } finally {
      setIsExtracting(false)
    }
  }

  const handleInsertToPage = () => {
    if (extractedText) {
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

          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

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
              } catch {
                // Skip invalid JSON lines
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Note generation error:", error)
      toast.error("Failed to generate notes. Please try again.")
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
      toast.success("Copied to clipboard")
    }
  }

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-80 bg-zinc-950 border-l border-zinc-900 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-900">
          <h3 className="text-sm font-medium truncate text-white">{file.originalName}</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-900 rounded text-zinc-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 p-4 overflow-y-auto">
          {file.type === "image" && file.url && (
            <img
              src={file.url}
              alt={file.originalName}
              className="w-full rounded-xl mb-4"
            />
          )}

          {file.type === "pdf" && (
            <div className="mb-4">
              <div
                onClick={() => setShowPDFViewer(true)}
                className="aspect-[3/4] bg-zinc-900 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-800 transition-colors group"
              >
                <FileText size={40} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                <span className="text-xs text-zinc-500 mt-2 group-hover:text-zinc-300">Click to view PDF</span>
              </div>
              <button
                onClick={() => setShowPDFViewer(true)}
                className="w-full mt-2 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2 text-zinc-300"
              >
                <Eye size={14} />
                Open PDF Viewer
              </button>
            </div>
          )}

          {/* Extracted Text Section for PDFs */}
          {file.type === "pdf" && (
            <div className="mb-4 p-3 bg-zinc-900 rounded-xl border border-zinc-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Text Extraction</span>
                {extractedText && (
                  <button
                    onClick={copyToClipboard}
                    className="text-[11px] text-zinc-400 hover:text-white transition-colors"
                  >
                    Copy
                  </button>
                )}
              </div>
              {!extractedText ? (
                <button
                  onClick={handleExtractText}
                  disabled={isExtracting}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:cursor-wait rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 text-zinc-200"
                >
                  {isExtracting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <MessageSquare size={14} />
                      Extract Text
                    </>
                  )}
                </button>
              ) : (
                <>
                  <div className="max-h-40 overflow-y-auto text-xs text-zinc-300 bg-zinc-950 p-2.5 rounded-lg mb-2 border border-zinc-900">
                    {extractedText.substring(0, 500)}
                    {extractedText.length > 500 && "..."}
                  </div>
                  <button
                    onClick={handleInsertToPage}
                    className={`w-full py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
                      insertSuccess
                        ? "bg-zinc-700 text-white"
                        : "bg-zinc-800 hover:bg-zinc-700 text-white"
                    }`}
                  >
                    {insertSuccess ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Inserted!
                      </>
                    ) : (
                      <>
                        <FileText size={14} />
                        Insert Raw Text
                      </>
                    )}
                  </button>

                  {/* AI Note Generation Section */}
                  <div className="mt-3 pt-3 border-t border-zinc-900">
                    <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider block mb-2">AI Notes</span>
                    {!generatedNotes ? (
                      <button
                        onClick={handleGenerateNotes}
                        disabled={isGeneratingNotes}
                        className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:cursor-wait rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 text-zinc-200"
                      >
                        {isGeneratingNotes ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            Generate Notes
                          </>
                        )}
                      </button>
                    ) : (
                      <>
                        <div className="max-h-48 overflow-y-auto text-xs text-zinc-300 bg-zinc-950 p-2.5 rounded-lg mb-2 border border-zinc-900 whitespace-pre-wrap">
                          {generatedNotes}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleInsertGeneratedNotes}
                            className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-medium transition-colors text-white flex items-center justify-center gap-2"
                          >
                            <FileText size={14} />
                            Insert Notes
                          </button>
                          <button
                            onClick={() => setGeneratedNotes(null)}
                            className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors text-zinc-300"
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
          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider">Type</label>
              <p className="text-xs text-zinc-300 mt-0.5">{file.mimeType}</p>
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider">Size</label>
              <p className="text-xs text-zinc-300 mt-0.5">{formatFileSize(file.size)}</p>
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider">Uploaded</label>
              <p className="text-xs text-zinc-300 mt-0.5">{formatDate(file.createdAt)}</p>
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider">Last accessed</label>
              <p className="text-xs text-zinc-300 mt-0.5">{formatDate(file.accessedAt)}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-zinc-900">
          <a
            href={file.url}
            download={file.originalName}
            className="w-full py-2.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded-xl text-center text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Download size={14} />
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

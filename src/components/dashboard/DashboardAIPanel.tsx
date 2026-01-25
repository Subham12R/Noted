"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useNotes, Folder, Page } from "@/context/NotesContext"
import { MermaidChart } from "@/components/MermaidChart"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  AiChat02Icon,
  ArrowUp01Icon,
  Loading03Icon,
  Copy01Icon,
  RefreshIcon,
  AttachmentIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"
import { FileText } from "lucide-react"
import { toast } from "sonner"

interface AttachedPDF {
  file: File
  name: string
  text?: string
  isExtracting: boolean
}

interface DashboardAIPanelProps {
  isOpen: boolean
  onClose: () => void
  folder?: Folder | null
  mode?: "flowchart" | "summarize" | "answer"
}

// Extract all pages from a folder including subfolders
function getAllPagesFromFolder(folder: Folder): Page[] {
  const pages: Page[] = [...folder.pages]
  if (folder.folders) {
    for (const subFolder of folder.folders) {
      pages.push(...getAllPagesFromFolder(subFolder))
    }
  }
  return pages
}

// Build folder structure text for AI context
function buildFolderContext(folder: Folder, indent: number = 0): string {
  const prefix = "  ".repeat(indent)
  let context = `${prefix}Folder: ${folder.name}\n`

  // Add pages
  for (const page of folder.pages) {
    context += `${prefix}  - Page: ${page.name}\n`
    if (page.content) {
      // Strip HTML tags and limit content
      const cleanContent = page.content.replace(/<[^>]*>/g, " ").trim().slice(0, 500)
      if (cleanContent) {
        context += `${prefix}    Content: ${cleanContent}...\n`
      }
    }
  }

  // Add subfolders recursively
  if (folder.folders) {
    for (const subFolder of folder.folders) {
      context += buildFolderContext(subFolder, indent + 1)
    }
  }

  return context
}

export function DashboardAIPanel({ isOpen, onClose, folder, mode = "flowchart" }: DashboardAIPanelProps) {
  const { folders } = useNotes()
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folder?.id || null)
  const [inputValue, setInputValue] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [response, setResponse] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [attachedPDFs, setAttachedPDFs] = useState<AttachedPDF[]>([])
  const responseRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  // Update selectedFolderId when folder prop changes
  useEffect(() => {
    if (folder?.id) {
      setSelectedFolderId(folder.id)
    }
  }, [folder?.id])

  // Get selected folder - prefer the passed folder prop if IDs match, otherwise find from folders
  const selectedFolder = folder && folder.id === selectedFolderId
    ? folder
    : selectedFolderId
      ? folders.find(f => f.id === selectedFolderId) ||
        folders.flatMap(f => f.folders || []).find(sf => sf.id === selectedFolderId)
      : null

  // Set default prompt based on mode
  useEffect(() => {
    if (isOpen && mode === "flowchart") {
      setInputValue("Create a flowchart showing the structure and relationships between the notes in this folder")
    } else if (isOpen && mode === "summarize") {
      setInputValue("Summarize the key points from all notes in this folder")
    }
  }, [isOpen, mode])

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  // Auto-scroll response
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight
    }
  }, [response])

  // Handle PDF file attachment
  const handlePDFAttach = async (files: FileList | null) => {
    if (!files) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type !== "application/pdf") {
        toast.error(`${file.name} is not a PDF file`)
        continue
      }

      const newPDF: AttachedPDF = {
        file,
        name: file.name,
        isExtracting: true,
      }

      setAttachedPDFs((prev) => [...prev, newPDF])

      // Extract text from PDF using FormData (direct file upload)
      try {
        const formData = new FormData()
        formData.append("file", file)

        const res = await fetch("/api/files/extract-text", {
          method: "POST",
          body: formData, // FormData - don't set Content-Type header
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to extract text")
        }

        const { text } = await res.json()
        setAttachedPDFs((prev) =>
          prev.map((pdf) =>
            pdf.name === file.name ? { ...pdf, text, isExtracting: false } : pdf
          )
        )
        toast.success(`Extracted text from ${file.name}`)
      } catch (err) {
        console.error("PDF extraction error:", err)
        setAttachedPDFs((prev) =>
          prev.map((pdf) =>
            pdf.name === file.name ? { ...pdf, isExtracting: false } : pdf
          )
        )
        toast.error(`Failed to extract text from ${file.name}`)
      }
    }

    // Reset input
    if (pdfInputRef.current) {
      pdfInputRef.current.value = ""
    }
  }

  // Remove attached PDF
  const removePDF = (name: string) => {
    setAttachedPDFs((prev) => prev.filter((pdf) => pdf.name !== name))
  }

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!inputValue.trim()) {
      toast.error("Please enter a prompt")
      return
    }

    // Allow generation without folder if PDFs are attached
    if (!selectedFolder && attachedPDFs.length === 0) {
      toast.error("Please select a folder or attach a PDF")
      return
    }

    // Check if any PDFs are still extracting
    if (attachedPDFs.some((pdf) => pdf.isExtracting)) {
      toast.error("Please wait for PDF text extraction to complete")
      return
    }

    setIsProcessing(true)
    setError(null)
    setResponse("")

    try {
      // Build context from folder (if selected)
      let contextText = ""

      if (selectedFolder) {
        const folderContext = buildFolderContext(selectedFolder)
        const allPages = getAllPagesFromFolder(selectedFolder)

        contextText = `
Folder Structure:
${folderContext}

Total Pages: ${allPages.length}
Folder Name: ${selectedFolder.name}
        `.trim()
      }

      // Add PDF context
      if (attachedPDFs.length > 0) {
        const pdfContext = attachedPDFs
          .filter((pdf) => pdf.text)
          .map((pdf) => `\n\n--- PDF Document: ${pdf.name} ---\n${pdf.text}`)
          .join("\n")

        if (pdfContext) {
          contextText += `\n\n=== ATTACHED PDF DOCUMENTS ===${pdfContext}`
        }
      }

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: inputValue.trim(),
          mode: mode,
          model: "compound-beta",
          context: contextText,
          stream: true,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Generation failed")
      }

      // Handle streaming response
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response stream")
      }

      let fullResponse = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n").filter((line) => line.startsWith("data: "))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === "chunk" && data.content) {
              fullResponse += data.content
              setResponse(fullResponse)
            } else if (data.type === "error") {
              throw new Error(data.error)
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setIsProcessing(false)
    }
  }, [inputValue, selectedFolder, mode])

  // Copy response to clipboard
  const handleCopy = useCallback(() => {
    if (response) {
      navigator.clipboard.writeText(response)
      toast.success("Copied to clipboard")
    }
  }, [response])

  // Regenerate
  const handleRegenerate = useCallback(() => {
    setResponse("")
    setError(null)
    handleGenerate()
  }, [handleGenerate])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        if (inputValue.trim() && !isProcessing) {
          handleGenerate()
        }
      }
    },
    [onClose, inputValue, isProcessing, handleGenerate]
  )

  // Extract mermaid chart from response
  const extractMermaidChart = (text: string): string | null => {
    const match = text.match(/```mermaid\s*\n([\s\S]*?)```/)
    return match ? match[1].trim() : null
  }

  const mermaidChart = extractMermaidChart(response)

  if (!isOpen) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[500px] max-w-[calc(100vw-2rem)] bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={AiChat02Icon} size={20} className="text-indigo-400" />
          <span className="font-medium text-white">
            {mode === "flowchart" ? "Folder Flowchart" : "Folder AI"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} className="text-zinc-400" />
        </button>
      </div>

      {/* Folder Selector */}
      <div className="px-4 py-3 border-b border-white/5">
        <label className="text-xs text-zinc-400 mb-1.5 block">Select Folder</label>
        <select
          value={selectedFolderId || ""}
          onChange={(e) => setSelectedFolderId(e.target.value || null)}
          className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          <option value="">Choose a folder...</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.pages.length} notes)
            </option>
          ))}
        </select>
      </div>

      {/* Attached PDFs */}
      {attachedPDFs.length > 0 && (
        <div className="px-4 py-2 border-b border-white/5 flex flex-wrap gap-2">
          {attachedPDFs.map((pdf) => (
            <div
              key={pdf.name}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs"
            >
              <FileText size={14} className="text-red-400" />
              <span className="text-zinc-300 max-w-[120px] truncate">{pdf.name}</span>
              {pdf.isExtracting ? (
                <HugeiconsIcon icon={Loading03Icon} size={12} className="text-red-400 animate-spin" />
              ) : (
                <button
                  onClick={() => removePDF(pdf.name)}
                  className="p-0.5 hover:bg-red-500/20 rounded"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={12} className="text-zinc-400 hover:text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={attachedPDFs.length > 0 ? "Ask about the attached PDFs..." : "Ask about this folder..."}
            className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 pr-24 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            rows={2}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* PDF Attach Button */}
            <button
              onClick={() => pdfInputRef.current?.click()}
              className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
              title="Attach PDF for AI to read"
            >
              <HugeiconsIcon icon={AttachmentIcon} size={18} />
            </button>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handlePDFAttach(e.target.files)}
            />
            {/* Submit Button */}
            <button
              onClick={handleGenerate}
              disabled={isProcessing || !inputValue.trim() || (!selectedFolderId && attachedPDFs.length === 0)}
              className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isProcessing ? (
                <HugeiconsIcon icon={Loading03Icon} size={18} className="text-white animate-spin" />
              ) : (
                <HugeiconsIcon icon={ArrowUp01Icon} size={18} className="text-white" />
              )}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-zinc-500 mt-1.5">
          Attach PDFs to ask questions about their content
        </p>
      </div>

      {/* Response/Output Section */}
      <div
        ref={responseRef}
        className="px-4 py-4 max-h-[400px] overflow-y-auto"
      >
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {isProcessing && !response && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-zinc-400">
              <HugeiconsIcon icon={Loading03Icon} size={20} className="animate-spin" />
              <span className="text-sm">Generating...</span>
            </div>
          </div>
        )}

        {mermaidChart && (
          <div className="mb-4">
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
              <MermaidChart chart={mermaidChart} />
            </div>
          </div>
        )}

        {response && !mermaidChart && (
          <div className="prose prose-invert prose-sm max-w-none">
            <div className="text-zinc-200 text-sm whitespace-pre-wrap">{response}</div>
          </div>
        )}

        {response && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
            >
              <HugeiconsIcon icon={Copy01Icon} size={14} />
              Copy
            </button>
            <button
              onClick={handleRegenerate}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all disabled:opacity-50"
            >
              <HugeiconsIcon icon={RefreshIcon} size={14} />
              Regenerate
            </button>
          </div>
        )}

        {!response && !isProcessing && !error && (
          <div className="text-center py-8 text-zinc-500">
            <p className="text-sm">Select a folder and ask a question to get started</p>
            <p className="text-xs mt-1 text-zinc-600">
              {mode === "flowchart"
                ? "A flowchart will be generated based on your folder structure"
                : "AI will analyze all notes in the selected folder"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import { Editor } from "@tiptap/react"
import { exportToPdf, exportToMarkdown, exportToText, exportToHtml } from "@/lib/export-utils"

interface ExportMenuProps {
  editor: Editor | null
  pageName: string
}

type ExportFormat = "pdf" | "markdown" | "html" | "text"

interface ExportOption {
  id: ExportFormat
  label: string
  description: string
  icon: React.ReactNode
  shortcut: string
}

const exportOptions: ExportOption[] = [
  {
    id: "pdf",
    label: "PDF",
    description: "Export as PDF document",
    icon: <PdfIcon />,
    shortcut: "Ctrl+P",
  },
  {
    id: "markdown",
    label: "Markdown",
    description: "Export as .md file",
    icon: <MarkdownIcon />,
    shortcut: "Ctrl+Shift+M",
  },
  {
    id: "html",
    label: "HTML",
    description: "Export as HTML page",
    icon: <HtmlIcon />,
    shortcut: "",
  },
  {
    id: "text",
    label: "Plain Text",
    description: "Export as .txt file",
    icon: <TextIcon />,
    shortcut: "",
  },
]

export function ExportMenu({ editor, pageName }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
    }

    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const handleExport = async (format: ExportFormat) => {
    if (!editor) {
      console.error("No editor instance available")
      return
    }

    setIsExporting(format)
    const htmlContent = editor.getHTML()
    const filename = pageName || "untitled"

    console.log("Exporting:", format, "content length:", htmlContent.length)

    try {
      switch (format) {
        case "pdf":
          await exportToPdf(htmlContent, filename)
          break
        case "markdown":
          exportToMarkdown(htmlContent, filename)
          break
        case "html":
          exportToHtml(htmlContent, filename)
          break
        case "text":
          exportToText(htmlContent, filename)
          break
      }
      console.log("Export successful:", format)
    } catch (error) {
      console.error(`Failed to export as ${format}:`, error)
    } finally {
      setIsExporting(null)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        title="Export (Ctrl+Shift+E)"
      >
        <ExportIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Export</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-zinc-700/50 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2 border-b border-zinc-700/50">
            <p className="px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Export As
            </p>
          </div>

          <div className="py-1">
            {exportOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleExport(option.id)}
                disabled={isExporting !== null}
                className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-zinc-800/50 transition-colors disabled:opacity-50"
              >
                <span className="text-zinc-400">{option.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {option.label}
                    </span>
                    {isExporting === option.id && (
                      <span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">{option.description}</span>
                </div>
                {option.shortcut && (
                  <span className="text-xs text-zinc-600 font-mono">
                    {option.shortcut}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Icons
function ExportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  )
}

function PdfIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15v2h6v-2" />
      <path d="M9 11v6" />
      <path d="M15 11v6" />
    </svg>
  )
}

function MarkdownIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 15V9l2 2 2-2v6" />
      <path d="M17 9v6l-2-2" />
    </svg>
  )
}

function HtmlIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="12" x2="12" y1="2" y2="22" />
    </svg>
  )
}

function TextIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" x2="16" y1="13" y2="13" />
      <line x1="8" x2="16" y1="17" y2="17" />
    </svg>
  )
}

"use client"

import { useEffect, useRef } from "react"

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutGroup {
  title: string
  shortcuts: {
    keys: string[]
    description: string
  }[]
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: ["Ctrl", "S"], description: "Save document" },
      { keys: ["Ctrl", "Z"], description: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Redo" },
      { keys: ["Ctrl", "A"], description: "Select all" },
      { keys: ["Ctrl", "F"], description: "Find in document" },
      { keys: ["Ctrl", "K"], description: "Keyboard shortcuts" },
      { keys: ["/"], description: "Open command menu" },
    ],
  },
  {
    title: "Text Formatting",
    shortcuts: [
      { keys: ["Ctrl", "B"], description: "Bold" },
      { keys: ["Ctrl", "I"], description: "Italic" },
      { keys: ["Ctrl", "U"], description: "Underline" },
      { keys: ["Ctrl", "Shift", "S"], description: "Strikethrough" },
      { keys: ["Ctrl", "`"], description: "Inline code" },
      { keys: ["Ctrl", "Shift", "H"], description: "Highlight" },
    ],
  },
  {
    title: "Blocks",
    shortcuts: [
      { keys: ["Ctrl", "Alt", "1"], description: "Heading 1" },
      { keys: ["Ctrl", "Alt", "2"], description: "Heading 2" },
      { keys: ["Ctrl", "Alt", "3"], description: "Heading 3" },
      { keys: ["Ctrl", "Shift", "7"], description: "Numbered list" },
      { keys: ["Ctrl", "Shift", "8"], description: "Bullet list" },
      { keys: ["Ctrl", "Shift", "9"], description: "Task list" },
      { keys: ["Ctrl", "Shift", "B"], description: "Blockquote" },
      { keys: ["Ctrl", "Alt", "C"], description: "Code block" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["Ctrl", "Home"], description: "Go to start" },
      { keys: ["Ctrl", "End"], description: "Go to end" },
      { keys: ["Ctrl", "↑"], description: "Move line up" },
      { keys: ["Ctrl", "↓"], description: "Move line down" },
    ],
  },
  {
    title: "Media & Links",
    shortcuts: [
      { keys: ["Ctrl", "Shift", "I"], description: "Insert image" },
      { keys: ["Ctrl", "Shift", "L"], description: "Insert link" },
    ],
  },
  {
    title: "Export",
    shortcuts: [
      { keys: ["Ctrl", "Shift", "E"], description: "Export menu" },
      { keys: ["Ctrl", "P"], description: "Export as PDF" },
      { keys: ["Ctrl", "Shift", "M"], description: "Export as Markdown" },
    ],
  },
]

// Platform detection for displaying correct modifier key
const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0

function formatKey(key: string): string {
  if (isMac) {
    return key
      .replace("Ctrl", "⌘")
      .replace("Alt", "⌥")
      .replace("Shift", "⇧")
  }
  return key
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl max-h-[85vh] bg-zinc-900/95 backdrop-blur-xl rounded-2xl border border-zinc-700/50 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700/50">
          <div className="flex items-center gap-3">
            <KeyboardIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(85vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shortcutGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
                    >
                      <span className="text-sm text-zinc-300">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <span key={keyIdx} className="flex items-center gap-1">
                            <kbd className="px-2 py-1 text-xs font-medium bg-zinc-800 border border-zinc-700 rounded text-zinc-300 min-w-[24px] text-center">
                              {formatKey(key)}
                            </kbd>
                            {keyIdx < shortcut.keys.length - 1 && (
                              <span className="text-zinc-600 text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-700/50 bg-zinc-800/30">
          <p className="text-xs text-zinc-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-300 mx-1">Esc</kbd> to close
            {isMac ? " • ⌘ = Command" : " • Ctrl = Control"}
          </p>
        </div>
      </div>
    </div>
  )
}

// Icons
function KeyboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" ry="2" />
      <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

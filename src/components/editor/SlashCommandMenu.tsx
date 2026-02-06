"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Editor } from "@tiptap/react"

export interface SlashCommand {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  category: "basic" | "formatting" | "media" | "advanced" | "ai"
  action: (editor: Editor) => void
}

interface SlashCommandMenuProps {
  editor: Editor
  isOpen: boolean
  position: { top: number; left: number }
  onClose: () => void
}

// Icons
const HeadingIcon = ({ level }: { level: number }) => (
  <div className="w-5 h-5 flex items-center justify-center text-xs font-bold">
    H{level}
  </div>
)

const TextIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
  </svg>
)

const BulletListIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    <circle cx="2" cy="6" r="1" fill="currentColor" />
    <circle cx="2" cy="10" r="1" fill="currentColor" />
    <circle cx="2" cy="14" r="1" fill="currentColor" />
    <circle cx="2" cy="18" r="1" fill="currentColor" />
  </svg>
)

const NumberedListIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13" />
    <text x="2" y="8" fontSize="6" fill="currentColor">1</text>
    <text x="2" y="14" fontSize="6" fill="currentColor">2</text>
    <text x="2" y="20" fontSize="6" fill="currentColor">3</text>
  </svg>
)

const TaskListIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="5" width="4" height="4" rx="1" strokeWidth={2} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 7h11" />
    <rect x="3" y="13" width="4" height="4" rx="1" strokeWidth={2} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 15h11" />
  </svg>
)

const QuoteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </svg>
)

const CodeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
)

const DividerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
  </svg>
)

const ImageIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15l-5-5L5 21" />
  </svg>
)

const WhiteboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01" />
  </svg>
)

const ColumnsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="18" rx="1" strokeWidth={2} />
    <rect x="14" y="3" width="7" height="18" rx="1" strokeWidth={2} />
  </svg>
)

const TableIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
    <path strokeLinecap="round" strokeWidth={2} d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </svg>
)

// AI Icons
const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
)

const SummarizeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h6" />
  </svg>
)

const ExpandIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
)

const ImproveIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const TranslateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
  </svg>
)

const FlowchartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="6" height="4" rx="1" strokeWidth={2} />
    <rect x="15" y="3" width="6" height="4" rx="1" strokeWidth={2} />
    <rect x="9" y="17" width="6" height="4" rx="1" strokeWidth={2} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7v3a2 2 0 002 2h8a2 2 0 002-2V7M12 12v5" />
  </svg>
)

const ExcalidrawIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
)

const QuizIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const FlashcardsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
)

export const slashCommands: SlashCommand[] = [
  // Basic
  {
    id: "paragraph",
    label: "Text",
    description: "Plain text paragraph",
    icon: <TextIcon />,
    category: "basic",
    action: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: "h1",
    label: "Heading 1",
    description: "Large section heading",
    icon: <HeadingIcon level={1} />,
    category: "basic",
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: <HeadingIcon level={2} />,
    category: "basic",
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    label: "Heading 3",
    description: "Small section heading",
    icon: <HeadingIcon level={3} />,
    category: "basic",
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },

  // Formatting
  {
    id: "bulletList",
    label: "Bullet List",
    description: "Create a bulleted list",
    icon: <BulletListIcon />,
    category: "formatting",
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "orderedList",
    label: "Numbered List",
    description: "Create a numbered list",
    icon: <NumberedListIcon />,
    category: "formatting",
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "taskList",
    label: "Task List",
    description: "Create a checklist",
    icon: <TaskListIcon />,
    category: "formatting",
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: "blockquote",
    label: "Quote",
    description: "Add a blockquote",
    icon: <QuoteIcon />,
    category: "formatting",
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "codeBlock",
    label: "Code Block",
    description: "Add a code snippet",
    icon: <CodeIcon />,
    category: "formatting",
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "divider",
    label: "Divider",
    description: "Add a horizontal line",
    icon: <DividerIcon />,
    category: "formatting",
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },

  // Media
  {
    id: "image",
    label: "Image",
    description: "Upload an image",
    icon: <ImageIcon />,
    category: "media",
    action: (editor) => {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = "image/*"
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = () => {
            editor.chain().focus().setImage({ src: reader.result as string }).run()
          }
          reader.readAsDataURL(file)
        }
      }
      input.click()
    },
  },

  // Advanced
  {
    id: "whiteboard",
    label: "Whiteboard",
    description: "Add a drawing canvas",
    icon: <WhiteboardIcon />,
    category: "advanced",
    action: (editor) => {
      editor.chain().focus().insertContent({ type: "whiteboard" }).run()
    },
  },
  {
    id: "columns",
    label: "Two Columns",
    description: "Split into two columns",
    icon: <ColumnsIcon />,
    category: "advanced",
    action: (editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "columns",
          content: [
            { type: "column", content: [{ type: "paragraph" }] },
            { type: "column", content: [{ type: "paragraph" }] },
          ],
        })
        .run()
    },
  },
  {
    id: "excalidraw",
    label: "Excalidraw",
    description: "Add an interactive drawing canvas",
    icon: <ExcalidrawIcon />,
    category: "advanced",
    action: (editor) => {
      // @ts-ignore - custom command
      editor.chain().focus().insertExcalidraw().run()
    },
  },
  {
    id: "quiz",
    label: "Quiz",
    description: "Create a quiz from your notes",
    icon: <QuizIcon />,
    category: "advanced",
    action: () => {
      window.dispatchEvent(new CustomEvent('openQuizModal', { detail: { mode: 'create' } }))
    },
  },
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Generate flashcards from your notes",
    icon: <FlashcardsIcon />,
    category: "advanced",
    action: () => {
      window.dispatchEvent(new CustomEvent('openFlashcardsModal', { detail: { mode: 'create' } }))
    },
  },

  // AI Commands
  {
    id: "ai-ask",
    label: "Ask AI",
    description: "Ask AI a question about your notes",
    icon: <SparklesIcon />,
    category: "ai",
    action: (editor) => {
      // Dispatch custom event to open AI panel
      window.dispatchEvent(new CustomEvent('openAIPanel', { detail: { mode: 'answer' } }))
    },
  },
  {
    id: "ai-summarize",
    label: "AI Summarize",
    description: "Summarize the selected content",
    icon: <SummarizeIcon />,
    category: "ai",
    action: (editor) => {
      window.dispatchEvent(new CustomEvent('openAIPanel', { detail: { mode: 'summarize' } }))
    },
  },
  {
    id: "ai-expand",
    label: "AI Expand",
    description: "Expand and add more detail",
    icon: <ExpandIcon />,
    category: "ai",
    action: (editor) => {
      window.dispatchEvent(new CustomEvent('openAIPanel', { detail: { mode: 'expand' } }))
    },
  },
  {
    id: "ai-improve",
    label: "AI Improve",
    description: "Improve writing quality",
    icon: <ImproveIcon />,
    category: "ai",
    action: (editor) => {
      window.dispatchEvent(new CustomEvent('openAIPanel', { detail: { mode: 'improve' } }))
    },
  },
  {
    id: "ai-translate",
    label: "AI Translate",
    description: "Translate to another language",
    icon: <TranslateIcon />,
    category: "ai",
    action: (editor) => {
      window.dispatchEvent(new CustomEvent('openAIPanel', { detail: { mode: 'translate' } }))
    },
  },
  {
    id: "ai-flowchart",
    label: "AI Flowchart",
    description: "Generate a flowchart from content",
    icon: <FlowchartIcon />,
    category: "ai",
    action: (editor) => {
      window.dispatchEvent(new CustomEvent('openAIPanel', { detail: { mode: 'flowchart' } }))
    },
  },
]

const categoryLabels: Record<string, string> = {
  basic: "Basic Blocks",
  formatting: "Formatting",
  media: "Media",
  advanced: "Advanced",
  ai: "AI Assistant",
}

const categoryOrder = ["ai", "basic", "formatting", "media", "advanced"]

export function SlashCommandMenu({ editor, isOpen, position, onClose }: SlashCommandMenuProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter commands based on search
  const filteredCommands = slashCommands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group commands by category
  const groupedCommands = categoryOrder.reduce((acc, category) => {
    const commands = filteredCommands.filter((cmd) => cmd.category === category)
    if (commands.length > 0) {
      acc[category] = commands
    }
    return acc
  }, {} as Record<string, SlashCommand[]>)

  // Flatten for index calculation
  const flattenedCommands = categoryOrder.flatMap(
    (category) => groupedCommands[category] || []
  )

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  // Focus input when menu opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (!isOpen) {
      setSearchQuery("")
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const len = flattenedCommands.length
      if (len === 0 && e.key !== "Escape") return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % len)
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + len) % len)
          break
        case "Enter":
          e.preventDefault()
          if (flattenedCommands[selectedIndex]) {
            selectCommand(flattenedCommands[selectedIndex])
          }
          break
        case "Escape":
          e.preventDefault()
          onClose()
          break
      }
    },
    [flattenedCommands, selectedIndex, onClose]
  )

  const selectCommand = (command: SlashCommand) => {
    // Delete the slash and any search text
    const from = editor.state.selection.from
    const deleteFrom = Math.max(0, from - searchQuery.length - 1)

    editor.chain().focus().deleteRange({
      from: deleteFrom,
      to: from,
    }).run()

    command.action(editor)
    onClose()
  }

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onClose])

  // Calculate optimal position based on viewport
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; openUpward: boolean }>({
    top: position.top,
    left: position.left,
    openUpward: false,
  })

  useEffect(() => {
    if (!isOpen) return

    const menuHeight = 400 // max-h-[400px]
    const menuWidth = 280 // min-w-[280px]
    const padding = 16 // margin from viewport edges
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth

    // Check if menu would overflow bottom
    const spaceBelow = viewportHeight - position.top
    const spaceAbove = position.top
    const openUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow

    // Calculate top position
    let top = position.top
    if (openUpward) {
      top = Math.max(padding, position.top - menuHeight)
    } else {
      top = Math.min(position.top, viewportHeight - menuHeight - padding)
    }

    // Calculate left position (ensure menu doesn't overflow right edge)
    let left = position.left
    if (left + menuWidth > viewportWidth - padding) {
      left = viewportWidth - menuWidth - padding
    }
    left = Math.max(padding, left)

    setMenuPosition({ top, left, openUpward })
  }, [isOpen, position.top, position.left])

  if (!isOpen) return null

  // Calculate which index each command is at for selection
  let currentFlatIndex = 0

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-zinc-700/50 shadow-2xl overflow-hidden min-w-[280px] max-h-[400px] animate-in fade-in duration-150 ${
        menuPosition.openUpward ? "slide-in-from-bottom-2" : "slide-in-from-top-2"
      }`}
      style={{ top: menuPosition.top, left: menuPosition.left }}
      onKeyDown={handleKeyDown}
    >
      {/* Search input */}
      <div className="p-2 border-b border-zinc-700/50">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search commands..."
          className="w-full px-3 py-2 text-sm bg-zinc-800/50 rounded-lg border border-zinc-700/50 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
      </div>

      {/* Commands list */}
      <div className="py-1 max-h-[320px] overflow-y-auto">
        {flattenedCommands.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-zinc-500">
            No commands found
          </div>
        ) : (
          categoryOrder.map((category) => {
            const commands = groupedCommands[category]
            if (!commands || commands.length === 0) return null

            return (
              <div key={category}>
                <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {categoryLabels[category]}
                </div>
                {commands.map((cmd) => {
                  const flatIndex = currentFlatIndex++
                  const isSelected = flatIndex === selectedIndex

                  return (
                    <button
                      key={cmd.id}
                      className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors ${
                        isSelected
                          ? "bg-indigo-500/20 text-white"
                          : "text-zinc-300 hover:bg-zinc-800/50"
                      }`}
                      onClick={() => selectCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                    >
                      <span className={`${isSelected ? "text-indigo-400" : "text-zinc-500"}`}>
                        {cmd.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{cmd.label}</div>
                        <div className={`text-xs ${isSelected ? "text-indigo-300" : "text-zinc-500"}`}>
                          {cmd.description}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-zinc-700/50 bg-zinc-800/30">
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-300">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-300">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-300">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  )
}

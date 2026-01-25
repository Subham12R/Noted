"use client"

import { useStudyToolbar, ToolbarItem } from "@/context/StudyToolbarContext"
import { usePomodoro } from "@/context/PomodoroContext"
import { useFlashcards } from "@/context/FlashcardContext"
import { useQuiz } from "@/context/QuizContext"
import { useFileLibrary } from "@/context/FileLibraryContext"
import { useState, useRef, useEffect } from "react"
import {
  Zap,
  Layers,
  Brain,
  HelpCircle,
  BarChart3,
  FolderOpen,
  Timer,
  Settings,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Search,
} from "lucide-react"
import { FileLibrary } from "@/components/file-library"
import { AdvancedSearch } from "@/components/search"

interface ToolbarItemConfig {
  id: ToolbarItem
  icon: React.ReactNode
  label: string
  shortcut: string
  onClick: () => void
}

export function StudyToolbar() {
  const {
    isExpanded,
    toggleExpanded,
    activePanel,
    togglePanel,
    badges,
    isVisible,
  } = useStudyToolbar()

  const { toggleVisibility: togglePomodoro, isVisible: pomodoroVisible } = usePomodoro()
  const { openModal: openFlashcards } = useFlashcards()
  const { openModal: openQuiz } = useQuiz()
  const { togglePanel: toggleFileLibrary, isPanelOpen: fileLibraryOpen, closePanel: closeFileLibrary } = useFileLibrary()

  const [hoveredItem, setHoveredItem] = useState<ToolbarItem | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartX = useRef(0)
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Calculate toolbar width based on expanded state
  const toolbarWidth = isExpanded ? 192 : 56 // w-48 or w-14 in pixels

  // Handle drag to open/close
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = dragStartX.current - e.clientX // Reversed for right side
      setDragOffset(Math.max(-toolbarWidth, Math.min(0, delta)))
    }

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false)
      const delta = dragStartX.current - e.clientX // Reversed for right side
      // If dragged more than 1/3 of the toolbar width, toggle state
      if (isOpen && delta < -toolbarWidth / 3) {
        setIsOpen(false)
      } else if (!isOpen && delta > toolbarWidth / 3) {
        setIsOpen(true)
      }
      setDragOffset(0)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, isOpen, toolbarWidth])

  if (!isVisible) return null

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K for search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
      // Ctrl+Shift+L for file library
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "L") {
        e.preventDefault()
        toggleFileLibrary()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [toggleFileLibrary])

  const items: ToolbarItemConfig[] = [
    {
      id: "quick-actions",
      icon: <Search size={20} />,
      label: "Search",
      shortcut: "Ctrl+K",
      onClick: () => setSearchOpen(true),
    },
    {
      id: "flashcards",
      icon: <Layers size={20} />,
      label: "Flashcards",
      shortcut: "Ctrl+Shift+F",
      onClick: () => openFlashcards("list"),
    },
    {
      id: "knowledge-graph",
      icon: <Brain size={20} />,
      label: "Knowledge Graph",
      shortcut: "Ctrl+Shift+G",
      onClick: () => togglePanel("knowledge-graph"),
    },
    {
      id: "quiz",
      icon: <HelpCircle size={20} />,
      label: "Quiz",
      shortcut: "Ctrl+Shift+Q",
      onClick: () => openQuiz("list"),
    },
    {
      id: "analytics",
      icon: <BarChart3 size={20} />,
      label: "Analytics",
      shortcut: "Ctrl+Shift+A",
      onClick: () => togglePanel("analytics"),
    },
    {
      id: "file-library",
      icon: <FolderOpen size={20} />,
      label: "File Library",
      shortcut: "Ctrl+Shift+L",
      onClick: () => toggleFileLibrary(),
    },
    {
      id: "pomodoro",
      icon: <Timer size={20} />,
      label: "Pomodoro",
      shortcut: "Ctrl+Shift+P",
      onClick: () => togglePomodoro(),
    },
  ]

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartX.current = e.clientX
  }

  // Calculate position (right side)
  const translateX = isDragging
    ? isOpen
      ? -dragOffset
      : toolbarWidth + dragOffset - toolbarWidth
    : isOpen
      ? 0
      : toolbarWidth

  return (
    <>
      {/* Floating Toolbar - Right Side */}
      <div
        ref={toolbarRef}
        className="fixed right-0 top-0 h-full z-50 flex flex-row-reverse transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${translateX}px)`,
          transitionDuration: isDragging ? "0ms" : "200ms",
        }}
      >
        {/* Main Toolbar */}
        <div
          className={`h-full flex flex-col bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-700/50 shadow-2xl ${
            isExpanded ? "w-48" : "w-14"
          }`}
        >
          {/* Header */}
          <div className="h-14 flex items-center justify-between px-2 border-b border-zinc-800">
            <button
              onClick={toggleExpanded}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            {isExpanded && (
              <span className="text-sm font-semibold text-zinc-300 mr-2">Study Tools</span>
            )}
          </div>

          {/* Items */}
          <div className="flex-1 py-2 flex flex-col gap-1 px-2 overflow-y-auto">
            {items.map(item => {
              const badge = badges[item.id]
              const isActive = activePanel === item.id ||
                (item.id === "pomodoro" && pomodoroVisible) ||
                (item.id === "file-library" && fileLibraryOpen) ||
                (item.id === "quick-actions" && searchOpen)

              return (
                <div key={item.id} className="relative">
                  <button
                    onClick={item.onClick}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-150 ${
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    } ${isExpanded ? "flex-row-reverse" : ""}`}
                  >
                    <span className="relative flex-shrink-0">
                      {item.icon}
                      {badge !== undefined && badge > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-medium rounded-full px-1">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </span>
                    {isExpanded && (
                      <span className="text-sm font-medium truncate">{item.label}</span>
                    )}
                  </button>

                  {/* Tooltip - Left side for right toolbar */}
                  {!isExpanded && hoveredItem === item.id && (
                    <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-3 py-2 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 whitespace-nowrap z-50">
                      <div className="text-sm font-medium text-white">{item.label}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{item.shortcut}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Settings at bottom */}
          <div className="py-2 px-2 border-t border-zinc-800">
            <button
              onClick={() => togglePanel("settings")}
              onMouseEnter={() => setHoveredItem("settings")}
              onMouseLeave={() => setHoveredItem(null)}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-150 ${
                activePanel === "settings"
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              } ${isExpanded ? "flex-row-reverse" : ""}`}
            >
              <Settings size={20} />
              {isExpanded && <span className="text-sm font-medium">Settings</span>}
            </button>

            {!isExpanded && hoveredItem === "settings" && (
              <div className="absolute right-full bottom-2 mr-2 px-3 py-2 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 whitespace-nowrap z-50">
                <div className="text-sm font-medium text-white">Settings</div>
              </div>
            )}
          </div>
        </div>

        {/* Drag Handle - Left of toolbar */}
        <div
          onMouseDown={handleDragStart}
          onClick={() => !isDragging && setIsOpen(!isOpen)}
          className="h-full w-4 flex items-center justify-center cursor-ew-resize group"
        >
          <div className="h-24 w-1.5 bg-zinc-700/50 rounded-full group-hover:bg-indigo-500/50 transition-colors flex items-center justify-center">
            <GripVertical size={10} className="text-zinc-500 group-hover:text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Edge Trigger - Always visible thin bar when toolbar is closed (right side) */}
      {!isOpen && !isDragging && (
        <div
          onClick={() => setIsOpen(true)}
          onMouseDown={handleDragStart}
          className="fixed right-0 top-0 h-full w-2 z-40 cursor-pointer group"
        >
          <div className="h-full w-full bg-transparent hover:bg-indigo-500/20 transition-colors">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-20 w-1 bg-zinc-600/30 group-hover:bg-indigo-500/50 rounded-l-full transition-colors" />
          </div>
        </div>
      )}

      {/* Backdrop when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* File Library Panel */}
      {fileLibraryOpen && (
        <div className="fixed inset-y-0 right-16 w-96 z-50 shadow-2xl">
          <FileLibrary />
        </div>
      )}

      {/* Advanced Search Modal */}
      <AdvancedSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

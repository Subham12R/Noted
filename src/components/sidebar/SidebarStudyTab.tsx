"use client"

import { useFlashcards } from "@/context/FlashcardContext"
import { useQuiz } from "@/context/QuizContext"
import { usePomodoro } from "@/context/PomodoroContext"
import { useStudyToolbar } from "@/context/StudyToolbarContext"
import {
  Layers,
  Brain,
  HelpCircle,
  BarChart3,
  Timer,
  Search,
} from "lucide-react"

interface StudyToolItem {
  id: string
  icon: React.ReactNode
  label: string
  shortcut: string
  onClick: () => void
  badge?: number
}

interface SidebarStudyTabProps {
  onSearchClick?: () => void
}

export function SidebarStudyTab({ onSearchClick }: SidebarStudyTabProps) {
  const { openModal: openFlashcards } = useFlashcards()
  const { openModal: openQuiz } = useQuiz()
  const { toggleVisibility: togglePomodoro, isVisible: pomodoroVisible } = usePomodoro()
  const { badges, togglePanel } = useStudyToolbar()

  const items: StudyToolItem[] = [
    {
      id: "flashcards",
      icon: <Layers size={18} />,
      label: "Flashcards",
      shortcut: "Ctrl+Shift+F",
      onClick: () => openFlashcards("list"),
      badge: badges.flashcards,
    },
    {
      id: "quiz",
      icon: <HelpCircle size={18} />,
      label: "Quiz",
      shortcut: "Ctrl+Shift+Q",
      onClick: () => openQuiz("list"),
      badge: badges.quiz,
    },
    {
      id: "pomodoro",
      icon: <Timer size={18} />,
      label: "Pomodoro",
      shortcut: "Ctrl+Shift+P",
      onClick: () => togglePomodoro(),
    },
  ]

  return (
    <div className="sidebar-study-list">
      {items.map((item) => (
        <div
          key={item.id}
          className="sidebar-study-item"
          onClick={item.onClick}
          data-active={item.id === "pomodoro" && pomodoroVisible}
        >
          <span className="sidebar-study-icon">{item.icon}</span>
          <span className="sidebar-study-label">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="sidebar-study-badge">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
          <span className="sidebar-study-shortcut">{item.shortcut}</span>
        </div>
      ))}
    </div>
  )
}

export default SidebarStudyTab

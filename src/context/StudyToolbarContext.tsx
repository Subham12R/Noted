"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

export type ToolbarItem =
  | "quick-actions"
  | "flashcards"
  | "knowledge-graph"
  | "quiz"
  | "analytics"
  | "file-library"
  | "pomodoro"
  | "settings"

interface StudyToolbarContextType {
  isExpanded: boolean
  toggleExpanded: () => void
  setExpanded: (expanded: boolean) => void
  activePanel: ToolbarItem | null
  openPanel: (item: ToolbarItem) => void
  closePanel: () => void
  togglePanel: (item: ToolbarItem) => void
  badges: Partial<Record<ToolbarItem, number>>
  setBadge: (item: ToolbarItem, count: number) => void
  isVisible: boolean
  setVisible: (visible: boolean) => void
}

const StudyToolbarContext = createContext<StudyToolbarContextType | null>(null)

export function StudyToolbarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activePanel, setActivePanel] = useState<ToolbarItem | null>(null)
  const [badges, setBadges] = useState<Partial<Record<ToolbarItem, number>>>({
    flashcards: 0,
    quiz: 0,
  })
  const [isVisible, setIsVisible] = useState(true)

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const setExpanded = useCallback((expanded: boolean) => {
    setIsExpanded(expanded)
  }, [])

  const openPanel = useCallback((item: ToolbarItem) => {
    setActivePanel(item)
  }, [])

  const closePanel = useCallback(() => {
    setActivePanel(null)
  }, [])

  const togglePanel = useCallback((item: ToolbarItem) => {
    setActivePanel(prev => (prev === item ? null : item))
  }, [])

  const setBadge = useCallback((item: ToolbarItem, count: number) => {
    setBadges(prev => ({ ...prev, [item]: count }))
  }, [])

  const setVisible = useCallback((visible: boolean) => {
    setIsVisible(visible)
  }, [])

  return (
    <StudyToolbarContext.Provider
      value={{
        isExpanded,
        toggleExpanded,
        setExpanded,
        activePanel,
        openPanel,
        closePanel,
        togglePanel,
        badges,
        setBadge,
        isVisible,
        setVisible,
      }}
    >
      {children}
    </StudyToolbarContext.Provider>
  )
}

export function useStudyToolbar() {
  const context = useContext(StudyToolbarContext)
  if (!context) {
    throw new Error("useStudyToolbar must be used within a StudyToolbarProvider")
  }
  return context
}

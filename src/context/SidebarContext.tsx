"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

export type SidebarTab = "folders" | "tags" | "study"

interface SidebarContextType {
  isOpen: boolean
  mode: "floating" | "sticky"
  activeTab: SidebarTab
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void
  setMode: (mode: "floating" | "sticky") => void
  setActiveTab: (tab: SidebarTab) => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setModeState] = useState<"floating" | "sticky">("floating")
  const [activeTab, setActiveTabState] = useState<SidebarTab>("folders")

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const openSidebar = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeSidebar = useCallback(() => {
    if (mode === "floating") {
      setIsOpen(false)
    }
  }, [mode])

  const setMode = useCallback((newMode: "floating" | "sticky") => {
    setModeState(newMode)
    if (newMode === "sticky") {
      setIsOpen(true)
    }
  }, [])

  const setActiveTab = useCallback((tab: SidebarTab) => {
    setActiveTabState(tab)
  }, [])

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        mode,
        activeTab,
        toggleSidebar,
        openSidebar,
        closeSidebar,
        setMode,
        setActiveTab,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebarContext() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebarContext must be used within a SidebarProvider")
  }
  return context
}

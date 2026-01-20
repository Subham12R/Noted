"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

interface SidebarContextType {
  isOpen: boolean
  mode: "floating" | "sticky"
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void
  setMode: (mode: "floating" | "sticky") => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setModeState] = useState<"floating" | "sticky">("floating")

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

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        mode,
        toggleSidebar,
        openSidebar,
        closeSidebar,
        setMode,
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

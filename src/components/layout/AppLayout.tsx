"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Input } from "@/components/Input"
import { StudyToolbar } from "@/components/study-toolbar"
import { useNotes } from "@/context/NotesContext"
import { useSidebarContext } from "@/context/SidebarContext"
import { DashboardToolbar } from "./DashboardToolbar"

interface AppLayoutProps {
  children: React.ReactNode
  showInput?: boolean
  showToolbar?: boolean
  showStudyToolbar?: boolean
}

export function AppLayout({ children, showInput = true, showToolbar = true, showStudyToolbar = true }: AppLayoutProps) {
  const router = useRouter()
  const { isOpen, mode, closeSidebar, setMode } = useSidebarContext()

  const {
    folders,
    setFolders,
    activePage,
    setActivePage,
    createFolder,
    createPage,
    deleteFolder,
    deletePage,
    renameFolder,
    renamePage,
    movePage,
    moveFolder,
  } = useNotes()

  const handlePageSelect = useCallback((pageId: string) => {
    setActivePage(pageId)
    if (mode === "floating") {
      closeSidebar()
    }
    router.push(`/note/${pageId}`)
  }, [mode, setActivePage, router, closeSidebar])

  return (
    <div className={`min-h-screen w-full ${mode === "sticky" && isOpen ? "flex" : ""}`}>
      {/* Study Toolbar - Fixed left side */}
      {showStudyToolbar && <StudyToolbar />}

      <Sidebar
        isOpen={isOpen}
        onClose={closeSidebar}
        mode={mode}
        onModeChange={setMode}
        folders={folders}
        onFoldersChange={setFolders}
        activePage={activePage}
        onPageSelect={handlePageSelect}
        onCreateFolder={createFolder}
        onCreatePage={createPage}
        onDeleteFolder={deleteFolder}
        onDeletePage={deletePage}
        onRenameFolder={renameFolder}
        onRenamePage={renamePage}
        onMovePage={movePage}
        onMoveFolder={moveFolder}
      />

      <div className="flex-1 min-w-0 relative h-screen flex flex-col overflow-hidden">
        {showToolbar && <DashboardToolbar />}

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {showInput && <Input />}
      </div>
    </div>
  )
}

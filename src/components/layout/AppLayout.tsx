"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Input } from "@/components/Input"
import { AdvancedSearch } from "@/components/search"
import { FileLibrary } from "@/components/file-library"
import { useNotes } from "@/context/NotesContext"
import { useSidebarContext } from "@/context/SidebarContext"
import { useFileLibrary } from "@/context/FileLibraryContext"
import { DashboardToolbar } from "./DashboardToolbar"

interface AppLayoutProps {
  children: React.ReactNode
  showInput?: boolean
  showToolbar?: boolean
}

export function AppLayout({ children, showInput = true, showToolbar = true }: AppLayoutProps) {
  const router = useRouter()
  const { isOpen, mode, closeSidebar, setMode } = useSidebarContext()
  const { isPanelOpen: fileLibraryOpen } = useFileLibrary()
  const [searchOpen, setSearchOpen] = useState(false)

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
        onSearchClick={() => setSearchOpen(true)}
      />

      {/* Advanced Search Modal */}
      <AdvancedSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* File Library Panel */}
      {fileLibraryOpen && (
        <div className="fixed inset-y-0 right-0 w-96 z-50 shadow-2xl">
          <FileLibrary />
        </div>
      )}

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

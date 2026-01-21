"use client"

import { useState } from "react"
import { useNotes } from "@/context/NotesContext"
import { FolderCard } from "./FolderCard"
import { PageCard } from "./PageCard"
import { DashboardAIPanel } from "./DashboardAIPanel"
import { PlusIcon } from "@/components/tiptap-icons/plus-icon"
import { FolderIcon } from "@/components/tiptap-icons/folder-icon"
import { FileIcon } from "@/components/tiptap-icons/file-icon"
import { ChevronRightIcon } from "@/components/tiptap-icons/chevron-right-icon"
import { HugeiconsIcon } from "@hugeicons/react"
import { AiChat02Icon } from "@hugeicons/core-free-icons"
import Link from "next/link"

interface FolderViewProps {
  folderId: string
}

export function FolderView({ folderId }: FolderViewProps) {
  const {
    getFolderById,
    createFolder,
    createPage,
    deleteFolder,
    deletePage,
    renameFolder,
    renamePage,
  } = useNotes()

  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  const folder = getFolderById(folderId)

  if (!folder) {
    return (
      <div className="min-h-screen bg-background p-8 max-sm:p-4">
        <div className="flex flex-col items-center justify-center p-12 text-center text-foreground/50 [&_svg]:w-12 [&_svg]:h-12 [&_svg]:mb-4 [&_svg]:opacity-50">
          <FolderIcon />
          <p className="m-0 text-sm">Folder not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8 max-sm:p-4">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/" className="text-foreground/60 no-underline transition-opacity hover:opacity-100">Home</Link>
        <ChevronRightIcon className="text-foreground/30" style={{ width: 16, height: 16 }} />
        <span className="text-foreground font-medium">{folder.name}</span>
      </nav>

      <div className="flex items-center justify-between border-b border-white/10 px-2 py-4 mb-4">
        <div className="flex flex-col justify-start items-start">
          <h1 className="tracking-tighter text-4xl font-bold leading-tight">{folder.name}</h1>
          <span className="tracking-tight font-medium text-base text-zinc-500 mt-1">
            {folder.pages.length} {folder.pages.length === 1 ? "note" : "notes"}
            {folder.folders && folder.folders.length > 0 && ` · ${folder.folders.length} ${folder.folders.length === 1 ? "folder" : "folders"}`}
          </span>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 backdrop-blur-3xl rounded-xl font-medium text-sm hover:bg-indigo-500/30 active:scale-[0.98] transition-all"
          onClick={() => setIsAIPanelOpen(true)}
        >
          <HugeiconsIcon icon={AiChat02Icon} size={16} />
          <span>AI Flowchart</span>
        </button>
      </div>

      {folder.folders && folder.folders.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg tracking-tighter">Folders</h2>
          </div>
          <div className="bg-transparent relative border border-zinc-800 px-4 py-4 rounded-xl">
            <div className="absolute top-4 right-4 z-10">
              <button
                className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg backdrop-blur-2xl border border-white/10 active:scale-95 transition-transform text-sm"
                onClick={() => createFolder(folderId)}
              >
                <FolderIcon style={{ width: 16, height: 16 }} />
                <span>New Folder</span>
              </button>
            </div>
            <div className="flex gap-8 justify-start items-start flex-wrap">
              {folder.folders.map((subFolder) => (
                <FolderCard
                  key={subFolder.id}
                  folder={subFolder}
                  onDelete={deleteFolder}
                  onRename={renameFolder}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg tracking-tighter">Notes</h2>
        </div>
        <div className="bg-transparent relative border border-zinc-800 px-4 py-4 rounded-xl">
          <div className="absolute top-4 right-4 z-10">
            <button
              className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg backdrop-blur-2xl border border-white/10 active:scale-95 transition-transform text-sm"
              onClick={() => createPage(folderId)}
            >
              <PlusIcon style={{ width: 16, height: 16 }} />
              <span>New Note</span>
            </button>
          </div>
          {folder.pages.length > 0 ? (
            <div className="flex flex-wrap gap-8 justify-start items-start mt-8">
              {folder.pages.map((page) => (
                <PageCard
                  key={page.id}
                  page={page}
                  folderId={folderId}
                  onDelete={deletePage}
                  onRename={renamePage}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-foreground/50 [&_svg]:w-12 [&_svg]:h-12 [&_svg]:mb-4 [&_svg]:opacity-50">
              <FileIcon />
              <p className="m-0 text-sm">No notes in this folder. Create one to get started!</p>
            </div>
          )}
        </div>
      </section>

      {/* AI Panel for folder-based flowchart generation */}
      <DashboardAIPanel
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        folder={folder}
        mode="flowchart"
      />
    </div>
  )
}

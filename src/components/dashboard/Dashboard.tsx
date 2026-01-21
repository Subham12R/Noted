"use client"

import { useNotes } from "@/context/NotesContext"
import { useAuth } from "@/context/AuthContext"
import { FolderCard } from "./FolderCard"
import { PageCard } from "./PageCard"
import { SharedWithMe } from "./SharedWithMe"
import { PlusIcon } from "@/components/tiptap-icons/plus-icon"
import { FolderIcon } from "@/components/tiptap-icons/folder-icon"

export function Dashboard() {
  const { user } = useAuth()
  const {
    folders,
    createFolder,
    deleteFolder,
    renameFolder,
    deletePage,
    renamePage,
  } = useNotes()

  // Get all recent pages across all folders
  const getAllPages = () => {
    const pages: { page: typeof folders[0]["pages"][0]; folderId: string }[] = []
    const collectPages = (folderList: typeof folders) => {
      for (const folder of folderList) {
        for (const page of folder.pages) {
          pages.push({ page, folderId: folder.id })
        }
        if (folder.folders) {
          collectPages(folder.folders)
        }
      }
    }
    collectPages(folders)
    return pages.slice(0, 5) // Show only 5 recent notes
  }

  const recentPages = getAllPages()

  return (
    <div className="min-h-screen text-zinc-900 dark:text-white p-8 max-sm:p-4">
      <div className="flex flex-col justify-start items-start h-full pb-10 border-b border-white/10">
        <h1 className="tracking-tighter text-6xl lg:text-[5vw] font-bold leading-tight text-white dark:text-black">
          <span className="text-zinc-800 dark:text-zinc-500">Welcome Back, </span>{user?.name?.split(" ")[0] || "User"}!
        </h1>
        <span className="tracking-tight font-medium text-lg lg:px-2 text-zinc-800 dark:text-zinc-500 text-balance">
          Create notes, collaborate, use <strong className="text-white dark:text-black">AI</strong>, brief texts, documents at ease, take the power of notetaking in your hands.
        </span>
      </div>

      {recentPages.length > 0 && (
        <section className="my-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg tracking-tighter">Recent Notes</h2>
          </div>
          <div className="flex flex-wrap gap-8 justify-start items-start">
            {recentPages.map(({ page, folderId }) => (
              <PageCard
                key={page.id}
                page={page}
                folderId={folderId}
                onDelete={deletePage}
                onRename={renamePage}
              />
            ))}
          </div>
        </section>
      )}

      {/* Grid layout for My Files and Shared With Me */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
        {/* My Files Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg tracking-tighter">My Files</h2>
          </div>
          <div className="bg-transparent relative border border-zinc-800 px-4 py-4 rounded-xl min-h-[200px]">
            <div className="absolute top-4 right-4 z-10">
              <button
                className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg backdrop-blur-2xl border border-white/10 active:scale-95 transition-transform text-sm"
                onClick={() => createFolder()}
              >
                <PlusIcon />
                <span>New Folder</span>
              </button>
            </div>
            {folders.length > 0 ? (
              <div className="flex gap-6 justify-start items-start flex-wrap pt-10">
                {folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    onDelete={deleteFolder}
                    onRename={renameFolder}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-foreground/50 [&_svg]:w-10 [&_svg]:h-10 [&_svg]:mb-3 [&_svg]:opacity-50">
                <FolderIcon />
                <p className="m-0 text-sm">No folders yet</p>
                <p className="m-0 text-xs mt-1">Create one to get started!</p>
              </div>
            )}
          </div>
        </section>

        {/* Shared With Me Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg tracking-tighter">Shared With Me</h2>
          </div>
          <SharedWithMe />
        </section>
      </div>
    </div>
  )
}

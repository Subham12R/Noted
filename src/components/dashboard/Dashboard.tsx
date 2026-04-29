"use client"

import { useSyncExternalStore } from "react"
import { useNotes } from "@/context/NotesContext"
import { useAuth } from "@/context/AuthContext"
import { FolderCard } from "./FolderCard"
import { PageCard } from "./PageCard"
import { SharedWithMe } from "./SharedWithMe"
import { DashboardAIInput } from "./DashboardAIInput"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"
import {
  Folder01Icon,
  Clock01Icon,
  Add01Icon,
  Share01Icon,
  CheckListIcon,
} from "@hugeicons/core-free-icons"
import { TodoList } from "./TodoList"

// Greeting based on time of day
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good Morning"
  if (hour < 17) return "Good Afternoon"
  return "Good Evening"
}

// Format date
function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

// Custom hook to handle hydration-safe values
function useHydrated() {
  return useSyncExternalStore(
    () => () => { },
    () => true,
    () => false
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const {
    folders,
    createFolder,
    deleteFolder,
    renameFolder,
    deletePage,
    renamePage,
    movePage,
    moveFolder,
  } = useNotes()

  const isHydrated = useHydrated()

  // Get greeting and date only on client-side after hydration
  const greeting = isHydrated ? getGreeting() : "Hello"
  const currentDate = isHydrated ? formatDate() : ""

  const handleCreateFolder = async () => {
    try {
      await createFolder()
      toast.success("Folder created!", {
        description: "Your new folder is ready to use.",
      })
    } catch (err) {
      if (err instanceof Error && err.message.includes("limit")) {
        toast.error("You've reached your folder limit", {
          description: "Upgrade your plan to create more folders and unlock additional features.",
          action: {
            label: "Upgrade Now",
            onClick: () => { window.location.href = "/pricing" },
          },
        })
      } else {
        toast.error("Couldn't create folder", {
          description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        })
      }
    }
  }

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
    // Sort by updated time if available
    return pages.slice(0, 6)
  }

  const recentPages = getAllPages()
  const firstName = user?.name?.split(" ")[0] || "there"

  // Skeleton loader component
  function DashboardSkeleton() {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        <header className="px-6 pt-8 pb-6 lg:px-10 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-2" />
          <div className="h-12 w-64 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] divide-x divide-zinc-100 dark:divide-zinc-800/60">
          <div className="p-10 space-y-8">
            <div className="h-5 w-28 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="w-44 h-28 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse" />)}
            </div>
            <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />)}
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="h-5 w-20 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isHydrated) {
    return <DashboardSkeleton />
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white transition-colors duration-300 flex flex-col">
      {/* Header */}
      <header className="px-6 pt-8 pb-6 lg:px-10 border-b border-zinc-100 dark:border-zinc-800/60">
        <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500 mb-1 tracking-tight">
          {currentDate}
        </p>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
          <span className="text-neutral-400 dark:text-neutral-500">{greeting}, </span>
          <span className="text-neutral-900 dark:text-white font-grandhotel italic text-6xl">{firstName}!</span>
        </h1>
      </header>

      {/* Two-column fullscreen body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] divide-y lg:divide-y-0 lg:divide-x divide-zinc-100 dark:divide-zinc-800/60 min-h-0">

        {/* LEFT COLUMN: Recent Pages → Folders */}
        <div className="flex flex-col gap-0 overflow-y-auto">

          {/* Recent Pages */}
          <section className="px-4 lg:px-6 py-6 border-b border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-2.5 mb-5">
              <HugeiconsIcon icon={Clock01Icon} size={18} className="text-zinc-400 dark:text-zinc-500" />
              <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">Recent Pages</h2>
            </div>
            {recentPages.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {recentPages.slice(0, 10).map(({ page, folderId }) => (
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
              <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4">No recent pages yet. Open a note to see it here.</p>
            )}
          </section>

          {/* Folders */}
          <section className="px-4 lg:px-6 py-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <HugeiconsIcon icon={Folder01Icon} size={18} className="text-zinc-400 dark:text-zinc-500" />
                <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">My Folders</h2>
              </div>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-medium text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all"
                onClick={handleCreateFolder}
              >
                <HugeiconsIcon icon={Add01Icon} size={14} />
                <span>New Folder</span>
              </button>
            </div>

            {folders.length > 0 ? (
              <div className="flex flex-wrap gap-4">
                {folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    onDelete={deleteFolder}
                    onRename={renameFolder}
                    onMoveFolder={moveFolder}
                    onMovePage={movePage}
                    allFolders={folders}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<HugeiconsIcon icon={Folder01Icon} size={40} />}
                title="No folders yet"
                description="Create your first folder to start organizing your notes"
                action={
                  <button
                    onClick={handleCreateFolder}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors"
                  >
                    <HugeiconsIcon icon={Add01Icon} size={15} />
                    Create Folder
                  </button>
                }
              />
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: Todo → Shared With Me */}
        <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-y-auto">

          {/* Todo */}
          <section className="px-6 py-8 flex-1 min-h-[300px]">
            <div className="flex items-center gap-2.5 mb-5">
              <HugeiconsIcon icon={CheckListIcon} size={18} className="text-zinc-400 dark:text-zinc-500" />
              <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">Todo</h2>
            </div>
            <TodoList />
          </section>

          {/* Shared With Me */}
          <section className="px-6 py-8">
            <div className="flex items-center gap-2.5 mb-5">
              <HugeiconsIcon icon={Share01Icon} size={18} className="text-zinc-400 dark:text-zinc-500" />
              <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">Shared With Me</h2>
            </div>
            <SharedWithMe />
          </section>
        </div>
      </div>

      {/* AI input pinned at bottom */}
      <DashboardAIInput />
    </div>
  )
}

// Empty State Component
function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-neutral-300 dark:text-neutral-600 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{title}</h3>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  )
}

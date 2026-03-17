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
      <div className="min-h-full pb-20 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 py-8 lg:px-8">
          <header className="mb-12">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-2" />
                <div className="h-12 w-64 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-3" />
                <div className="h-5 w-96 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              </div>
            </div>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-20">
            <div className="lg:col-span-2">
              <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-4" />
              <div className="flex gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-48 h-32 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse" />
                ))}
              </div>
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
    <div className="min-h-full pb-20 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-8">
        {/* Header Section */}
        <header className="mb-12">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1 tracking-tighter">
                {currentDate}
              </p>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-3">
                <span className="text-neutral-500 dark:text-neutral-400">{greeting}, </span>
                <span className="text-neutral-900 dark:text-white font-grandhotel italic text-6xl">{firstName}!</span>
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 max-w-lg">
                Ready to capture your ideas? Create, organize, and collaborate on your notes.
              </p>
            </div>
          </div>
        </header>

        {/* Recent Notes & Todo List Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-20">
          {/* Recent Notes Section - Takes 2 columns */}
          {recentPages.length > 0 && (
            <section className="lg:col-span-2 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <HugeiconsIcon icon={Clock01Icon} size={20} className="text-zinc-500 dark:text-zinc-400" />
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Recent Notes</h2>
                </div>
              </div>
              <div className="flex gap-2 justify-start overflow-x-auto rounded-2xl py-2">
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
            </section>
          )}

          {/* Todo List Section */}
          <section className={recentPages.length > 0 ? "lg:col-span-1" : "lg:col-span-3"}>
            <div className="flex items-center gap-3 mb-4 ">
              <HugeiconsIcon icon={CheckListIcon} size={20} className="text-zinc-500 dark:text-zinc-400" />
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Todo List</h2>
            </div>
            <TodoList />
          </section>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* My Files Section - Takes more space */}
          <section className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <HugeiconsIcon icon={Folder01Icon} size={20} className="text-zinc-500 dark:text-zinc-400" />
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">My Files</h2>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900/10 border border-zinc-200/10 text-zinc-900 dark:text-zinc-200 backdrop-blur-3xl rounded-xl font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all"
                onClick={handleCreateFolder}
              >
                <HugeiconsIcon icon={Add01Icon} size={16} />
                <span>New Folder</span>
              </button>
            </div>

            <div className="  min-h-[300px]">
              {folders.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
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
                  icon={<HugeiconsIcon icon={Folder01Icon} size={48} />}
                  title="No folders yet"
                  description="Create your first folder to start organizing your notes"
                  action={
                    <button
                      onClick={handleCreateFolder}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors"
                    >
                      <HugeiconsIcon icon={Add01Icon} size={16} />
                      Create Folder
                    </button>
                  }
                />
              )}
            </div>
          </section>

          {/* Shared With Me Section */}
          <section className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <HugeiconsIcon icon={Share01Icon} size={20} className="text-zinc-500 dark:text-zinc-400" />
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Shared With Me</h2>
            </div>
            <SharedWithMe />
          </section>
        </div>
      </div>

      {/* Always visible AI input at bottom of dashboard */}
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

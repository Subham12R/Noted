"use client"

import { useState, useSyncExternalStore } from "react"
import { useNotes } from "@/context/NotesContext"
import { useAuth } from "@/context/AuthContext"
import { FolderCard } from "./FolderCard"
import { PageCard } from "./PageCard"
import { SharedWithMe } from "./SharedWithMe"
import { DashboardAIPanel } from "./DashboardAIPanel"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"
import {
  Folder01Icon,
  Clock01Icon,
  Add01Icon,
  Share01Icon,
  AiChat02Icon,
} from "@hugeicons/core-free-icons"

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
    () => () => {},
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
  } = useNotes()

  const isHydrated = useHydrated()
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  const [aiPanelMode, setAiPanelMode] = useState<"flowchart" | "summarize" | "answer">("flowchart")

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

  return (
    <div className="min-h-full pb-24 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-8">
        {/* Header Section */}
        <header className="mb-12">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-200 dark:text-zinc-200 mb-1 tracking-tighter">
                {currentDate}
              </p>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-3">
                <span className="text-zinc-200 dark:text-zinc-200">{greeting}, </span>
                <span className="text-zinc-900 dark:text-white font-grandhotel italic text-6xl">{firstName}!</span>
              </h1>
              <p className="text-zinc-200 dark:text-zinc-200 max-w-lg">
                Ready to capture your ideas? Create, organize, and collaborate on your notes.
              </p>
            </div>
            <div className="hidden lg:block w-32 h-32">
              <DotLottieReact
                src="/lottie/Octahedron - Cube Morph.lottie"
                loop
                autoplay
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
        </header>

        {/* Recent Notes Section */}
        {recentPages.length > 0 && (
          <section className="mb-12 ">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <HugeiconsIcon icon={Clock01Icon} size={20} className="text-zinc-200 dark:text-zinc-200" />
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Recent Notes</h2>
              </div>
            </div>
            <div className="flex  gap-6 justify-start overflow-x-auto  px-4 outline-1 outline-white/10 rounded-2xl py-4">
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* My Files Section - Takes more space */}
          <section className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <HugeiconsIcon icon={Folder01Icon} size={20} className="text-zinc-200 dark:text-zinc-200" />
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">My Files</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 backdrop-blur-3xl rounded-xl font-medium text-sm hover:bg-indigo-500/30 active:scale-[0.98] transition-all"
                  onClick={() => {
                    setAiPanelMode("flowchart")
                    setIsAIPanelOpen(true)
                  }}
                >
                  <HugeiconsIcon icon={AiChat02Icon} size={16} />
                  <span>AI Flowchart</span>
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900/10 border border-zinc-200/10 text-zinc-900 dark:text-zinc-200 backdrop-blur-3xl rounded-xl font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all"
                  onClick={handleCreateFolder}
                >
                  <HugeiconsIcon icon={Add01Icon} size={16} />
                  <span>New Folder</span>
                </button>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 min-h-[300px]">
              {folders.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
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
                <EmptyState
                  icon={<HugeiconsIcon icon={Folder01Icon} size={48} />}
                  title="No folders yet"
                  description="Create your first folder to start organizing your notes"
                  action={
                    <button
                      onClick={handleCreateFolder}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
                    >
                      <HugeiconsIcon icon={Add01Icon} size={16} />
                      Create Folder
                    </button>
                  }
                  lottie="/lottie/Learning.lottie"
                />
              )}
            </div>
          </section>

          {/* Shared With Me Section */}
          <section className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <HugeiconsIcon icon={Share01Icon} size={20} className="text-zinc-200 dark:text-zinc-200" />
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Shared With Me</h2>
            </div>
            <SharedWithMe />
          </section>
        </div>
      </div>

      {/* AI Panel for folder-based flowchart generation */}
      <DashboardAIPanel
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        mode={aiPanelMode}
      />
    </div>
  )
}

// Empty State Component
function EmptyState({
  icon,
  title,
  description,
  action,
  lottie,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  lottie?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {lottie ? (
        <div className="w-32 h-32 mb-4 opacity-80">
          <DotLottieReact
            src={lottie}
            loop
            autoplay
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      ) : (
        <div className="text-zinc-300 dark:text-zinc-600 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-200 dark:text-zinc-200 mb-6 max-w-sm">{description}</p>
      {action}
    </div>
  )
}

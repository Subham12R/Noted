"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { X, Pencil, Eye } from "lucide-react"
import { toast } from "sonner"
import type { SharedPage, SharedFolder } from "@/types/shared-with-me"

function SharedPageCard({ page, onRemove }: { page: SharedPage; onRemove: (id: string) => void }) {
  const [isRemoving, setIsRemoving] = useState(false)

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30"
      case "editor":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30"
      default:
        return "bg-zinc-500/20 text-zinc-300 border-zinc-500/30"
    }
  }

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsRemoving(true)

    try {
      const res = await fetch(`/api/shared-with-me/${page.id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to remove access")

      onRemove(page.id)
      toast.success("Access removed")
    } catch (err) {
      toast.error("Failed to remove access")
      setIsRemoving(false)
    }
  }

  return (
    <div className="relative rounded-2xl transition-all duration-200 hover:-translate-y-1 group">
      {/* Role badge */}
      <div className="absolute top-0 left-0 z-10">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeColor(page.role)}`}>
          {page.role}
        </span>
      </div>

      {/* Remove button */}
      <div className="absolute top-0 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleRemove}
          disabled={isRemoving}
          className="w-6 h-6 rounded-md text-white flex items-center justify-center transition-all duration-150 disabled:opacity-50"
          title="Remove access"
        >
          <X size={14} />
        </button>
      </div>

      <Link href={`/note/${page.id}`} className="flex flex-col items-center no-underline text-inherit p-3">
        {/* Visual Page Icon */}
        <div className="relative w-14 h-[72px] mb-3 transition-transform duration-200 group-hover:scale-105">
          {/* Paper */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-700 dark:to-zinc-800 rounded-sm shadow-lg border border-zinc-200/50 dark:border-zinc-600/50">
            {/* Corner Fold */}
            <div className="absolute top-0 right-0 w-4 h-4 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-600 dark:to-zinc-700 rounded-bl-md" />

            {/* Text Lines */}
            <div className="absolute top-5 left-2 right-2 space-y-1.5">
              <div className="h-1 bg-zinc-300/60 dark:bg-zinc-500/60 rounded-full w-full" />
              <div className="h-1 bg-zinc-300/60 dark:bg-zinc-500/60 rounded-full w-4/5" />
              <div className="h-1 bg-zinc-300/60 dark:bg-zinc-500/60 rounded-full w-3/5" />
              <div className="h-1 bg-zinc-300/60 dark:bg-zinc-500/60 rounded-full w-4/5" />
              <div className="h-1 bg-zinc-300/60 dark:bg-zinc-500/60 rounded-full w-2/5" />
            </div>
          </div>
        </div>

        {/* Page Name */}
        <div className="flex flex-col items-center text-center max-w-[120px]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-semibold text-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px]">
              {page.name}
            </span>
            {page.role === "editor" || page.role === "admin" ? (
              <Pencil size={12} className="text-blue-400 flex-shrink-0" />
            ) : (
              <Eye size={12} className="text-zinc-400 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {page.ownerImage ? (
              <Image
                src={page.ownerImage}
                alt={page.ownerName || "Owner"}
                width={14}
                height={14}
                className="rounded-full"
              />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-zinc-600 flex items-center justify-center text-[8px] text-white">
                {(page.ownerName || page.ownerEmail)[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-[10px] text-foreground/40">
              {page.ownerName || page.ownerEmail.split("@")[0]}
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}

function SharedFolderCard({ folder, onRemove }: { folder: SharedFolder; onRemove: (id: string) => void }) {
  const [isRemoving, setIsRemoving] = useState(false)

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30"
      case "editor":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30"
      default:
        return "bg-zinc-500/20 text-zinc-300 border-zinc-500/30"
    }
  }

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsRemoving(true)

    try {
      const res = await fetch(`/api/shared-with-me/${folder.id}?type=folder`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to remove access")

      onRemove(folder.id)
      toast.success("Access removed")
    } catch (err) {
      toast.error("Failed to remove access")
      setIsRemoving(false)
    }
  }

  return (
    <div className="relative rounded-2xl transition-all duration-200 hover:-translate-y-1 group">
      {/* Role badge */}
      <div className="absolute top-0 left-0 z-10">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeColor(folder.role)}`}>
          {folder.role}
        </span>
      </div>

      {/* Remove button */}
      <div className="absolute top-0 right-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleRemove}
          disabled={isRemoving}
          className="w-6 h-6 rounded-md bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-all duration-150 disabled:opacity-50"
          title="Remove access"
        >
          <X size={14} />
        </button>
      </div>

      <Link href={`/folder/${folder.id}?shared=true`} className="flex flex-col items-center no-underline text-inherit p-3">
        {/* Visual Folder Icon */}
        <div className="relative w-20 h-16 mb-3 transition-transform duration-200 group-hover:scale-105">
          {/* Folder Back */}
          <div className="absolute bottom-0 left-0 w-full h-14 bg-amber-400 dark:bg-zinc-800 rounded-md rounded-tl-none">
            <div className="absolute -top-2.5 left-0 w-8 h-3 bg-amber-400 dark:bg-zinc-800 rounded-t-md" />
          </div>
          {/* Folder Front */}
          <div className="absolute bottom-0 left-0 w-full h-10 bg-amber-300/80 dark:bg-white/20 backdrop-blur-sm rounded-md rounded-tl-sm shadow-lg" />
        </div>

        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm font-semibold text-foreground text-center overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px]">
            {folder.name}
          </span>
          {folder.role === "editor" || folder.role === "admin" ? (
            <Pencil size={12} className="text-zinc-400 flex-shrink-0" />
          ) : (
            <Eye size={12} className="text-zinc-400 flex-shrink-0" />
          )}
        </div>

        <span className="text-xs text-foreground/50">
          {folder.pageCount} {folder.pageCount === 1 ? "note" : "notes"}
        </span>

        <div className="flex items-center gap-1 mt-1">
          {folder.ownerImage ? (
            <Image
              src={folder.ownerImage}
              alt={folder.ownerName || "Owner"}
              width={14}
              height={14}
              className="rounded-full"
            />
          ) : (
            <div className="w-3.5 h-3.5 rounded-full bg-zinc-600 flex items-center justify-center text-[8px] text-white">
              {(folder.ownerName || folder.ownerEmail)[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-[10px] text-foreground/40">
            {folder.ownerName || folder.ownerEmail.split("@")[0]}
          </span>
        </div>
      </Link>
    </div>
  )
}

// Link icon for the input
function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

// Share link input component
function ShareLinkInput() {
  const [link, setLink] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!link.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      // Extract token from link (handles both full URLs and just tokens)
      const token = link.includes("/share/")
        ? link.split("/share/").pop()?.split("?")[0]
        : link.trim()

      if (!token) {
        throw new Error("Invalid share link")
      }

      // Navigate to the share page
      router.push(`/share/${token}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid link")
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative flex-1">
        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 w-4 h-4" />
        <input
          type="text"
          value={link}
          onChange={(e) => {
            setLink(e.target.value)
            setError(null)
          }}
          placeholder="Paste share link here..."
          className="w-full bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !link.trim()}
        className="px-4 py-3 bg-zinc-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
      >
        {isLoading ? "Opening..." : "Open"}
      </button>
      {error && (
        <span className="text-xs text-red-500 dark:text-red-400">{error}</span>
      )}
    </form>
  )
}

export function SharedWithMe() {
  const [sharedPages, setSharedPages] = useState<SharedPage[]>([])
  const [sharedFolders, setSharedFolders] = useState<SharedFolder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    const fetchSharedItems = async () => {
      try {
        const res = await fetch("/api/shared-with-me")
        if (!res.ok) {
          if (res.status === 401) {
            // Not logged in, just show nothing
            setIsLoading(false)
            return
          }
          throw new Error("Failed to fetch shared items")
        }
        const data = await res.json()
        setSharedPages(data.pages || [])
        setSharedFolders(data.folders || [])
      } catch (err) {
        console.error("Error fetching shared items:", err)
        setError(err instanceof Error ? err.message : "Failed to load shared items")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSharedItems()
  }, [])

  const handleRemovePage = (pageId: string) => {
    setSharedPages((prev) => prev.filter((p) => p.id !== pageId))
  }

  const handleRemoveFolder = (folderId: string) => {
    setSharedFolders((prev) => prev.filter((f) => f.id !== folderId))
  }

  // Prevent hydration mismatch
  if (!hasMounted) {
    return (
      <div className="px-4 py-4 min-h-75 max-h-125">
        <div className="mb-4">
          <ShareLinkInput />
        </div>
        <div className="flex items-center justify-center py-8 text-zinc-500 dark:text-zinc-400">
          <span className="animate-pulse">Loading...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-4 min-h-75 max-h-125">
        <div className="mb-4">
          <ShareLinkInput />
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-zinc-500 dark:text-zinc-400">
          <LinkIcon className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No shared items yet</p>
          <p className="text-xs mt-1">Paste a share link above to access shared files</p>
        </div>
      </div>
    )
  }

  const hasSharedItems = sharedPages.length > 0 || sharedFolders.length > 0

  return (
    <div className="px-4 py-4 min-h-75 max-h-125 overflow-y-auto">
      {/* Share link input */}
      <div className="mb-4">
        <ShareLinkInput />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-zinc-500 dark:text-zinc-400">
          <span className="animate-pulse">Loading shared items...</span>
        </div>
      ) : !hasSharedItems ? (
        <div className="flex flex-col items-center justify-center py-8 text-zinc-500 dark:text-zinc-400">
          <LinkIcon className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No shared items yet</p>
          <p className="text-xs mt-1">Paste a share link above to access shared files</p>
        </div>
      ) : (
        <>
          {sharedFolders.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-foreground/70 mb-3">Folders</h3>
              <div className="flex gap-6 justify-start items-start flex-wrap">
                {sharedFolders.map((folder) => (
                  <SharedFolderCard key={folder.id} folder={folder} onRemove={handleRemoveFolder} />
                ))}
              </div>
            </div>
          )}

          {sharedPages.length > 0 && (
            <div>
              {sharedFolders.length > 0 && (
                <h3 className="text-sm font-medium text-foreground/70 mb-3">Notes</h3>
              )}
              <div className="flex gap-6 justify-start items-start flex-wrap">
                {sharedPages.map((page) => (
                  <SharedPageCard key={page.id} page={page} onRemove={handleRemovePage} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

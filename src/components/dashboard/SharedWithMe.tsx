"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import type { SharedPage, SharedFolder } from "@/app/api/shared-with-me/route"

// Available folder images
const folderImages = [
  "/Folders/Folder-1.png",
  "/Folders/Folder-2.png",
  "/Folders/Folder-3.png",
  "/Folders/Folder-4.png",
  "/Folders/Folder-5.png",
  "/Folders/Folder-6.png",
  "/Folders/Folder-7.png",
  "/Folders/Folder-8.png",
]

function SharedPageCard({ page }: { page: SharedPage }) {
  // Get preview text from content (strip HTML)
  const getPreview = (content?: string | null) => {
    if (!content) return "Empty note"
    const stripped = content.replace(/<[^>]*>/g, "").trim()
    return stripped.slice(0, 60) || "Empty note"
  }

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

  return (
    <div className="relative rounded-2xl transition-all duration-200 hover:-translate-y-0.5 group">
      {/* Role badge */}
      <div className="absolute -top-2 -right-2 z-10">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeColor(page.role)}`}>
          {page.role}
        </span>
      </div>

      <Link href={`/note/${page.id}`} className="flex flex-col items-center no-underline text-inherit">
        <div className="w-20 h-20 flex items-start justify-start transition-transform duration-200 group-hover:scale-105 [&_img]:w-full [&_img]:h-full [&_img]:object-contain [&_img]:drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <Image
            src="/note.png"
            alt={page.name}
            width={80}
            height={80}
            draggable={false}
          />
        </div>

        <div className="flex flex-col items-center text-center max-w-[120px]">
          <span className="text-sm font-semibold text-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-full mb-1">
            {page.name}
          </span>
          <span className="text-xs text-foreground/50 overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
            {getPreview(page.content)}
          </span>
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

function SharedFolderCard({ folder }: { folder: SharedFolder }) {
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

  // Get folder image based on folder's image property or use a consistent one based on id
  const getFolderImage = () => {
    if (folder.image) return folder.image
    // Generate a consistent index based on folder id
    const hash = folder.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return folderImages[hash % folderImages.length]
  }

  return (
    <div className="relative rounded-2xl transition-all duration-200 hover:-translate-y-0.5 group">
      {/* Role badge */}
      <div className="absolute -top-2 -right-2 z-10">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeColor(folder.role)}`}>
          {folder.role}
        </span>
      </div>

      <Link href={`/folder/${folder.id}?shared=true`} className="flex flex-col items-center no-underline text-inherit">
        <div className="w-20 h-20 flex items-start justify-start transition-transform duration-200 group-hover:scale-105 [&_img]:w-full [&_img]:h-full [&_img]:object-contain [&_img]:drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <Image
            src={getFolderImage()}
            alt={folder.name}
            width={80}
            height={80}
            draggable={false}
          />
        </div>

        <span className="text-sm font-semibold text-foreground text-center overflow-hidden text-ellipsis whitespace-nowrap max-w-full mb-1">
          {folder.name}
        </span>

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
        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
        <input
          type="text"
          value={link}
          onChange={(e) => {
            setLink(e.target.value)
            setError(null)
          }}
          placeholder="Paste share link here..."
          className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !link.trim()}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
      >
        {isLoading ? "Opening..." : "Open"}
      </button>
      {error && (
        <span className="text-xs text-red-400">{error}</span>
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

  // Prevent hydration mismatch
  if (!hasMounted) {
    return (
      <div className="bg-transparent relative border border-zinc-800 px-4 py-4 rounded-xl min-h-[200px]">
        <div className="mb-4">
          <ShareLinkInput />
        </div>
        <div className="flex items-center justify-center py-8 text-foreground/50">
          <span className="animate-pulse">Loading...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-transparent relative border border-zinc-800 px-4 py-4 rounded-xl min-h-[200px]">
        <div className="mb-4">
          <ShareLinkInput />
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-foreground/50">
          <LinkIcon className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No shared items yet</p>
          <p className="text-xs mt-1">Paste a share link above to access shared files</p>
        </div>
      </div>
    )
  }

  const hasSharedItems = sharedPages.length > 0 || sharedFolders.length > 0

  return (
    <div className="bg-transparent relative border border-zinc-800 px-4 py-4 rounded-xl min-h-[200px]">
      {/* Share link input */}
      <div className="mb-4">
        <ShareLinkInput />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-foreground/50">
          <span className="animate-pulse">Loading shared items...</span>
        </div>
      ) : !hasSharedItems ? (
        <div className="flex flex-col items-center justify-center py-8 text-foreground/50">
          <LinkIcon className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No shared items yet</p>
          <p className="text-xs mt-1">Paste a share link above to access shared files</p>
        </div>
      ) : (
        <>
          {sharedFolders.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-foreground/70 mb-3">Folders</h3>
              <div className="flex gap-8 justify-start items-start flex-wrap">
                {sharedFolders.map((folder) => (
                  <SharedFolderCard key={folder.id} folder={folder} />
                ))}
              </div>
            </div>
          )}

          {sharedPages.length > 0 && (
            <div>
              {sharedFolders.length > 0 && (
                <h3 className="text-sm font-medium text-foreground/70 mb-3">Notes</h3>
              )}
              <div className="flex gap-8 justify-start items-start flex-wrap">
                {sharedPages.map((page) => (
                  <SharedPageCard key={page.id} page={page} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

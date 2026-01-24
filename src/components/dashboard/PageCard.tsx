"use client"

import { useState, DragEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { TrashIcon } from "@/components/tiptap-icons/trash-icon"
import { EditIcon } from "@/components/tiptap-icons/edit-icon"
import type { Page } from "@/context/NotesContext"

// Paper airplane icon for shared indicator
function ShareIndicatorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  )
}

interface PageCardProps {
  page: Page
  folderId: string
  onDelete: (folderId: string, pageId: string) => void
  onRename: (folderId: string, pageId: string, newName: string) => void
}

export function PageCard({ page, folderId, onDelete, onRename }: PageCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(page.name)
  const [isDragging, setIsDragging] = useState(false)

  const handleSubmit = () => {
    if (editName.trim()) {
      onRename(folderId, page.id, editName.trim())
    }
    setIsEditing(false)
  }

  // Get preview text from content (strip HTML)
  const getPreview = (content?: string) => {
    if (!content) return "Empty note"
    const stripped = content.replace(/<[^>]*>/g, "").trim()
    return stripped.slice(0, 60) || "Empty note"
  }

  // Drag handlers - make page draggable
  const handleDragStart = (e: DragEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("application/json", JSON.stringify({
      type: "page",
      id: page.id,
      sourceFolderId: folderId,
    }))
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  return (
    <div
      className={`relative rounded-2xl transition-all duration-200 hover:-translate-y-0.5 group ${isDragging ? 'opacity-50' : ''}`}
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="absolute top-0 right-0 flex z-10 gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          className="w-7 h-7 rounded-md border-none bg-black/50 text-foreground cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-black/70 [&_svg]:w-3.5 [&_svg]:h-3.5"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsEditing(true)
          }}
          title="Rename"
        >
          <EditIcon />
        </button>
        <button
          className="w-7 h-7 rounded-md border-none bg-black/50 text-foreground cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-red-500/80 [&_svg]:w-3.5 [&_svg]:h-3.5"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(folderId, page.id)
          }}
          title="Delete"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Shared indicator */}
      {page.isShared && (
        <div className="absolute top-2 right-2 z-10" title="This note is shared">
          <div className=" rounded-full bg-white p-1 rotate-[-45deg] flex items-center justify-center">
            <ShareIndicatorIcon className="text-black w-3 h-3 shadow" />
          </div>
        </div>
      )}

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
          {isEditing ? (
            <input
              type="text"
              className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-foreground text-center outline-none w-full focus:border-indigo-500/50"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit()
                if (e.key === "Escape") {
                  setEditName(page.name)
                  setIsEditing(false)
                }
              }}
              onBlur={handleSubmit}
              onClick={(e) => e.preventDefault()}
              autoFocus
            />
          ) : (
            <span className="text-sm font-semibold text-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-full mb-1">{page.name}</span>
          )}
          <span className="text-xs text-foreground/50 overflow-hidden text-ellipsis whitespace-nowrap max-w-full">{getPreview(page.content)}</span>
        </div>
      </Link>
    </div>
  )
}

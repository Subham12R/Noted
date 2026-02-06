"use client"

import { useState, DragEvent } from "react"
import Link from "next/link"
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

  // Drag handlers
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
      className={`relative rounded-2xl transition-all duration-200 hover:-translate-y-1 group ${isDragging ? 'opacity-50' : ''}`}
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Action Buttons */}
      <div className="absolute top-0 right-0 flex z-10 gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          className="w-7 h-7 rounded-md border-none bg-black/60 text-white cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-black/80 [&_svg]:w-3.5 [&_svg]:h-3.5"
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
          className="w-7 h-7 rounded-md border-none bg-black/60 text-white cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-red-500/80 [&_svg]:w-3.5 [&_svg]:h-3.5"
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
        <div className="absolute top-2 left-2 z-10" title="This note is shared">
          <div className="rounded-full bg-white p-1 rotate-[-45deg] flex items-center justify-center shadow-sm">
            <ShareIndicatorIcon className="text-black w-3 h-3" />
          </div>
        </div>
      )}

      <Link href={`/note/${page.id}`} className="flex flex-col items-center no-underline text-inherit p-3">
        {/* Visual Page Icon */}
        <div className="relative w-14 h-[72px] mb-3 transition-transform duration-200 group-hover:scale-105">
          {/* Paper */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 to-zinc-100 rounded-sm shadow-lg border border-zinc-200/50">
            {/* Corner Fold */}
            <div className="absolute top-0 right-0 w-4 h-4 bg-gradient-to-br from-zinc-200 to-zinc-300 rounded-bl-md" />

            {/* Text Lines */}
            <div className="absolute top-5 left-2 right-2 space-y-1.5">
              <div className="h-1 bg-zinc-300/60 rounded-full w-full" />
              <div className="h-1 bg-zinc-300/60 rounded-full w-4/5" />
              <div className="h-1 bg-zinc-300/60 rounded-full w-3/5" />
              <div className="h-1 bg-zinc-300/60 rounded-full w-4/5" />
              <div className="h-1 bg-zinc-300/60 rounded-full w-2/5" />
            </div>
          </div>
        </div>

        {/* Page Name */}
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
            <span className="text-sm font-semibold text-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-full mb-1">
              {page.name}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}

export default PageCard

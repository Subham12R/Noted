"use client"

import { useState, DragEvent } from "react"
import Link from "next/link"
import { TrashIcon } from "@/components/tiptap-icons/trash-icon"
import { EditIcon } from "@/components/tiptap-icons/edit-icon"
import type { Folder } from "@/context/NotesContext"

interface FolderCardProps {
  folder: Folder
  onDelete: (folderId: string) => void
  onRename: (folderId: string, newName: string) => void
  onMoveFolder?: (folderId: string, targetParentId: string | null) => Promise<void>
  onMovePage?: (pageId: string, targetFolderId: string) => Promise<void>
  allFolders?: Folder[]
}

// Helper to check if folder is descendant of another
function isDescendant(folders: Folder[], folderId: string, potentialAncestorId: string): boolean {
  const findFolder = (list: Folder[], id: string): Folder | null => {
    for (const f of list) {
      if (f.id === id) return f
      if (f.folders) {
        const found = findFolder(f.folders, id)
        if (found) return found
      }
    }
    return null
  }

  const ancestor = findFolder(folders, potentialAncestorId)
  if (!ancestor) return false

  const checkInChildren = (folder: Folder): boolean => {
    if (folder.id === folderId) return true
    if (folder.folders) {
      return folder.folders.some(checkInChildren)
    }
    return false
  }

  return checkInChildren(ancestor)
}

// Count all pages recursively in a folder
function countAllPages(folder: Folder): number {
  let count = folder.pages.length
  if (folder.folders) {
    for (const subfolder of folder.folders) {
      count += countAllPages(subfolder)
    }
  }
  return count
}

export function FolderCard({ folder, onDelete, onRename, onMoveFolder, onMovePage, allFolders = [] }: FolderCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(folder.name)
  const [isDragging, setIsDragging] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleSubmit = () => {
    if (editName.trim()) {
      onRename(folder.id, editName.trim())
    }
    setIsEditing(false)
  }

  const pageCount = countAllPages(folder)
  const subfolderCount = folder.folders?.length || 0

  // Drag handlers
  const handleDragStart = (e: DragEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("application/json", JSON.stringify({
      type: "folder",
      id: folder.id,
    }))
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"))

      if (data.type === "page" && onMovePage) {
        if (data.sourceFolderId === folder.id) return
        await onMovePage(data.id, folder.id)
      } else if (data.type === "folder" && onMoveFolder) {
        if (data.id === folder.id) return
        if (isDescendant(allFolders, folder.id, data.id)) return
        await onMoveFolder(data.id, folder.id)
      }
    } catch (err) {
      console.error("Drop error:", err)
    }
  }

  return (
    <div
      className={`relative rounded-2xl transition-all duration-200 hover:-translate-y-1 group ${isDragging ? 'opacity-50' : ''} ${isDragOver ? ' ring-offset-2 ring-offset-white dark:ring-offset-zinc-900' : ''}`}
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Action Buttons */}
      <div className="absolute top-0 right-1 flex z-10 gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
            onDelete(folder.id)
          }}
          title="Delete"
        >
          <TrashIcon />
        </button>
      </div>

      <Link href={`/folder/${folder.id}`} className="flex flex-col items-center no-underline text-inherit p-3">
        {/* Visual Folder Icon */}
        <div className="relative w-20 h-20 mb-3">
          {/* Folder Back */}
          <div className="absolute bottom-0 left-0 w-full h-14 bg-amber-400 dark:bg-zinc-800 rounded-md rounded-tl-none transition-all duration-300 ease-out">
            {/* Folder Tab */}
            <div className="absolute -top-2.5 left-0 w-8 h-3 bg-amber-400 dark:bg-zinc-800 rounded-t-md" />
          </div>

          {/* Papers Sticking Out - animate on hover */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-14">
            {pageCount > 0 && (
              <>
                {/* Page 1 - slides up and rotates left */}
                <div className="absolute left-1/2 w-11 h-12 bg-white rounded-sm transition-all duration-300 -translate-x-1/2 bottom-0 -rotate-1 group-hover:-translate-y-4 group-hover:-rotate-6 group-hover:-translate-x-[60%] ease-in-out" />
                {pageCount > 1 && (
                  /* Page 2 - slides up center */
                  <div className="absolute left-[14px] w-11 h-12 bg-white rounded-sm transition-all duration-300 ease-in-out delay-75 -translate-x-1/2 bottom-0 -rotate-2 group-hover:-translate-y-5 group-hover:-rotate-6" />
                )}
                {pageCount > 2 && (
                  /* Page 3 - slides up and rotates right */
                  <div className="absolute left-[40px] w-11 h-12 bg-white rounded-sm transition-all duration-300 ease-in-out delay-150 -translate-x-1/2 bottom-0 rotate-2 group-hover:-translate-y-3 group-hover:rotate-6 group-hover:-translate-x-[40%]" />
                )}
              </>
            )}
          </div>

          {/* Folder Front */}
          <div className="absolute bottom-0 left-0 w-full h-12 bg-amber-300/80 dark:bg-white/20 backdrop-blur-sm rounded-md rounded-tl-sm transition-all duration-300 ease-in-out" />
        </div>

        {/* Folder Name */}
        {isEditing ? (
          <input
            type="text"
            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-foreground text-center outline-none w-full "
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit()
              if (e.key === "Escape") {
                setEditName(folder.name)
                setIsEditing(false)
              }
            }}
            onBlur={handleSubmit}
            onClick={(e) => e.preventDefault()}
            autoFocus
          />
        ) : (
          <span className="text-sm font-semibold text-foreground text-center overflow-hidden text-ellipsis whitespace-nowrap max-w-full mb-1">
            {folder.name}
          </span>
        )}

        {/* Item Count */}
        <span className="text-xs text-foreground/50">
          {pageCount} {pageCount === 1 ? "page" : "pages"}
          {subfolderCount > 0 && ` · ${subfolderCount} ${subfolderCount === 1 ? "folder" : "folders"}`}
        </span>
      </Link>
    </div>
  )
}

export default FolderCard

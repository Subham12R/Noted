"use client"

import { useState, DragEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { TrashIcon } from "@/components/tiptap-icons/trash-icon"
import { EditIcon } from "@/components/tiptap-icons/edit-icon"
import type { Folder } from "@/context/NotesContext"

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

interface FolderCardProps {
  folder: Folder
  onDelete: (folderId: string) => void
  onRename: (folderId: string, newName: string) => void
  onMoveFolder?: (folderId: string, targetParentId: string | null) => Promise<void>
  onMovePage?: (pageId: string, targetFolderId: string) => Promise<void>
  allFolders?: Folder[] // For cycle detection
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

  const pageCount = folder.pages.length
  const subfolderCount = folder.folders?.length || 0

  // Get folder image based on folder's image property or use a consistent one based on id
  const getFolderImage = () => {
    if (folder.image) return folder.image
    // Generate a consistent index based on folder id
    const hash = folder.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return folderImages[hash % folderImages.length]
  }

  // Drag handlers - make folder draggable
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

  // Drop handlers - allow dropping pages and folders onto this folder
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
        // Don't move if already in this folder
        if (data.sourceFolderId === folder.id) return
        await onMovePage(data.id, folder.id)
      } else if (data.type === "folder" && onMoveFolder) {
        // Don't move folder into itself
        if (data.id === folder.id) return
        // Don't move folder into its own descendant
        if (isDescendant(allFolders, folder.id, data.id)) return
        await onMoveFolder(data.id, folder.id)
      }
    } catch (err) {
      console.error("Drop error:", err)
    }
  }

  return (
    <div
      className={`relative rounded-2xl transition-all duration-200 hover:-translate-y-0.5 group ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-background' : ''}`}
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="absolute top-0 right-6 flex z-10 gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
            onDelete(folder.id)
          }}
          title="Delete"
        >
          <TrashIcon />
        </button>
      </div>

      <Link href={`/folder/${folder.id}`} className="flex flex-col items-center no-underline text-inherit">
        <div className="w-20 h-20 flex items-start justify-start transition-transform duration-200 group-hover:scale-105 [&_img]:w-full [&_img]:h-full [&_img]:object-contain [&_img]:drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <Image
            src={getFolderImage()}
            alt={folder.name}
            width={80}
            height={80}
            draggable={false}
          />
        </div>

        {isEditing ? (
          <input
            type="text"
            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-foreground text-center outline-none w-full focus:border-indigo-500/50"
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
          <span className="text-sm font-semibold text-foreground text-center overflow-hidden text-ellipsis whitespace-nowrap max-w-full mb-1">{folder.name}</span>
        )}

        <span className="text-xs text-foreground/50">
          {pageCount} {pageCount === 1 ? "note" : "notes"}
          {subfolderCount > 0 && ` · ${subfolderCount} ${subfolderCount === 1 ? "folder" : "folders"}`}
        </span>
      </Link>
    </div>
  )
}

export { folderImages }

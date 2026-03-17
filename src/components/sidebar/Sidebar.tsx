"use client"

import { useState, useCallback, useEffect, DragEvent } from "react"
import { FolderIcon, FolderOpenIcon } from "@/components/tiptap-icons/folder-icon"
import { FileIcon } from "@/components/tiptap-icons/file-icon"
import { ChevronRightIcon } from "@/components/tiptap-icons/chevron-right-icon"
import { PlusIcon } from "@/components/tiptap-icons/plus-icon"
import { CloseIcon } from "@/components/tiptap-icons/close-icon"
import { TrashIcon } from "@/components/tiptap-icons/trash-icon"
import { EditIcon } from "@/components/tiptap-icons/edit-icon"
import { PinIcon, PinOffIcon } from "@/components/tiptap-icons/pin-icon"
import { SidebarTabs, SidebarTab } from "./SidebarTabs"
import { SidebarSearch } from "./SidebarSearch"
import { SidebarTagsTab } from "./SidebarTagsTab"
import { SidebarStudyTab } from "./SidebarStudyTab"
import { FileLibrary } from "@/components/file-library"
import "./sidebar.scss"
import Link from "next/link"

export interface Page {
  id: string
  name: string
  content?: string
}

export interface Folder {
  id: string
  name: string
  pages: Page[]
  folders?: Folder[]
  isExpanded?: boolean
  parentId?: string | null
}

export interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  mode: "floating" | "sticky"
  onModeChange: (mode: "floating" | "sticky") => void
  folders: Folder[]
  onFoldersChange: (folders: Folder[]) => void
  activePage: string | null
  onPageSelect: (pageId: string, content?: string) => void
  onCreateFolder: (parentId?: string) => void
  onCreatePage: (folderId: string) => void
  onDeleteFolder: (folderId: string) => void
  onDeletePage: (folderId: string, pageId: string) => void
  onRenameFolder: (folderId: string, newName: string) => void
  onRenamePage: (folderId: string, pageId: string, newName: string) => void
  onMovePage?: (pageId: string, targetFolderId: string) => Promise<void>
  onMoveFolder?: (folderId: string, targetParentId: string | null) => Promise<void>
  onSearchClick?: () => void
}

interface DragData {
  type: "page" | "folder"
  id: string
  sourceFolderId?: string
}

// Helper to count all items in a folder (pages + subfolders recursively)
function countFolderItems(folder: Folder): number {
  const pageCount = folder.pages.length
  const subfolderCount = folder.folders?.length || 0
  const subfolderItems = folder.folders?.reduce(
    (sum, f) => sum + countFolderItems(f), 0
  ) || 0
  return pageCount + subfolderCount + subfolderItems
}

interface FolderItemProps {
  folder: Folder
  depth: number
  activePage: string | null
  editingId: string | null
  editingName: string
  dragOverFolderId: string | null
  draggingId: string | null
  onToggle: (folderId: string) => void
  onPageSelect: (pageId: string, content?: string) => void
  onCreateFolder: (parentId?: string) => void
  onCreatePage: (folderId: string) => void
  onDeleteFolder: (folderId: string) => void
  onDeletePage: (folderId: string, pageId: string) => void
  onStartEdit: (id: string, currentName: string) => void
  onEditChange: (name: string) => void
  onEditSubmit: (type: "folder" | "page", folderId: string, pageId?: string) => void
  onEditCancel: () => void
  onDragStart: (e: DragEvent, data: DragData) => void
  onDragEnd: () => void
  onDragOver: (e: DragEvent, folderId: string) => void
  onDragLeave: () => void
  onDrop: (e: DragEvent, targetFolderId: string) => void
  isDescendantOf: (folderId: string, potentialAncestorId: string) => boolean
}

// Helper to check if folder is descendant of another
function checkIsDescendant(folders: Folder[], folderId: string, potentialAncestorId: string): boolean {
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

function FolderItem({
  folder,
  depth,
  activePage,
  editingId,
  editingName,
  dragOverFolderId,
  draggingId,
  onToggle,
  onPageSelect,
  onCreateFolder,
  onCreatePage,
  onDeleteFolder,
  onDeletePage,
  onStartEdit,
  onEditChange,
  onEditSubmit,
  onEditCancel,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDescendantOf,
}: FolderItemProps) {
  const isEditingFolder = editingId === folder.id
  const isDragOver = dragOverFolderId === folder.id
  const isDragging = draggingId === folder.id

  // Check if this folder would be an invalid drop target
  const isInvalidDropTarget = draggingId !== null && isDescendantOf(folder.id, draggingId)

  // Calculate item count
  const itemCount = countFolderItems(folder)

  return (
    <div className="sidebar-folder" style={{ marginLeft: depth > 0 ? `${depth * 0.75}rem` : 0 }}>
      <div
        className={`sidebar-folder-header ${isDragging ? 'dragging' : ''} ${isDragOver && !isInvalidDropTarget ? 'drag-over' : ''} ${isDragOver && isInvalidDropTarget ? 'drag-over-invalid' : ''}`}
        data-expanded={folder.isExpanded}
        onClick={() => !isEditingFolder && onToggle(folder.id)}
        draggable={!isEditingFolder}
        onDragStart={(e) => onDragStart(e, { type: "folder", id: folder.id })}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, folder.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, folder.id)}
      >
        <ChevronRightIcon className="folder-chevron" />
        {folder.isExpanded ? (
          <FolderOpenIcon className="folder-icon" />
        ) : (
          <FolderIcon className="folder-icon" />
        )}
        {isEditingFolder ? (
          <input
            type="text"
            className="sidebar-edit-input"
            value={editingName}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onEditSubmit("folder", folder.id)
              } else if (e.key === "Escape") {
                onEditCancel()
              }
            }}
            onBlur={() => onEditSubmit("folder", folder.id)}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span className="folder-name">{folder.name}</span>
        )}
        {itemCount > 0 && !isEditingFolder && (
          <span className="folder-count">{itemCount}</span>
        )}
        <div className="folder-actions">
          <button
            className="sidebar-icon-button"
            onClick={(e) => {
              e.stopPropagation()
              onStartEdit(folder.id, folder.name)
            }}
            title="Rename Folder"
          >
            <EditIcon />
          </button>
          <button
            className="sidebar-icon-button"
            onClick={(e) => {
              e.stopPropagation()
              onCreateFolder(folder.id)
            }}
            title="New Subfolder"
          >
            <FolderIcon />
          </button>
          <button
            className="sidebar-icon-button"
            onClick={(e) => {
              e.stopPropagation()
              onCreatePage(folder.id)
            }}
            title="New Page"
          >
            <PlusIcon />
          </button>
          <button
            className="sidebar-icon-button sidebar-icon-button--danger"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteFolder(folder.id)
            }}
            title="Delete Folder"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {folder.isExpanded && (
        <div className="sidebar-folder-content">
          {folder.folders?.map((subFolder) => (
            <FolderItem
              key={subFolder.id}
              folder={subFolder}
              depth={depth + 1}
              activePage={activePage}
              editingId={editingId}
              editingName={editingName}
              dragOverFolderId={dragOverFolderId}
              draggingId={draggingId}
              onToggle={onToggle}
              onPageSelect={onPageSelect}
              onCreateFolder={onCreateFolder}
              onCreatePage={onCreatePage}
              onDeleteFolder={onDeleteFolder}
              onDeletePage={onDeletePage}
              onStartEdit={onStartEdit}
              onEditChange={onEditChange}
              onEditSubmit={onEditSubmit}
              onEditCancel={onEditCancel}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              isDescendantOf={isDescendantOf}
            />
          ))}
          {folder.pages.map((page) => {
            const isEditingPage = editingId === page.id
            const isPageDragging = draggingId === page.id
            return (
              <div
                key={page.id}
                className={`sidebar-page ${isPageDragging ? 'dragging' : ''}`}
                data-active={activePage === page.id}
                onClick={() => !isEditingPage && onPageSelect(page.id, page.content)}
                draggable={!isEditingPage}
                onDragStart={(e) => onDragStart(e, { type: "page", id: page.id, sourceFolderId: folder.id })}
                onDragEnd={onDragEnd}
              >
                <FileIcon className="page-icon" />
                {isEditingPage ? (
                  <input
                    type="text"
                    className="sidebar-edit-input"
                    value={editingName}
                    onChange={(e) => onEditChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onEditSubmit("page", folder.id, page.id)
                      } else if (e.key === "Escape") {
                        onEditCancel()
                      }
                    }}
                    onBlur={() => onEditSubmit("page", folder.id, page.id)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="page-name">{page.name}</span>
                )}
                <div className="page-actions">
                  <button
                    className="sidebar-icon-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStartEdit(page.id, page.name)
                    }}
                    title="Rename Page"
                  >
                    <EditIcon />
                  </button>
                  <button
                    className="sidebar-icon-button sidebar-icon-button--danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeletePage(folder.id, page.id)
                    }}
                    title="Delete Page"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Sidebar({
  isOpen,
  onClose,
  mode,
  onModeChange,
  folders,
  onFoldersChange,
  activePage,
  onPageSelect,
  onCreateFolder,
  onCreatePage,
  onDeleteFolder,
  onDeletePage,
  onRenameFolder,
  onRenamePage,
  onMovePage,
  onMoveFolder,
  onSearchClick,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragData, setDragData] = useState<DragData | null>(null)
  const [activeTab, setActiveTab] = useState<SidebarTab>("folders")

  // Auto-expand folders containing the active page
  useEffect(() => {
    if (!activePage) return

    // Helper to find the path of folder IDs containing a page
    const findFolderPathForPage = (folderList: Folder[], pageId: string, path: string[] = []): string[] | null => {
      for (const folder of folderList) {
        // Check if this folder contains the page
        if (folder.pages.some(p => p.id === pageId)) {
          return [...path, folder.id]
        }
        // Check subfolders recursively
        if (folder.folders) {
          const result = findFolderPathForPage(folder.folders, pageId, [...path, folder.id])
          if (result) return result
        }
      }
      return null
    }

    const folderPath = findFolderPathForPage(folders, activePage)
    if (!folderPath || folderPath.length === 0) return

    // Check if all folders in the path are already expanded
    const findFolder = (list: Folder[], folderId: string): Folder | null => {
      for (const f of list) {
        if (f.id === folderId) return f
        if (f.folders) {
          const found = findFolder(f.folders, folderId)
          if (found) return found
        }
      }
      return null
    }

    const needsUpdate = folderPath.some(folderId => {
      const folder = findFolder(folders, folderId)
      return folder && !folder.isExpanded
    })

    if (needsUpdate) {
      const expandFoldersInPath = (folderList: Folder[]): Folder[] => {
        return folderList.map((folder) => {
          const shouldExpand = folderPath.includes(folder.id)
          const updatedFolder = shouldExpand ? { ...folder, isExpanded: true } : folder
          if (folder.folders) {
            return { ...updatedFolder, folders: expandFoldersInPath(folder.folders) }
          }
          return updatedFolder
        })
      }
      onFoldersChange(expandFoldersInPath(folders))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage])

  const toggleFolder = useCallback((folderId: string) => {
    const updateFolders = (folderList: Folder[]): Folder[] => {
      return folderList.map((folder) => {
        if (folder.id === folderId) {
          return { ...folder, isExpanded: !folder.isExpanded }
        }
        if (folder.folders) {
          return { ...folder, folders: updateFolders(folder.folders) }
        }
        return folder
      })
    }
    onFoldersChange(updateFolders(folders))
  }, [folders, onFoldersChange])

  const handleStartEdit = useCallback((id: string, currentName: string) => {
    setEditingId(id)
    setEditingName(currentName)
  }, [])

  const handleEditChange = useCallback((name: string) => {
    setEditingName(name)
  }, [])

  const handleEditSubmit = useCallback((type: "folder" | "page", folderId: string, pageId?: string) => {
    if (editingName.trim()) {
      if (type === "folder") {
        onRenameFolder(folderId, editingName.trim())
      } else if (pageId) {
        onRenamePage(folderId, pageId, editingName.trim())
      }
    }
    setEditingId(null)
    setEditingName("")
  }, [editingName, onRenameFolder, onRenamePage])

  const handleEditCancel = useCallback(() => {
    setEditingId(null)
    setEditingName("")
  }, [])

  const toggleMode = useCallback(() => {
    onModeChange(mode === "floating" ? "sticky" : "floating")
  }, [mode, onModeChange])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: DragEvent, data: DragData) => {
    setDraggingId(data.id)
    setDragData(data)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("application/json", JSON.stringify(data))
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingId(null)
    setDragOverFolderId(null)
    setDragData(null)
  }, [])

  const handleDragOver = useCallback((e: DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    setDragOverFolderId(folderId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverFolderId(null)
  }, [])

  const isDescendantOf = useCallback((folderId: string, potentialAncestorId: string): boolean => {
    return checkIsDescendant(folders, folderId, potentialAncestorId)
  }, [folders])

  const handleDrop = useCallback(async (e: DragEvent, targetFolderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(null)
    setDraggingId(null)

    if (!dragData) return

    try {
      if (dragData.type === "page") {
        // Don't move if dropping in the same folder
        if (dragData.sourceFolderId === targetFolderId) return

        if (onMovePage) {
          await onMovePage(dragData.id, targetFolderId)
        }
      } else if (dragData.type === "folder") {
        // Don't move folder into itself
        if (dragData.id === targetFolderId) return

        // Don't move folder into its own descendant
        if (isDescendantOf(targetFolderId, dragData.id)) return

        if (onMoveFolder) {
          await onMoveFolder(dragData.id, targetFolderId)
        }
      }
    } catch (err) {
      console.error("Error during drop:", err)
    }

    setDragData(null)
  }, [dragData, onMovePage, onMoveFolder, isDescendantOf])

  return (
    <>
      {mode === "floating" && (
        <div
          className="sidebar-overlay"
          data-visible={isOpen}
          onClick={onClose}
        />
      )}

      <aside
        className="sidebar"
        data-open={isOpen}
        data-mode={mode}
      >
        <div className="sidebar-header">
          <Link href="/" className="font-grandhotel text-2xl font-bold">Noted.</Link>
          <div className="sidebar-header-actions">
            <button
              className="sidebar-icon-button"
              onClick={toggleMode}
              title={mode === "floating" ? "Pin Sidebar" : "Unpin Sidebar"}
            >
              {mode === "floating" ? <PinIcon /> : <PinOffIcon />}
            </button>
            <button
              className="sidebar-icon-button"
              onClick={() => onCreateFolder()}
              title="New Folder"
            >
              <PlusIcon />
            </button>
            {mode === "floating" && (
              <button
                className="sidebar-icon-button"
                onClick={onClose}
                title="Close"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <SidebarSearch onSearchClick={onSearchClick} placeholder="Search" />

        {/* Tab Switcher */}
        <SidebarTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="sidebar-content">
          {/* Folders Tab */}
          {activeTab === "folders" && (
            <div className="sidebar-section">
              {folders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  depth={0}
                  activePage={activePage}
                  editingId={editingId}
                  editingName={editingName}
                  dragOverFolderId={dragOverFolderId}
                  draggingId={draggingId}
                  onToggle={toggleFolder}
                  onPageSelect={onPageSelect}
                  onCreateFolder={onCreateFolder}
                  onCreatePage={onCreatePage}
                  onDeleteFolder={onDeleteFolder}
                  onDeletePage={onDeletePage}
                  onStartEdit={handleStartEdit}
                  onEditChange={handleEditChange}
                  onEditSubmit={handleEditSubmit}
                  onEditCancel={handleEditCancel}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  isDescendantOf={isDescendantOf}
                />
              ))}

              {folders.length === 0 && (
                <div className="sidebar-page" style={{ opacity: 0.5 }}>
                  <span className="page-name">No folders yet</span>
                </div>
              )}
            </div>
          )}

          {/* Tags Tab */}
          {activeTab === "tags" && (
            <SidebarTagsTab />
          )}

          {/* Files Tab */}
          {activeTab === "files" && (
            <div className="flex-1 overflow-auto">
              <FileLibrary />
            </div>
          )}

          {/* Study Tab */}
          {activeTab === "study" && (
            <SidebarStudyTab onSearchClick={onSearchClick} />
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar

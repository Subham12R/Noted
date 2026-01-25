"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

export interface FileItem {
  id: string
  userId: string
  pageId: string | null
  name: string
  originalName: string
  mimeType: string
  size: number
  storageKey: string
  url: string
  thumbnailUrl: string | null
  type: "image" | "pdf" | "video" | "audio" | "document" | "file"
  folderId: string | null
  isStarred: boolean
  createdAt: Date
  updatedAt: Date
  accessedAt: Date
}

export interface FileFolder {
  id: string
  userId: string
  name: string
  parentId: string | null
  color: string | null
  createdAt: Date
  updatedAt: Date
}

export interface StorageInfo {
  used: number
  limit: number
  percentage: number
}

interface FileLibraryContextType {
  // State
  files: FileItem[]
  folders: FileFolder[]
  currentFolder: FileFolder | null
  selectedFiles: string[]
  isLoading: boolean
  error: string | null
  storage: StorageInfo | null

  // Filters
  viewMode: "grid" | "list"
  filterType: "all" | "image" | "pdf" | "video" | "audio" | "document" | "file"
  sortBy: "date" | "name" | "size"
  showStarred: boolean

  // Panel state
  isPanelOpen: boolean
  previewFile: FileItem | null

  // Actions
  fetchFiles: (options?: { type?: string; folderId?: string; starred?: boolean }) => Promise<void>
  uploadFile: (file: File, options?: { pageId?: string; folderId?: string }) => Promise<FileItem | null>
  deleteFile: (fileId: string) => Promise<void>
  updateFile: (fileId: string, updates: Partial<FileItem>) => Promise<void>
  toggleStar: (fileId: string) => Promise<void>
  moveFile: (fileId: string, folderId: string | null) => Promise<void>

  // Selection
  selectFile: (fileId: string) => void
  deselectFile: (fileId: string) => void
  toggleFileSelection: (fileId: string) => void
  selectAllFiles: () => void
  clearSelection: () => void
  deleteSelected: () => Promise<void>

  // View
  setViewMode: (mode: "grid" | "list") => void
  setFilterType: (type: FileLibraryContextType["filterType"]) => void
  setSortBy: (sort: "date" | "name" | "size") => void
  setShowStarred: (show: boolean) => void
  setCurrentFolder: (folder: FileFolder | null) => void

  // Panel
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
  setPreviewFile: (file: FileItem | null) => void
}

const FileLibraryContext = createContext<FileLibraryContextType | null>(null)

export function FileLibraryProvider({ children }: { children: ReactNode }) {
  // State
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<FileFolder[]>([])
  const [currentFolder, setCurrentFolder] = useState<FileFolder | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [storage, setStorage] = useState<StorageInfo | null>(null)

  // Filters
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [filterType, setFilterType] = useState<FileLibraryContextType["filterType"]>("all")
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date")
  const [showStarred, setShowStarred] = useState(false)

  // Panel
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)

  // Fetch files
  const fetchFiles = useCallback(async (options?: { type?: string; folderId?: string; starred?: boolean }) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options?.type) params.set("type", options.type)
      if (options?.folderId) params.set("folderId", options.folderId)
      if (options?.starred) params.set("starred", "true")

      const res = await fetch(`/api/files?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch files")

      const data = await res.json()
      setFiles(data.files || [])
      setStorage(data.storage || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch files")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Upload file
  const uploadFile = useCallback(async (file: File, options?: { pageId?: string; folderId?: string }): Promise<FileItem | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (options?.pageId) formData.append("pageId", options.pageId)
      if (options?.folderId) formData.append("folderId", options.folderId)

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to upload file")
      }

      const data = await res.json()
      setFiles((prev) => [data.file, ...prev])
      return data.file
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file")
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Delete file
  const deleteFile = useCallback(async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete file")

      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      setSelectedFiles((prev) => prev.filter((id) => id !== fileId))
      if (previewFile?.id === fileId) setPreviewFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file")
    }
  }, [previewFile])

  // Update file
  const updateFile = useCallback(async (fileId: string, updates: Partial<FileItem>) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (!res.ok) throw new Error("Failed to update file")

      const data = await res.json()
      setFiles((prev) => prev.map((f) => (f.id === fileId ? data.file : f)))
      if (previewFile?.id === fileId) setPreviewFile(data.file)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update file")
    }
  }, [previewFile])

  // Toggle star
  const toggleStar = useCallback(async (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (!file) return

    await updateFile(fileId, { isStarred: !file.isStarred })
  }, [files, updateFile])

  // Move file
  const moveFile = useCallback(async (fileId: string, folderId: string | null) => {
    await updateFile(fileId, { folderId } as Partial<FileItem>)
  }, [updateFile])

  // Selection
  const selectFile = useCallback((fileId: string) => {
    setSelectedFiles((prev) => [...prev, fileId])
  }, [])

  const deselectFile = useCallback((fileId: string) => {
    setSelectedFiles((prev) => prev.filter((id) => id !== fileId))
  }, [])

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    )
  }, [])

  const selectAllFiles = useCallback(() => {
    setSelectedFiles(files.map((f) => f.id))
  }, [files])

  const clearSelection = useCallback(() => {
    setSelectedFiles([])
  }, [])

  const deleteSelected = useCallback(async () => {
    for (const fileId of selectedFiles) {
      await deleteFile(fileId)
    }
    setSelectedFiles([])
  }, [selectedFiles, deleteFile])

  // Panel
  const openPanel = useCallback(() => setIsPanelOpen(true), [])
  const closePanel = useCallback(() => setIsPanelOpen(false), [])
  const togglePanel = useCallback(() => setIsPanelOpen((prev) => !prev), [])

  const value: FileLibraryContextType = {
    files,
    folders,
    currentFolder,
    selectedFiles,
    isLoading,
    error,
    storage,
    viewMode,
    filterType,
    sortBy,
    showStarred,
    isPanelOpen,
    previewFile,
    fetchFiles,
    uploadFile,
    deleteFile,
    updateFile,
    toggleStar,
    moveFile,
    selectFile,
    deselectFile,
    toggleFileSelection,
    selectAllFiles,
    clearSelection,
    deleteSelected,
    setViewMode,
    setFilterType,
    setSortBy,
    setShowStarred,
    setCurrentFolder,
    openPanel,
    closePanel,
    togglePanel,
    setPreviewFile,
  }

  return <FileLibraryContext.Provider value={value}>{children}</FileLibraryContext.Provider>
}

export function useFileLibrary() {
  const context = useContext(FileLibraryContext)
  if (!context) {
    throw new Error("useFileLibrary must be used within FileLibraryProvider")
  }
  return context
}

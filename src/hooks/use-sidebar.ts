"use client"

import { useState, useCallback, useEffect } from "react"
import type { Folder, Page } from "@/components/sidebar"

// API response types
interface ApiFolder {
  id: string
  name: string
  ownerId: string
  parentId: string | null
  color: string | null
  image: string | null
  isExpanded: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface ApiPage {
  id: string
  name: string
  folderId: string
  ownerId?: string
  blocks?: unknown[]
  ydocState?: string | null
  sortOrder: number
  isPublic?: boolean
  version?: number
  createdAt: string
  updatedAt: string
  lastSavedAt?: string | null
}

// Convert flat API folders to nested structure
function buildFolderTree(
  apiFolders: ApiFolder[],
  apiPages: ApiPage[]
): Folder[] {
  const folderMap = new Map<string, Folder>()

  // Create folder objects
  apiFolders.forEach((f) => {
    folderMap.set(f.id, {
      id: f.id,
      name: f.name,
      isExpanded: f.isExpanded,
      parentId: f.parentId,
      pages: [],
      folders: [],
    })
  })

  // Add pages to folders
  apiPages.forEach((p) => {
    const folder = folderMap.get(p.folderId)
    if (folder) {
      folder.pages.push({
        id: p.id,
        name: p.name,
        content: "", // Content is loaded separately when page is selected
      })
    }
  })

  // Build tree structure
  const rootFolders: Folder[] = []
  folderMap.forEach((folder) => {
    if (folder.parentId) {
      const parent = folderMap.get(folder.parentId)
      if (parent) {
        parent.folders = parent.folders || []
        parent.folders.push(folder)
      }
    } else {
      rootFolders.push(folder)
    }
  })

  return rootFolders
}

// Helper to recursively update folders
const updateFoldersRecursive = (
  folderList: Folder[],
  folderId: string,
  updater: (folder: Folder) => Folder
): Folder[] => {
  return folderList.map((folder) => {
    if (folder.id === folderId) {
      return updater(folder)
    }
    if (folder.folders && folder.folders.length > 0) {
      return {
        ...folder,
        folders: updateFoldersRecursive(folder.folders, folderId, updater),
      }
    }
    return folder
  })
}

// Helper to find a folder by id recursively
const findFolderById = (folderList: Folder[], folderId: string): Folder | null => {
  for (const folder of folderList) {
    if (folder.id === folderId) {
      return folder
    }
    if (folder.folders && folder.folders.length > 0) {
      const found = findFolderById(folder.folders, folderId)
      if (found) return found
    }
  }
  return null
}

// Helper to delete folder recursively from local state
const deleteFolderRecursive = (folderList: Folder[], folderId: string): Folder[] => {
  return folderList
    .filter((folder) => folder.id !== folderId)
    .map((folder) => ({
      ...folder,
      folders: folder.folders ? deleteFolderRecursive(folder.folders, folderId) : [],
    }))
}

// Helper to get all page ids from a folder and its subfolders
const getAllPageIds = (folder: Folder): string[] => {
  const pageIds = folder.pages.map((p) => p.id)
  if (folder.folders) {
    for (const subFolder of folder.folders) {
      pageIds.push(...getAllPageIds(subFolder))
    }
  }
  return pageIds
}

export function useSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<"floating" | "sticky">("floating")
  const [folders, setFolders] = useState<Folder[]>([])
  const [activePage, setActivePage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch folders and pages from backend
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [foldersRes, pagesRes] = await Promise.all([
        fetch("/api/folders"),
        fetch("/api/pages"),
      ])

      if (!foldersRes.ok || !pagesRes.ok) {
        // If unauthorized (401), just set empty state - user not logged in
        if (foldersRes.status === 401 || pagesRes.status === 401) {
          setFolders([])
          setIsLoading(false)
          return
        }
        throw new Error("Failed to fetch data")
      }

      const foldersData = await foldersRes.json()
      const pagesData = await pagesRes.json()

      const nestedFolders = buildFolderTree(
        foldersData.folders || [],
        pagesData.pages || []
      )
      setFolders(nestedFolders)
    } catch (err) {
      console.error("Error fetching sidebar data:", err)
      setError(err instanceof Error ? err.message : "Failed to load data")
      setFolders([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch data on mount
  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const closeSidebar = useCallback(() => {
    if (mode === "floating") {
      setIsOpen(false)
    }
  }, [mode])

  const handleModeChange = useCallback((newMode: "floating" | "sticky") => {
    setMode(newMode)
    if (newMode === "sticky") {
      setIsOpen(true)
    }
  }, [])

  const createFolder = useCallback(async (parentId?: string) => {
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Folder",
          parentId: parentId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create folder")
      }

      const { folder: newFolder } = await res.json()

      // Add to local state
      const folderToAdd: Folder = {
        id: newFolder.id,
        name: newFolder.name,
        isExpanded: true,
        parentId: newFolder.parentId,
        pages: [],
        folders: [],
      }

      if (parentId) {
        setFolders((prev) =>
          updateFoldersRecursive(prev, parentId, (folder) => ({
            ...folder,
            isExpanded: true,
            folders: [...(folder.folders || []), folderToAdd],
          }))
        )
      } else {
        setFolders((prev) => [...prev, folderToAdd])
      }
    } catch (err) {
      console.error("Error creating folder:", err)
      setError(err instanceof Error ? err.message : "Failed to create folder")
    }
  }, [])

  const createPage = useCallback(async (folderId: string) => {
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Untitled",
          folderId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create page")
      }

      const { page: newPage } = await res.json()

      // Add to local state
      const pageToAdd: Page = {
        id: newPage.id,
        name: newPage.name,
        content: "",
      }

      setFolders((prev) =>
        updateFoldersRecursive(prev, folderId, (folder) => ({
          ...folder,
          pages: [...folder.pages, pageToAdd],
          isExpanded: true,
        }))
      )
      setActivePage(newPage.id)
    } catch (err) {
      console.error("Error creating page:", err)
      setError(err instanceof Error ? err.message : "Failed to create page")
    }
  }, [])

  const selectPage = useCallback((pageId: string) => {
    setActivePage(pageId)
    if (mode === "floating") {
      setIsOpen(false)
    }
  }, [mode])

  const deleteFolder = useCallback(async (folderId: string) => {
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete folder")
      }

      // Update local state
      setFolders((prev) => {
        const folderToDelete = findFolderById(prev, folderId)
        if (folderToDelete) {
          const pageIds = getAllPageIds(folderToDelete)
          setActivePage((currentPage) => {
            if (currentPage && pageIds.includes(currentPage)) {
              return null
            }
            return currentPage
          })
        }
        return deleteFolderRecursive(prev, folderId)
      })
    } catch (err) {
      console.error("Error deleting folder:", err)
      setError(err instanceof Error ? err.message : "Failed to delete folder")
    }
  }, [])

  const deletePage = useCallback(async (folderId: string, pageId: string) => {
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete page")
      }

      // Update local state
      setFolders((prev) =>
        updateFoldersRecursive(prev, folderId, (folder) => ({
          ...folder,
          pages: folder.pages.filter((p) => p.id !== pageId),
        }))
      )
      setActivePage((currentPage) => (currentPage === pageId ? null : currentPage))
    } catch (err) {
      console.error("Error deleting page:", err)
      setError(err instanceof Error ? err.message : "Failed to delete page")
    }
  }, [])

  const renameFolder = useCallback(async (folderId: string, newName: string) => {
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to rename folder")
      }

      // Update local state
      setFolders((prev) =>
        updateFoldersRecursive(prev, folderId, (folder) => ({
          ...folder,
          name: newName,
        }))
      )
    } catch (err) {
      console.error("Error renaming folder:", err)
      setError(err instanceof Error ? err.message : "Failed to rename folder")
    }
  }, [])

  const renamePage = useCallback(async (folderId: string, pageId: string, newName: string) => {
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to rename page")
      }

      // Update local state
      setFolders((prev) =>
        updateFoldersRecursive(prev, folderId, (folder) => ({
          ...folder,
          pages: folder.pages.map((page) =>
            page.id === pageId ? { ...page, name: newName } : page
          ),
        }))
      )
    } catch (err) {
      console.error("Error renaming page:", err)
      setError(err instanceof Error ? err.message : "Failed to rename page")
    }
  }, [])

  const updatePageContent = useCallback((pageId: string, content: string) => {
    // Update local state only - actual save is handled by the editor component
    const updatePagesRecursive = (folderList: Folder[]): Folder[] => {
      return folderList.map((folder) => ({
        ...folder,
        pages: folder.pages.map((page) =>
          page.id === pageId ? { ...page, content } : page
        ),
        folders: folder.folders ? updatePagesRecursive(folder.folders) : [],
      }))
    }
    setFolders((prev) => updatePagesRecursive(prev))
  }, [])

  const getPageContent = useCallback((pageId: string): string => {
    const findPage = (folderList: Folder[]): string | null => {
      for (const folder of folderList) {
        const page = folder.pages.find((p) => p.id === pageId)
        if (page) {
          return page.content || ""
        }
        if (folder.folders) {
          const found = findPage(folder.folders)
          if (found !== null) return found
        }
      }
      return null
    }
    return findPage(folders) || ""
  }, [folders])

  const updateFolderExpanded = useCallback(async (folderId: string, isExpanded: boolean) => {
    try {
      // Optimistically update local state first
      setFolders((prev) =>
        updateFoldersRecursive(prev, folderId, (folder) => ({
          ...folder,
          isExpanded,
        }))
      )

      // Then sync with backend
      await fetch(`/api/folders/${folderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isExpanded }),
      })
    } catch (err) {
      console.error("Error updating folder expanded state:", err)
    }
  }, [])

  return {
    isOpen,
    setIsOpen,
    mode,
    setMode: handleModeChange,
    folders,
    setFolders,
    activePage,
    setActivePage,
    toggleSidebar,
    closeSidebar,
    createFolder,
    createPage,
    selectPage,
    deleteFolder,
    deletePage,
    renameFolder,
    renamePage,
    updatePageContent,
    getPageContent,
    updateFolderExpanded,
    isLoading,
    error,
    refetch: fetchData,
  }
}

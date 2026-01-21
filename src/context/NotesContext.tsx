"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react"

export interface Page {
  id: string
  name: string
  content?: string
  createdAt?: string
  updatedAt?: string
  isShared?: boolean
}

export interface Folder {
  id: string
  name: string
  pages: Page[]
  folders?: Folder[]
  isExpanded?: boolean
  parentId?: string | null
  color?: string
  image?: string
  createdAt?: string
}

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
  content?: string | null
  folderId: string
  ownerId?: string
  blocks?: unknown[]
  ydocState?: string | null
  sortOrder: number
  isPublic?: boolean
  isShared?: boolean
  version?: number
  createdAt: string
  updatedAt: string
  lastSavedAt?: string | null
}

interface NotesContextType {
  folders: Folder[]
  setFolders: (folders: Folder[]) => void
  activePage: string | null
  setActivePage: (pageId: string | null) => void
  activeFolder: string | null
  setActiveFolder: (folderId: string | null) => void
  createFolder: (parentId?: string) => Promise<void>
  createPage: (folderId: string) => Promise<void>
  deleteFolder: (folderId: string) => Promise<void>
  deletePage: (folderId: string, pageId: string) => Promise<void>
  renameFolder: (folderId: string, newName: string) => Promise<void>
  renamePage: (folderId: string, pageId: string, newName: string) => Promise<void>
  updatePageContent: (pageId: string, content: string) => void
  getPageContent: (pageId: string) => string
  getFolderById: (folderId: string) => Folder | null
  getPageById: (pageId: string) => { page: Page; folderId: string } | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const NotesContext = createContext<NotesContextType | null>(null)

const folderColors = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6"
]

const getRandomColor = () => folderColors[Math.floor(Math.random() * folderColors.length)]

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
      color: f.color || undefined,
      image: f.image || undefined,
      createdAt: f.createdAt,
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
        content: p.content || "",
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        isShared: p.isShared || false,
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

// Helper functions
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

const deleteFolderRecursive = (folderList: Folder[], folderId: string): Folder[] => {
  return folderList
    .filter((folder) => folder.id !== folderId)
    .map((folder) => ({
      ...folder,
      folders: folder.folders ? deleteFolderRecursive(folder.folders, folderId) : [],
    }))
}

const getAllPageIds = (folder: Folder): string[] => {
  const pageIds = folder.pages.map((p) => p.id)
  if (folder.folders) {
    for (const subFolder of folder.folders) {
      pageIds.push(...getAllPageIds(subFolder))
    }
  }
  return pageIds
}

const findPageInFolders = (
  folderList: Folder[],
  pageId: string
): { page: Page; folderId: string } | null => {
  for (const folder of folderList) {
    const page = folder.pages.find((p) => p.id === pageId)
    if (page) {
      return { page, folderId: folder.id }
    }
    if (folder.folders) {
      const found = findPageInFolders(folder.folders, pageId)
      if (found) return found
    }
  }
  return null
}

export function NotesProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [activePage, setActivePage] = useState<string | null>(null)
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce timer ref for saving content
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSavesRef = useRef<Map<string, string>>(new Map())

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
      console.error("Error fetching notes data:", err)
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

  // Cleanup: save pending content when component unmounts or page unloads
  useEffect(() => {
    const savePending = () => {
      pendingSavesRef.current.forEach((content, pageId) => {
        // Use fetch with keepalive for reliable save on page close
        // This allows PUT requests unlike sendBeacon which only supports POST
        fetch(`/api/pages/${pageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
          keepalive: true, // Ensures request completes even if page closes
        }).catch(() => {
          // Silently fail - page is closing anyway
        })
      })
      pendingSavesRef.current.clear()
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSavesRef.current.size > 0) {
        savePending()
        // Some browsers require returnValue to be set
        e.preventDefault()
        e.returnValue = ""
      }
    }

    // Also save when tab becomes hidden (user switches tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && pendingSavesRef.current.size > 0) {
        savePending()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      // Save any pending changes on unmount
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      savePending()
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
          color: getRandomColor(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        // Handle limit reached error specially
        if (data.code === "FOLDER_LIMIT_REACHED") {
          throw new Error(data.message || "Folder limit reached. Please upgrade your plan.")
        }
        throw new Error(data.error || "Failed to create folder")
      }

      const { folder: newFolder } = await res.json()

      const folderToAdd: Folder = {
        id: newFolder.id,
        name: newFolder.name,
        isExpanded: true,
        parentId: newFolder.parentId,
        color: newFolder.color || getRandomColor(),
        createdAt: newFolder.createdAt,
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
      const errorMessage = err instanceof Error ? err.message : "Failed to create folder"
      setError(errorMessage)
      throw err // Re-throw so caller can handle it
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
        // Handle limit reached error specially
        if (data.code === "NOTE_LIMIT_REACHED") {
          throw new Error(data.message || "Note limit reached. Please upgrade your plan.")
        }
        throw new Error(data.error || "Failed to create page")
      }

      const { page: newPage } = await res.json()

      const pageToAdd: Page = {
        id: newPage.id,
        name: newPage.name,
        content: "",
        createdAt: newPage.createdAt,
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
      const errorMessage = err instanceof Error ? err.message : "Failed to create page"
      setError(errorMessage)
      throw err // Re-throw so caller can handle it
    }
  }, [])

  const deleteFolder = useCallback(async (folderId: string) => {
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete folder")
      }

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

  // Save content to API (debounced)
  const saveContentToApi = useCallback(async (pageId: string, content: string) => {
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })

      if (!res.ok) {
        console.error("Failed to save page content")
      }
    } catch (err) {
      console.error("Error saving page content:", err)
    }
  }, [])

  const updatePageContent = useCallback((pageId: string, content: string) => {
    // Update local state immediately
    const updatePagesRecursive = (folderList: Folder[]): Folder[] => {
      return folderList.map((folder) => ({
        ...folder,
        pages: folder.pages.map((page) =>
          page.id === pageId ? { ...page, content, updatedAt: new Date().toISOString() } : page
        ),
        folders: folder.folders ? updatePagesRecursive(folder.folders) : [],
      }))
    }
    setFolders((prev) => updatePagesRecursive(prev))

    // Queue the save to API with debouncing
    pendingSavesRef.current.set(pageId, content)

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    // Set new debounced save timer (1.5 seconds)
    saveTimerRef.current = setTimeout(() => {
      pendingSavesRef.current.forEach((savedContent, savedPageId) => {
        saveContentToApi(savedPageId, savedContent)
      })
      pendingSavesRef.current.clear()
    }, 1500)
  }, [saveContentToApi])

  const getPageContent = useCallback((pageId: string): string => {
    const result = findPageInFolders(folders, pageId)
    return result?.page.content || ""
  }, [folders])

  const getFolderById = useCallback((folderId: string): Folder | null => {
    return findFolderById(folders, folderId)
  }, [folders])

  const getPageById = useCallback((pageId: string): { page: Page; folderId: string } | null => {
    return findPageInFolders(folders, pageId)
  }, [folders])

  return (
    <NotesContext.Provider
      value={{
        folders,
        setFolders,
        activePage,
        setActivePage,
        activeFolder,
        setActiveFolder,
        createFolder,
        createPage,
        deleteFolder,
        deletePage,
        renameFolder,
        renamePage,
        updatePageContent,
        getPageContent,
        getFolderById,
        getPageById,
        isLoading,
        error,
        refetch: fetchData,
      }}
    >
      {children}
    </NotesContext.Provider>
  )
}

export function useNotes() {
  const context = useContext(NotesContext)
  if (!context) {
    throw new Error("useNotes must be used within a NotesProvider")
  }
  return context
}

"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

export interface Page {
  id: string
  name: string
  content?: string
  createdAt?: string
  updatedAt?: string
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

interface NotesContextType {
  folders: Folder[]
  setFolders: (folders: Folder[]) => void
  activePage: string | null
  setActivePage: (pageId: string | null) => void
  activeFolder: string | null
  setActiveFolder: (folderId: string | null) => void
  createFolder: (parentId?: string) => void
  createPage: (folderId: string) => void
  deleteFolder: (folderId: string) => void
  deletePage: (folderId: string, pageId: string) => void
  renameFolder: (folderId: string, newName: string) => void
  renamePage: (folderId: string, pageId: string, newName: string) => void
  updatePageContent: (pageId: string, content: string) => void
  getPageContent: (pageId: string) => string
  getFolderById: (folderId: string) => Folder | null
  getPageById: (pageId: string) => { page: Page; folderId: string } | null
}

const NotesContext = createContext<NotesContextType | null>(null)

const generateId = () => Math.random().toString(36).substring(2, 9)

const folderColors = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6"
]

const getRandomColor = () => folderColors[Math.floor(Math.random() * folderColors.length)]

const defaultFolders: Folder[] = [
  {
    id: "folder-1",
    name: "My Notes",
    isExpanded: true,
    color: "#6366f1",
    createdAt: new Date().toISOString(),
    folders: [
      {
        id: "folder-1-1",
        name: "Personal",
        isExpanded: false,
        color: "#8b5cf6",
        createdAt: new Date().toISOString(),
        pages: [
          { id: "page-4", name: "Daily Journal", content: "", createdAt: new Date().toISOString() },
        ],
        folders: [],
      },
    ],
    pages: [
      { id: "page-1", name: "Welcome", content: "", createdAt: new Date().toISOString() },
      { id: "page-2", name: "Getting Started", content: "", createdAt: new Date().toISOString() },
    ],
  },
  {
    id: "folder-2",
    name: "Projects",
    isExpanded: false,
    color: "#22c55e",
    createdAt: new Date().toISOString(),
    folders: [],
    pages: [
      { id: "page-3", name: "Project Ideas", content: "", createdAt: new Date().toISOString() },
    ],
  },
  {
    id: "folder-3",
    name: "Work",
    isExpanded: false,
    color: "#f97316",
    createdAt: new Date().toISOString(),
    folders: [],
    pages: [],
  },
]

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
  const [folders, setFolders] = useState<Folder[]>(defaultFolders)
  const [activePage, setActivePage] = useState<string | null>(null)
  const [activeFolder, setActiveFolder] = useState<string | null>(null)

  const createFolder = useCallback((parentId?: string) => {
    const newFolder: Folder = {
      id: `folder-${generateId()}`,
      name: "New Folder",
      isExpanded: true,
      pages: [],
      folders: [],
      color: getRandomColor(),
      createdAt: new Date().toISOString(),
    }

    if (parentId) {
      setFolders((prev) =>
        updateFoldersRecursive(prev, parentId, (folder) => ({
          ...folder,
          isExpanded: true,
          folders: [...(folder.folders || []), newFolder],
        }))
      )
    } else {
      setFolders((prev) => [...prev, newFolder])
    }
  }, [])

  const createPage = useCallback((folderId: string) => {
    const newPage: Page = {
      id: `page-${generateId()}`,
      name: "Untitled",
      content: "",
      createdAt: new Date().toISOString(),
    }
    setFolders((prev) =>
      updateFoldersRecursive(prev, folderId, (folder) => ({
        ...folder,
        pages: [...folder.pages, newPage],
        isExpanded: true,
      }))
    )
    setActivePage(newPage.id)
  }, [])

  const deleteFolder = useCallback((folderId: string) => {
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
  }, [])

  const deletePage = useCallback((folderId: string, pageId: string) => {
    setFolders((prev) =>
      updateFoldersRecursive(prev, folderId, (folder) => ({
        ...folder,
        pages: folder.pages.filter((p) => p.id !== pageId),
      }))
    )
    setActivePage((currentPage) => (currentPage === pageId ? null : currentPage))
  }, [])

  const renameFolder = useCallback((folderId: string, newName: string) => {
    setFolders((prev) =>
      updateFoldersRecursive(prev, folderId, (folder) => ({
        ...folder,
        name: newName,
      }))
    )
  }, [])

  const renamePage = useCallback((folderId: string, pageId: string, newName: string) => {
    setFolders((prev) =>
      updateFoldersRecursive(prev, folderId, (folder) => ({
        ...folder,
        pages: folder.pages.map((page) =>
          page.id === pageId ? { ...page, name: newName } : page
        ),
      }))
    )
  }, [])

  const updatePageContent = useCallback((pageId: string, content: string) => {
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
  }, [])

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

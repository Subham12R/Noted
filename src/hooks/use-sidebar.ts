"use client"

import { useState, useCallback } from "react"
import type { Folder, Page } from "@/components/sidebar"

const generateId = () => Math.random().toString(36).substring(2, 9)

const defaultFolders: Folder[] = [
  {
    id: "folder-1",
    name: "My Notes",
    isExpanded: true,
    folders: [
      {
        id: "folder-1-1",
        name: "Personal",
        isExpanded: false,
        pages: [
          { id: "page-4", name: "Daily Journal", content: "" },
        ],
        folders: [],
      },
    ],
    pages: [
      { id: "page-1", name: "Welcome", content: "" },
      { id: "page-2", name: "Getting Started", content: "" },
    ],
  },
  {
    id: "folder-2",
    name: "Projects",
    isExpanded: false,
    folders: [],
    pages: [
      { id: "page-3", name: "Project Ideas", content: "" },
    ],
  },
]

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

// Helper to delete folder recursively
const deleteFolderRecursive = (folderList: Folder[], folderId: string): Folder[] => {
  return folderList
    .filter((folder) => folder.id !== folderId)
    .map((folder) => ({
      ...folder,
      folders: folder.folders ? deleteFolderRecursive(folder.folders, folderId) : [],
    }))
}

// Helper to check if a page exists in any folder
const findPageInFolders = (folderList: Folder[], pageId: string): boolean => {
  for (const folder of folderList) {
    if (folder.pages.some((p) => p.id === pageId)) {
      return true
    }
    if (folder.folders && findPageInFolders(folder.folders, pageId)) {
      return true
    }
  }
  return false
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
  const [folders, setFolders] = useState<Folder[]>(defaultFolders)
  const [activePage, setActivePage] = useState<string | null>(null)

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

  const createFolder = useCallback((parentId?: string) => {
    const newFolder: Folder = {
      id: `folder-${generateId()}`,
      name: "New Folder",
      isExpanded: true,
      pages: [],
      folders: [],
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

  const selectPage = useCallback((pageId: string) => {
    setActivePage(pageId)
    if (mode === "floating") {
      setIsOpen(false)
    }
  }, [mode])

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
  }
}

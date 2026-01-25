"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

export interface Tag {
  id: string
  userId: string
  name: string
  color: string
  parentId: string | null
  createdAt: Date
  updatedAt: Date
  pageCount?: number
  folderCount?: number
}

interface TagContextType {
  // State
  tags: Tag[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchTags: () => Promise<void>
  createTag: (name: string, color?: string, parentId?: string) => Promise<Tag | null>
  updateTag: (tagId: string, updates: Partial<Tag>) => Promise<void>
  deleteTag: (tagId: string) => Promise<void>

  // Page tag operations
  getPageTags: (pageId: string) => Promise<Tag[]>
  addTagToPage: (pageId: string, tagId: string) => Promise<void>
  removeTagFromPage: (pageId: string, tagId: string) => Promise<void>
  setPageTags: (pageId: string, tagIds: string[]) => Promise<void>

  // Search
  searchTags: (query: string) => Tag[]
}

const TagContext = createContext<TagContextType | null>(null)

// Predefined tag colors
export const TAG_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6b7280", // Gray
]

export function TagProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all tags
  const fetchTags = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/tags")
      if (!res.ok) throw new Error("Failed to fetch tags")

      const data = await res.json()
      setTags(data.tags || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tags")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Create tag
  const createTag = useCallback(async (name: string, color?: string, parentId?: string): Promise<Tag | null> => {
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, parentId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create tag")
      }

      const data = await res.json()
      setTags((prev) => [...prev, data.tag])
      return data.tag
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tag")
      return null
    }
  }, [])

  // Update tag
  const updateTag = useCallback(async (tagId: string, updates: Partial<Tag>) => {
    try {
      const res = await fetch(`/api/tags/${tagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (!res.ok) throw new Error("Failed to update tag")

      const data = await res.json()
      setTags((prev) => prev.map((t) => (t.id === tagId ? data.tag : t)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tag")
    }
  }, [])

  // Delete tag
  const deleteTag = useCallback(async (tagId: string) => {
    try {
      const res = await fetch(`/api/tags/${tagId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete tag")

      setTags((prev) => prev.filter((t) => t.id !== tagId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tag")
    }
  }, [])

  // Get tags for a page
  const getPageTags = useCallback(async (pageId: string): Promise<Tag[]> => {
    try {
      const res = await fetch(`/api/pages/${pageId}/tags`)
      if (!res.ok) throw new Error("Failed to fetch page tags")

      const data = await res.json()
      return data.tags || []
    } catch (err) {
      console.error("Failed to get page tags:", err)
      return []
    }
  }, [])

  // Add tag to page
  const addTagToPage = useCallback(async (pageId: string, tagId: string) => {
    try {
      const res = await fetch(`/api/pages/${pageId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      })

      if (!res.ok) throw new Error("Failed to add tag to page")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add tag")
    }
  }, [])

  // Remove tag from page
  const removeTagFromPage = useCallback(async (pageId: string, tagId: string) => {
    try {
      const res = await fetch(`/api/pages/${pageId}/tags?tagId=${tagId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to remove tag from page")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove tag")
    }
  }, [])

  // Set all tags for a page
  const setPageTags = useCallback(async (pageId: string, tagIds: string[]) => {
    try {
      const res = await fetch(`/api/pages/${pageId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds }),
      })

      if (!res.ok) throw new Error("Failed to set page tags")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set tags")
    }
  }, [])

  // Search tags locally
  const searchTags = useCallback(
    (query: string): Tag[] => {
      if (!query) return tags
      const lowerQuery = query.toLowerCase()
      return tags.filter((tag) => tag.name.toLowerCase().includes(lowerQuery))
    },
    [tags]
  )

  const value: TagContextType = {
    tags,
    isLoading,
    error,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    getPageTags,
    addTagToPage,
    removeTagFromPage,
    setPageTags,
    searchTags,
  }

  return <TagContext.Provider value={value}>{children}</TagContext.Provider>
}

export function useTags() {
  const context = useContext(TagContext)
  if (!context) {
    throw new Error("useTags must be used within TagProvider")
  }
  return context
}

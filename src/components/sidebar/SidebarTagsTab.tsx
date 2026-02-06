"use client"

import { useTags } from "@/context/TagContext"
import { useEffect } from "react"
import { Plus } from "lucide-react"

interface SidebarTagsTabProps {
  onTagSelect?: (tagId: string) => void
}

export function SidebarTagsTab({ onTagSelect }: SidebarTagsTabProps) {
  const { tags, isLoading, fetchTags } = useTags()

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  if (isLoading) {
    return (
      <div className="sidebar-tags-loading">
        <span>Loading tags...</span>
      </div>
    )
  }

  if (tags.length === 0) {
    return (
      <div className="sidebar-tags-empty">
        <span>No tags yet</span>
      </div>
    )
  }

  return (
    <div className="sidebar-tags-list">
      {tags.map((tag) => (
        <div
          key={tag.id}
          className="sidebar-tag-item"
          onClick={() => onTagSelect?.(tag.id)}
        >
          <span
            className="sidebar-tag-dot"
            style={{ backgroundColor: tag.color }}
          />
          <span className="sidebar-tag-name">{tag.name}</span>
          {(tag.pageCount !== undefined && tag.pageCount > 0) && (
            <span className="sidebar-tag-count">{tag.pageCount}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default SidebarTagsTab

"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useTags, TAG_COLORS, Tag } from "@/context/TagContext"
import { TagBadge } from "./TagBadge"
import { Plus, Search, Check, X, Tag as TagIcon } from "lucide-react"

interface TagSelectorProps {
  selectedTags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  pageId?: string // If provided, syncs with backend
}

export function TagSelector({ selectedTags, onTagsChange, pageId }: TagSelectorProps) {
  const { tags, fetchTags, createTag, addTagToPage, removeTagFromPage } = useTags()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch tags on mount
  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filter tags by search
  const filteredTags = tags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedTags.some((t) => t.id === tag.id)
  )

  // Handle tag selection
  const handleSelectTag = useCallback(
    async (tag: Tag) => {
      onTagsChange([...selectedTags, tag])
      if (pageId) {
        await addTagToPage(pageId, tag.id)
      }
      setSearchQuery("")
    },
    [selectedTags, onTagsChange, pageId, addTagToPage]
  )

  // Handle tag removal
  const handleRemoveTag = useCallback(
    async (tag: Tag) => {
      onTagsChange(selectedTags.filter((t) => t.id !== tag.id))
      if (pageId) {
        await removeTagFromPage(pageId, tag.id)
      }
    },
    [selectedTags, onTagsChange, pageId, removeTagFromPage]
  )

  // Handle create new tag
  const handleCreateTag = useCallback(async () => {
    if (!newTagName.trim()) return

    const tag = await createTag(newTagName.trim(), newTagColor)
    if (tag) {
      onTagsChange([...selectedTags, tag])
      if (pageId) {
        await addTagToPage(pageId, tag.id)
      }
      setNewTagName("")
      setNewTagColor(TAG_COLORS[0])
      setIsCreating(false)
    }
  }, [newTagName, newTagColor, createTag, selectedTags, onTagsChange, pageId, addTagToPage])

  return (
    <div ref={containerRef} className="relative">
      {/* Selected tags display */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {selectedTags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} size="sm" onRemove={() => handleRemoveTag(tag)} />
        ))}
      </div>

      {/* Add tag button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setTimeout(() => inputRef.current?.focus(), 100)
        }}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
      >
        <Plus size={14} />
        Add tag
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 w-64 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-zinc-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search or create tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery && filteredTags.length === 0) {
                    setNewTagName(searchQuery)
                    setIsCreating(true)
                  }
                }}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Tag list or create form */}
          <div className="max-h-48 overflow-y-auto">
            {isCreating ? (
              <div className="p-3">
                <p className="text-xs text-zinc-400 mb-2">Create new tag</p>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name"
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm focus:outline-none focus:border-indigo-500 mb-2"
                  autoFocus
                />
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${
                        newTagColor === color ? "border-white scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateTag}
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false)
                      setNewTagName("")
                    }}
                    className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {filteredTags.length === 0 && searchQuery ? (
                  <button
                    onClick={() => {
                      setNewTagName(searchQuery)
                      setIsCreating(true)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Create &quot;{searchQuery}&quot;
                  </button>
                ) : (
                  filteredTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleSelectTag(tag)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="truncate">{tag.name}</span>
                      {tag.pageCount !== undefined && (
                        <span className="text-xs text-zinc-500 ml-auto">{tag.pageCount}</span>
                      )}
                    </button>
                  ))
                )}
              </>
            )}
          </div>

          {/* Create new tag button */}
          {!isCreating && filteredTags.length > 0 && (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2 border-t border-zinc-700"
            >
              <Plus size={14} />
              Create new tag
            </button>
          )}
        </div>
      )}
    </div>
  )
}

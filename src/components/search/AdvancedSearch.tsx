"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTags, Tag } from "@/context/TagContext"
import { TagBadge } from "@/components/tags"
import {
  Search,
  X,
  FileText,
  Folder,
  File,
  Image,
  Video,
  Music,
  Filter,
  Calendar,
  Tag as TagIcon,
  ChevronDown,
  Loader2,
} from "lucide-react"

export interface SearchResult {
  type: "page" | "folder" | "file"
  id: string
  name: string
  snippet?: string
  folderId?: string
  folderName?: string
  tags?: { id: string; name: string; color: string }[]
  mimeType?: string
  fileType?: string
  url?: string
  updatedAt: Date
  createdAt: Date
  matchScore: number
}

interface AdvancedSearchProps {
  isOpen: boolean
  onClose: () => void
  initialQuery?: string
}

export function AdvancedSearch({ isOpen, onClose, initialQuery = "" }: AdvancedSearchProps) {
  const router = useRouter()
  const { tags, fetchTags } = useTags()
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = useState<"all" | "pages" | "folders" | "files">("all")
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState<"relevance" | "date" | "name">("relevance")

  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Fetch tags on mount
  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Search function
  const performSearch = useCallback(async () => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("q", query)
      params.set("type", typeFilter)
      params.set("sortBy", sortBy)
      if (selectedTags.length > 0) {
        params.set("tags", selectedTags.map((t) => t.id).join(","))
      }
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)

      const res = await fetch(`/api/search?${params.toString()}`)
      if (!res.ok) throw new Error("Search failed")

      const data = await res.json()
      setResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed")
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [query, typeFilter, selectedTags, dateFrom, dateTo, sortBy])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch()
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [performSearch])

  // Handle result click
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      onClose()
      if (result.type === "page") {
        router.push(`/note/${result.id}`)
      } else if (result.type === "folder") {
        router.push(`/dashboard?folder=${result.id}`)
      }
      // Files could open in a preview modal
    },
    [router, onClose]
  )

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Search modal */}
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
          <Search className="text-zinc-400 flex-shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, folders, and files..."
            className="flex-1 bg-transparent text-lg focus:outline-none"
          />
          {isLoading && <Loader2 className="animate-spin text-zinc-400" size={20} />}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? "bg-indigo-600 text-white" : "hover:bg-zinc-800 text-zinc-400"
            }`}
          >
            <Filter size={18} />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 border-b border-zinc-800 space-y-3">
            {/* Type filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400 w-20">Type:</span>
              <div className="flex gap-1">
                {(["all", "pages", "folders", "files"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                      typeFilter === type
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400 w-20">Tags:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    size="sm"
                    onRemove={() => setSelectedTags((prev) => prev.filter((t) => t.id !== tag.id))}
                  />
                ))}
                <select
                  value=""
                  onChange={(e) => {
                    const tag = tags.find((t) => t.id === e.target.value)
                    if (tag && !selectedTags.some((t) => t.id === tag.id)) {
                      setSelectedTags((prev) => [...prev, tag])
                    }
                  }}
                  className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
                >
                  <option value="">Add tag...</option>
                  {tags
                    .filter((t) => !selectedTags.some((st) => st.id === t.id))
                    .map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Date filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400 w-20">Date:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
              />
              <span className="text-zinc-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400 w-20">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {error ? (
            <div className="p-8 text-center text-red-400">{error}</div>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="p-8 text-center text-zinc-400">
              {isLoading ? "Searching..." : "No results found"}
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">
              <Search size={32} className="mx-auto mb-2 opacity-50" />
              <p>Start typing to search</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {results.map((result) => (
                <SearchResultItem
                  key={`${result.type}-${result.id}`}
                  result={result}
                  onClick={() => handleResultClick(result)}
                  query={query}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="p-3 border-t border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
            <span>{results.length} results</span>
            <div className="flex items-center gap-4">
              <span>
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↵</kbd> to select
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">esc</kbd> to close
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Search result item component
function SearchResultItem({
  result,
  onClick,
  query,
}: {
  result: SearchResult
  onClick: () => void
  query: string
}) {
  // Get icon based on type
  const getIcon = () => {
    if (result.type === "page") return FileText
    if (result.type === "folder") return Folder
    if (result.fileType === "image") return Image
    if (result.fileType === "video") return Video
    if (result.fileType === "audio") return Music
    return File
  }
  const Icon = getIcon()

  // Highlight matching text
  const highlightText = (text: string) => {
    if (!query) return text
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full p-4 text-left hover:bg-zinc-800/50 flex items-start gap-3 transition-colors"
    >
      {/* Icon */}
      <div
        className={`p-2 rounded-lg flex-shrink-0 ${
          result.type === "page"
            ? "bg-blue-500/20 text-blue-400"
            : result.type === "folder"
            ? "bg-yellow-500/20 text-yellow-400"
            : "bg-zinc-700 text-zinc-400"
        }`}
      >
        <Icon size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">{highlightText(result.name)}</span>
          <span className="text-xs px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 capitalize">
            {result.type}
          </span>
        </div>

        {/* Snippet */}
        {result.snippet && (
          <p className="text-sm text-zinc-400 line-clamp-2">{highlightText(result.snippet)}</p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
          {result.folderName && (
            <span className="flex items-center gap-1">
              <Folder size={12} />
              {result.folderName}
            </span>
          )}
          {result.tags && result.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <TagIcon size={12} />
              <span>{result.tags.map((t) => t.name).join(", ")}</span>
            </div>
          )}
          <span>{new Date(result.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </button>
  )
}

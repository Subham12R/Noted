import { NextRequest, NextResponse } from "next/server"
import { db, pages, folders, tags, pageTags, files } from "@/db"
import { eq, desc, and, or, sql, ilike, inArray } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"

export interface SearchResult {
  type: "page" | "folder" | "file"
  id: string
  name: string
  snippet?: string // Text snippet with highlighted match
  folderId?: string
  folderName?: string
  tags?: { id: string; name: string; color: string }[]
  mimeType?: string // For files
  fileType?: string // For files
  url?: string // For files
  updatedAt: Date
  createdAt: Date
  matchScore: number
}

// GET /api/search - Advanced search across pages, folders, and files
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")?.trim()
    const type = searchParams.get("type") // 'all' | 'pages' | 'folders' | 'files'
    const tagIds = searchParams.get("tags")?.split(",").filter(Boolean) || []
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const sortBy = searchParams.get("sortBy") || "relevance" // 'relevance' | 'date' | 'name'
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")

    if (!query || query.length < 2) {
      return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 })
    }

    const results: SearchResult[] = []
    const searchType = type || "all"

    // Helper to extract text snippet with highlight
    function extractSnippet(content: string | null, searchQuery: string, maxLength = 150): string {
      if (!content) return ""

      // Strip HTML tags
      const plainText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

      // Find position of search query (case-insensitive)
      const lowerText = plainText.toLowerCase()
      const lowerQuery = searchQuery.toLowerCase()
      const matchIndex = lowerText.indexOf(lowerQuery)

      if (matchIndex === -1) {
        // No match in content, return beginning
        return plainText.substring(0, maxLength) + (plainText.length > maxLength ? "..." : "")
      }

      // Calculate snippet window
      const start = Math.max(0, matchIndex - 50)
      const end = Math.min(plainText.length, matchIndex + searchQuery.length + 100)

      let snippet = plainText.substring(start, end)
      if (start > 0) snippet = "..." + snippet
      if (end < plainText.length) snippet = snippet + "..."

      return snippet
    }

    // Search pages using full-text search
    if (searchType === "all" || searchType === "pages") {
      // Build date conditions
      const dateConditions = []
      if (dateFrom) {
        dateConditions.push(sql`${pages.updatedAt} >= ${new Date(dateFrom)}`)
      }
      if (dateTo) {
        dateConditions.push(sql`${pages.updatedAt} <= ${new Date(dateTo)}`)
      }

      // Full-text search query
      const tsQuery = query.split(/\s+/).join(" & ")

      let pageQuery = db
        .select({
          id: pages.id,
          name: pages.name,
          content: pages.content,
          folderId: pages.folderId,
          updatedAt: pages.updatedAt,
          createdAt: pages.createdAt,
          matchScore: sql<number>`ts_rank(
            to_tsvector('english', coalesce(${pages.name}, '') || ' ' || coalesce(${pages.content}, '')),
            plainto_tsquery('english', ${query})
          )`,
        })
        .from(pages)
        .where(
          and(
            eq(pages.ownerId, session.user.id),
            or(
              // Full-text search
              sql`to_tsvector('english', coalesce(${pages.name}, '') || ' ' || coalesce(${pages.content}, '')) @@ plainto_tsquery('english', ${query})`,
              // Fallback to ILIKE for partial matches
              ilike(pages.name, `%${query}%`),
              ilike(pages.content, `%${query}%`)
            ),
            ...dateConditions
          )
        )
        .limit(limit)
        .offset(offset)

      const pageResults = await pageQuery

      // Get folder names and tags for pages
      const pageIds = pageResults.map((p) => p.id)
      const folderIds = pageResults.map((p) => p.folderId).filter(Boolean)

      // Get folders
      const folderMap = new Map<string, string>()
      if (folderIds.length > 0) {
        const folderData = await db
          .select({ id: folders.id, name: folders.name })
          .from(folders)
          .where(inArray(folders.id, folderIds as string[]))

        folderData.forEach((f) => folderMap.set(f.id, f.name))
      }

      // Get tags for pages
      const pageTagsMap = new Map<string, { id: string; name: string; color: string }[]>()
      if (pageIds.length > 0) {
        const pageTagsData = await db
          .select({
            pageId: pageTags.pageId,
            tagId: tags.id,
            tagName: tags.name,
            tagColor: tags.color,
          })
          .from(pageTags)
          .innerJoin(tags, eq(pageTags.tagId, tags.id))
          .where(inArray(pageTags.pageId, pageIds))

        pageTagsData.forEach((pt) => {
          const existing = pageTagsMap.get(pt.pageId) || []
          existing.push({ id: pt.tagId, name: pt.tagName, color: pt.tagColor })
          pageTagsMap.set(pt.pageId, existing)
        })
      }

      // Filter by tags if specified
      let filteredPageResults = pageResults
      if (tagIds.length > 0) {
        filteredPageResults = pageResults.filter((page) => {
          const pageTags = pageTagsMap.get(page.id) || []
          return tagIds.some((tagId) => pageTags.some((t) => t.id === tagId))
        })
      }

      // Transform to SearchResult
      filteredPageResults.forEach((page) => {
        results.push({
          type: "page",
          id: page.id,
          name: page.name,
          snippet: extractSnippet(page.content, query),
          folderId: page.folderId,
          folderName: folderMap.get(page.folderId) || undefined,
          tags: pageTagsMap.get(page.id) || [],
          updatedAt: page.updatedAt,
          createdAt: page.createdAt,
          matchScore: page.matchScore || 0,
        })
      })
    }

    // Search folders
    if (searchType === "all" || searchType === "folders") {
      const folderResults = await db
        .select({
          id: folders.id,
          name: folders.name,
          color: folders.color,
          parentId: folders.parentId,
          updatedAt: folders.updatedAt,
          createdAt: folders.createdAt,
        })
        .from(folders)
        .where(
          and(
            eq(folders.ownerId, session.user.id),
            ilike(folders.name, `%${query}%`)
          )
        )
        .limit(limit)

      folderResults.forEach((folder) => {
        results.push({
          type: "folder",
          id: folder.id,
          name: folder.name,
          folderId: folder.parentId || undefined,
          updatedAt: folder.updatedAt,
          createdAt: folder.createdAt,
          matchScore: folder.name.toLowerCase().includes(query.toLowerCase()) ? 1 : 0.5,
        })
      })
    }

    // Search files
    if (searchType === "all" || searchType === "files") {
      const fileResults = await db
        .select({
          id: files.id,
          name: files.name,
          originalName: files.originalName,
          mimeType: files.mimeType,
          type: files.type,
          url: files.url,
          thumbnailUrl: files.thumbnailUrl,
          updatedAt: files.updatedAt,
          createdAt: files.createdAt,
        })
        .from(files)
        .where(
          and(
            eq(files.userId, session.user.id),
            or(
              ilike(files.name, `%${query}%`),
              ilike(files.originalName, `%${query}%`)
            )
          )
        )
        .limit(limit)

      fileResults.forEach((file) => {
        results.push({
          type: "file",
          id: file.id,
          name: file.originalName,
          mimeType: file.mimeType,
          fileType: file.type,
          url: file.url,
          updatedAt: file.updatedAt,
          createdAt: file.createdAt,
          matchScore: file.originalName.toLowerCase().includes(query.toLowerCase()) ? 1 : 0.5,
        })
      })
    }

    // Sort results
    if (sortBy === "relevance") {
      results.sort((a, b) => b.matchScore - a.matchScore)
    } else if (sortBy === "date") {
      results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    } else if (sortBy === "name") {
      results.sort((a, b) => a.name.localeCompare(b.name))
    }

    return NextResponse.json({
      query,
      results: results.slice(0, limit),
      total: results.length,
      filters: {
        type: searchType,
        tags: tagIds,
        dateFrom,
        dateTo,
        sortBy,
      },
    })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

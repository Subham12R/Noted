import { NextRequest, NextResponse } from "next/server"
import { db, pages, folders } from "@/db"
import { eq, desc, asc, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { createPageSchema, sanitizeBlocks } from "@/lib/validation"
import { rateLimitMemory, RATE_LIMITS } from "@/lib/rate-limit"
import type { Block } from "@/types/blocks"

// GET /api/pages - List pages for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const folderId = request.nextUrl.searchParams.get("folderId")
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50")
    const recent = request.nextUrl.searchParams.get("recent") === "true"

    let query = db
      .select({
        id: pages.id,
        name: pages.name,
        content: pages.content,
        folderId: pages.folderId,
        createdAt: pages.createdAt,
        updatedAt: pages.updatedAt,
        lastSavedAt: pages.lastSavedAt,
        sortOrder: pages.sortOrder,
        isPublic: pages.isPublic,
        version: pages.version,
      })
      .from(pages)
      .where(eq(pages.ownerId, session.user.id))
      .limit(limit)

    if (folderId) {
      query = db
        .select({
          id: pages.id,
          name: pages.name,
          content: pages.content,
          folderId: pages.folderId,
          createdAt: pages.createdAt,
          updatedAt: pages.updatedAt,
          lastSavedAt: pages.lastSavedAt,
          sortOrder: pages.sortOrder,
          isPublic: pages.isPublic,
          version: pages.version,
        })
        .from(pages)
        .where(and(eq(pages.ownerId, session.user.id), eq(pages.folderId, folderId)))
        .limit(limit)
    }

    const userPages = recent
      ? await db
          .select({
            id: pages.id,
            name: pages.name,
            content: pages.content,
            folderId: pages.folderId,
            createdAt: pages.createdAt,
            updatedAt: pages.updatedAt,
            lastSavedAt: pages.lastSavedAt,
            sortOrder: pages.sortOrder,
            isPublic: pages.isPublic,
            version: pages.version,
          })
          .from(pages)
          .where(eq(pages.ownerId, session.user.id))
          .orderBy(desc(pages.updatedAt))
          .limit(limit)
      : await query

    return NextResponse.json({ pages: userPages })
  } catch (error) {
    console.error("Get pages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/pages - Create a new page
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = rateLimitMemory({
      identifier: session.user.id,
      endpoint: "page-create",
      ...RATE_LIMITS.API_GENERAL,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const body = await request.json()
    const validatedData = createPageSchema.parse(body)

    // Verify folder exists and belongs to user
    const [folder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, validatedData.folderId))

    if (!folder || folder.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    // Sanitize blocks if provided and cast to the expected type
    const blocks = (validatedData.blocks ? sanitizeBlocks(validatedData.blocks) : []) as Block[]

    // Get the highest sort order for pages in this folder
    const existingPages = await db
      .select({ sortOrder: pages.sortOrder })
      .from(pages)
      .where(eq(pages.folderId, validatedData.folderId))

    const maxSortOrder = existingPages.reduce(
      (max, p) => Math.max(max, p.sortOrder),
      -1
    )

    // Create the page
    const [newPage] = await db
      .insert(pages)
      .values({
        name: validatedData.name,
        folderId: validatedData.folderId,
        ownerId: session.user.id,
        blocks,
        sortOrder: maxSortOrder + 1,
      })
      .returning()

    return NextResponse.json({ page: newPage }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 })
    }
    console.error("Create page error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

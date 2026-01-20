import { NextRequest, NextResponse } from "next/server"
import { db, pages, pageCollaborators } from "@/db"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { savePageSchema, sanitizeBlocks } from "@/lib/validation"
import { rateLimitMemory, RATE_LIMITS } from "@/lib/rate-limit"
import type { Block } from "@/types/blocks"

// Check if user can edit a page (owner or editor/admin collaborator)
async function canEditPage(pageId: string, userId: string): Promise<boolean> {
  const [page] = await db
    .select({ ownerId: pages.ownerId })
    .from(pages)
    .where(eq(pages.id, pageId))

  if (!page) {
    return false
  }

  if (page.ownerId === userId) {
    return true
  }

  const [collaborator] = await db
    .select({ role: pageCollaborators.role })
    .from(pageCollaborators)
    .where(
      and(
        eq(pageCollaborators.pageId, pageId),
        eq(pageCollaborators.userId, userId)
      )
    )

  if (collaborator && (collaborator.role === "editor" || collaborator.role === "admin")) {
    return true
  }

  return false
}

// POST /api/pages/[id]/save - Debounced save endpoint with version checking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting (10 saves per minute per page per user)
    const rateLimitResult = rateLimitMemory({
      identifier: `${session.user.id}:${id}`,
      endpoint: "page-save",
      ...RATE_LIMITS.PAGE_SAVE,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
          message: "Too many save requests. Please wait before saving again.",
        },
        { status: 429 }
      )
    }

    // Validate request body
    const body = await request.json()
    const validatedData = savePageSchema.parse(body)

    // Check if user can edit the page
    const canEdit = await canEditPage(id, session.user.id)
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get current page for version check
    const [currentPage] = await db
      .select({
        version: pages.version,
        ownerId: pages.ownerId,
      })
      .from(pages)
      .where(eq(pages.id, id))

    if (!currentPage) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    // Optimistic locking - version conflict detection
    if (currentPage.version !== validatedData.expectedVersion) {
      return NextResponse.json(
        {
          error: "Version conflict",
          currentVersion: currentPage.version,
          expectedVersion: validatedData.expectedVersion,
          message: "The page was modified by another user. Please refresh and try again.",
        },
        { status: 409 }
      )
    }

    // Sanitize blocks and cast to the expected type
    const sanitizedBlocks = sanitizeBlocks(validatedData.blocks) as Block[]

    // Update page with atomic version increment
    const newVersion = currentPage.version + 1
    const now = new Date()

    const [updatedPage] = await db
      .update(pages)
      .set({
        blocks: sanitizedBlocks,
        ydocState: validatedData.ydocState,
        version: newVersion,
        updatedAt: now,
        lastSavedAt: now,
      })
      .where(
        and(
          eq(pages.id, id),
          eq(pages.version, validatedData.expectedVersion) // Double-check version for race condition
        )
      )
      .returning({
        id: pages.id,
        version: pages.version,
        lastSavedAt: pages.lastSavedAt,
      })

    if (!updatedPage) {
      // Another request beat us to the update
      return NextResponse.json(
        {
          error: "Concurrent modification detected",
          message: "Another save happened at the same time. Please refresh and try again.",
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      version: updatedPage.version,
      savedAt: updatedPage.lastSavedAt?.toISOString(),
    })
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      )
    }
    console.error("Save page error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

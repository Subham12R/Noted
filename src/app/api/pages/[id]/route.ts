import { NextRequest, NextResponse } from "next/server"
import { db, pages, folders, pageCollaborators, folderCollaborators } from "@/db"
import { eq, and, or } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { updatePageSchema, sanitizeBlocks, sanitizeContent } from "@/lib/validation"

// Check if user has access to a page (owner, page collaborator, or folder collaborator)
async function hasPageAccess(pageId: string, userId: string): Promise<{ hasAccess: boolean; role: string | null }> {
  const [page] = await db
    .select({ ownerId: pages.ownerId, folderId: pages.folderId })
    .from(pages)
    .where(eq(pages.id, pageId))

  if (!page) {
    return { hasAccess: false, role: null }
  }

  if (page.ownerId === userId) {
    return { hasAccess: true, role: "owner" }
  }

  // Check page-level collaborator
  const [pageCollab] = await db
    .select({ role: pageCollaborators.role })
    .from(pageCollaborators)
    .where(
      and(
        eq(pageCollaborators.pageId, pageId),
        eq(pageCollaborators.userId, userId)
      )
    )

  if (pageCollab) {
    return { hasAccess: true, role: pageCollab.role }
  }

  // Check folder-level collaborator (inherited access)
  const [folderCollab] = await db
    .select({ role: folderCollaborators.role })
    .from(folderCollaborators)
    .where(
      and(
        eq(folderCollaborators.folderId, page.folderId),
        eq(folderCollaborators.userId, userId)
      )
    )

  if (folderCollab) {
    return { hasAccess: true, role: folderCollab.role }
  }

  return { hasAccess: false, role: null }
}

// GET /api/pages/[id] - Get a specific page with full content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [page] = await db.select().from(pages).where(eq(pages.id, id))

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    // Check access
    const { hasAccess, role } = await hasPageAccess(id, session.user.id)

    // Allow access if public or user has access
    if (!page.isPublic && !hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get folder info
    const [folder] = await db
      .select({ id: folders.id, name: folders.name })
      .from(folders)
      .where(eq(folders.id, page.folderId))

    return NextResponse.json({
      page: {
        ...page,
        folder: folder || null,
      },
      role: role || (page.isPublic ? "viewer" : null),
    })
  } catch (error) {
    console.error("Get page error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/pages/[id] - Update page metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updatePageSchema.parse(body)

    // Check access
    const { hasAccess, role } = await hasPageAccess(id, session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    // Only owner and admin can update certain fields
    if (role !== "owner" && role !== "admin") {
      // Editors can only update blocks and name
      if (validatedData.folderId || validatedData.isPublic !== undefined) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // If changing folder, verify the new folder exists and belongs to user
    if (validatedData.folderId) {
      const [folder] = await db
        .select()
        .from(folders)
        .where(eq(folders.id, validatedData.folderId))

      if (!folder || folder.ownerId !== session.user.id) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 })
      }
    }

    // Sanitize content and blocks if provided
    const updateData: Record<string, unknown> = { ...validatedData, updatedAt: new Date() }
    if (validatedData.content !== undefined) {
      updateData.content = sanitizeContent(validatedData.content)
    }
    if (validatedData.blocks) {
      updateData.blocks = sanitizeBlocks(validatedData.blocks)
    }

    // Update the page
    const [updatedPage] = await db
      .update(pages)
      .set(updateData)
      .where(eq(pages.id, id))
      .returning()

    return NextResponse.json({ page: updatedPage })
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 })
    }
    console.error("Update page error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/pages/[id] - Delete a page
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check ownership (only owner can delete)
    const [page] = await db.select().from(pages).where(eq(pages.id, id))

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    if (page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete the page
    await db.delete(pages).where(eq(pages.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete page error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

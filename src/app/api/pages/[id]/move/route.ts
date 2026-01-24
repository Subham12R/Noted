import { NextRequest, NextResponse } from "next/server"
import { db, pages, folders } from "@/db"
import { eq } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { z } from "zod"

const movePageSchema = z.object({
  targetFolderId: z.string().uuid("Invalid folder ID"),
})

// POST /api/pages/[id]/move - Move a page to a different folder
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

    const body = await request.json()
    const validatedData = movePageSchema.parse(body)

    // Get the page and verify ownership
    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, id))

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    if (page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // If moving to the same folder, just return success
    if (page.folderId === validatedData.targetFolderId) {
      return NextResponse.json({ page })
    }

    // Verify target folder exists and belongs to user
    const [targetFolder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, validatedData.targetFolderId))

    if (!targetFolder) {
      return NextResponse.json({ error: "Target folder not found" }, { status: 404 })
    }

    if (targetFolder.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get the highest sort order in the target folder
    const existingPages = await db
      .select({ sortOrder: pages.sortOrder })
      .from(pages)
      .where(eq(pages.folderId, validatedData.targetFolderId))

    const maxSortOrder = existingPages.reduce(
      (max, p) => Math.max(max, p.sortOrder),
      -1
    )

    // Move the page
    const [updatedPage] = await db
      .update(pages)
      .set({
        folderId: validatedData.targetFolderId,
        sortOrder: maxSortOrder + 1,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, id))
      .returning()

    return NextResponse.json({ page: updatedPage })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 })
    }
    console.error("Move page error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

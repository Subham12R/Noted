import { NextRequest, NextResponse } from "next/server"
import { db, files } from "@/db"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"

// GET /api/files/[id] - Get file details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, session.user.id)))

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Update last accessed time
    await db
      .update(files)
      .set({ accessedAt: new Date() })
      .where(eq(files.id, id))

    return NextResponse.json({ file })
  } catch (error) {
    console.error("Get file error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/files/[id] - Update file metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify file exists and belongs to user
    const [existingFile] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, session.user.id)))

    if (!existingFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Build update object
    const updates: Partial<typeof files.$inferInsert> = {}

    if (body.name !== undefined) {
      updates.name = body.name
    }

    if (body.folderId !== undefined) {
      updates.folderId = body.folderId
    }

    if (body.isStarred !== undefined) {
      updates.isStarred = body.isStarred
    }

    if (body.pageId !== undefined) {
      updates.pageId = body.pageId
    }

    updates.updatedAt = new Date()

    // Update file
    const [updatedFile] = await db
      .update(files)
      .set(updates)
      .where(eq(files.id, id))
      .returning()

    return NextResponse.json({ file: updatedFile })
  } catch (error) {
    console.error("Update file error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/files/[id] - Delete file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify file exists and belongs to user
    const [existingFile] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, session.user.id)))

    if (!existingFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // TODO: Delete from storage (S3/R2/etc.)
    // For now, we just delete the database record

    // Delete file record
    await db.delete(files).where(eq(files.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete file error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

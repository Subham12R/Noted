import { NextRequest, NextResponse } from "next/server"
import { db, folders, pages } from "@/db"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { updateFolderSchema } from "@/lib/validation"

// GET /api/folders/[id] - Get a specific folder with its pages
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

    const [folder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, id))

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    if (folder.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get pages in this folder
    const folderPages = await db
      .select({
        id: pages.id,
        name: pages.name,
        createdAt: pages.createdAt,
        updatedAt: pages.updatedAt,
        sortOrder: pages.sortOrder,
      })
      .from(pages)
      .where(eq(pages.folderId, id))

    // Get child folders
    const childFolders = await db
      .select()
      .from(folders)
      .where(eq(folders.parentId, id))

    return NextResponse.json({
      folder,
      pages: folderPages,
      childFolders,
    })
  } catch (error) {
    console.error("Get folder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/folders/[id] - Update a folder
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
    const validatedData = updateFolderSchema.parse(body)

    // Check ownership
    const [existingFolder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, id))

    if (!existingFolder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    if (existingFolder.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // If changing parent, verify the new parent exists and belongs to user
    if (validatedData.parentId !== undefined && validatedData.parentId !== null) {
      // Prevent setting self as parent
      if (validatedData.parentId === id) {
        return NextResponse.json({ error: "Cannot set folder as its own parent" }, { status: 400 })
      }

      const [parentFolder] = await db
        .select()
        .from(folders)
        .where(eq(folders.id, validatedData.parentId))

      if (!parentFolder || parentFolder.ownerId !== session.user.id) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 })
      }
    }

    // Update the folder
    const [updatedFolder] = await db
      .update(folders)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(folders.id, id))
      .returning()

    return NextResponse.json({ folder: updatedFolder })
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 })
    }
    console.error("Update folder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/folders/[id] - Delete a folder
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

    // Check ownership
    const [existingFolder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, id))

    if (!existingFolder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    if (existingFolder.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete the folder (cascades to pages and child folders due to schema constraints)
    await db.delete(folders).where(eq(folders.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete folder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

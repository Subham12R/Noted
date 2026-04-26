import { NextRequest, NextResponse } from "next/server"
import { db, files } from "@/db"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { rateLimitMemory, RATE_LIMITS } from "@/lib/rate-limit"
import { deleteFile, isR2Configured } from "@/lib/storage/r2"
import { z } from "zod"

const SAFE_FILE_COLUMNS = {
  id: files.id,
  userId: files.userId,
  pageId: files.pageId,
  folderId: files.folderId,
  name: files.name,
  originalName: files.originalName,
  mimeType: files.mimeType,
  size: files.size,
  url: files.url,
  thumbnailUrl: files.thumbnailUrl,
  type: files.type,
  isStarred: files.isStarred,
  accessedAt: files.accessedAt,
  createdAt: files.createdAt,
  updatedAt: files.updatedAt,
  // storageKey intentionally omitted — internal storage path, not for clients
}

const patchFileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  folderId: z.string().uuid().nullable().optional(),
  pageId: z.string().uuid().nullable().optional(),
  isStarred: z.boolean().optional(),
})

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
      .select(SAFE_FILE_COLUMNS)
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, session.user.id)))

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Update last accessed time
    await db
      .update(files)
      .set({ accessedAt: new Date() })
      .where(and(eq(files.id, id), eq(files.userId, session.user.id)))

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

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "file-patch", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, { status: 429 })
    }

    const { id } = await params
    const body = await request.json()
    const updates = patchFileSchema.parse(body)

    // Verify file exists and belongs to user
    const [existingFile] = await db
      .select({ id: files.id })
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, session.user.id)))

    if (!existingFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Update file — WHERE includes userId to prevent TOCTOU
    const [updatedFile] = await db
      .update(files)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(files.id, id), eq(files.userId, session.user.id)))
      .returning(SAFE_FILE_COLUMNS)

    return NextResponse.json({ file: updatedFile })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 })
    }
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

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "file-delete", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, { status: 429 })
    }

    const { id } = await params

    // Verify file exists and belongs to user — fetch storageKey for R2 cleanup
    const [existingFile] = await db
      .select({ id: files.id, storageKey: files.storageKey })
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, session.user.id)))

    if (!existingFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Delete from R2 storage first
    if (isR2Configured() && existingFile.storageKey) {
      try {
        await deleteFile(existingFile.storageKey)
      } catch (storageErr) {
        console.error("Failed to delete file from R2:", storageErr)
        // Continue with DB deletion even if R2 cleanup fails
      }
    }

    await db.delete(files).where(and(eq(files.id, id), eq(files.userId, session.user.id)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete file error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

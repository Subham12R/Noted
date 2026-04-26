import { NextRequest, NextResponse } from "next/server"
import { db, tags, pageTags, folderTags } from "@/db"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { rateLimitMemory, RATE_LIMITS } from "@/lib/rate-limit"
import { z } from "zod"

// Validation schema
const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  parentId: z.string().uuid().nullable().optional(),
})

// GET /api/tags/[id] - Get tag details
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

    const [tag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, session.user.id)))

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 })
    }

    return NextResponse.json({ tag })
  } catch (error) {
    console.error("Get tag error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/tags/[id] - Update tag
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "tag-update", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, { status: 429 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateTagSchema.parse(body)

    // Verify tag exists and belongs to user
    const [existingTag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, session.user.id)))

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 })
    }

    // Check for name uniqueness if name is being updated
    if (validatedData.name && validatedData.name !== existingTag.name) {
      const [duplicateTag] = await db
        .select()
        .from(tags)
        .where(and(eq(tags.userId, session.user.id), eq(tags.name, validatedData.name)))

      if (duplicateTag) {
        return NextResponse.json({ error: "Tag with this name already exists" }, { status: 409 })
      }
    }

    // Verify parent tag if provided
    if (validatedData.parentId) {
      // Prevent self-reference
      if (validatedData.parentId === id) {
        return NextResponse.json({ error: "Tag cannot be its own parent" }, { status: 400 })
      }

      const [parentTag] = await db
        .select()
        .from(tags)
        .where(and(eq(tags.id, validatedData.parentId), eq(tags.userId, session.user.id)))

      if (!parentTag) {
        return NextResponse.json({ error: "Parent tag not found" }, { status: 404 })
      }
    }

    // Build update object
    const updates: Partial<typeof tags.$inferInsert> = {}

    if (validatedData.name !== undefined) {
      updates.name = validatedData.name
    }

    if (validatedData.color !== undefined) {
      updates.color = validatedData.color
    }

    if (validatedData.parentId !== undefined) {
      updates.parentId = validatedData.parentId
    }

    updates.updatedAt = new Date()

    // Update tag
    const [updatedTag] = await db
      .update(tags)
      .set(updates)
      .where(and(eq(tags.id, id), eq(tags.userId, session.user.id)))
      .returning()

    return NextResponse.json({ tag: updatedTag })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 })
    }
    console.error("Update tag error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/tags/[id] - Delete tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "tag-delete", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, { status: 429 })
    }

    const { id } = await params

    // Verify tag exists and belongs to user
    const [existingTag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, session.user.id)))

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 })
    }

    // Delete tag (cascade will handle page_tags and folder_tags)
    await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, session.user.id)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete tag error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

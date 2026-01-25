import { NextRequest, NextResponse } from "next/server"
import { db, tags, pageTags, folderTags } from "@/db"
import { eq, desc, and, sql, ilike } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { z } from "zod"

// Validation schema
const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#6366f1"),
  parentId: z.string().uuid().optional(),
})

// GET /api/tags - List tags for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")

    // Build query conditions
    const conditions = [eq(tags.userId, session.user.id)]

    if (search) {
      conditions.push(ilike(tags.name, `%${search}%`))
    }

    // Query tags with usage counts
    const userTags = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        parentId: tags.parentId,
        createdAt: tags.createdAt,
        updatedAt: tags.updatedAt,
        pageCount: sql<number>`(
          SELECT COUNT(*) FROM page_tags WHERE page_tags.tag_id = tags.id
        )::int`,
        folderCount: sql<number>`(
          SELECT COUNT(*) FROM folder_tags WHERE folder_tags.tag_id = tags.id
        )::int`,
      })
      .from(tags)
      .where(and(...conditions))
      .orderBy(tags.name)

    return NextResponse.json({ tags: userTags })
  } catch (error) {
    console.error("Get tags error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createTagSchema.parse(body)

    // Check if tag with same name already exists for this user
    const [existingTag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.userId, session.user.id), eq(tags.name, validatedData.name)))

    if (existingTag) {
      return NextResponse.json({ error: "Tag with this name already exists" }, { status: 409 })
    }

    // Verify parent tag exists if provided
    if (validatedData.parentId) {
      const [parentTag] = await db
        .select()
        .from(tags)
        .where(and(eq(tags.id, validatedData.parentId), eq(tags.userId, session.user.id)))

      if (!parentTag) {
        return NextResponse.json({ error: "Parent tag not found" }, { status: 404 })
      }
    }

    // Create tag
    const [newTag] = await db
      .insert(tags)
      .values({
        userId: session.user.id,
        name: validatedData.name,
        color: validatedData.color,
        parentId: validatedData.parentId || null,
      })
      .returning()

    return NextResponse.json({ tag: newTag }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 })
    }
    console.error("Create tag error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

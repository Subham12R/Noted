import { NextRequest, NextResponse } from "next/server"
import { db, pages, tags, pageTags } from "@/db"
import { eq, and, inArray } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { z } from "zod"

// Validation schema
const updatePageTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()),
})

// GET /api/pages/[id]/tags - Get tags for a page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: pageId } = await params

    // Verify page exists and user has access
    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, pageId))

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    // Check if user owns the page or is a collaborator
    if (page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get tags for this page
    const pageTagsData = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        parentId: tags.parentId,
      })
      .from(pageTags)
      .innerJoin(tags, eq(pageTags.tagId, tags.id))
      .where(eq(pageTags.pageId, pageId))
      .orderBy(tags.name)

    return NextResponse.json({ tags: pageTagsData })
  } catch (error) {
    console.error("Get page tags error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/pages/[id]/tags - Update tags for a page (replace all)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: pageId } = await params
    const body = await request.json()
    const validatedData = updatePageTagsSchema.parse(body)

    // Verify page exists and user owns it
    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, pageId))

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    if (page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Verify all tags exist and belong to user
    if (validatedData.tagIds.length > 0) {
      const userTags = await db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.userId, session.user.id), inArray(tags.id, validatedData.tagIds)))

      if (userTags.length !== validatedData.tagIds.length) {
        return NextResponse.json({ error: "One or more tags not found" }, { status: 404 })
      }
    }

    // Delete existing page tags
    await db.delete(pageTags).where(eq(pageTags.pageId, pageId))

    // Insert new page tags
    if (validatedData.tagIds.length > 0) {
      await db.insert(pageTags).values(
        validatedData.tagIds.map((tagId) => ({
          pageId,
          tagId,
        }))
      )
    }

    // Return updated tags
    const updatedTags = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        parentId: tags.parentId,
      })
      .from(pageTags)
      .innerJoin(tags, eq(pageTags.tagId, tags.id))
      .where(eq(pageTags.pageId, pageId))
      .orderBy(tags.name)

    return NextResponse.json({ tags: updatedTags })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 })
    }
    console.error("Update page tags error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/pages/[id]/tags - Add a tag to a page
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: pageId } = await params
    const body = await request.json()
    const { tagId } = body

    if (!tagId) {
      return NextResponse.json({ error: "tagId is required" }, { status: 400 })
    }

    // Verify page exists and user owns it
    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, pageId))

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    if (page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Verify tag exists and belongs to user
    const [tag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, session.user.id)))

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 })
    }

    // Check if already tagged
    const [existingPageTag] = await db
      .select()
      .from(pageTags)
      .where(and(eq(pageTags.pageId, pageId), eq(pageTags.tagId, tagId)))

    if (existingPageTag) {
      return NextResponse.json({ error: "Page already has this tag" }, { status: 409 })
    }

    // Add tag
    await db.insert(pageTags).values({ pageId, tagId })

    return NextResponse.json({ success: true, tag })
  } catch (error) {
    console.error("Add page tag error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/pages/[id]/tags - Remove a tag from a page
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: pageId } = await params
    const tagId = request.nextUrl.searchParams.get("tagId")

    if (!tagId) {
      return NextResponse.json({ error: "tagId is required" }, { status: 400 })
    }

    // Verify page exists and user owns it
    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, pageId))

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    if (page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Remove tag
    await db
      .delete(pageTags)
      .where(and(eq(pageTags.pageId, pageId), eq(pageTags.tagId, tagId)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Remove page tag error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

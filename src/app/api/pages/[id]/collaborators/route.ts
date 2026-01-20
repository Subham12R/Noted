import { NextRequest, NextResponse } from "next/server"
import { db, pages, pageCollaborators, users } from "@/db"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { addCollaboratorSchema } from "@/lib/validation"

// GET /api/pages/[id]/collaborators - List collaborators
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

    // Check if user has access to this page
    const [page] = await db
      .select({ ownerId: pages.ownerId })
      .from(pages)
      .where(eq(pages.id, id))

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    // Check access
    const isOwner = page.ownerId === session.user.id
    const [isCollaborator] = await db
      .select()
      .from(pageCollaborators)
      .where(
        and(
          eq(pageCollaborators.pageId, id),
          eq(pageCollaborators.userId, session.user.id)
        )
      )

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get owner info
    const [owner] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.image,
      })
      .from(users)
      .where(eq(users.id, page.ownerId))

    // Get collaborators with user info
    const collaborators = await db
      .select({
        id: pageCollaborators.id,
        role: pageCollaborators.role,
        createdAt: pageCollaborators.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.image,
        },
      })
      .from(pageCollaborators)
      .innerJoin(users, eq(pageCollaborators.userId, users.id))
      .where(eq(pageCollaborators.pageId, id))

    return NextResponse.json({
      owner: { ...owner, role: "owner" },
      collaborators,
    })
  } catch (error) {
    console.error("Get collaborators error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/pages/[id]/collaborators - Add a collaborator
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
    const validatedData = addCollaboratorSchema.parse(body)

    // Only owner can add collaborators
    const [page] = await db
      .select({ ownerId: pages.ownerId })
      .from(pages)
      .where(eq(pages.id, id))

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    if (page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if user exists
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, validatedData.userId))

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Can't add owner as collaborator
    if (validatedData.userId === page.ownerId) {
      return NextResponse.json({ error: "Cannot add owner as collaborator" }, { status: 400 })
    }

    // Check if already a collaborator
    const [existing] = await db
      .select()
      .from(pageCollaborators)
      .where(
        and(
          eq(pageCollaborators.pageId, id),
          eq(pageCollaborators.userId, validatedData.userId)
        )
      )

    if (existing) {
      // Update role if different
      if (existing.role !== validatedData.role) {
        await db
          .update(pageCollaborators)
          .set({ role: validatedData.role })
          .where(eq(pageCollaborators.id, existing.id))
      }
      return NextResponse.json({ message: "Collaborator updated" })
    }

    // Add collaborator
    const [newCollaborator] = await db
      .insert(pageCollaborators)
      .values({
        pageId: id,
        userId: validatedData.userId,
        role: validatedData.role,
      })
      .returning()

    return NextResponse.json({ collaborator: newCollaborator }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 })
    }
    console.error("Add collaborator error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/pages/[id]/collaborators - Remove a collaborator
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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Only owner can remove collaborators (or user can remove themselves)
    const [page] = await db
      .select({ ownerId: pages.ownerId })
      .from(pages)
      .where(eq(pages.id, id))

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    const isOwner = page.ownerId === session.user.id
    const isSelf = userId === session.user.id

    if (!isOwner && !isSelf) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Remove collaborator
    await db
      .delete(pageCollaborators)
      .where(
        and(
          eq(pageCollaborators.pageId, id),
          eq(pageCollaborators.userId, userId)
        )
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Remove collaborator error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

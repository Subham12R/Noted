import { NextRequest, NextResponse } from "next/server"
import { db, pages, shareLinks, pageCollaborators, users } from "@/db"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { z } from "zod"
import { randomBytes } from "crypto"

const shareSettingsSchema = z.object({
  isPublic: z.boolean().optional(),
  permission: z.enum(["view", "edit"]).optional(),
  expiresIn: z.number().optional(), // hours
  password: z.string().optional(),
})

function generateToken(): string {
  return randomBytes(32).toString("hex")
}

// GET /api/pages/[id]/share - Get share settings, links, and collaborators
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

    const [page] = await db
      .select({
        id: pages.id,
        name: pages.name,
        ownerId: pages.ownerId,
        isPublic: pages.isPublic,
      })
      .from(pages)
      .where(eq(pages.id, id))

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    // Check access - owner or collaborator can see share settings
    const isOwner = page.ownerId === session.user.id
    const [collaborator] = await db
      .select()
      .from(pageCollaborators)
      .where(
        and(
          eq(pageCollaborators.pageId, id),
          eq(pageCollaborators.userId, session.user.id)
        )
      )

    if (!isOwner && !collaborator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get owner info
    const [owner] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, page.ownerId))

    // Get active share links
    const links = await db
      .select({
        id: shareLinks.id,
        token: shareLinks.token,
        permission: shareLinks.permission,
        expiresAt: shareLinks.expiresAt,
        viewCount: shareLinks.viewCount,
        hasPassword: shareLinks.password,
        createdAt: shareLinks.createdAt,
      })
      .from(shareLinks)
      .where(eq(shareLinks.pageId, id))

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
          image: users.image,
        },
      })
      .from(pageCollaborators)
      .innerJoin(users, eq(pageCollaborators.userId, users.id))
      .where(eq(pageCollaborators.pageId, id))

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    return NextResponse.json({
      pageId: id,
      pageName: page.name,
      isPublic: page.isPublic,
      isOwner,
      currentUserRole: isOwner ? "owner" : collaborator?.role,
      owner: { ...owner, role: "owner" },
      collaborators,
      shareLinks: links.map((link) => ({
        ...link,
        hasPassword: !!link.hasPassword,
        url: `${baseUrl}/share/${link.token}`,
        isExpired: link.expiresAt ? new Date(link.expiresAt) < new Date() : false,
      })),
    })
  } catch (error) {
    console.error("Get share settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/pages/[id]/share - Create a new share link
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
    const { permission = "view", expiresIn, password } = shareSettingsSchema.parse(body)

    // Check ownership or admin role
    const [page] = await db
      .select({ ownerId: pages.ownerId })
      .from(pages)
      .where(eq(pages.id, id))

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    const isOwner = page.ownerId === session.user.id
    const [collaborator] = await db
      .select({ role: pageCollaborators.role })
      .from(pageCollaborators)
      .where(
        and(
          eq(pageCollaborators.pageId, id),
          eq(pageCollaborators.userId, session.user.id)
        )
      )

    if (!isOwner && collaborator?.role !== "admin") {
      return NextResponse.json({ error: "Only owners and admins can create share links" }, { status: 403 })
    }

    const token = generateToken()
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000) : null

    const [newLink] = await db
      .insert(shareLinks)
      .values({
        pageId: id,
        token,
        createdBy: session.user.id,
        permission,
        password: password || null,
        expiresAt,
      })
      .returning()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    return NextResponse.json({
      id: newLink.id,
      token: newLink.token,
      permission: newLink.permission,
      expiresAt: newLink.expiresAt,
      hasPassword: !!newLink.password,
      url: `${baseUrl}/share/${newLink.token}`,
      createdAt: newLink.createdAt,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 })
    }
    console.error("Create share link error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/pages/[id]/share - Update share settings (make public/private)
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
    const validatedData = shareSettingsSchema.parse(body)

    // Check ownership
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

    // Update share settings
    const [updatedPage] = await db
      .update(pages)
      .set({
        isPublic: validatedData.isPublic,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, id))
      .returning({
        id: pages.id,
        isPublic: pages.isPublic,
      })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    return NextResponse.json({
      isPublic: updatedPage.isPublic,
      shareLink: `${baseUrl}/note/${id}`,
      message: validatedData.isPublic
        ? "Page is now public. Anyone with the link can view it."
        : "Page is now private. Only you and collaborators can access it.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 })
    }
    console.error("Update share settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/pages/[id]/share - Delete a share link
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
    const linkId = searchParams.get("linkId")

    if (!linkId) {
      return NextResponse.json({ error: "linkId is required" }, { status: 400 })
    }

    // Check ownership
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

    await db
      .delete(shareLinks)
      .where(and(eq(shareLinks.id, linkId), eq(shareLinks.pageId, id)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete share link error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

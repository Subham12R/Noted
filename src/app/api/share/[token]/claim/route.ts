import { NextRequest, NextResponse } from "next/server"
import { db, shareLinks, pages, pageCollaborators } from "@/db"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import bcrypt from "bcryptjs"

// POST /api/share/[token]/claim - Claim access to a shared page (adds user as collaborator)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { token } = await params

    // Check for password in request body
    const body = await request.json().catch(() => ({}))
    const providedPassword = body.password

    // Find the share link
    const [link] = await db
      .select({
        id: shareLinks.id,
        pageId: shareLinks.pageId,
        permission: shareLinks.permission,
        expiresAt: shareLinks.expiresAt,
        password: shareLinks.password,
      })
      .from(shareLinks)
      .where(eq(shareLinks.token, token))

    if (!link) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 })
    }

    // Check if expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return NextResponse.json({ error: "This share link has expired" }, { status: 410 })
    }

    // Check if password protected
    if (link.password) {
      if (!providedPassword) {
        return NextResponse.json(
          { error: "Password required", requiresPassword: true },
          { status: 401 }
        )
      }
      const isValid = await bcrypt.compare(providedPassword, link.password)
      if (!isValid) {
        return NextResponse.json(
          { error: "Incorrect password", requiresPassword: true },
          { status: 401 }
        )
      }
    }

    // Get the page to check ownership
    const [page] = await db
      .select({
        id: pages.id,
        ownerId: pages.ownerId,
      })
      .from(pages)
      .where(eq(pages.id, link.pageId))

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    // Don't add owner as collaborator
    if (page.ownerId === session.user.id) {
      return NextResponse.json({
        success: true,
        message: "You own this page",
        pageId: page.id,
        role: "owner",
      })
    }

    // Check if user is already a collaborator
    const [existingCollab] = await db
      .select({ id: pageCollaborators.id, role: pageCollaborators.role })
      .from(pageCollaborators)
      .where(
        and(
          eq(pageCollaborators.pageId, link.pageId),
          eq(pageCollaborators.userId, session.user.id)
        )
      )

    // Map share link permission to collaborator role
    const role = link.permission === "edit" ? "editor" : "viewer"

    if (existingCollab) {
      // Update role if share link has higher permission
      if (link.permission === "edit" && existingCollab.role === "viewer") {
        await db
          .update(pageCollaborators)
          .set({ role: "editor" })
          .where(eq(pageCollaborators.id, existingCollab.id))

        return NextResponse.json({
          success: true,
          message: "Access upgraded to editor",
          pageId: page.id,
          role: "editor",
        })
      }

      return NextResponse.json({
        success: true,
        message: "You already have access to this page",
        pageId: page.id,
        role: existingCollab.role,
      })
    }

    // Add user as collaborator
    await db.insert(pageCollaborators).values({
      pageId: link.pageId,
      userId: session.user.id,
      role,
    })

    return NextResponse.json({
      success: true,
      message: `Access granted as ${role}`,
      pageId: page.id,
      role,
    })
  } catch (error) {
    console.error("Claim share link error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

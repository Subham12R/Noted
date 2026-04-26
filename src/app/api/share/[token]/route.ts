import { NextRequest, NextResponse } from "next/server"
import { db, shareLinks, pages, users } from "@/db"
import { eq, sql } from "drizzle-orm"
import bcrypt from "bcryptjs"

// GET /api/share/[token] - Get shared page content by token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

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
      const providedPassword = request.headers.get("X-Share-Password")
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

    // Get the page content
    const [page] = await db
      .select({
        id: pages.id,
        name: pages.name,
        content: pages.content,
        ownerId: pages.ownerId,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(eq(pages.id, link.pageId))

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    // Get owner info
    const [owner] = await db
      .select({
        name: users.name,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, page.ownerId))

    // Increment view count
    await db
      .update(shareLinks)
      .set({
        viewCount: sql`${shareLinks.viewCount} + 1`,
        lastAccessedAt: new Date(),
      })
      .where(eq(shareLinks.id, link.id))

    return NextResponse.json({
      page: {
        id: page.id,
        name: page.name,
        content: page.content,
        updatedAt: page.updatedAt,
      },
      owner: {
        name: owner?.name || "Unknown",
        image: owner?.image,
      },
      permission: link.permission,
    })
  } catch (error) {
    console.error("Get shared page error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

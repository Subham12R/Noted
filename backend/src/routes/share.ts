import { Hono } from "hono"
import { db, shareLinks, pages, users, pageCollaborators } from "../db/index.js"
import { eq, and, sql } from "drizzle-orm"
import { getServerSession } from "../lib/auth-utils.js"
import bcrypt from "bcryptjs"

const app = new Hono()

// GET /share/:token — public view of shared page
app.get("/:token", async (c) => {
  try {
    const token = c.req.param("token")

    const [link] = await db.select({
      id: shareLinks.id, pageId: shareLinks.pageId, permission: shareLinks.permission,
      expiresAt: shareLinks.expiresAt, password: shareLinks.password,
    }).from(shareLinks).where(eq(shareLinks.token, token))

    if (!link) return c.json({ error: "Share link not found" }, 404)
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return c.json({ error: "This share link has expired" }, 410)

    if (link.password) {
      const provided = c.req.header("X-Share-Password")
      if (!provided) return c.json({ error: "Password required", requiresPassword: true }, 401)
      const isValid = await bcrypt.compare(provided, link.password)
      if (!isValid) return c.json({ error: "Incorrect password", requiresPassword: true }, 401)
    }

    const [page] = await db.select({ id: pages.id, name: pages.name, content: pages.content, ownerId: pages.ownerId, updatedAt: pages.updatedAt }).from(pages).where(eq(pages.id, link.pageId))
    if (!page) return c.json({ error: "Page not found" }, 404)

    const [owner] = await db.select({ name: users.name, image: users.image }).from(users).where(eq(users.id, page.ownerId))

    await db.update(shareLinks).set({ viewCount: sql`${shareLinks.viewCount} + 1`, lastAccessedAt: new Date() }).where(eq(shareLinks.id, link.id))

    return c.json({
      page: { id: page.id, name: page.name, content: page.content, updatedAt: page.updatedAt },
      owner: { name: owner?.name || "Unknown", image: owner?.image },
      permission: link.permission,
    })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// POST /share/:token/claim — add as collaborator
app.post("/:token/claim", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const token = c.req.param("token")
    const body = await c.req.json().catch(() => ({}))

    const [link] = await db.select({
      id: shareLinks.id, pageId: shareLinks.pageId, permission: shareLinks.permission,
      expiresAt: shareLinks.expiresAt, password: shareLinks.password,
    }).from(shareLinks).where(eq(shareLinks.token, token))

    if (!link) return c.json({ error: "Share link not found" }, 404)
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return c.json({ error: "This share link has expired" }, 410)

    if (link.password) {
      if (!body.password) return c.json({ error: "Password required", requiresPassword: true }, 401)
      const isValid = await bcrypt.compare(body.password, link.password)
      if (!isValid) return c.json({ error: "Incorrect password", requiresPassword: true }, 401)
    }

    const [page] = await db.select({ id: pages.id, ownerId: pages.ownerId }).from(pages).where(eq(pages.id, link.pageId))
    if (!page) return c.json({ error: "Page not found" }, 404)

    if (page.ownerId === session.user.id) return c.json({ success: true, message: "You own this page", pageId: page.id, role: "owner" })

    const [existing] = await db.select({ id: pageCollaborators.id, role: pageCollaborators.role }).from(pageCollaborators).where(and(eq(pageCollaborators.pageId, link.pageId), eq(pageCollaborators.userId, session.user.id)))
    const role = link.permission === "edit" ? "editor" : "viewer"

    if (existing) {
      if (link.permission === "edit" && existing.role === "viewer") {
        await db.update(pageCollaborators).set({ role: "editor" }).where(eq(pageCollaborators.id, existing.id))
        return c.json({ success: true, message: "Access upgraded to editor", pageId: page.id, role: "editor" })
      }
      return c.json({ success: true, message: "You already have access", pageId: page.id, role: existing.role })
    }

    await db.insert(pageCollaborators).values({ pageId: link.pageId, userId: session.user.id, role })
    return c.json({ success: true, message: `Access granted as ${role}`, pageId: page.id, role })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

export default app

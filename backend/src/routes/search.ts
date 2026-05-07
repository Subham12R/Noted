import { Hono } from "hono"
import { db, pages, folders } from "../db/index.js"
import { eq, and, ilike, or } from "drizzle-orm"
import { getServerSession } from "../lib/auth-utils.js"

const app = new Hono()

app.get("/", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const q = c.req.query("q")?.trim()
    if (!q || q.length < 2) return c.json({ pages: [], folders: [] })

    const searchPattern = `%${q}%`

    const matchedPages = await db.select({
      id: pages.id, name: pages.name, folderId: pages.folderId,
      updatedAt: pages.updatedAt, createdAt: pages.createdAt,
    }).from(pages).where(and(eq(pages.ownerId, session.user.id), ilike(pages.name, searchPattern))).limit(20)

    const matchedFolders = await db.select({
      id: folders.id, name: folders.name, color: folders.color,
      updatedAt: folders.updatedAt, createdAt: folders.createdAt,
    }).from(folders).where(and(eq(folders.ownerId, session.user.id), ilike(folders.name, searchPattern))).limit(10)

    return c.json({ pages: matchedPages, folders: matchedFolders })
  } catch {
    return c.json({ error: "Internal server error" }, 500)
  }
})

export default app

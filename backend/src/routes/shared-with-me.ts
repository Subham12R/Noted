import { Hono } from "hono"
import { db, pages, folders, pageCollaborators, folderCollaborators, users, shareLinks } from "../db/index.js"
import { eq, and, or, isNull, gt } from "drizzle-orm"
import { getServerSession } from "../lib/auth-utils.js"

const app = new Hono()

app.get("/", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const sharedPages = await db.select({
      id: pages.id,
      name: pages.name,
      content: pages.content,
      folderId: pages.folderId,
      ownerId: pages.ownerId,
      updatedAt: pages.updatedAt,
      role: pageCollaborators.role,
      sharedAt: pageCollaborators.createdAt,
      ownerName: users.name,
      ownerEmail: users.email,
      ownerImage: users.image,
    }).from(pageCollaborators)
      .innerJoin(pages, eq(pageCollaborators.pageId, pages.id))
      .innerJoin(users, eq(pages.ownerId, users.id))
      .where(eq(pageCollaborators.userId, session.user.id))

    return c.json({ pages: sharedPages, folders: [] })
  } catch {
    return c.json({ error: "Internal server error" }, 500)
  }
})

app.delete("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const id = c.req.param("id")
    await db.delete(pageCollaborators).where(and(eq(pageCollaborators.pageId, id), eq(pageCollaborators.userId, session.user.id)))
    return c.json({ success: true })
  } catch {
    return c.json({ error: "Internal server error" }, 500)
  }
})

export default app

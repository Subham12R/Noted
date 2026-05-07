import { Hono } from "hono"
import { db, folders, pages } from "../db/index.js"
import { eq, and, asc } from "drizzle-orm"
import { getServerSession } from "../lib/auth-utils.js"
import { rateLimitMemory, RATE_LIMITS } from "../lib/rate-limit.js"
import { createFolderSchema, updateFolderSchema } from "../lib/validation.js"
import { canCreateFolder } from "../lib/subscription.js"
import { z } from "zod"

const app = new Hono()

app.get("/", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const parentId = c.req.query("parentId")
    const userFolders = await db.select().from(folders).where(eq(folders.ownerId, session.user.id)).orderBy(asc(folders.sortOrder), asc(folders.createdAt))

    if (parentId) {
      const filtered = userFolders.filter(f => parentId === "null" ? f.parentId === null : f.parentId === parentId)
      return c.json({ folders: filtered })
    }
    return c.json({ folders: userFolders })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

app.post("/", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "folder-create", ...RATE_LIMITS.FOLDER_CREATE })
    if (!rl.success) return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429)

    const limitCheck = await canCreateFolder(session.user.id)
    if (!limitCheck.allowed) return c.json({ error: "Limit reached", message: limitCheck.reason, code: "FOLDER_LIMIT_REACHED" }, 403)

    const body = await c.req.json()
    const validatedData = createFolderSchema.parse(body)

    if (validatedData.parentId) {
      const [parent] = await db.select().from(folders).where(eq(folders.id, validatedData.parentId))
      if (!parent || parent.ownerId !== session.user.id) return c.json({ error: "Parent folder not found" }, 404)
    }

    const existing = await db.select({ sortOrder: folders.sortOrder }).from(folders).where(eq(folders.ownerId, session.user.id))
    const maxSort = existing.reduce((m, f) => Math.max(m, f.sortOrder), -1)

    const [folder] = await db.insert(folders).values({
      name: validatedData.name, ownerId: session.user.id,
      parentId: validatedData.parentId || null, color: validatedData.color || null, sortOrder: maxSort + 1,
    }).returning()
    return c.json({ folder }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Validation failed", details: error.issues }, 400)
    return c.json({ error: "Internal server error" }, 500)
  }
})

app.get("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)
    const id = c.req.param("id")

    const [folder] = await db.select().from(folders).where(eq(folders.id, id))
    if (!folder) return c.json({ error: "Folder not found" }, 404)
    if (folder.ownerId !== session.user.id) return c.json({ error: "Forbidden" }, 403)

    const folderPages = await db.select({ id: pages.id, name: pages.name, createdAt: pages.createdAt, updatedAt: pages.updatedAt, sortOrder: pages.sortOrder }).from(pages).where(eq(pages.folderId, id))
    const childFolders = await db.select().from(folders).where(eq(folders.parentId, id))
    return c.json({ folder, pages: folderPages, childFolders })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

app.put("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "folder-update", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded" }, 429)

    const id = c.req.param("id")
    const [folder] = await db.select().from(folders).where(eq(folders.id, id))
    if (!folder) return c.json({ error: "Folder not found" }, 404)
    if (folder.ownerId !== session.user.id) return c.json({ error: "Forbidden" }, 403)

    const body = await c.req.json()
    const validatedData = updateFolderSchema.parse(body)
    const [updated] = await db.update(folders).set({ ...validatedData, updatedAt: new Date() }).where(eq(folders.id, id)).returning()
    return c.json({ folder: updated })
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Validation failed", details: error.issues }, 400)
    return c.json({ error: "Internal server error" }, 500)
  }
})

app.delete("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "folder-delete", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded" }, 429)

    const id = c.req.param("id")
    const [folder] = await db.select().from(folders).where(eq(folders.id, id))
    if (!folder) return c.json({ error: "Folder not found" }, 404)
    if (folder.ownerId !== session.user.id) return c.json({ error: "Forbidden" }, 403)

    await db.delete(folders).where(eq(folders.id, id))
    return c.json({ success: true })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// POST /folders/:id/move
app.post("/:id/move", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "folder-move", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded" }, 429)

    const id = c.req.param("id")
    const body = await c.req.json()
    const { targetParentId } = z.object({ targetParentId: z.string().uuid().nullable() }).parse(body)

    const [folder] = await db.select().from(folders).where(eq(folders.id, id))
    if (!folder) return c.json({ error: "Folder not found" }, 404)
    if (folder.ownerId !== session.user.id) return c.json({ error: "Forbidden" }, 403)
    if (targetParentId === id) return c.json({ error: "Cannot move folder into itself" }, 400)
    if (folder.parentId === targetParentId) return c.json({ folder })

    if (targetParentId) {
      const allFolders = await db.select().from(folders)
      const folderMap = new Map(allFolders.map(f => [f.id, f]))
      let current = folderMap.get(targetParentId)
      while (current) {
        if (current.id === id) return c.json({ error: "Cannot move folder into its own subfolder" }, 400)
        if (!current.parentId) break
        current = folderMap.get(current.parentId)
      }
      const [target] = await db.select().from(folders).where(eq(folders.id, targetParentId))
      if (!target || target.ownerId !== session.user.id) return c.json({ error: "Target folder not found" }, 404)
    }

    const siblings = targetParentId
      ? await db.select({ sortOrder: folders.sortOrder }).from(folders).where(eq(folders.parentId, targetParentId))
      : await db.select({ sortOrder: folders.sortOrder }).from(folders).where(eq(folders.ownerId, session.user.id))
    const maxSort = siblings.filter(f => f.sortOrder !== null).reduce((m, f) => Math.max(m, f.sortOrder), -1)

    const [updated] = await db.update(folders).set({ parentId: targetParentId, sortOrder: maxSort + 1, updatedAt: new Date() }).where(eq(folders.id, id)).returning()
    return c.json({ folder: updated })
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Validation failed", details: error.issues }, 400)
    return c.json({ error: "Internal server error" }, 500)
  }
})

export default app

import { Hono } from "hono"
import { db, tags, pageTags, folderTags } from "../db/index.js"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "../lib/auth-utils.js"
import { rateLimitMemory, RATE_LIMITS } from "../lib/rate-limit.js"
import { z } from "zod"

const app = new Hono()

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  parentId: z.string().uuid().nullable().optional(),
})

app.get("/", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)
    const userTags = await db.select().from(tags).where(eq(tags.userId, session.user.id))
    return c.json({ tags: userTags })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

app.post("/", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "tag-create", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded" }, 429)

    const body = await c.req.json()
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 50) : ""
    if (!name) return c.json({ error: "name is required" }, 400)
    const color = typeof body?.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(body.color) ? body.color : "#6366f1"
    const parentId = typeof body?.parentId === "string" ? body.parentId : null

    const [existing] = await db.select().from(tags).where(and(eq(tags.userId, session.user.id), eq(tags.name, name)))
    if (existing) return c.json({ error: "Tag with this name already exists" }, 409)

    const [tag] = await db.insert(tags).values({ userId: session.user.id, name, color, parentId }).returning()
    return c.json({ tag }, 201)
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

app.get("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)
    const id = c.req.param("id")
    const [tag] = await db.select().from(tags).where(and(eq(tags.id, id), eq(tags.userId, session.user.id)))
    if (!tag) return c.json({ error: "Tag not found" }, 404)
    return c.json({ tag })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

app.patch("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "tag-update", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded" }, 429)

    const id = c.req.param("id")
    const body = await c.req.json()
    const validatedData = updateTagSchema.parse(body)

    const [existing] = await db.select().from(tags).where(and(eq(tags.id, id), eq(tags.userId, session.user.id)))
    if (!existing) return c.json({ error: "Tag not found" }, 404)

    if (validatedData.name && validatedData.name !== existing.name) {
      const [dup] = await db.select().from(tags).where(and(eq(tags.userId, session.user.id), eq(tags.name, validatedData.name)))
      if (dup) return c.json({ error: "Tag with this name already exists" }, 409)
    }

    if (validatedData.parentId === id) return c.json({ error: "Tag cannot be its own parent" }, 400)

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (validatedData.name !== undefined) updates.name = validatedData.name
    if (validatedData.color !== undefined) updates.color = validatedData.color
    if (validatedData.parentId !== undefined) updates.parentId = validatedData.parentId

    const [updated] = await db.update(tags).set(updates).where(and(eq(tags.id, id), eq(tags.userId, session.user.id))).returning()
    return c.json({ tag: updated })
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Validation failed", details: error.issues }, 400)
    return c.json({ error: "Internal server error" }, 500)
  }
})

app.delete("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "tag-delete", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded" }, 429)

    const id = c.req.param("id")
    const [existing] = await db.select().from(tags).where(and(eq(tags.id, id), eq(tags.userId, session.user.id)))
    if (!existing) return c.json({ error: "Tag not found" }, 404)

    await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, session.user.id)))
    return c.json({ success: true })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

export default app

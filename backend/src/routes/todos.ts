import { Hono } from "hono"
import { db, todos } from "../db/index.js"
import { eq, and, asc } from "drizzle-orm"
import { getServerSession } from "../lib/auth-utils.js"
import { rateLimitMemory, RATE_LIMITS } from "../lib/rate-limit.js"
import { z } from "zod"

const app = new Hono()

app.get("/", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401)

    const userTodos = await db.select().from(todos).where(eq(todos.userId, session.user.id)).orderBy(asc(todos.sortOrder), asc(todos.createdAt))
    return c.json({ todos: userTodos })
  } catch {
    return c.json({ error: "Internal server error" }, 500)
  }
})

app.post("/", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "todo-create", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded" }, 429)

    const body = await c.req.json()
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 500) : ""
    if (!text) return c.json({ error: "text is required" }, 400)

    const existingTodos = await db.select({ sortOrder: todos.sortOrder }).from(todos).where(eq(todos.userId, session.user.id))
    const maxSort = existingTodos.reduce((m, t) => Math.max(m, t.sortOrder), -1)

    const [todo] = await db.insert(todos).values({ userId: session.user.id, text, sortOrder: maxSort + 1 }).returning()
    return c.json({ todo }, 201)
  } catch {
    return c.json({ error: "Internal server error" }, 500)
  }
})

app.patch("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401)

    const id = c.req.param("id")
    const body = await c.req.json()
    const updates = z.object({ text: z.string().min(1).max(500).optional(), completed: z.boolean().optional() }).parse(body)

    const [existing] = await db.select().from(todos).where(and(eq(todos.id, id), eq(todos.userId, session.user.id)))
    if (!existing) return c.json({ error: "Todo not found" }, 404)

    const [updated] = await db.update(todos).set({ ...updates, updatedAt: new Date() }).where(and(eq(todos.id, id), eq(todos.userId, session.user.id))).returning()
    return c.json({ todo: updated })
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Invalid input", details: error.issues }, 400)
    return c.json({ error: "Internal server error" }, 500)
  }
})

app.delete("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401)

    const id = c.req.param("id")
    const [existing] = await db.select().from(todos).where(and(eq(todos.id, id), eq(todos.userId, session.user.id)))
    if (!existing) return c.json({ error: "Todo not found" }, 404)

    await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, session.user.id)))
    return c.json({ success: true })
  } catch {
    return c.json({ error: "Internal server error" }, 500)
  }
})

export default app

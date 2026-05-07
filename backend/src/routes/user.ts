import { Hono } from "hono"
import { db, userApiKeys } from "../db/index.js"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "../lib/auth-utils.js"
import { rateLimitMemory, RATE_LIMITS } from "../lib/rate-limit.js"
import { encryptApiKey, maskApiKey } from "../lib/encryption.js"

const ALLOWED_PROVIDERS = ["openai", "anthropic", "gemini", "groq", "minimax", "nvidia", "custom"] as const
type AllowedProvider = typeof ALLOWED_PROVIDERS[number]

const app = new Hono()

// GET /user/api-keys
app.get("/api-keys", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const keys = await db.select({
      id: userApiKeys.id,
      provider: userApiKeys.provider,
      label: userApiKeys.label,
      baseUrl: userApiKeys.baseUrl,
      modelOverride: userApiKeys.modelOverride,
      isActive: userApiKeys.isActive,
      createdAt: userApiKeys.createdAt,
    }).from(userApiKeys).where(eq(userApiKeys.userId, session.user.id))

    return c.json({ keys })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// POST /user/api-keys
app.post("/api-keys", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "api-key-create", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded" }, 429)

    const body = await c.req.json()
    const provider = typeof body?.provider === "string" ? body.provider : ""
    if (!ALLOWED_PROVIDERS.includes(provider as AllowedProvider)) return c.json({ error: `provider must be one of: ${ALLOWED_PROVIDERS.join(", ")}` }, 400)

    const label = typeof body?.label === "string" ? body.label.trim().slice(0, 100) : ""
    if (!label) return c.json({ error: "label is required" }, 400)

    const rawKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : ""
    if (!rawKey || rawKey.length < 8) return c.json({ error: "apiKey is required and must be at least 8 characters" }, 400)

    const baseUrl = typeof body?.baseUrl === "string" ? body.baseUrl.trim().slice(0, 500) || null : null
    const modelOverride = typeof body?.modelOverride === "string" ? body.modelOverride.trim().slice(0, 100) || null : null

    const encryptedKey = encryptApiKey(rawKey)
    const maskedKey = maskApiKey(rawKey)

    const [key] = await db.insert(userApiKeys).values({
      userId: session.user.id, provider, label, encryptedKey, baseUrl, modelOverride, isActive: true,
    }).returning({ id: userApiKeys.id, provider: userApiKeys.provider, label: userApiKeys.label, baseUrl: userApiKeys.baseUrl, modelOverride: userApiKeys.modelOverride, isActive: userApiKeys.isActive, createdAt: userApiKeys.createdAt })

    return c.json({ key: { ...key, maskedKey } }, 201)
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// PATCH /user/api-keys/:id
app.patch("/api-keys/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const id = c.req.param("id")
    const [existing] = await db.select({ id: userApiKeys.id }).from(userApiKeys).where(and(eq(userApiKeys.id, id), eq(userApiKeys.userId, session.user.id)))
    if (!existing) return c.json({ error: "Not found" }, 404)

    const body = await c.req.json()
    const isActive = typeof body?.isActive === "boolean" ? body.isActive : undefined
    if (isActive === undefined) return c.json({ error: "isActive (boolean) is required" }, 400)

    const [updated] = await db.update(userApiKeys).set({ isActive, updatedAt: new Date() }).where(and(eq(userApiKeys.id, id), eq(userApiKeys.userId, session.user.id))).returning({ id: userApiKeys.id, isActive: userApiKeys.isActive })
    return c.json({ key: updated })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// DELETE /user/api-keys/:id
app.delete("/api-keys/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const id = c.req.param("id")
    const [existing] = await db.select({ id: userApiKeys.id }).from(userApiKeys).where(and(eq(userApiKeys.id, id), eq(userApiKeys.userId, session.user.id)))
    if (!existing) return c.json({ error: "Not found" }, 404)

    await db.delete(userApiKeys).where(and(eq(userApiKeys.id, id), eq(userApiKeys.userId, session.user.id)))
    return c.json({ success: true })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

export default app

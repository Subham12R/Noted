import { Hono } from "hono"
import { db, users, accounts } from "../db/index.js"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "../lib/auth-utils.js"
import { rateLimitMemory, RATE_LIMITS } from "../lib/rate-limit.js"
import bcrypt from "bcryptjs"

const app = new Hono()

// GET /users/me
app.get("/me", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)
    return c.json({ user: { id: session.user.id, email: session.user.email, name: session.user.name, image: session.user.image, emailVerified: session.user.emailVerified, createdAt: session.user.createdAt, updatedAt: session.user.updatedAt } })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// GET /users/search?email=
app.get("/search", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)
    const email = c.req.query("email")
    if (!email) return c.json({ error: "Email is required" }, 400)
    const [user] = await db.select({ id: users.id, name: users.name, email: users.email, image: users.image }).from(users).where(eq(users.email, email.toLowerCase()))
    if (!user) return c.json({ error: "User not found" }, 404)
    return c.json({ user })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// GET /users/profile
app.get("/profile", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401)
    const [user] = await db.select({ id: users.id, email: users.email, name: users.name, image: users.image, emailVerified: users.emailVerified, createdAt: users.createdAt, updatedAt: users.updatedAt }).from(users).where(eq(users.id, session.user.id)).limit(1)
    if (!user) return c.json({ error: "User not found" }, 404)
    return c.json({ user })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// PATCH /users/profile
app.patch("/profile", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "profile-update", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded" }, 429)

    const body = await c.req.json()
    const { name, image } = body

    if (name !== undefined && (typeof name !== "string" || name.length > 100)) return c.json({ error: "Name must be a string with max 100 characters" }, 400)
    if (image !== undefined && image !== null && (typeof image !== "string" || !image.match(/^https?:\/\/.+/))) return c.json({ error: "Image must be a valid HTTP(S) URL or null" }, 400)

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (name !== undefined) updateData.name = name.trim() || null
    if (image !== undefined) updateData.image = image

    const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, session.user.id)).returning({ id: users.id, email: users.email, name: users.name, image: users.image, emailVerified: users.emailVerified, createdAt: users.createdAt, updatedAt: users.updatedAt })
    return c.json({ user: updatedUser })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// DELETE /users/profile
app.delete("/profile", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401)
    const body = await c.req.json().catch(() => ({}))
    if (body.confirmation !== "DELETE") return c.json({ error: "Please confirm deletion by sending { confirmation: 'DELETE' }" }, 400)
    await db.delete(users).where(eq(users.id, session.user.id))
    return c.json({ success: true, message: "Account deleted successfully" })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// PATCH /users/password
app.patch("/password", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "password-change", limit: 5, windowMs: 60 * 1000 })
    if (!rl.success) return c.json({ error: "Rate limit exceeded" }, 429)

    const body = await c.req.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || typeof currentPassword !== "string") return c.json({ error: "Current password is required" }, 400)
    if (!newPassword || typeof newPassword !== "string") return c.json({ error: "New password is required" }, 400)
    if (newPassword.length < 8) return c.json({ error: "New password must be at least 8 characters" }, 400)
    if (newPassword.length > 128) return c.json({ error: "New password must be at most 128 characters" }, 400)

    const [account] = await db.select().from(accounts).where(and(eq(accounts.userId, session.user.id), eq(accounts.providerId, "credential"))).limit(1)
    if (!account?.password) return c.json({ error: "No password set for this account." }, 400)

    const isValid = await bcrypt.compare(currentPassword, account.password)
    if (!isValid) return c.json({ error: "Current password is incorrect" }, 400)

    const hashed = await bcrypt.hash(newPassword, 10)
    await db.update(accounts).set({ password: hashed, updatedAt: new Date() }).where(eq(accounts.id, account.id))
    return c.json({ success: true, message: "Password updated successfully" })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

export default app

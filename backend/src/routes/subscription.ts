import { Hono } from "hono"
import { getServerSession } from "../lib/auth-utils.js"
import { getUserSubscription, getUserUsageStats } from "../lib/subscription.js"
import { SUBSCRIPTION_TIERS } from "../types/subscription.js"

const app = new Hono()

app.get("/", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401)

    const { subscription, tier } = await getUserSubscription(session.user.id)
    const usage = await getUserUsageStats(session.user.id)
    const limits = SUBSCRIPTION_TIERS[tier].limits

    return c.json({ subscription, tier, limits, usage })
  } catch {
    return c.json({ error: "Internal server error" }, 500)
  }
})

export default app

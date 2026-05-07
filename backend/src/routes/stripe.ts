import { Hono } from "hono"
import { stripe, getOrCreateStripeCustomer, getPriceId, getTierFromPriceId } from "../lib/stripe.js"
import { getServerSession } from "../lib/auth-utils.js"
import { db, subscriptions } from "../db/index.js"
import { eq } from "drizzle-orm"
import { upsertSubscription } from "../lib/subscription.js"
import type Stripe from "stripe"

const app = new Hono()

// POST /stripe/checkout
app.post("/checkout", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const body = await c.req.json()
    const { tier, interval = "month" } = body
    if (!tier || !["pro", "team"].includes(tier)) return c.json({ error: "Invalid tier" }, 400)
    if (!["month", "year"].includes(interval)) return c.json({ error: "Invalid interval" }, 400)

    const priceId = getPriceId(tier, interval)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const customerId = await getOrCreateStripeCustomer(session.user.id, session.user.email!, session.user.name ?? undefined)
    const stripeSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/pricing`,
      subscription_data: { metadata: { userId: session.user.id } },
      metadata: { userId: session.user.id },
    })

    return c.json({ url: stripeSession.url })
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// POST /stripe/portal
app.post("/portal", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const [sub] = await db.select({ stripeCustomerId: subscriptions.stripeCustomerId }).from(subscriptions).where(eq(subscriptions.userId, session.user.id))
    if (!sub?.stripeCustomerId) return c.json({ error: "No subscription found" }, 404)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const portalSession = await stripe.billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: `${appUrl}/settings` })
    return c.json({ url: portalSession.url })
  } catch (error) {
    console.error("Stripe portal error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// POST /stripe/webhook
app.post("/webhook", async (c) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const isDev = process.env.NODE_ENV === "development"

  let event: Stripe.Event
  try {
    const rawBody = await c.req.arrayBuffer()
    const rawBuffer = Buffer.from(rawBody)
    const signature = c.req.header("stripe-signature")

    if (isDev && (!webhookSecret || webhookSecret === "whsec_test_placeholder")) {
      event = JSON.parse(rawBuffer.toString()) as Stripe.Event
    } else {
      if (!webhookSecret) return c.json({ error: "Webhook secret not configured" }, 500)
      if (!signature) return c.json({ error: "Missing stripe-signature header" }, 400)
      event = stripe.webhooks.constructEvent(rawBuffer, signature, webhookSecret)
    }
  } catch (err) {
    return c.json({ error: `Webhook Error: ${err instanceof Error ? err.message : "Unknown"}` }, 400)
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        if (!userId || !session.subscription) break
        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        const priceId = sub.items.data[0]?.price.id
        const currentPeriodEnd = sub.items.data[0]?.current_period_end
        const tierInfo = priceId ? getTierFromPriceId(priceId) : null
        if (tierInfo && currentPeriodEnd) {
          await upsertSubscription(userId, {
            tier: tierInfo.tier, status: "active",
            currentPeriodEnd: new Date(currentPeriodEnd * 1000),
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          })
        }
        break
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!userId) break
        const priceId = sub.items.data[0]?.price.id
        const currentPeriodEnd = sub.items.data[0]?.current_period_end
        const tierInfo = priceId ? getTierFromPriceId(priceId) : null
        if (tierInfo && currentPeriodEnd) {
          await upsertSubscription(userId, {
            tier: tierInfo.tier,
            status: sub.status as "active" | "canceled" | "past_due" | "trialing",
            currentPeriodEnd: new Date(currentPeriodEnd * 1000),
            stripeCustomerId: sub.customer as string,
            stripeSubscriptionId: sub.id,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          })
        }
        break
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (userId) {
          await upsertSubscription(userId, { tier: "free", status: "canceled", stripeCustomerId: sub.customer as string })
        }
        break
      }
    }
    return c.json({ received: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return c.json({ error: "Webhook processing failed" }, 500)
  }
})

export default app

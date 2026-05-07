import Stripe from "stripe"
import { db, subscriptions } from "../db/index.js"
import { eq } from "drizzle-orm"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
  typescript: true,
})

export const STRIPE_PRICE_IDS = {
  pro: { monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!, yearly: process.env.STRIPE_PRICE_PRO_YEARLY! },
  team: { monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY!, yearly: process.env.STRIPE_PRICE_TEAM_YEARLY! },
} as const

export function getPriceId(tier: "pro" | "team", interval: "month" | "year"): string {
  return STRIPE_PRICE_IDS[tier][interval === "month" ? "monthly" : "yearly"]
}

export function getTierFromPriceId(priceId: string): { tier: "pro" | "team"; interval: "month" | "year" } | null {
  for (const [tier, prices] of Object.entries(STRIPE_PRICE_IDS)) {
    if (prices.monthly === priceId) return { tier: tier as "pro" | "team", interval: "month" }
    if (prices.yearly === priceId) return { tier: tier as "pro" | "team", interval: "year" }
  }
  return null
}

export async function getOrCreateStripeCustomer(userId: string, email: string, name?: string): Promise<string> {
  const [existingSub] = await db.select({ stripeCustomerId: subscriptions.stripeCustomerId }).from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1)

  if (existingSub?.stripeCustomerId) {
    try {
      await stripe.customers.retrieve(existingSub.stripeCustomerId)
      return existingSub.stripeCustomerId
    } catch {}
  }

  const customer = await stripe.customers.create({ email, name: name || undefined, metadata: { userId } })

  await db.insert(subscriptions).values({
    userId, tier: "free", status: "active", stripeCustomerId: customer.id, stripeSubscriptionId: null, stripePriceId: null,
  }).onConflictDoUpdate({
    target: subscriptions.userId,
    set: { stripeCustomerId: customer.id, stripeSubscriptionId: null, stripePriceId: null, tier: "free", status: "active", updatedAt: new Date() },
  })

  return customer.id
}

export async function createCheckoutSession(customerId: string, priceId: string, userId: string, successUrl: string, cancelUrl: string): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: { metadata: { userId } },
    metadata: { userId },
  })
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl })
}

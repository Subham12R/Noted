import { db, subscriptions, folders, pages, aiUsage } from "../db/index.js"
import { eq, count, and } from "drizzle-orm"
import type { SubscriptionTier } from "../types/subscription.js"
import { SUBSCRIPTION_TIERS } from "../types/subscription.js"

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export async function getUserSubscription(userId: string) {
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId))
  if (!subscription || subscription.status !== "active") return { subscription: null, tier: "free" as SubscriptionTier }
  return { subscription, tier: subscription.tier as SubscriptionTier }
}

export async function canCreateFolder(_userId: string) {
  return { allowed: true, current: 0, limit: -1, reason: "" }
}

export async function canCreatePage(_userId: string) {
  return { allowed: true, current: 0, limit: -1, reason: "" }
}

export async function canUseAI(_userId: string) {
  return { allowed: true, current: 0, limit: -1, reason: "" }
}

export async function incrementAIUsage(userId: string): Promise<void> {
  const currentMonth = getCurrentMonth()
  const [existing] = await db.select().from(aiUsage).where(and(eq(aiUsage.userId, userId), eq(aiUsage.month, currentMonth)))

  if (existing) {
    await db.update(aiUsage).set({ requestCount: existing.requestCount + 1, updatedAt: new Date() }).where(eq(aiUsage.id, existing.id))
  } else {
    await db.insert(aiUsage).values({ userId, month: currentMonth, requestCount: 1 })
  }
}

export async function getUserUsageStats(userId: string) {
  const currentMonth = getCurrentMonth()

  const [folderCount] = await db.select({ count: count() }).from(folders).where(eq(folders.ownerId, userId))
  const [pageCount] = await db.select({ count: count() }).from(pages).where(eq(pages.ownerId, userId))
  const [aiMonthly] = await db.select({ requestCount: aiUsage.requestCount }).from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.month, currentMonth)))

  return {
    folders: folderCount?.count ?? 0,
    pages: pageCount?.count ?? 0,
    aiRequestsThisMonth: aiMonthly?.requestCount ?? 0,
  }
}

export async function upsertSubscription(userId: string, data: {
  tier: SubscriptionTier
  status?: "active" | "canceled" | "past_due" | "trialing"
  currentPeriodEnd?: Date
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  cancelAtPeriodEnd?: boolean
}) {
  const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId))

  if (existing) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        tier: data.tier,
        status: data.status ?? existing.status,
        currentPeriodEnd: data.currentPeriodEnd ?? existing.currentPeriodEnd,
        stripeCustomerId: data.stripeCustomerId ?? existing.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId ?? existing.stripeSubscriptionId,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? existing.cancelAtPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing.id))
      .returning()
    return updated
  } else {
    const [created] = await db
      .insert(subscriptions)
      .values({
        userId,
        tier: data.tier,
        status: data.status ?? "active",
        currentPeriodEnd: data.currentPeriodEnd,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      })
      .returning()
    return created
  }
}

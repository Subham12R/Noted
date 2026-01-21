import { db, subscriptions, folders, pages, aiUsage } from "@/db"
import { eq, count, and } from "drizzle-orm"
import {
  SubscriptionTier,
  SUBSCRIPTION_TIERS,
  TierLimits,
  UsageStats,
  SubscriptionWithUsage,
  isLimitReached,
} from "@/types/subscription"

// Get current month in YYYY-MM format
function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

// Get user's subscription tier (defaults to free if none exists)
export async function getUserSubscription(userId: string): Promise<{
  subscription: typeof subscriptions.$inferSelect | null
  tier: SubscriptionTier
}> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))

  if (!subscription || subscription.status !== "active") {
    return { subscription: null, tier: "free" }
  }

  return {
    subscription,
    tier: subscription.tier as SubscriptionTier,
  }
}

// Get user's current usage stats
export async function getUserUsageStats(userId: string): Promise<UsageStats> {
  // Count folders
  const [folderCount] = await db
    .select({ count: count() })
    .from(folders)
    .where(eq(folders.ownerId, userId))

  // Count pages
  const [pageCount] = await db
    .select({ count: count() })
    .from(pages)
    .where(eq(pages.ownerId, userId))

  // Get AI usage for current month
  const currentMonth = getCurrentMonth()
  const [aiUsageRecord] = await db
    .select()
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.month, currentMonth)))

  return {
    notesCount: pageCount?.count ?? 0,
    foldersCount: folderCount?.count ?? 0,
    storageUsedMB: 0, // TODO: Calculate actual storage usage
    aiRequestsThisMonth: aiUsageRecord?.requestCount ?? 0,
  }
}

// Get complete subscription info with usage
export async function getSubscriptionWithUsage(
  userId: string
): Promise<SubscriptionWithUsage> {
  const { subscription, tier } = await getUserSubscription(userId)
  const usage = await getUserUsageStats(userId)
  const limits = SUBSCRIPTION_TIERS[tier].limits

  return {
    subscription,
    tier,
    limits,
    usage,
  }
}

// Check if user can create more folders
export async function canCreateFolder(userId: string): Promise<{
  allowed: boolean
  reason?: string
  current: number
  limit: number
}> {
  const { tier } = await getUserSubscription(userId)
  const limits = SUBSCRIPTION_TIERS[tier].limits
  const usage = await getUserUsageStats(userId)

  if (isLimitReached(usage.foldersCount, limits.maxFolders)) {
    return {
      allowed: false,
      reason: `You've reached the maximum of ${limits.maxFolders} folders on the ${SUBSCRIPTION_TIERS[tier].name} plan. Upgrade to create more.`,
      current: usage.foldersCount,
      limit: limits.maxFolders,
    }
  }

  return {
    allowed: true,
    current: usage.foldersCount,
    limit: limits.maxFolders,
  }
}

// Check if user can create more pages/notes
export async function canCreatePage(userId: string): Promise<{
  allowed: boolean
  reason?: string
  current: number
  limit: number
}> {
  const { tier } = await getUserSubscription(userId)
  const limits = SUBSCRIPTION_TIERS[tier].limits
  const usage = await getUserUsageStats(userId)

  if (isLimitReached(usage.notesCount, limits.maxNotes)) {
    return {
      allowed: false,
      reason: `You've reached the maximum of ${limits.maxNotes} notes on the ${SUBSCRIPTION_TIERS[tier].name} plan. Upgrade to create more.`,
      current: usage.notesCount,
      limit: limits.maxNotes,
    }
  }

  return {
    allowed: true,
    current: usage.notesCount,
    limit: limits.maxNotes,
  }
}

// Check if user can use AI features
export async function canUseAI(userId: string): Promise<{
  allowed: boolean
  reason?: string
  current: number
  limit: number
}> {
  const { tier } = await getUserSubscription(userId)
  const limits = SUBSCRIPTION_TIERS[tier].limits
  const usage = await getUserUsageStats(userId)

  if (isLimitReached(usage.aiRequestsThisMonth, limits.maxAiRequestsPerMonth)) {
    return {
      allowed: false,
      reason: `You've used all ${limits.maxAiRequestsPerMonth} AI requests for this month on the ${SUBSCRIPTION_TIERS[tier].name} plan. Upgrade for more.`,
      current: usage.aiRequestsThisMonth,
      limit: limits.maxAiRequestsPerMonth,
    }
  }

  return {
    allowed: true,
    current: usage.aiRequestsThisMonth,
    limit: limits.maxAiRequestsPerMonth,
  }
}

// Increment AI usage counter
export async function incrementAIUsage(userId: string): Promise<void> {
  const currentMonth = getCurrentMonth()

  // Try to update existing record, or insert new one
  const [existing] = await db
    .select()
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.month, currentMonth)))

  if (existing) {
    await db
      .update(aiUsage)
      .set({
        requestCount: existing.requestCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(aiUsage.id, existing.id))
  } else {
    await db.insert(aiUsage).values({
      userId,
      month: currentMonth,
      requestCount: 1,
    })
  }
}

// Create or update subscription (for Stripe webhook or manual creation)
export async function upsertSubscription(
  userId: string,
  data: {
    tier: SubscriptionTier
    status?: "active" | "canceled" | "past_due" | "trialing"
    currentPeriodEnd?: Date
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    cancelAtPeriodEnd?: boolean
  }
): Promise<typeof subscriptions.$inferSelect> {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))

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

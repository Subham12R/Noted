// Subscription tier types and configurations

export type SubscriptionTier = "free" | "pro" | "team"

export interface TierLimits {
  maxNotes: number // -1 means unlimited
  maxFolders: number
  maxCollaboratorsPerNote: number
  maxStorageMB: number
  maxAiRequestsPerMonth: number
}

export interface TierConfig {
  name: string
  price: number // in cents, 0 for free
  period: "month" | "year" | "forever"
  color: string
  limits: TierLimits
  features: string[]
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  free: {
    name: "Free",
    price: 0,
    period: "forever",
    color: "from-zinc-600 to-zinc-800",
    limits: {
      maxNotes: 10,
      maxFolders: 3,
      maxCollaboratorsPerNote: 2,
      maxStorageMB: 50,   // 50 MB
      maxAiRequestsPerMonth: 10,
    },
    features: [
      "Up to 10 notes",
      "3 folders",
      "Basic collaboration (2 users)",
      "50 MB storage",
      "10 AI requests/month",
    ],
  },
  pro: {
    name: "Pro",
    price: 900, // $9.00
    period: "month",
    color: "from-indigo-600 to-purple-600",
    limits: {
      maxNotes: 100,
      maxFolders: 20,
      maxCollaboratorsPerNote: 10,
      maxStorageMB: 100,  // 100 MB
      maxAiRequestsPerMonth: 500,
    },
    features: [
      "Up to 100 notes",
      "20 folders",
      "Advanced collaboration (10 users)",
      "100 MB storage",
      "500 AI requests/month",
      "Priority support",
    ],
  },
  team: {
    name: "Team",
    price: 2900, // $29.00
    period: "month",
    color: "from-amber-500 to-orange-600",
    limits: {
      maxNotes: -1, // unlimited
      maxFolders: -1,
      maxCollaboratorsPerNote: -1,
      maxStorageMB: 500,  // 500 MB
      maxAiRequestsPerMonth: -1,
    },
    features: [
      "Unlimited notes",
      "Unlimited folders",
      "Unlimited collaborators",
      "500 MB storage",
      "Unlimited AI requests",
      "Priority support",
      "Admin dashboard",
      "Custom branding",
    ],
  },
}

export type BillingInterval = "month" | "year"

export interface UserSubscription {
  id: string
  userId: string
  tier: SubscriptionTier
  status: "active" | "canceled" | "past_due" | "trialing"
  billingInterval: BillingInterval
  currentPeriodStart: Date
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
  createdAt: Date
  updatedAt: Date
}

export interface UsageStats {
  notesCount: number
  foldersCount: number
  storageUsedMB: number
  aiRequestsThisMonth: number
}

export interface SubscriptionWithUsage {
  subscription: UserSubscription | null
  tier: SubscriptionTier
  limits: TierLimits
  usage: UsageStats
}

// Helper to format price
export function formatPrice(cents: number): string {
  if (cents === 0) return "$0"
  return `$${(cents / 100).toFixed(0)}`
}

// Helper to check if limit is reached
export function isLimitReached(used: number, limit: number): boolean {
  if (limit === -1) return false // unlimited
  return used >= limit
}

// Helper to get usage percentage
export function getUsagePercent(used: number, limit: number): number {
  if (limit === -1) return 0 // unlimited shows as 0%
  return Math.min((used / limit) * 100, 100)
}

// Helper to format limit value for display
export function formatLimit(value: number): string {
  if (value === -1) return "Unlimited"
  return value.toString()
}

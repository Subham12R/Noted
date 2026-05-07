export type SubscriptionTier = "free" | "pro" | "team"

export interface TierLimits {
  maxNotes: number
  maxFolders: number
  maxCollaboratorsPerNote: number
  maxStorageMB: number
  maxAiRequestsPerMonth: number
}

export interface TierConfig {
  name: string
  price: number
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
    limits: { maxNotes: 10, maxFolders: 3, maxCollaboratorsPerNote: 2, maxStorageMB: 50, maxAiRequestsPerMonth: 10 },
    features: ["Up to 10 notes", "3 folders", "10 AI requests/month"],
  },
  pro: {
    name: "Pro",
    price: 999,
    period: "month",
    color: "from-indigo-600 to-purple-600",
    limits: { maxNotes: -1, maxFolders: -1, maxCollaboratorsPerNote: 10, maxStorageMB: 10240, maxAiRequestsPerMonth: 500 },
    features: ["Unlimited notes", "Unlimited folders", "500 AI requests/month"],
  },
  team: {
    name: "Team",
    price: 1999,
    period: "month",
    color: "from-orange-500 to-pink-600",
    limits: { maxNotes: -1, maxFolders: -1, maxCollaboratorsPerNote: -1, maxStorageMB: 102400, maxAiRequestsPerMonth: -1 },
    features: ["Everything in Pro", "Unlimited collaborators", "Unlimited AI"],
  },
}

export interface UsageStats {
  notesCount: number
  foldersCount: number
  storageUsedMB: number
  aiRequestsThisMonth: number
}

export interface SubscriptionWithUsage {
  subscription: unknown
  tier: SubscriptionTier
  limits: TierLimits
  usage: UsageStats
}

export function isLimitReached(current: number, limit: number): boolean {
  return limit !== -1 && current >= limit
}

export type SubscriptionTier = "free" | "pro" | "team";
export interface TierLimits {
    maxNotes: number;
    maxFolders: number;
    maxCollaboratorsPerNote: number;
    maxStorageMB: number;
    maxAiRequestsPerMonth: number;
}
export interface TierConfig {
    name: string;
    price: number;
    period: "month" | "year" | "forever";
    color: string;
    limits: TierLimits;
    features: string[];
}
export declare const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig>;
export interface UsageStats {
    notesCount: number;
    foldersCount: number;
    storageUsedMB: number;
    aiRequestsThisMonth: number;
}
export interface SubscriptionWithUsage {
    subscription: unknown;
    tier: SubscriptionTier;
    limits: TierLimits;
    usage: UsageStats;
}
export declare function isLimitReached(current: number, limit: number): boolean;
//# sourceMappingURL=subscription.d.ts.map
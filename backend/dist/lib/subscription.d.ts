import type { SubscriptionTier } from "../types/subscription.js";
export declare function getUserSubscription(userId: string): Promise<{
    subscription: null;
    tier: SubscriptionTier;
} | {
    subscription: {
        id: string;
        userId: string;
        tier: string;
        status: string;
        billingInterval: string | null;
        currentPeriodStart: Date;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        stripePriceId: string | null;
        createdAt: Date;
        updatedAt: Date;
    };
    tier: SubscriptionTier;
}>;
export declare function canCreateFolder(_userId: string): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    reason: string;
}>;
export declare function canCreatePage(_userId: string): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    reason: string;
}>;
export declare function canUseAI(_userId: string): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    reason: string;
}>;
export declare function incrementAIUsage(userId: string): Promise<void>;
export declare function getUserUsageStats(userId: string): Promise<{
    folders: number;
    pages: number;
    aiRequestsThisMonth: number;
}>;
export declare function upsertSubscription(userId: string, data: {
    tier: SubscriptionTier;
    status?: "active" | "canceled" | "past_due" | "trialing";
    currentPeriodEnd?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    cancelAtPeriodEnd?: boolean;
}): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    status: string;
    tier: string;
    billingInterval: string | null;
    currentPeriodStart: Date;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
}>;
//# sourceMappingURL=subscription.d.ts.map
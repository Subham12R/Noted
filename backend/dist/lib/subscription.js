"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserSubscription = getUserSubscription;
exports.canCreateFolder = canCreateFolder;
exports.canCreatePage = canCreatePage;
exports.canUseAI = canUseAI;
exports.incrementAIUsage = incrementAIUsage;
exports.getUserUsageStats = getUserUsageStats;
exports.upsertSubscription = upsertSubscription;
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
async function getUserSubscription(userId) {
    const [subscription] = await index_js_1.db.select().from(index_js_1.subscriptions).where((0, drizzle_orm_1.eq)(index_js_1.subscriptions.userId, userId));
    if (!subscription || subscription.status !== "active")
        return { subscription: null, tier: "free" };
    return { subscription, tier: subscription.tier };
}
async function canCreateFolder(_userId) {
    return { allowed: true, current: 0, limit: -1, reason: "" };
}
async function canCreatePage(_userId) {
    return { allowed: true, current: 0, limit: -1, reason: "" };
}
async function canUseAI(_userId) {
    return { allowed: true, current: 0, limit: -1, reason: "" };
}
async function incrementAIUsage(userId) {
    const currentMonth = getCurrentMonth();
    const [existing] = await index_js_1.db.select().from(index_js_1.aiUsage).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.aiUsage.userId, userId), (0, drizzle_orm_1.eq)(index_js_1.aiUsage.month, currentMonth)));
    if (existing) {
        await index_js_1.db.update(index_js_1.aiUsage).set({ requestCount: existing.requestCount + 1, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(index_js_1.aiUsage.id, existing.id));
    }
    else {
        await index_js_1.db.insert(index_js_1.aiUsage).values({ userId, month: currentMonth, requestCount: 1 });
    }
}
async function getUserUsageStats(userId) {
    const currentMonth = getCurrentMonth();
    const [folderCount] = await index_js_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.ownerId, userId));
    const [pageCount] = await index_js_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.ownerId, userId));
    const [aiMonthly] = await index_js_1.db.select({ requestCount: index_js_1.aiUsage.requestCount }).from(index_js_1.aiUsage)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.aiUsage.userId, userId), (0, drizzle_orm_1.eq)(index_js_1.aiUsage.month, currentMonth)));
    return {
        folders: folderCount?.count ?? 0,
        pages: pageCount?.count ?? 0,
        aiRequestsThisMonth: aiMonthly?.requestCount ?? 0,
    };
}
async function upsertSubscription(userId, data) {
    const [existing] = await index_js_1.db.select().from(index_js_1.subscriptions).where((0, drizzle_orm_1.eq)(index_js_1.subscriptions.userId, userId));
    if (existing) {
        const [updated] = await index_js_1.db
            .update(index_js_1.subscriptions)
            .set({
            tier: data.tier,
            status: data.status ?? existing.status,
            currentPeriodEnd: data.currentPeriodEnd ?? existing.currentPeriodEnd,
            stripeCustomerId: data.stripeCustomerId ?? existing.stripeCustomerId,
            stripeSubscriptionId: data.stripeSubscriptionId ?? existing.stripeSubscriptionId,
            cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? existing.cancelAtPeriodEnd,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(index_js_1.subscriptions.id, existing.id))
            .returning();
        return updated;
    }
    else {
        const [created] = await index_js_1.db
            .insert(index_js_1.subscriptions)
            .values({
            userId,
            tier: data.tier,
            status: data.status ?? "active",
            currentPeriodEnd: data.currentPeriodEnd,
            stripeCustomerId: data.stripeCustomerId,
            stripeSubscriptionId: data.stripeSubscriptionId,
            cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        })
            .returning();
        return created;
    }
}
//# sourceMappingURL=subscription.js.map
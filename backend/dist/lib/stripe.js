"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRIPE_PRICE_IDS = exports.stripe = void 0;
exports.getPriceId = getPriceId;
exports.getTierFromPriceId = getTierFromPriceId;
exports.getOrCreateStripeCustomer = getOrCreateStripeCustomer;
exports.createCheckoutSession = createCheckoutSession;
exports.createCustomerPortalSession = createCustomerPortalSession;
const stripe_1 = __importDefault(require("stripe"));
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
exports.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
    typescript: true,
});
exports.STRIPE_PRICE_IDS = {
    pro: { monthly: process.env.STRIPE_PRICE_PRO_MONTHLY, yearly: process.env.STRIPE_PRICE_PRO_YEARLY },
    team: { monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY, yearly: process.env.STRIPE_PRICE_TEAM_YEARLY },
};
function getPriceId(tier, interval) {
    return exports.STRIPE_PRICE_IDS[tier][interval === "month" ? "monthly" : "yearly"];
}
function getTierFromPriceId(priceId) {
    for (const [tier, prices] of Object.entries(exports.STRIPE_PRICE_IDS)) {
        if (prices.monthly === priceId)
            return { tier: tier, interval: "month" };
        if (prices.yearly === priceId)
            return { tier: tier, interval: "year" };
    }
    return null;
}
async function getOrCreateStripeCustomer(userId, email, name) {
    const [existingSub] = await index_js_1.db.select({ stripeCustomerId: index_js_1.subscriptions.stripeCustomerId }).from(index_js_1.subscriptions).where((0, drizzle_orm_1.eq)(index_js_1.subscriptions.userId, userId)).limit(1);
    if (existingSub?.stripeCustomerId) {
        try {
            await exports.stripe.customers.retrieve(existingSub.stripeCustomerId);
            return existingSub.stripeCustomerId;
        }
        catch { }
    }
    const customer = await exports.stripe.customers.create({ email, name: name || undefined, metadata: { userId } });
    await index_js_1.db.insert(index_js_1.subscriptions).values({
        userId, tier: "free", status: "active", stripeCustomerId: customer.id, stripeSubscriptionId: null, stripePriceId: null,
    }).onConflictDoUpdate({
        target: index_js_1.subscriptions.userId,
        set: { stripeCustomerId: customer.id, stripeSubscriptionId: null, stripePriceId: null, tier: "free", status: "active", updatedAt: new Date() },
    });
    return customer.id;
}
async function createCheckoutSession(customerId, priceId, userId, successUrl, cancelUrl) {
    return exports.stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: { metadata: { userId } },
        metadata: { userId },
    });
}
async function createCustomerPortalSession(customerId, returnUrl) {
    return exports.stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
}
//# sourceMappingURL=stripe.js.map
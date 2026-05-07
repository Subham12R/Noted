"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const stripe_js_1 = require("../lib/stripe.js");
const auth_utils_js_1 = require("../lib/auth-utils.js");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const subscription_js_1 = require("../lib/subscription.js");
const app = new hono_1.Hono();
// POST /stripe/checkout
app.post("/checkout", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const body = await c.req.json();
        const { tier, interval = "month" } = body;
        if (!tier || !["pro", "team"].includes(tier))
            return c.json({ error: "Invalid tier" }, 400);
        if (!["month", "year"].includes(interval))
            return c.json({ error: "Invalid interval" }, 400);
        const priceId = (0, stripe_js_1.getPriceId)(tier, interval);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const customerId = await (0, stripe_js_1.getOrCreateStripeCustomer)(session.user.id, session.user.email, session.user.name ?? undefined);
        const stripeSession = await stripe_js_1.stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${appUrl}/dashboard?upgraded=true`,
            cancel_url: `${appUrl}/pricing`,
            subscription_data: { metadata: { userId: session.user.id } },
            metadata: { userId: session.user.id },
        });
        return c.json({ url: stripeSession.url });
    }
    catch (error) {
        console.error("Stripe checkout error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /stripe/portal
app.post("/portal", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const [sub] = await index_js_1.db.select({ stripeCustomerId: index_js_1.subscriptions.stripeCustomerId }).from(index_js_1.subscriptions).where((0, drizzle_orm_1.eq)(index_js_1.subscriptions.userId, session.user.id));
        if (!sub?.stripeCustomerId)
            return c.json({ error: "No subscription found" }, 404);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const portalSession = await stripe_js_1.stripe.billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: `${appUrl}/settings` });
        return c.json({ url: portalSession.url });
    }
    catch (error) {
        console.error("Stripe portal error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /stripe/webhook
app.post("/webhook", async (c) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const isDev = process.env.NODE_ENV === "development";
    let event;
    try {
        const rawBody = await c.req.arrayBuffer();
        const rawBuffer = Buffer.from(rawBody);
        const signature = c.req.header("stripe-signature");
        if (isDev && (!webhookSecret || webhookSecret === "whsec_test_placeholder")) {
            event = JSON.parse(rawBuffer.toString());
        }
        else {
            if (!webhookSecret)
                return c.json({ error: "Webhook secret not configured" }, 500);
            if (!signature)
                return c.json({ error: "Missing stripe-signature header" }, 400);
            event = stripe_js_1.stripe.webhooks.constructEvent(rawBuffer, signature, webhookSecret);
        }
    }
    catch (err) {
        return c.json({ error: `Webhook Error: ${err instanceof Error ? err.message : "Unknown"}` }, 400);
    }
    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const userId = session.metadata?.userId;
                if (!userId || !session.subscription)
                    break;
                const sub = await stripe_js_1.stripe.subscriptions.retrieve(session.subscription);
                const priceId = sub.items.data[0]?.price.id;
                const currentPeriodEnd = sub.items.data[0]?.current_period_end;
                const tierInfo = priceId ? (0, stripe_js_1.getTierFromPriceId)(priceId) : null;
                if (tierInfo && currentPeriodEnd) {
                    await (0, subscription_js_1.upsertSubscription)(userId, {
                        tier: tierInfo.tier, status: "active",
                        currentPeriodEnd: new Date(currentPeriodEnd * 1000),
                        stripeCustomerId: session.customer,
                        stripeSubscriptionId: session.subscription,
                    });
                }
                break;
            }
            case "customer.subscription.updated":
            case "customer.subscription.created": {
                const sub = event.data.object;
                const userId = sub.metadata?.userId;
                if (!userId)
                    break;
                const priceId = sub.items.data[0]?.price.id;
                const currentPeriodEnd = sub.items.data[0]?.current_period_end;
                const tierInfo = priceId ? (0, stripe_js_1.getTierFromPriceId)(priceId) : null;
                if (tierInfo && currentPeriodEnd) {
                    await (0, subscription_js_1.upsertSubscription)(userId, {
                        tier: tierInfo.tier,
                        status: sub.status,
                        currentPeriodEnd: new Date(currentPeriodEnd * 1000),
                        stripeCustomerId: sub.customer,
                        stripeSubscriptionId: sub.id,
                        cancelAtPeriodEnd: sub.cancel_at_period_end,
                    });
                }
                break;
            }
            case "customer.subscription.deleted": {
                const sub = event.data.object;
                const userId = sub.metadata?.userId;
                if (userId) {
                    await (0, subscription_js_1.upsertSubscription)(userId, { tier: "free", status: "canceled", stripeCustomerId: sub.customer });
                }
                break;
            }
        }
        return c.json({ received: true });
    }
    catch (error) {
        console.error("Webhook processing error:", error);
        return c.json({ error: "Webhook processing failed" }, 500);
    }
});
exports.default = app;
//# sourceMappingURL=stripe.js.map
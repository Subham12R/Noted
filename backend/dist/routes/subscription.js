"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const auth_utils_js_1 = require("../lib/auth-utils.js");
const subscription_js_1 = require("../lib/subscription.js");
const subscription_js_2 = require("../types/subscription.js");
const app = new hono_1.Hono();
app.get("/", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user?.id)
            return c.json({ error: "Unauthorized" }, 401);
        const { subscription, tier } = await (0, subscription_js_1.getUserSubscription)(session.user.id);
        const usage = await (0, subscription_js_1.getUserUsageStats)(session.user.id);
        const limits = subscription_js_2.SUBSCRIPTION_TIERS[tier].limits;
        return c.json({ subscription, tier, limits, usage });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
exports.default = app;
//# sourceMappingURL=subscription.js.map
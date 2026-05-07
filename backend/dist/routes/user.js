"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const auth_utils_js_1 = require("../lib/auth-utils.js");
const rate_limit_js_1 = require("../lib/rate-limit.js");
const encryption_js_1 = require("../lib/encryption.js");
const ALLOWED_PROVIDERS = ["openai", "anthropic", "gemini", "groq", "minimax", "nvidia", "custom"];
const app = new hono_1.Hono();
// GET /user/api-keys
app.get("/api-keys", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const keys = await index_js_1.db.select({
            id: index_js_1.userApiKeys.id,
            provider: index_js_1.userApiKeys.provider,
            label: index_js_1.userApiKeys.label,
            baseUrl: index_js_1.userApiKeys.baseUrl,
            modelOverride: index_js_1.userApiKeys.modelOverride,
            isActive: index_js_1.userApiKeys.isActive,
            createdAt: index_js_1.userApiKeys.createdAt,
        }).from(index_js_1.userApiKeys).where((0, drizzle_orm_1.eq)(index_js_1.userApiKeys.userId, session.user.id));
        return c.json({ keys });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /user/api-keys
app.post("/api-keys", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "api-key-create", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded" }, 429);
        const body = await c.req.json();
        const provider = typeof body?.provider === "string" ? body.provider : "";
        if (!ALLOWED_PROVIDERS.includes(provider))
            return c.json({ error: `provider must be one of: ${ALLOWED_PROVIDERS.join(", ")}` }, 400);
        const label = typeof body?.label === "string" ? body.label.trim().slice(0, 100) : "";
        if (!label)
            return c.json({ error: "label is required" }, 400);
        const rawKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
        if (!rawKey || rawKey.length < 8)
            return c.json({ error: "apiKey is required and must be at least 8 characters" }, 400);
        const baseUrl = typeof body?.baseUrl === "string" ? body.baseUrl.trim().slice(0, 500) || null : null;
        const modelOverride = typeof body?.modelOverride === "string" ? body.modelOverride.trim().slice(0, 100) || null : null;
        const encryptedKey = (0, encryption_js_1.encryptApiKey)(rawKey);
        const maskedKey = (0, encryption_js_1.maskApiKey)(rawKey);
        const [key] = await index_js_1.db.insert(index_js_1.userApiKeys).values({
            userId: session.user.id, provider, label, encryptedKey, baseUrl, modelOverride, isActive: true,
        }).returning({ id: index_js_1.userApiKeys.id, provider: index_js_1.userApiKeys.provider, label: index_js_1.userApiKeys.label, baseUrl: index_js_1.userApiKeys.baseUrl, modelOverride: index_js_1.userApiKeys.modelOverride, isActive: index_js_1.userApiKeys.isActive, createdAt: index_js_1.userApiKeys.createdAt });
        return c.json({ key: { ...key, maskedKey } }, 201);
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// PATCH /user/api-keys/:id
app.patch("/api-keys/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const id = c.req.param("id");
        const [existing] = await index_js_1.db.select({ id: index_js_1.userApiKeys.id }).from(index_js_1.userApiKeys).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.userApiKeys.id, id), (0, drizzle_orm_1.eq)(index_js_1.userApiKeys.userId, session.user.id)));
        if (!existing)
            return c.json({ error: "Not found" }, 404);
        const body = await c.req.json();
        const isActive = typeof body?.isActive === "boolean" ? body.isActive : undefined;
        if (isActive === undefined)
            return c.json({ error: "isActive (boolean) is required" }, 400);
        const [updated] = await index_js_1.db.update(index_js_1.userApiKeys).set({ isActive, updatedAt: new Date() }).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.userApiKeys.id, id), (0, drizzle_orm_1.eq)(index_js_1.userApiKeys.userId, session.user.id))).returning({ id: index_js_1.userApiKeys.id, isActive: index_js_1.userApiKeys.isActive });
        return c.json({ key: updated });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// DELETE /user/api-keys/:id
app.delete("/api-keys/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const id = c.req.param("id");
        const [existing] = await index_js_1.db.select({ id: index_js_1.userApiKeys.id }).from(index_js_1.userApiKeys).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.userApiKeys.id, id), (0, drizzle_orm_1.eq)(index_js_1.userApiKeys.userId, session.user.id)));
        if (!existing)
            return c.json({ error: "Not found" }, 404);
        await index_js_1.db.delete(index_js_1.userApiKeys).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.userApiKeys.id, id), (0, drizzle_orm_1.eq)(index_js_1.userApiKeys.userId, session.user.id)));
        return c.json({ success: true });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
exports.default = app;
//# sourceMappingURL=user.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const auth_utils_js_1 = require("../lib/auth-utils.js");
const rate_limit_js_1 = require("../lib/rate-limit.js");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const app = new hono_1.Hono();
// GET /users/me
app.get("/me", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        return c.json({ user: { id: session.user.id, email: session.user.email, name: session.user.name, image: session.user.image, emailVerified: session.user.emailVerified, createdAt: session.user.createdAt, updatedAt: session.user.updatedAt } });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// GET /users/search?email=
app.get("/search", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const email = c.req.query("email");
        if (!email)
            return c.json({ error: "Email is required" }, 400);
        const [user] = await index_js_1.db.select({ id: index_js_1.users.id, name: index_js_1.users.name, email: index_js_1.users.email, image: index_js_1.users.image }).from(index_js_1.users).where((0, drizzle_orm_1.eq)(index_js_1.users.email, email.toLowerCase()));
        if (!user)
            return c.json({ error: "User not found" }, 404);
        return c.json({ user });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// GET /users/profile
app.get("/profile", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user?.id)
            return c.json({ error: "Unauthorized" }, 401);
        const [user] = await index_js_1.db.select({ id: index_js_1.users.id, email: index_js_1.users.email, name: index_js_1.users.name, image: index_js_1.users.image, emailVerified: index_js_1.users.emailVerified, createdAt: index_js_1.users.createdAt, updatedAt: index_js_1.users.updatedAt }).from(index_js_1.users).where((0, drizzle_orm_1.eq)(index_js_1.users.id, session.user.id)).limit(1);
        if (!user)
            return c.json({ error: "User not found" }, 404);
        return c.json({ user });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// PATCH /users/profile
app.patch("/profile", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user?.id)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "profile-update", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded" }, 429);
        const body = await c.req.json();
        const { name, image } = body;
        if (name !== undefined && (typeof name !== "string" || name.length > 100))
            return c.json({ error: "Name must be a string with max 100 characters" }, 400);
        if (image !== undefined && image !== null && (typeof image !== "string" || !image.match(/^https?:\/\/.+/)))
            return c.json({ error: "Image must be a valid HTTP(S) URL or null" }, 400);
        const updateData = { updatedAt: new Date() };
        if (name !== undefined)
            updateData.name = name.trim() || null;
        if (image !== undefined)
            updateData.image = image;
        const [updatedUser] = await index_js_1.db.update(index_js_1.users).set(updateData).where((0, drizzle_orm_1.eq)(index_js_1.users.id, session.user.id)).returning({ id: index_js_1.users.id, email: index_js_1.users.email, name: index_js_1.users.name, image: index_js_1.users.image, emailVerified: index_js_1.users.emailVerified, createdAt: index_js_1.users.createdAt, updatedAt: index_js_1.users.updatedAt });
        return c.json({ user: updatedUser });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// DELETE /users/profile
app.delete("/profile", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user?.id)
            return c.json({ error: "Unauthorized" }, 401);
        const body = await c.req.json().catch(() => ({}));
        if (body.confirmation !== "DELETE")
            return c.json({ error: "Please confirm deletion by sending { confirmation: 'DELETE' }" }, 400);
        await index_js_1.db.delete(index_js_1.users).where((0, drizzle_orm_1.eq)(index_js_1.users.id, session.user.id));
        return c.json({ success: true, message: "Account deleted successfully" });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// PATCH /users/password
app.patch("/password", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user?.id)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "password-change", limit: 5, windowMs: 60 * 1000 });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded" }, 429);
        const body = await c.req.json();
        const { currentPassword, newPassword } = body;
        if (!currentPassword || typeof currentPassword !== "string")
            return c.json({ error: "Current password is required" }, 400);
        if (!newPassword || typeof newPassword !== "string")
            return c.json({ error: "New password is required" }, 400);
        if (newPassword.length < 8)
            return c.json({ error: "New password must be at least 8 characters" }, 400);
        if (newPassword.length > 128)
            return c.json({ error: "New password must be at most 128 characters" }, 400);
        const [account] = await index_js_1.db.select().from(index_js_1.accounts).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.accounts.userId, session.user.id), (0, drizzle_orm_1.eq)(index_js_1.accounts.providerId, "credential"))).limit(1);
        if (!account?.password)
            return c.json({ error: "No password set for this account." }, 400);
        const isValid = await bcryptjs_1.default.compare(currentPassword, account.password);
        if (!isValid)
            return c.json({ error: "Current password is incorrect" }, 400);
        const hashed = await bcryptjs_1.default.hash(newPassword, 10);
        await index_js_1.db.update(index_js_1.accounts).set({ password: hashed, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(index_js_1.accounts.id, account.id));
        return c.json({ success: true, message: "Password updated successfully" });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
exports.default = app;
//# sourceMappingURL=users.js.map
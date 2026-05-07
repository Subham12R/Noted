"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const auth_utils_js_1 = require("../lib/auth-utils.js");
const rate_limit_js_1 = require("../lib/rate-limit.js");
const zod_1 = require("zod");
const app = new hono_1.Hono();
const updateTagSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(50).optional(),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    parentId: zod_1.z.string().uuid().nullable().optional(),
});
app.get("/", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const userTags = await index_js_1.db.select().from(index_js_1.tags).where((0, drizzle_orm_1.eq)(index_js_1.tags.userId, session.user.id));
        return c.json({ tags: userTags });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
app.post("/", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "tag-create", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded" }, 429);
        const body = await c.req.json();
        const name = typeof body?.name === "string" ? body.name.trim().slice(0, 50) : "";
        if (!name)
            return c.json({ error: "name is required" }, 400);
        const color = typeof body?.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(body.color) ? body.color : "#6366f1";
        const parentId = typeof body?.parentId === "string" ? body.parentId : null;
        const [existing] = await index_js_1.db.select().from(index_js_1.tags).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.tags.userId, session.user.id), (0, drizzle_orm_1.eq)(index_js_1.tags.name, name)));
        if (existing)
            return c.json({ error: "Tag with this name already exists" }, 409);
        const [tag] = await index_js_1.db.insert(index_js_1.tags).values({ userId: session.user.id, name, color, parentId }).returning();
        return c.json({ tag }, 201);
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
app.get("/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const id = c.req.param("id");
        const [tag] = await index_js_1.db.select().from(index_js_1.tags).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.tags.id, id), (0, drizzle_orm_1.eq)(index_js_1.tags.userId, session.user.id)));
        if (!tag)
            return c.json({ error: "Tag not found" }, 404);
        return c.json({ tag });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
app.patch("/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "tag-update", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded" }, 429);
        const id = c.req.param("id");
        const body = await c.req.json();
        const validatedData = updateTagSchema.parse(body);
        const [existing] = await index_js_1.db.select().from(index_js_1.tags).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.tags.id, id), (0, drizzle_orm_1.eq)(index_js_1.tags.userId, session.user.id)));
        if (!existing)
            return c.json({ error: "Tag not found" }, 404);
        if (validatedData.name && validatedData.name !== existing.name) {
            const [dup] = await index_js_1.db.select().from(index_js_1.tags).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.tags.userId, session.user.id), (0, drizzle_orm_1.eq)(index_js_1.tags.name, validatedData.name)));
            if (dup)
                return c.json({ error: "Tag with this name already exists" }, 409);
        }
        if (validatedData.parentId === id)
            return c.json({ error: "Tag cannot be its own parent" }, 400);
        const updates = { updatedAt: new Date() };
        if (validatedData.name !== undefined)
            updates.name = validatedData.name;
        if (validatedData.color !== undefined)
            updates.color = validatedData.color;
        if (validatedData.parentId !== undefined)
            updates.parentId = validatedData.parentId;
        const [updated] = await index_js_1.db.update(index_js_1.tags).set(updates).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.tags.id, id), (0, drizzle_orm_1.eq)(index_js_1.tags.userId, session.user.id))).returning();
        return c.json({ tag: updated });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return c.json({ error: "Validation failed", details: error.issues }, 400);
        return c.json({ error: "Internal server error" }, 500);
    }
});
app.delete("/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "tag-delete", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded" }, 429);
        const id = c.req.param("id");
        const [existing] = await index_js_1.db.select().from(index_js_1.tags).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.tags.id, id), (0, drizzle_orm_1.eq)(index_js_1.tags.userId, session.user.id)));
        if (!existing)
            return c.json({ error: "Tag not found" }, 404);
        await index_js_1.db.delete(index_js_1.tags).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.tags.id, id), (0, drizzle_orm_1.eq)(index_js_1.tags.userId, session.user.id)));
        return c.json({ success: true });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
exports.default = app;
//# sourceMappingURL=tags.js.map
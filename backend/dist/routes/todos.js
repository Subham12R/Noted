"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const auth_utils_js_1 = require("../lib/auth-utils.js");
const rate_limit_js_1 = require("../lib/rate-limit.js");
const zod_1 = require("zod");
const app = new hono_1.Hono();
app.get("/", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user?.id)
            return c.json({ error: "Unauthorized" }, 401);
        const userTodos = await index_js_1.db.select().from(index_js_1.todos).where((0, drizzle_orm_1.eq)(index_js_1.todos.userId, session.user.id)).orderBy((0, drizzle_orm_1.asc)(index_js_1.todos.sortOrder), (0, drizzle_orm_1.asc)(index_js_1.todos.createdAt));
        return c.json({ todos: userTodos });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
app.post("/", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user?.id)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "todo-create", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded" }, 429);
        const body = await c.req.json();
        const text = typeof body?.text === "string" ? body.text.trim().slice(0, 500) : "";
        if (!text)
            return c.json({ error: "text is required" }, 400);
        const existingTodos = await index_js_1.db.select({ sortOrder: index_js_1.todos.sortOrder }).from(index_js_1.todos).where((0, drizzle_orm_1.eq)(index_js_1.todos.userId, session.user.id));
        const maxSort = existingTodos.reduce((m, t) => Math.max(m, t.sortOrder), -1);
        const [todo] = await index_js_1.db.insert(index_js_1.todos).values({ userId: session.user.id, text, sortOrder: maxSort + 1 }).returning();
        return c.json({ todo }, 201);
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
app.patch("/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user?.id)
            return c.json({ error: "Unauthorized" }, 401);
        const id = c.req.param("id");
        const body = await c.req.json();
        const updates = zod_1.z.object({ text: zod_1.z.string().min(1).max(500).optional(), completed: zod_1.z.boolean().optional() }).parse(body);
        const [existing] = await index_js_1.db.select().from(index_js_1.todos).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.todos.id, id), (0, drizzle_orm_1.eq)(index_js_1.todos.userId, session.user.id)));
        if (!existing)
            return c.json({ error: "Todo not found" }, 404);
        const [updated] = await index_js_1.db.update(index_js_1.todos).set({ ...updates, updatedAt: new Date() }).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.todos.id, id), (0, drizzle_orm_1.eq)(index_js_1.todos.userId, session.user.id))).returning();
        return c.json({ todo: updated });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return c.json({ error: "Invalid input", details: error.issues }, 400);
        return c.json({ error: "Internal server error" }, 500);
    }
});
app.delete("/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user?.id)
            return c.json({ error: "Unauthorized" }, 401);
        const id = c.req.param("id");
        const [existing] = await index_js_1.db.select().from(index_js_1.todos).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.todos.id, id), (0, drizzle_orm_1.eq)(index_js_1.todos.userId, session.user.id)));
        if (!existing)
            return c.json({ error: "Todo not found" }, 404);
        await index_js_1.db.delete(index_js_1.todos).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.todos.id, id), (0, drizzle_orm_1.eq)(index_js_1.todos.userId, session.user.id)));
        return c.json({ success: true });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
exports.default = app;
//# sourceMappingURL=todos.js.map
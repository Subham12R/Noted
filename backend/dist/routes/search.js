"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const auth_utils_js_1 = require("../lib/auth-utils.js");
const app = new hono_1.Hono();
app.get("/", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const q = c.req.query("q")?.trim();
        if (!q || q.length < 2)
            return c.json({ pages: [], folders: [] });
        const searchPattern = `%${q}%`;
        const matchedPages = await index_js_1.db.select({
            id: index_js_1.pages.id, name: index_js_1.pages.name, folderId: index_js_1.pages.folderId,
            updatedAt: index_js_1.pages.updatedAt, createdAt: index_js_1.pages.createdAt,
        }).from(index_js_1.pages).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pages.ownerId, session.user.id), (0, drizzle_orm_1.ilike)(index_js_1.pages.name, searchPattern))).limit(20);
        const matchedFolders = await index_js_1.db.select({
            id: index_js_1.folders.id, name: index_js_1.folders.name, color: index_js_1.folders.color,
            updatedAt: index_js_1.folders.updatedAt, createdAt: index_js_1.folders.createdAt,
        }).from(index_js_1.folders).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.folders.ownerId, session.user.id), (0, drizzle_orm_1.ilike)(index_js_1.folders.name, searchPattern))).limit(10);
        return c.json({ pages: matchedPages, folders: matchedFolders });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
exports.default = app;
//# sourceMappingURL=search.js.map
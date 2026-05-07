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
        const sharedPages = await index_js_1.db.select({
            id: index_js_1.pages.id,
            name: index_js_1.pages.name,
            content: index_js_1.pages.content,
            folderId: index_js_1.pages.folderId,
            ownerId: index_js_1.pages.ownerId,
            updatedAt: index_js_1.pages.updatedAt,
            role: index_js_1.pageCollaborators.role,
            sharedAt: index_js_1.pageCollaborators.createdAt,
            ownerName: index_js_1.users.name,
            ownerEmail: index_js_1.users.email,
            ownerImage: index_js_1.users.image,
        }).from(index_js_1.pageCollaborators)
            .innerJoin(index_js_1.pages, (0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.pageId, index_js_1.pages.id))
            .innerJoin(index_js_1.users, (0, drizzle_orm_1.eq)(index_js_1.pages.ownerId, index_js_1.users.id))
            .where((0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.userId, session.user.id));
        return c.json({ pages: sharedPages, folders: [] });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
app.delete("/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const id = c.req.param("id");
        await index_js_1.db.delete(index_js_1.pageCollaborators).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.pageId, id), (0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.userId, session.user.id)));
        return c.json({ success: true });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
exports.default = app;
//# sourceMappingURL=shared-with-me.js.map
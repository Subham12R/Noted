"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const auth_utils_js_1 = require("../lib/auth-utils.js");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const app = new hono_1.Hono();
// GET /share/:token — public view of shared page
app.get("/:token", async (c) => {
    try {
        const token = c.req.param("token");
        const [link] = await index_js_1.db.select({
            id: index_js_1.shareLinks.id, pageId: index_js_1.shareLinks.pageId, permission: index_js_1.shareLinks.permission,
            expiresAt: index_js_1.shareLinks.expiresAt, password: index_js_1.shareLinks.password,
        }).from(index_js_1.shareLinks).where((0, drizzle_orm_1.eq)(index_js_1.shareLinks.token, token));
        if (!link)
            return c.json({ error: "Share link not found" }, 404);
        if (link.expiresAt && new Date(link.expiresAt) < new Date())
            return c.json({ error: "This share link has expired" }, 410);
        if (link.password) {
            const provided = c.req.header("X-Share-Password");
            if (!provided)
                return c.json({ error: "Password required", requiresPassword: true }, 401);
            const isValid = await bcryptjs_1.default.compare(provided, link.password);
            if (!isValid)
                return c.json({ error: "Incorrect password", requiresPassword: true }, 401);
        }
        const [page] = await index_js_1.db.select({ id: index_js_1.pages.id, name: index_js_1.pages.name, content: index_js_1.pages.content, ownerId: index_js_1.pages.ownerId, updatedAt: index_js_1.pages.updatedAt }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, link.pageId));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        const [owner] = await index_js_1.db.select({ name: index_js_1.users.name, image: index_js_1.users.image }).from(index_js_1.users).where((0, drizzle_orm_1.eq)(index_js_1.users.id, page.ownerId));
        await index_js_1.db.update(index_js_1.shareLinks).set({ viewCount: (0, drizzle_orm_1.sql) `${index_js_1.shareLinks.viewCount} + 1`, lastAccessedAt: new Date() }).where((0, drizzle_orm_1.eq)(index_js_1.shareLinks.id, link.id));
        return c.json({
            page: { id: page.id, name: page.name, content: page.content, updatedAt: page.updatedAt },
            owner: { name: owner?.name || "Unknown", image: owner?.image },
            permission: link.permission,
        });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /share/:token/claim — add as collaborator
app.post("/:token/claim", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const token = c.req.param("token");
        const body = await c.req.json().catch(() => ({}));
        const [link] = await index_js_1.db.select({
            id: index_js_1.shareLinks.id, pageId: index_js_1.shareLinks.pageId, permission: index_js_1.shareLinks.permission,
            expiresAt: index_js_1.shareLinks.expiresAt, password: index_js_1.shareLinks.password,
        }).from(index_js_1.shareLinks).where((0, drizzle_orm_1.eq)(index_js_1.shareLinks.token, token));
        if (!link)
            return c.json({ error: "Share link not found" }, 404);
        if (link.expiresAt && new Date(link.expiresAt) < new Date())
            return c.json({ error: "This share link has expired" }, 410);
        if (link.password) {
            if (!body.password)
                return c.json({ error: "Password required", requiresPassword: true }, 401);
            const isValid = await bcryptjs_1.default.compare(body.password, link.password);
            if (!isValid)
                return c.json({ error: "Incorrect password", requiresPassword: true }, 401);
        }
        const [page] = await index_js_1.db.select({ id: index_js_1.pages.id, ownerId: index_js_1.pages.ownerId }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, link.pageId));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        if (page.ownerId === session.user.id)
            return c.json({ success: true, message: "You own this page", pageId: page.id, role: "owner" });
        const [existing] = await index_js_1.db.select({ id: index_js_1.pageCollaborators.id, role: index_js_1.pageCollaborators.role }).from(index_js_1.pageCollaborators).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.pageId, link.pageId), (0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.userId, session.user.id)));
        const role = link.permission === "edit" ? "editor" : "viewer";
        if (existing) {
            if (link.permission === "edit" && existing.role === "viewer") {
                await index_js_1.db.update(index_js_1.pageCollaborators).set({ role: "editor" }).where((0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.id, existing.id));
                return c.json({ success: true, message: "Access upgraded to editor", pageId: page.id, role: "editor" });
            }
            return c.json({ success: true, message: "You already have access", pageId: page.id, role: existing.role });
        }
        await index_js_1.db.insert(index_js_1.pageCollaborators).values({ pageId: link.pageId, userId: session.user.id, role });
        return c.json({ success: true, message: `Access granted as ${role}`, pageId: page.id, role });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
exports.default = app;
//# sourceMappingURL=share.js.map
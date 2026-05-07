"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const auth_utils_js_1 = require("../lib/auth-utils.js");
const rate_limit_js_1 = require("../lib/rate-limit.js");
const validation_js_1 = require("../lib/validation.js");
const subscription_js_1 = require("../lib/subscription.js");
const zod_1 = require("zod");
const app = new hono_1.Hono();
app.get("/", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const parentId = c.req.query("parentId");
        const userFolders = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.ownerId, session.user.id)).orderBy((0, drizzle_orm_1.asc)(index_js_1.folders.sortOrder), (0, drizzle_orm_1.asc)(index_js_1.folders.createdAt));
        if (parentId) {
            const filtered = userFolders.filter(f => parentId === "null" ? f.parentId === null : f.parentId === parentId);
            return c.json({ folders: filtered });
        }
        return c.json({ folders: userFolders });
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
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "folder-create", ...rate_limit_js_1.RATE_LIMITS.FOLDER_CREATE });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429);
        const limitCheck = await (0, subscription_js_1.canCreateFolder)(session.user.id);
        if (!limitCheck.allowed)
            return c.json({ error: "Limit reached", message: limitCheck.reason, code: "FOLDER_LIMIT_REACHED" }, 403);
        const body = await c.req.json();
        const validatedData = validation_js_1.createFolderSchema.parse(body);
        if (validatedData.parentId) {
            const [parent] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, validatedData.parentId));
            if (!parent || parent.ownerId !== session.user.id)
                return c.json({ error: "Parent folder not found" }, 404);
        }
        const existing = await index_js_1.db.select({ sortOrder: index_js_1.folders.sortOrder }).from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.ownerId, session.user.id));
        const maxSort = existing.reduce((m, f) => Math.max(m, f.sortOrder), -1);
        const [folder] = await index_js_1.db.insert(index_js_1.folders).values({
            name: validatedData.name, ownerId: session.user.id,
            parentId: validatedData.parentId || null, color: validatedData.color || null, sortOrder: maxSort + 1,
        }).returning();
        return c.json({ folder }, 201);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return c.json({ error: "Validation failed", details: error.issues }, 400);
        return c.json({ error: "Internal server error" }, 500);
    }
});
app.get("/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const id = c.req.param("id");
        const [folder] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, id));
        if (!folder)
            return c.json({ error: "Folder not found" }, 404);
        if (folder.ownerId !== session.user.id)
            return c.json({ error: "Forbidden" }, 403);
        const folderPages = await index_js_1.db.select({ id: index_js_1.pages.id, name: index_js_1.pages.name, createdAt: index_js_1.pages.createdAt, updatedAt: index_js_1.pages.updatedAt, sortOrder: index_js_1.pages.sortOrder }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.folderId, id));
        const childFolders = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.parentId, id));
        return c.json({ folder, pages: folderPages, childFolders });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
app.put("/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "folder-update", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded" }, 429);
        const id = c.req.param("id");
        const [folder] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, id));
        if (!folder)
            return c.json({ error: "Folder not found" }, 404);
        if (folder.ownerId !== session.user.id)
            return c.json({ error: "Forbidden" }, 403);
        const body = await c.req.json();
        const validatedData = validation_js_1.updateFolderSchema.parse(body);
        const [updated] = await index_js_1.db.update(index_js_1.folders).set({ ...validatedData, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, id)).returning();
        return c.json({ folder: updated });
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
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "folder-delete", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded" }, 429);
        const id = c.req.param("id");
        const [folder] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, id));
        if (!folder)
            return c.json({ error: "Folder not found" }, 404);
        if (folder.ownerId !== session.user.id)
            return c.json({ error: "Forbidden" }, 403);
        await index_js_1.db.delete(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, id));
        return c.json({ success: true });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /folders/:id/move
app.post("/:id/move", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "folder-move", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded" }, 429);
        const id = c.req.param("id");
        const body = await c.req.json();
        const { targetParentId } = zod_1.z.object({ targetParentId: zod_1.z.string().uuid().nullable() }).parse(body);
        const [folder] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, id));
        if (!folder)
            return c.json({ error: "Folder not found" }, 404);
        if (folder.ownerId !== session.user.id)
            return c.json({ error: "Forbidden" }, 403);
        if (targetParentId === id)
            return c.json({ error: "Cannot move folder into itself" }, 400);
        if (folder.parentId === targetParentId)
            return c.json({ folder });
        if (targetParentId) {
            const allFolders = await index_js_1.db.select().from(index_js_1.folders);
            const folderMap = new Map(allFolders.map(f => [f.id, f]));
            let current = folderMap.get(targetParentId);
            while (current) {
                if (current.id === id)
                    return c.json({ error: "Cannot move folder into its own subfolder" }, 400);
                if (!current.parentId)
                    break;
                current = folderMap.get(current.parentId);
            }
            const [target] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, targetParentId));
            if (!target || target.ownerId !== session.user.id)
                return c.json({ error: "Target folder not found" }, 404);
        }
        const siblings = targetParentId
            ? await index_js_1.db.select({ sortOrder: index_js_1.folders.sortOrder }).from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.parentId, targetParentId))
            : await index_js_1.db.select({ sortOrder: index_js_1.folders.sortOrder }).from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.ownerId, session.user.id));
        const maxSort = siblings.filter(f => f.sortOrder !== null).reduce((m, f) => Math.max(m, f.sortOrder), -1);
        const [updated] = await index_js_1.db.update(index_js_1.folders).set({ parentId: targetParentId, sortOrder: maxSort + 1, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, id)).returning();
        return c.json({ folder: updated });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return c.json({ error: "Validation failed", details: error.issues }, 400);
        return c.json({ error: "Internal server error" }, 500);
    }
});
exports.default = app;
//# sourceMappingURL=folders.js.map
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
const validation_js_1 = require("../lib/validation.js");
const subscription_js_1 = require("../lib/subscription.js");
const zod_1 = require("zod");
const crypto_1 = require("crypto");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const app = new hono_1.Hono();
async function hasPageAccess(pageId, userId) {
    const [page] = await index_js_1.db.select({ ownerId: index_js_1.pages.ownerId, folderId: index_js_1.pages.folderId }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, pageId));
    if (!page)
        return { hasAccess: false, role: null };
    if (page.ownerId === userId)
        return { hasAccess: true, role: "owner" };
    const [pageCollab] = await index_js_1.db.select({ role: index_js_1.pageCollaborators.role }).from(index_js_1.pageCollaborators)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.pageId, pageId), (0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.userId, userId)));
    if (pageCollab)
        return { hasAccess: true, role: pageCollab.role };
    const [folderCollab] = await index_js_1.db.select({ role: index_js_1.folderCollaborators.role }).from(index_js_1.folderCollaborators)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.folderCollaborators.folderId, page.folderId), (0, drizzle_orm_1.eq)(index_js_1.folderCollaborators.userId, userId)));
    if (folderCollab)
        return { hasAccess: true, role: folderCollab.role };
    return { hasAccess: false, role: null };
}
async function canEditPage(pageId, userId) {
    const [page] = await index_js_1.db.select({ ownerId: index_js_1.pages.ownerId }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, pageId));
    if (!page)
        return false;
    if (page.ownerId === userId)
        return true;
    const [collaborator] = await index_js_1.db.select({ role: index_js_1.pageCollaborators.role }).from(index_js_1.pageCollaborators)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.pageId, pageId), (0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.userId, userId)));
    return !!(collaborator && (collaborator.role === "editor" || collaborator.role === "admin"));
}
// GET /pages
app.get("/", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const folderId = c.req.query("folderId");
        const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
        const recent = c.req.query("recent") === "true";
        const baseSelect = {
            id: index_js_1.pages.id, name: index_js_1.pages.name, content: index_js_1.pages.content, folderId: index_js_1.pages.folderId,
            createdAt: index_js_1.pages.createdAt, updatedAt: index_js_1.pages.updatedAt, lastSavedAt: index_js_1.pages.lastSavedAt,
            sortOrder: index_js_1.pages.sortOrder, isPublic: index_js_1.pages.isPublic, version: index_js_1.pages.version,
        };
        let userPages;
        if (recent) {
            userPages = await index_js_1.db.select(baseSelect).from(index_js_1.pages)
                .where((0, drizzle_orm_1.eq)(index_js_1.pages.ownerId, session.user.id))
                .orderBy((0, drizzle_orm_1.desc)(index_js_1.pages.updatedAt)).limit(limit);
        }
        else if (folderId) {
            userPages = await index_js_1.db.select(baseSelect).from(index_js_1.pages)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pages.ownerId, session.user.id), (0, drizzle_orm_1.eq)(index_js_1.pages.folderId, folderId))).limit(limit);
        }
        else {
            userPages = await index_js_1.db.select(baseSelect).from(index_js_1.pages)
                .where((0, drizzle_orm_1.eq)(index_js_1.pages.ownerId, session.user.id)).limit(limit);
        }
        const pageIds = userPages.map((p) => p.id);
        const sharedLinkPages = pageIds.length > 0
            ? await index_js_1.db.selectDistinct({ pageId: index_js_1.shareLinks.pageId }).from(index_js_1.shareLinks)
                .where((0, drizzle_orm_1.sql) `${index_js_1.shareLinks.pageId} IN ${pageIds}`)
            : [];
        const collaboratorPages = pageIds.length > 0
            ? await index_js_1.db.selectDistinct({ pageId: index_js_1.pageCollaborators.pageId }).from(index_js_1.pageCollaborators)
                .where((0, drizzle_orm_1.sql) `${index_js_1.pageCollaborators.pageId} IN ${pageIds}`)
            : [];
        const sharedPageIds = new Set([
            ...sharedLinkPages.map((p) => p.pageId),
            ...collaboratorPages.map((p) => p.pageId),
        ]);
        return c.json({ pages: userPages.map((page) => ({ ...page, isShared: sharedPageIds.has(page.id) })) });
    }
    catch (error) {
        console.error("Get pages error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /pages
app.post("/", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "page-create", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429);
        const limitCheck = await (0, subscription_js_1.canCreatePage)(session.user.id);
        if (!limitCheck.allowed) {
            return c.json({ error: "Limit reached", message: limitCheck.reason, current: limitCheck.current, limit: limitCheck.limit, code: "NOTE_LIMIT_REACHED" }, 403);
        }
        const body = await c.req.json();
        const validatedData = validation_js_1.createPageSchema.parse(body);
        const [folder] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, validatedData.folderId));
        if (!folder || folder.ownerId !== session.user.id)
            return c.json({ error: "Folder not found" }, 404);
        const blocks = (validatedData.blocks ? (0, validation_js_1.sanitizeBlocks)(validatedData.blocks) : []);
        const existingPages = await index_js_1.db.select({ sortOrder: index_js_1.pages.sortOrder }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.folderId, validatedData.folderId));
        const maxSortOrder = existingPages.reduce((max, p) => Math.max(max, p.sortOrder), -1);
        const [newPage] = await index_js_1.db.insert(index_js_1.pages).values({
            name: validatedData.name, folderId: validatedData.folderId, ownerId: session.user.id,
            blocks, sortOrder: maxSortOrder + 1,
        }).returning();
        return c.json({ page: newPage }, 201);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return c.json({ error: "Validation failed", details: error.issues }, 400);
        console.error("Create page error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// GET /pages/:id
app.get("/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const id = c.req.param("id");
        const [page] = await index_js_1.db.select().from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        const { hasAccess, role } = await hasPageAccess(id, session.user.id);
        if (!page.isPublic && !hasAccess)
            return c.json({ error: "Forbidden" }, 403);
        const [folder] = await index_js_1.db.select({ id: index_js_1.folders.id, name: index_js_1.folders.name }).from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, page.folderId));
        return c.json({ page: { ...page, folder: folder || null }, role: role || (page.isPublic ? "viewer" : null) });
    }
    catch (error) {
        console.error("Get page error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// PUT /pages/:id
app.put("/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "page-update", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429);
        const id = c.req.param("id");
        const body = await c.req.json();
        const validatedData = validation_js_1.updatePageSchema.parse(body);
        const { hasAccess, role } = await hasPageAccess(id, session.user.id);
        if (!hasAccess)
            return c.json({ error: "Page not found" }, 404);
        if (role !== "owner" && role !== "admin") {
            if (validatedData.folderId || validatedData.isPublic !== undefined) {
                return c.json({ error: "Forbidden" }, 403);
            }
        }
        if (validatedData.folderId) {
            const [folder] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, validatedData.folderId));
            if (!folder || folder.ownerId !== session.user.id)
                return c.json({ error: "Folder not found" }, 404);
        }
        const updateData = { ...validatedData, updatedAt: new Date() };
        if (validatedData.content !== undefined)
            updateData.content = (0, validation_js_1.sanitizeContent)(validatedData.content);
        if (validatedData.blocks)
            updateData.blocks = (0, validation_js_1.sanitizeBlocks)(validatedData.blocks);
        const [updatedPage] = await index_js_1.db.update(index_js_1.pages).set(updateData).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id)).returning();
        return c.json({ page: updatedPage });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return c.json({ error: "Validation failed", details: error.issues }, 400);
        console.error("Update page error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// DELETE /pages/:id
app.delete("/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "page-delete", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429);
        const id = c.req.param("id");
        const [page] = await index_js_1.db.select().from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        if (page.ownerId !== session.user.id)
            return c.json({ error: "Forbidden" }, 403);
        await index_js_1.db.delete(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id));
        return c.json({ success: true });
    }
    catch (error) {
        console.error("Delete page error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /pages/:id/save
app.post("/:id/save", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const id = c.req.param("id");
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: `${session.user.id}:${id}`, endpoint: "page-save", ...rate_limit_js_1.RATE_LIMITS.PAGE_SAVE });
        if (!rl.success) {
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter, message: "Too many save requests. Please wait before saving again." }, 429);
        }
        const body = await c.req.json();
        const validatedData = validation_js_1.savePageSchema.parse(body);
        const canEdit = await canEditPage(id, session.user.id);
        if (!canEdit)
            return c.json({ error: "Forbidden" }, 403);
        const [currentPage] = await index_js_1.db.select({ version: index_js_1.pages.version, ownerId: index_js_1.pages.ownerId }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id));
        if (!currentPage)
            return c.json({ error: "Page not found" }, 404);
        if (currentPage.version !== validatedData.expectedVersion) {
            return c.json({ error: "Version conflict", currentVersion: currentPage.version, expectedVersion: validatedData.expectedVersion,
                message: "The page was modified by another user. Please refresh and try again." }, 409);
        }
        const sanitizedBlocks = (0, validation_js_1.sanitizeBlocks)(validatedData.blocks);
        const newVersion = currentPage.version + 1;
        const now = new Date();
        const [updatedPage] = await index_js_1.db.update(index_js_1.pages).set({
            blocks: sanitizedBlocks, ydocState: validatedData.ydocState, version: newVersion, updatedAt: now, lastSavedAt: now,
        }).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pages.id, id), (0, drizzle_orm_1.eq)(index_js_1.pages.version, validatedData.expectedVersion)))
            .returning({ id: index_js_1.pages.id, version: index_js_1.pages.version, lastSavedAt: index_js_1.pages.lastSavedAt });
        if (!updatedPage) {
            return c.json({ error: "Concurrent modification detected", message: "Another save happened at the same time. Please refresh and try again." }, 409);
        }
        return c.json({ success: true, version: updatedPage.version, savedAt: updatedPage.lastSavedAt?.toISOString() });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return c.json({ error: "Validation failed", details: error.issues }, 400);
        console.error("Save page error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// GET /pages/:id/share
app.get("/:id/share", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const id = c.req.param("id");
        const [page] = await index_js_1.db.select({ id: index_js_1.pages.id, name: index_js_1.pages.name, ownerId: index_js_1.pages.ownerId, isPublic: index_js_1.pages.isPublic })
            .from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        const isOwner = page.ownerId === session.user.id;
        const [collaborator] = await index_js_1.db.select().from(index_js_1.pageCollaborators)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.pageId, id), (0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.userId, session.user.id)));
        if (!isOwner && !collaborator)
            return c.json({ error: "Forbidden" }, 403);
        const [owner] = await index_js_1.db.select({ id: index_js_1.users.id, name: index_js_1.users.name, email: index_js_1.users.email, image: index_js_1.users.image })
            .from(index_js_1.users).where((0, drizzle_orm_1.eq)(index_js_1.users.id, page.ownerId));
        const links = await index_js_1.db.select({
            id: index_js_1.shareLinks.id, token: index_js_1.shareLinks.token, permission: index_js_1.shareLinks.permission,
            expiresAt: index_js_1.shareLinks.expiresAt, viewCount: index_js_1.shareLinks.viewCount, hasPassword: index_js_1.shareLinks.password, createdAt: index_js_1.shareLinks.createdAt,
        }).from(index_js_1.shareLinks).where((0, drizzle_orm_1.eq)(index_js_1.shareLinks.pageId, id));
        const collaborators = await index_js_1.db.select({
            id: index_js_1.pageCollaborators.id, role: index_js_1.pageCollaborators.role, createdAt: index_js_1.pageCollaborators.createdAt,
            user: { id: index_js_1.users.id, name: index_js_1.users.name, email: index_js_1.users.email, image: index_js_1.users.image },
        }).from(index_js_1.pageCollaborators).innerJoin(index_js_1.users, (0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.userId, index_js_1.users.id)).where((0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.pageId, id));
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        return c.json({
            pageId: id, pageName: page.name, isPublic: page.isPublic, isOwner,
            currentUserRole: isOwner ? "owner" : collaborator?.role,
            owner: { ...owner, role: "owner" },
            collaborators,
            shareLinks: links.map((link) => ({
                ...link, hasPassword: !!link.hasPassword,
                url: `${baseUrl}/share/${link.token}`,
                isExpired: link.expiresAt ? new Date(link.expiresAt) < new Date() : false,
            })),
        });
    }
    catch (error) {
        console.error("Get share settings error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /pages/:id/share
app.post("/:id/share", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "share-create", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429);
        const id = c.req.param("id");
        const body = await c.req.json();
        const shareSettingsSchema = zod_1.z.object({
            permission: zod_1.z.enum(["view", "edit"]).optional(),
            expiresIn: zod_1.z.number().optional(),
            password: zod_1.z.string().optional(),
        });
        const { permission = "view", expiresIn, password } = shareSettingsSchema.parse(body);
        const [page] = await index_js_1.db.select({ ownerId: index_js_1.pages.ownerId }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        const isOwner = page.ownerId === session.user.id;
        const [collaborator] = await index_js_1.db.select({ role: index_js_1.pageCollaborators.role }).from(index_js_1.pageCollaborators)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.pageId, id), (0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.userId, session.user.id)));
        if (!isOwner && collaborator?.role !== "admin")
            return c.json({ error: "Only owners and admins can create share links" }, 403);
        const token = (0, crypto_1.randomBytes)(32).toString("hex");
        const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000) : null;
        const hashedPassword = password ? await bcryptjs_1.default.hash(password, 10) : null;
        const [newLink] = await index_js_1.db.insert(index_js_1.shareLinks).values({
            pageId: id, token, createdBy: session.user.id, permission, password: hashedPassword, expiresAt,
        }).returning();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        return c.json({
            id: newLink.id, token: newLink.token, permission: newLink.permission, expiresAt: newLink.expiresAt,
            hasPassword: !!newLink.password, url: `${baseUrl}/share/${newLink.token}`, createdAt: newLink.createdAt,
        }, 201);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return c.json({ error: "Validation failed", details: error.issues }, 400);
        console.error("Create share link error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// PUT /pages/:id/share
app.put("/:id/share", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "share-settings", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429);
        const id = c.req.param("id");
        const body = await c.req.json();
        const validatedData = zod_1.z.object({ isPublic: zod_1.z.boolean().optional() }).parse(body);
        const [page] = await index_js_1.db.select({ ownerId: index_js_1.pages.ownerId }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        if (page.ownerId !== session.user.id)
            return c.json({ error: "Forbidden" }, 403);
        const [updatedPage] = await index_js_1.db.update(index_js_1.pages).set({ isPublic: validatedData.isPublic, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id)).returning({ id: index_js_1.pages.id, isPublic: index_js_1.pages.isPublic });
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        return c.json({
            isPublic: updatedPage.isPublic,
            shareLink: `${baseUrl}/note/${id}`,
            message: validatedData.isPublic ? "Page is now public." : "Page is now private.",
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return c.json({ error: "Validation failed", details: error.issues }, 400);
        console.error("Update share settings error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// DELETE /pages/:id/share
app.delete("/:id/share", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "share-delete", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429);
        const id = c.req.param("id");
        const linkId = c.req.query("linkId");
        if (!linkId)
            return c.json({ error: "linkId is required" }, 400);
        const [page] = await index_js_1.db.select({ ownerId: index_js_1.pages.ownerId }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        if (page.ownerId !== session.user.id)
            return c.json({ error: "Forbidden" }, 403);
        await index_js_1.db.delete(index_js_1.shareLinks).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.shareLinks.id, linkId), (0, drizzle_orm_1.eq)(index_js_1.shareLinks.pageId, id)));
        return c.json({ success: true });
    }
    catch (error) {
        console.error("Delete share link error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// GET /pages/:id/collaborators
app.get("/:id/collaborators", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const id = c.req.param("id");
        const [page] = await index_js_1.db.select({ ownerId: index_js_1.pages.ownerId }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        const isOwner = page.ownerId === session.user.id;
        const [isCollaborator] = await index_js_1.db.select().from(index_js_1.pageCollaborators)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.pageId, id), (0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.userId, session.user.id)));
        if (!isOwner && !isCollaborator)
            return c.json({ error: "Forbidden" }, 403);
        const [owner] = await index_js_1.db.select({ id: index_js_1.users.id, name: index_js_1.users.name, email: index_js_1.users.email, avatar: index_js_1.users.image })
            .from(index_js_1.users).where((0, drizzle_orm_1.eq)(index_js_1.users.id, page.ownerId));
        const collaborators = await index_js_1.db.select({
            id: index_js_1.pageCollaborators.id, role: index_js_1.pageCollaborators.role, createdAt: index_js_1.pageCollaborators.createdAt,
            user: { id: index_js_1.users.id, name: index_js_1.users.name, email: index_js_1.users.email, avatar: index_js_1.users.image },
        }).from(index_js_1.pageCollaborators).innerJoin(index_js_1.users, (0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.userId, index_js_1.users.id)).where((0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.pageId, id));
        return c.json({ owner: { ...owner, role: "owner" }, collaborators });
    }
    catch (error) {
        console.error("Get collaborators error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /pages/:id/collaborators
app.post("/:id/collaborators", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "collaborator-add", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429);
        const id = c.req.param("id");
        const body = await c.req.json();
        const validatedData = validation_js_1.addCollaboratorSchema.parse(body);
        const [page] = await index_js_1.db.select({ ownerId: index_js_1.pages.ownerId }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        if (page.ownerId !== session.user.id)
            return c.json({ error: "Forbidden" }, 403);
        const [targetUser] = await index_js_1.db.select().from(index_js_1.users).where((0, drizzle_orm_1.eq)(index_js_1.users.id, validatedData.userId));
        if (!targetUser)
            return c.json({ error: "User not found" }, 404);
        if (validatedData.userId === page.ownerId)
            return c.json({ error: "Cannot add owner as collaborator" }, 400);
        const [existing] = await index_js_1.db.select().from(index_js_1.pageCollaborators)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.pageId, id), (0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.userId, validatedData.userId)));
        if (existing) {
            if (existing.role !== validatedData.role) {
                await index_js_1.db.update(index_js_1.pageCollaborators).set({ role: validatedData.role }).where((0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.id, existing.id));
            }
            return c.json({ message: "Collaborator updated" });
        }
        const [newCollaborator] = await index_js_1.db.insert(index_js_1.pageCollaborators)
            .values({ pageId: id, userId: validatedData.userId, role: validatedData.role }).returning();
        return c.json({ collaborator: newCollaborator }, 201);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return c.json({ error: "Validation failed", details: error.issues }, 400);
        console.error("Add collaborator error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// DELETE /pages/:id/collaborators
app.delete("/:id/collaborators", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "collaborator-remove", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429);
        const id = c.req.param("id");
        const userId = c.req.query("userId");
        if (!userId)
            return c.json({ error: "userId is required" }, 400);
        const [page] = await index_js_1.db.select({ ownerId: index_js_1.pages.ownerId }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        const isOwner = page.ownerId === session.user.id;
        const isSelf = userId === session.user.id;
        if (!isOwner && !isSelf)
            return c.json({ error: "Forbidden" }, 403);
        await index_js_1.db.delete(index_js_1.pageCollaborators).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.pageId, id), (0, drizzle_orm_1.eq)(index_js_1.pageCollaborators.userId, userId)));
        return c.json({ success: true });
    }
    catch (error) {
        console.error("Remove collaborator error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// GET /pages/:id/tags
app.get("/:id/tags", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const pageId = c.req.param("id");
        const [page] = await index_js_1.db.select().from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, pageId));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        if (page.ownerId !== session.user.id)
            return c.json({ error: "Unauthorized" }, 403);
        const pageTagsData = await index_js_1.db.select({ id: index_js_1.tags.id, name: index_js_1.tags.name, color: index_js_1.tags.color, parentId: index_js_1.tags.parentId })
            .from(index_js_1.pageTags).innerJoin(index_js_1.tags, (0, drizzle_orm_1.eq)(index_js_1.pageTags.tagId, index_js_1.tags.id))
            .where((0, drizzle_orm_1.eq)(index_js_1.pageTags.pageId, pageId)).orderBy(index_js_1.tags.name);
        return c.json({ tags: pageTagsData });
    }
    catch (error) {
        console.error("Get page tags error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// PUT /pages/:id/tags
app.put("/:id/tags", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const pageId = c.req.param("id");
        const body = await c.req.json();
        const { tagIds } = zod_1.z.object({ tagIds: zod_1.z.array(zod_1.z.string().uuid()) }).parse(body);
        const [page] = await index_js_1.db.select().from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, pageId));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        if (page.ownerId !== session.user.id)
            return c.json({ error: "Unauthorized" }, 403);
        if (tagIds.length > 0) {
            const userTags = await index_js_1.db.select({ id: index_js_1.tags.id }).from(index_js_1.tags)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.tags.userId, session.user.id), (0, drizzle_orm_1.inArray)(index_js_1.tags.id, tagIds)));
            if (userTags.length !== tagIds.length)
                return c.json({ error: "One or more tags not found" }, 404);
        }
        await index_js_1.db.delete(index_js_1.pageTags).where((0, drizzle_orm_1.eq)(index_js_1.pageTags.pageId, pageId));
        if (tagIds.length > 0) {
            await index_js_1.db.insert(index_js_1.pageTags).values(tagIds.map((tagId) => ({ pageId, tagId })));
        }
        const updatedTags = await index_js_1.db.select({ id: index_js_1.tags.id, name: index_js_1.tags.name, color: index_js_1.tags.color, parentId: index_js_1.tags.parentId })
            .from(index_js_1.pageTags).innerJoin(index_js_1.tags, (0, drizzle_orm_1.eq)(index_js_1.pageTags.tagId, index_js_1.tags.id))
            .where((0, drizzle_orm_1.eq)(index_js_1.pageTags.pageId, pageId)).orderBy(index_js_1.tags.name);
        return c.json({ tags: updatedTags });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return c.json({ error: "Validation failed", details: error.issues }, 400);
        console.error("Update page tags error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /pages/:id/tags
app.post("/:id/tags", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const pageId = c.req.param("id");
        const body = await c.req.json();
        const { tagId } = body;
        if (!tagId)
            return c.json({ error: "tagId is required" }, 400);
        const [page] = await index_js_1.db.select().from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, pageId));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        if (page.ownerId !== session.user.id)
            return c.json({ error: "Unauthorized" }, 403);
        const [tag] = await index_js_1.db.select().from(index_js_1.tags).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.tags.id, tagId), (0, drizzle_orm_1.eq)(index_js_1.tags.userId, session.user.id)));
        if (!tag)
            return c.json({ error: "Tag not found" }, 404);
        const [existingPageTag] = await index_js_1.db.select().from(index_js_1.pageTags).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pageTags.pageId, pageId), (0, drizzle_orm_1.eq)(index_js_1.pageTags.tagId, tagId)));
        if (existingPageTag)
            return c.json({ error: "Page already has this tag" }, 409);
        await index_js_1.db.insert(index_js_1.pageTags).values({ pageId, tagId });
        return c.json({ success: true, tag });
    }
    catch (error) {
        console.error("Add page tag error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// DELETE /pages/:id/tags
app.delete("/:id/tags", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const pageId = c.req.param("id");
        const tagId = c.req.query("tagId");
        if (!tagId)
            return c.json({ error: "tagId is required" }, 400);
        const [page] = await index_js_1.db.select().from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, pageId));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        if (page.ownerId !== session.user.id)
            return c.json({ error: "Unauthorized" }, 403);
        await index_js_1.db.delete(index_js_1.pageTags).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pageTags.pageId, pageId), (0, drizzle_orm_1.eq)(index_js_1.pageTags.tagId, tagId)));
        return c.json({ success: true });
    }
    catch (error) {
        console.error("Remove page tag error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /pages/:id/move
app.post("/:id/move", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "page-move", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429);
        const id = c.req.param("id");
        const body = await c.req.json();
        const { targetFolderId } = zod_1.z.object({ targetFolderId: zod_1.z.string().uuid("Invalid folder ID") }).parse(body);
        const [page] = await index_js_1.db.select().from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id));
        if (!page)
            return c.json({ error: "Page not found" }, 404);
        if (page.ownerId !== session.user.id)
            return c.json({ error: "Forbidden" }, 403);
        if (page.folderId === targetFolderId)
            return c.json({ page });
        const [targetFolder] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, targetFolderId));
        if (!targetFolder)
            return c.json({ error: "Target folder not found" }, 404);
        if (targetFolder.ownerId !== session.user.id)
            return c.json({ error: "Forbidden" }, 403);
        const existingPages = await index_js_1.db.select({ sortOrder: index_js_1.pages.sortOrder }).from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.folderId, targetFolderId));
        const maxSortOrder = existingPages.reduce((max, p) => Math.max(max, p.sortOrder), -1);
        const [updatedPage] = await index_js_1.db.update(index_js_1.pages).set({
            folderId: targetFolderId, sortOrder: maxSortOrder + 1, updatedAt: new Date(),
        }).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, id)).returning();
        return c.json({ page: updatedPage });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return c.json({ error: "Validation failed", details: error.issues }, 400);
        console.error("Move page error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
exports.default = app;
//# sourceMappingURL=pages.js.map
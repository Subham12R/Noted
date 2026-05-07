"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const auth_utils_js_1 = require("../lib/auth-utils.js");
const rate_limit_js_1 = require("../lib/rate-limit.js");
const r2_js_1 = require("../lib/storage/r2.js");
const zod_1 = require("zod");
const app = new hono_1.Hono();
function getFileType(mimeType) {
    if (mimeType.startsWith("image/"))
        return "image";
    if (mimeType === "application/pdf")
        return "pdf";
    if (mimeType.startsWith("video/"))
        return "video";
    if (mimeType.startsWith("audio/"))
        return "audio";
    if (mimeType.includes("document") || mimeType.includes("word") || mimeType.includes("spreadsheet") ||
        mimeType.includes("excel") || mimeType.includes("presentation") || mimeType.includes("powerpoint"))
        return "document";
    return "file";
}
const STORAGE_LIMITS = {
    free: 50 * 1024 * 1024,
    pro: 100 * 1024 * 1024,
    team: 500 * 1024 * 1024,
};
const MAX_FILE_SIZE = {
    free: 5 * 1024 * 1024,
    pro: 20 * 1024 * 1024,
    team: 100 * 1024 * 1024,
};
const SAFE_FILE_COLUMNS = {
    id: index_js_1.files.id, userId: index_js_1.files.userId, pageId: index_js_1.files.pageId, folderId: index_js_1.files.folderId,
    name: index_js_1.files.name, originalName: index_js_1.files.originalName, mimeType: index_js_1.files.mimeType,
    size: index_js_1.files.size, url: index_js_1.files.url, thumbnailUrl: index_js_1.files.thumbnailUrl, type: index_js_1.files.type,
    isStarred: index_js_1.files.isStarred, accessedAt: index_js_1.files.accessedAt, createdAt: index_js_1.files.createdAt, updatedAt: index_js_1.files.updatedAt,
};
const patchFileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    folderId: zod_1.z.string().uuid().nullable().optional(),
    pageId: zod_1.z.string().uuid().nullable().optional(),
    isStarred: zod_1.z.boolean().optional(),
});
// GET /files
app.get("/", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const type = c.req.query("type");
        const folderId = c.req.query("folderId");
        const starred = c.req.query("starred") === "true";
        const recent = c.req.query("recent") === "true";
        const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
        const offset = Math.max(parseInt(c.req.query("offset") || "0"), 0);
        const conditions = [(0, drizzle_orm_1.eq)(index_js_1.files.userId, session.user.id)];
        if (type && type !== "all")
            conditions.push((0, drizzle_orm_1.eq)(index_js_1.files.type, type));
        if (folderId)
            conditions.push((0, drizzle_orm_1.eq)(index_js_1.files.folderId, folderId));
        if (starred)
            conditions.push((0, drizzle_orm_1.eq)(index_js_1.files.isStarred, true));
        const userFiles = await index_js_1.db.select(SAFE_FILE_COLUMNS).from(index_js_1.files)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy(recent ? (0, drizzle_orm_1.desc)(index_js_1.files.accessedAt) : (0, drizzle_orm_1.desc)(index_js_1.files.createdAt))
            .limit(limit).offset(offset);
        const [countResult] = await index_js_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)::int` }).from(index_js_1.files).where((0, drizzle_orm_1.and)(...conditions));
        const [storageResult] = await index_js_1.db.select({ total: (0, drizzle_orm_1.sql) `coalesce(sum(${index_js_1.files.size}), 0)::bigint` })
            .from(index_js_1.files).where((0, drizzle_orm_1.eq)(index_js_1.files.userId, session.user.id));
        const tier = "free";
        return c.json({
            files: userFiles, total: countResult?.count || 0,
            storage: {
                used: Number(storageResult?.total || 0),
                limit: STORAGE_LIMITS[tier],
                percentage: Math.round((Number(storageResult?.total || 0) / STORAGE_LIMITS[tier]) * 100),
            },
        });
    }
    catch (error) {
        console.error("GET /files error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /files (multipart upload)
app.post("/", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "file-upload", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429);
        const formData = await c.req.formData();
        const file = formData.get("file");
        const pageId = formData.get("pageId");
        const folderId = formData.get("folderId");
        if (!file)
            return c.json({ error: "No file provided" }, 400);
        const blockedTypes = ["application/x-msdownload", "application/x-executable", "text/x-shellscript"];
        if (blockedTypes.includes(file.type))
            return c.json({ error: "File type not allowed" }, 400);
        const tier = "free";
        if (file.size > MAX_FILE_SIZE[tier])
            return c.json({ error: "File too large", maxSize: MAX_FILE_SIZE[tier] }, 413);
        const [storageResult] = await index_js_1.db.select({ total: (0, drizzle_orm_1.sql) `coalesce(sum(${index_js_1.files.size}), 0)::bigint` })
            .from(index_js_1.files).where((0, drizzle_orm_1.eq)(index_js_1.files.userId, session.user.id));
        const currentStorage = Number(storageResult?.total || 0);
        if (currentStorage + file.size > STORAGE_LIMITS[tier]) {
            return c.json({ error: "Storage quota exceeded", used: currentStorage, limit: STORAGE_LIMITS[tier] }, 403);
        }
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
        const storageName = `${timestamp}-${randomStr}.${extension}`;
        const storageKey = `uploads/${session.user.id}/${storageName}`;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let url;
        if ((0, r2_js_1.isR2Configured)()) {
            url = await (0, r2_js_1.uploadFile)(storageKey, buffer, file.type);
        }
        else {
            url = `data:${file.type};base64,${buffer.toString("base64")}`;
        }
        const fileType = getFileType(file.type);
        const [newFile] = await index_js_1.db.insert(index_js_1.files).values({
            userId: session.user.id, pageId: pageId || null, folderId: folderId || null,
            name: storageName, originalName: file.name.replace(/\.\.|\/|\\|\0/g, "_").slice(0, 255),
            mimeType: file.type, size: file.size, storageKey, url,
            thumbnailUrl: fileType === "image" ? url : null, type: fileType,
        }).returning();
        return c.json({ file: newFile }, 201);
    }
    catch (error) {
        console.error("POST /files error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /files/extract-text
app.post("/extract-text", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        function sanitizeText(text) {
            return text
                .replace(/[一-鿿㐀-䶿豈-﫿]/g, "")
                .replace(/[-]/g, "")
                .replace(/[ -‏]/g, " ")
                .replace(/\s+/g, " ")
                .replace(/\n{3,}/g, "\n\n")
                .split("\n").map(line => line.trim()).join("\n").trim();
        }
        async function parsePDF(buffer) {
            const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
            const path = await import("path");
            const { pathToFileURL } = await import("url");
            const workerPath = path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
            pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
            const uint8Array = new Uint8Array(buffer);
            const pdf = await pdfjsLib.getDocument({ data: uint8Array, useSystemFonts: true, disableFontFace: true }).promise;
            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item) => item.str || "").join(" ");
                fullText += pageText + "\n\n";
            }
            const metadata = await pdf.getMetadata().catch(() => null);
            return { text: fullText.trim(), numpages: pdf.numPages, info: metadata?.info || {} };
        }
        let buffer;
        const contentType = c.req.header("content-type") || "";
        if (contentType.includes("multipart/form-data")) {
            const formData = await c.req.formData();
            const file = formData.get("file");
            if (!file)
                return c.json({ error: "No file provided" }, 400);
            if (file.type !== "application/pdf")
                return c.json({ error: "File is not a PDF" }, 400);
            buffer = Buffer.from(await file.arrayBuffer());
        }
        else {
            const body = await c.req.json();
            const { url, fileId, base64 } = body;
            if (base64) {
                buffer = Buffer.from(base64, "base64");
            }
            else if (fileId) {
                const [file] = await index_js_1.db.select().from(index_js_1.files).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.files.id, fileId), (0, drizzle_orm_1.eq)(index_js_1.files.userId, session.user.id)));
                if (!file)
                    return c.json({ error: "File not found" }, 404);
                if (!file.mimeType.includes("pdf"))
                    return c.json({ error: "File is not a PDF" }, 400);
                const response = await fetch(file.url);
                if (!response.ok)
                    return c.json({ error: "Failed to fetch PDF from storage" }, 400);
                buffer = Buffer.from(await response.arrayBuffer());
            }
            else if (url) {
                if (url.startsWith("data:application/pdf;base64,")) {
                    buffer = Buffer.from(url.replace("data:application/pdf;base64,", ""), "base64");
                }
                else if (url.startsWith("blob:")) {
                    return c.json({ error: "Blob URLs cannot be processed server-side. Please upload the file directly." }, 400);
                }
                else {
                    const response = await fetch(url);
                    if (!response.ok)
                        return c.json({ error: "Failed to fetch PDF" }, 400);
                    buffer = Buffer.from(await response.arrayBuffer());
                }
            }
            else {
                return c.json({ error: "Either file, url, fileId, or base64 is required" }, 400);
            }
        }
        const data = await parsePDF(buffer);
        let text = sanitizeText(data.text);
        const maxLength = 50000;
        if (text.length > maxLength)
            text = text.substring(0, maxLength) + "\n\n[... Content truncated due to length ...]";
        return c.json({ success: true, text, metadata: { pages: data.numpages, info: data.info }, charCount: text.length, estimatedTokens: Math.ceil(text.length / 4) });
    }
    catch (error) {
        console.error("PDF text extraction error:", error);
        return c.json({ error: error instanceof Error ? error.message : "Failed to extract text from PDF" }, 500);
    }
});
// GET /files/:id
app.get("/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const id = c.req.param("id");
        const [file] = await index_js_1.db.select(SAFE_FILE_COLUMNS).from(index_js_1.files)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.files.id, id), (0, drizzle_orm_1.eq)(index_js_1.files.userId, session.user.id)));
        if (!file)
            return c.json({ error: "File not found" }, 404);
        await index_js_1.db.update(index_js_1.files).set({ accessedAt: new Date() }).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.files.id, id), (0, drizzle_orm_1.eq)(index_js_1.files.userId, session.user.id)));
        return c.json({ file });
    }
    catch (error) {
        console.error("Get file error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// PATCH /files/:id
app.patch("/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "file-patch", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429);
        const id = c.req.param("id");
        const body = await c.req.json();
        const updates = patchFileSchema.parse(body);
        const [existingFile] = await index_js_1.db.select({ id: index_js_1.files.id }).from(index_js_1.files)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.files.id, id), (0, drizzle_orm_1.eq)(index_js_1.files.userId, session.user.id)));
        if (!existingFile)
            return c.json({ error: "File not found" }, 404);
        const [updatedFile] = await index_js_1.db.update(index_js_1.files).set({ ...updates, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.files.id, id), (0, drizzle_orm_1.eq)(index_js_1.files.userId, session.user.id))).returning(SAFE_FILE_COLUMNS);
        return c.json({ file: updatedFile });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return c.json({ error: "Validation failed", details: error.issues }, 400);
        console.error("Update file error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// DELETE /files/:id
app.delete("/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "file-delete", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429);
        const id = c.req.param("id");
        const [existingFile] = await index_js_1.db.select({ id: index_js_1.files.id, storageKey: index_js_1.files.storageKey }).from(index_js_1.files)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.files.id, id), (0, drizzle_orm_1.eq)(index_js_1.files.userId, session.user.id)));
        if (!existingFile)
            return c.json({ error: "File not found" }, 404);
        if ((0, r2_js_1.isR2Configured)() && existingFile.storageKey) {
            try {
                await (0, r2_js_1.deleteFile)(existingFile.storageKey);
            }
            catch (err) {
                console.error("Failed to delete from R2:", err);
            }
        }
        await index_js_1.db.delete(index_js_1.files).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.files.id, id), (0, drizzle_orm_1.eq)(index_js_1.files.userId, session.user.id)));
        return c.json({ success: true });
    }
    catch (error) {
        console.error("Delete file error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
exports.default = app;
//# sourceMappingURL=files.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCollaboratorSchema = exports.savePageSchema = exports.updatePageSchema = exports.createPageSchema = exports.updateFolderSchema = exports.createFolderSchema = exports.blockSchema = exports.blockAttrsSchema = exports.canvasSnapshotSchema = void 0;
exports.sanitizeContent = sanitizeContent;
exports.sanitizeBlocks = sanitizeBlocks;
const zod_1 = require("zod");
exports.canvasSnapshotSchema = zod_1.z.object({
    elements: zod_1.z.array(zod_1.z.unknown()),
    appState: zod_1.z.unknown().optional(),
    version: zod_1.z.number(),
});
exports.blockAttrsSchema = zod_1.z
    .object({
    level: zod_1.z.union([zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3), zod_1.z.literal(4), zod_1.z.literal(5), zod_1.z.literal(6)]).optional(),
    language: zod_1.z.string().optional(),
    listType: zod_1.z.enum(["bullet", "ordered", "task"]).optional(),
    checked: zod_1.z.boolean().optional(),
    alt: zod_1.z.string().optional(),
    src: zod_1.z.string().optional(),
    aiPrompt: zod_1.z.string().optional(),
    aiModel: zod_1.z.string().optional(),
})
    .passthrough()
    .optional();
exports.blockSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.enum(["text", "heading", "canvas", "ai", "image", "code", "list", "quote"]),
    content: zod_1.z.union([zod_1.z.string().max(100000), exports.canvasSnapshotSchema, zod_1.z.null()]),
    attrs: exports.blockAttrsSchema,
});
exports.createFolderSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required").max(255, "Name too long").trim(),
    parentId: zod_1.z.string().uuid().nullable().optional(),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
});
exports.updateFolderSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).trim().optional(),
    parentId: zod_1.z.string().uuid().nullable().optional(),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    image: zod_1.z.string().optional(),
    isExpanded: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().optional(),
});
exports.createPageSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required").max(255, "Name too long").trim(),
    folderId: zod_1.z.string().uuid("Invalid folder ID"),
    blocks: zod_1.z.array(exports.blockSchema).max(1000, "Too many blocks").optional(),
});
exports.updatePageSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).trim().optional(),
    folderId: zod_1.z.string().uuid().optional(),
    content: zod_1.z.string().max(10 * 1024 * 1024, "Content too large").optional(),
    blocks: zod_1.z.array(exports.blockSchema).max(1000).optional(),
    isPublic: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().optional(),
});
exports.savePageSchema = zod_1.z.object({
    blocks: zod_1.z.array(exports.blockSchema).max(1000, "Too many blocks"),
    ydocState: zod_1.z.string().max(10 * 1024 * 1024, "Y.Doc state too large").optional(),
    expectedVersion: zod_1.z.number().int().nonnegative("Invalid version"),
});
exports.addCollaboratorSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid("Invalid user ID"),
    role: zod_1.z.enum(["viewer", "editor", "admin"]).default("editor"),
});
function sanitizeContent(content) {
    return content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/data:\s*text\/html/gi, "");
}
function sanitizeBlocks(blocks) {
    return blocks.map((block) => {
        if (typeof block.content === "string") {
            return { ...block, content: sanitizeContent(block.content) };
        }
        return block;
    });
}
//# sourceMappingURL=validation.js.map
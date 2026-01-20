import { z } from "zod"

// Block validation schemas
export const canvasSnapshotSchema = z.object({
  elements: z.array(z.unknown()),
  appState: z.unknown().optional(),
  version: z.number(),
})

export const blockAttrsSchema = z
  .object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).optional(),
    language: z.string().optional(),
    listType: z.enum(["bullet", "ordered", "task"]).optional(),
    checked: z.boolean().optional(),
    alt: z.string().optional(),
    src: z.string().optional(),
    aiPrompt: z.string().optional(),
    aiModel: z.string().optional(),
  })
  .passthrough()
  .optional()

export const blockSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["text", "heading", "canvas", "ai", "image", "code", "list", "quote"]),
  content: z
    .union([
      z.string().max(100000), // Max 100KB per block text content
      canvasSnapshotSchema,
      z.null(),
    ]),
  attrs: blockAttrsSchema,
})

// Folder validation schemas
export const createFolderSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long").trim(),
  parentId: z.string().uuid().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional(),
})

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  parentId: z.string().uuid().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  image: z.string().optional(),
  isExpanded: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

// Page validation schemas
export const createPageSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long").trim(),
  folderId: z.string().uuid("Invalid folder ID"),
  blocks: z.array(blockSchema).max(1000, "Too many blocks").optional(),
})

export const updatePageSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  folderId: z.string().uuid().optional(),
  content: z.string().max(10 * 1024 * 1024, "Content too large").optional(), // Max 10MB
  blocks: z.array(blockSchema).max(1000).optional(),
  isPublic: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const savePageSchema = z.object({
  blocks: z.array(blockSchema).max(1000, "Too many blocks"),
  ydocState: z.string().max(10 * 1024 * 1024, "Y.Doc state too large").optional(), // Max 10MB
  expectedVersion: z.number().int().nonnegative("Invalid version"),
})

// Collaborator validation schemas
export const addCollaboratorSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(["viewer", "editor", "admin"]).default("editor"),
})

// Helper function to sanitize HTML content (basic XSS prevention)
export function sanitizeContent(content: string): string {
  return content
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
    // Remove javascript: URLs
    .replace(/javascript:/gi, "")
    // Remove data: URLs that might contain scripts
    .replace(/data:\s*text\/html/gi, "")
}

// Validate and sanitize blocks
export function sanitizeBlocks(blocks: z.infer<typeof blockSchema>[]): z.infer<typeof blockSchema>[] {
  return blocks.map((block) => {
    if (typeof block.content === "string") {
      return {
        ...block,
        content: sanitizeContent(block.content),
      }
    }
    return block
  })
}

// Type exports
export type Block = z.infer<typeof blockSchema>
export type CreateFolderInput = z.infer<typeof createFolderSchema>
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>
export type CreatePageInput = z.infer<typeof createPageSchema>
export type UpdatePageInput = z.infer<typeof updatePageSchema>
export type SavePageInput = z.infer<typeof savePageSchema>
export type AddCollaboratorInput = z.infer<typeof addCollaboratorSchema>

import { Hono } from "hono"
import { db, pages, folders, shareLinks, pageCollaborators, folderCollaborators, users, tags, pageTags } from "../db/index.js"
import { eq, and, desc, asc, or, sql, inArray } from "drizzle-orm"
import { getServerSession } from "../lib/auth-utils.js"
import { rateLimitMemory, RATE_LIMITS } from "../lib/rate-limit.js"
import { createPageSchema, updatePageSchema, savePageSchema, addCollaboratorSchema, sanitizeBlocks, sanitizeContent } from "../lib/validation.js"
import { canCreatePage } from "../lib/subscription.js"
import { z } from "zod"
import { randomBytes } from "crypto"
import bcrypt from "bcryptjs"
import type { Block } from "../types/blocks.js"

const app = new Hono()

async function hasPageAccess(pageId: string, userId: string): Promise<{ hasAccess: boolean; role: string | null }> {
  const [page] = await db.select({ ownerId: pages.ownerId, folderId: pages.folderId }).from(pages).where(eq(pages.id, pageId))
  if (!page) return { hasAccess: false, role: null }
  if (page.ownerId === userId) return { hasAccess: true, role: "owner" }

  const [pageCollab] = await db.select({ role: pageCollaborators.role }).from(pageCollaborators)
    .where(and(eq(pageCollaborators.pageId, pageId), eq(pageCollaborators.userId, userId)))
  if (pageCollab) return { hasAccess: true, role: pageCollab.role }

  const [folderCollab] = await db.select({ role: folderCollaborators.role }).from(folderCollaborators)
    .where(and(eq(folderCollaborators.folderId, page.folderId), eq(folderCollaborators.userId, userId)))
  if (folderCollab) return { hasAccess: true, role: folderCollab.role }

  return { hasAccess: false, role: null }
}

async function canEditPage(pageId: string, userId: string): Promise<boolean> {
  const [page] = await db.select({ ownerId: pages.ownerId }).from(pages).where(eq(pages.id, pageId))
  if (!page) return false
  if (page.ownerId === userId) return true

  const [collaborator] = await db.select({ role: pageCollaborators.role }).from(pageCollaborators)
    .where(and(eq(pageCollaborators.pageId, pageId), eq(pageCollaborators.userId, userId)))
  return !!(collaborator && (collaborator.role === "editor" || collaborator.role === "admin"))
}

// GET /pages
app.get("/", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const folderId = c.req.query("folderId")
    const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200)
    const recent = c.req.query("recent") === "true"

    const baseSelect = {
      id: pages.id, name: pages.name, content: pages.content, folderId: pages.folderId,
      createdAt: pages.createdAt, updatedAt: pages.updatedAt, lastSavedAt: pages.lastSavedAt,
      sortOrder: pages.sortOrder, isPublic: pages.isPublic, version: pages.version,
    }

    let userPages
    if (recent) {
      userPages = await db.select(baseSelect).from(pages)
        .where(eq(pages.ownerId, session.user.id))
        .orderBy(desc(pages.updatedAt)).limit(limit)
    } else if (folderId) {
      userPages = await db.select(baseSelect).from(pages)
        .where(and(eq(pages.ownerId, session.user.id), eq(pages.folderId, folderId))).limit(limit)
    } else {
      userPages = await db.select(baseSelect).from(pages)
        .where(eq(pages.ownerId, session.user.id)).limit(limit)
    }

    const pageIds = userPages.map((p) => p.id)
    const sharedLinkPages = pageIds.length > 0
      ? await db.selectDistinct({ pageId: shareLinks.pageId }).from(shareLinks)
          .where(sql`${shareLinks.pageId} IN ${pageIds}`)
      : []
    const collaboratorPages = pageIds.length > 0
      ? await db.selectDistinct({ pageId: pageCollaborators.pageId }).from(pageCollaborators)
          .where(sql`${pageCollaborators.pageId} IN ${pageIds}`)
      : []

    const sharedPageIds = new Set([
      ...sharedLinkPages.map((p) => p.pageId),
      ...collaboratorPages.map((p) => p.pageId),
    ])

    return c.json({ pages: userPages.map((page) => ({ ...page, isShared: sharedPageIds.has(page.id) })) })
  } catch (error) {
    console.error("Get pages error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// POST /pages
app.post("/", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "page-create", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429)

    const limitCheck = await canCreatePage(session.user.id)
    if (!limitCheck.allowed) {
      return c.json({ error: "Limit reached", message: limitCheck.reason, current: limitCheck.current, limit: limitCheck.limit, code: "NOTE_LIMIT_REACHED" }, 403)
    }

    const body = await c.req.json()
    const validatedData = createPageSchema.parse(body)

    const [folder] = await db.select().from(folders).where(eq(folders.id, validatedData.folderId))
    if (!folder || folder.ownerId !== session.user.id) return c.json({ error: "Folder not found" }, 404)

    const blocks = (validatedData.blocks ? sanitizeBlocks(validatedData.blocks) : []) as Block[]

    const existingPages = await db.select({ sortOrder: pages.sortOrder }).from(pages).where(eq(pages.folderId, validatedData.folderId))
    const maxSortOrder = existingPages.reduce((max, p) => Math.max(max, p.sortOrder), -1)

    const [newPage] = await db.insert(pages).values({
      name: validatedData.name, folderId: validatedData.folderId, ownerId: session.user.id,
      blocks, sortOrder: maxSortOrder + 1,
    }).returning()

    return c.json({ page: newPage }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Validation failed", details: error.issues }, 400)
    console.error("Create page error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// GET /pages/:id
app.get("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)
    const id = c.req.param("id")

    const [page] = await db.select().from(pages).where(eq(pages.id, id))
    if (!page) return c.json({ error: "Page not found" }, 404)

    const { hasAccess, role } = await hasPageAccess(id, session.user.id)
    if (!page.isPublic && !hasAccess) return c.json({ error: "Forbidden" }, 403)

    const [folder] = await db.select({ id: folders.id, name: folders.name }).from(folders).where(eq(folders.id, page.folderId))
    return c.json({ page: { ...page, folder: folder || null }, role: role || (page.isPublic ? "viewer" : null) })
  } catch (error) {
    console.error("Get page error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// PUT /pages/:id
app.put("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "page-update", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429)

    const id = c.req.param("id")
    const body = await c.req.json()
    const validatedData = updatePageSchema.parse(body)

    const { hasAccess, role } = await hasPageAccess(id, session.user.id)
    if (!hasAccess) return c.json({ error: "Page not found" }, 404)

    if (role !== "owner" && role !== "admin") {
      if (validatedData.folderId || validatedData.isPublic !== undefined) {
        return c.json({ error: "Forbidden" }, 403)
      }
    }

    if (validatedData.folderId) {
      const [folder] = await db.select().from(folders).where(eq(folders.id, validatedData.folderId))
      if (!folder || folder.ownerId !== session.user.id) return c.json({ error: "Folder not found" }, 404)
    }

    const updateData: Record<string, unknown> = { ...validatedData, updatedAt: new Date() }
    if (validatedData.content !== undefined) updateData.content = sanitizeContent(validatedData.content)
    if (validatedData.blocks) updateData.blocks = sanitizeBlocks(validatedData.blocks)

    const [updatedPage] = await db.update(pages).set(updateData).where(eq(pages.id, id)).returning()
    return c.json({ page: updatedPage })
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Validation failed", details: error.issues }, 400)
    console.error("Update page error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// DELETE /pages/:id
app.delete("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "page-delete", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429)

    const id = c.req.param("id")
    const [page] = await db.select().from(pages).where(eq(pages.id, id))
    if (!page) return c.json({ error: "Page not found" }, 404)
    if (page.ownerId !== session.user.id) return c.json({ error: "Forbidden" }, 403)

    await db.delete(pages).where(eq(pages.id, id))
    return c.json({ success: true })
  } catch (error) {
    console.error("Delete page error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// POST /pages/:id/save
app.post("/:id/save", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const id = c.req.param("id")
    const rl = rateLimitMemory({ identifier: `${session.user.id}:${id}`, endpoint: "page-save", ...RATE_LIMITS.PAGE_SAVE })
    if (!rl.success) {
      return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter, message: "Too many save requests. Please wait before saving again." }, 429)
    }

    const body = await c.req.json()
    const validatedData = savePageSchema.parse(body)

    const canEdit = await canEditPage(id, session.user.id)
    if (!canEdit) return c.json({ error: "Forbidden" }, 403)

    const [currentPage] = await db.select({ version: pages.version, ownerId: pages.ownerId }).from(pages).where(eq(pages.id, id))
    if (!currentPage) return c.json({ error: "Page not found" }, 404)

    if (currentPage.version !== validatedData.expectedVersion) {
      return c.json({ error: "Version conflict", currentVersion: currentPage.version, expectedVersion: validatedData.expectedVersion,
        message: "The page was modified by another user. Please refresh and try again." }, 409)
    }

    const sanitizedBlocks = sanitizeBlocks(validatedData.blocks) as Block[]
    const newVersion = currentPage.version + 1
    const now = new Date()

    const [updatedPage] = await db.update(pages).set({
      blocks: sanitizedBlocks, ydocState: validatedData.ydocState, version: newVersion, updatedAt: now, lastSavedAt: now,
    }).where(and(eq(pages.id, id), eq(pages.version, validatedData.expectedVersion)))
      .returning({ id: pages.id, version: pages.version, lastSavedAt: pages.lastSavedAt })

    if (!updatedPage) {
      return c.json({ error: "Concurrent modification detected", message: "Another save happened at the same time. Please refresh and try again." }, 409)
    }

    return c.json({ success: true, version: updatedPage.version, savedAt: updatedPage.lastSavedAt?.toISOString() })
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Validation failed", details: error.issues }, 400)
    console.error("Save page error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// GET /pages/:id/share
app.get("/:id/share", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const id = c.req.param("id")
    const [page] = await db.select({ id: pages.id, name: pages.name, ownerId: pages.ownerId, isPublic: pages.isPublic })
      .from(pages).where(eq(pages.id, id))
    if (!page) return c.json({ error: "Page not found" }, 404)

    const isOwner = page.ownerId === session.user.id
    const [collaborator] = await db.select().from(pageCollaborators)
      .where(and(eq(pageCollaborators.pageId, id), eq(pageCollaborators.userId, session.user.id)))
    if (!isOwner && !collaborator) return c.json({ error: "Forbidden" }, 403)

    const [owner] = await db.select({ id: users.id, name: users.name, email: users.email, image: users.image })
      .from(users).where(eq(users.id, page.ownerId))

    const links = await db.select({
      id: shareLinks.id, token: shareLinks.token, permission: shareLinks.permission,
      expiresAt: shareLinks.expiresAt, viewCount: shareLinks.viewCount, hasPassword: shareLinks.password, createdAt: shareLinks.createdAt,
    }).from(shareLinks).where(eq(shareLinks.pageId, id))

    const collaborators = await db.select({
      id: pageCollaborators.id, role: pageCollaborators.role, createdAt: pageCollaborators.createdAt,
      user: { id: users.id, name: users.name, email: users.email, image: users.image },
    }).from(pageCollaborators).innerJoin(users, eq(pageCollaborators.userId, users.id)).where(eq(pageCollaborators.pageId, id))

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
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
    })
  } catch (error) {
    console.error("Get share settings error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// POST /pages/:id/share
app.post("/:id/share", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "share-create", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429)

    const id = c.req.param("id")
    const body = await c.req.json()
    const shareSettingsSchema = z.object({
      permission: z.enum(["view", "edit"]).optional(),
      expiresIn: z.number().optional(),
      password: z.string().optional(),
    })
    const { permission = "view", expiresIn, password } = shareSettingsSchema.parse(body)

    const [page] = await db.select({ ownerId: pages.ownerId }).from(pages).where(eq(pages.id, id))
    if (!page) return c.json({ error: "Page not found" }, 404)

    const isOwner = page.ownerId === session.user.id
    const [collaborator] = await db.select({ role: pageCollaborators.role }).from(pageCollaborators)
      .where(and(eq(pageCollaborators.pageId, id), eq(pageCollaborators.userId, session.user.id)))
    if (!isOwner && collaborator?.role !== "admin") return c.json({ error: "Only owners and admins can create share links" }, 403)

    const token = randomBytes(32).toString("hex")
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000) : null
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null

    const [newLink] = await db.insert(shareLinks).values({
      pageId: id, token, createdBy: session.user.id, permission, password: hashedPassword, expiresAt,
    }).returning()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    return c.json({
      id: newLink.id, token: newLink.token, permission: newLink.permission, expiresAt: newLink.expiresAt,
      hasPassword: !!newLink.password, url: `${baseUrl}/share/${newLink.token}`, createdAt: newLink.createdAt,
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Validation failed", details: error.issues }, 400)
    console.error("Create share link error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// PUT /pages/:id/share
app.put("/:id/share", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "share-settings", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429)

    const id = c.req.param("id")
    const body = await c.req.json()
    const validatedData = z.object({ isPublic: z.boolean().optional() }).parse(body)

    const [page] = await db.select({ ownerId: pages.ownerId }).from(pages).where(eq(pages.id, id))
    if (!page) return c.json({ error: "Page not found" }, 404)
    if (page.ownerId !== session.user.id) return c.json({ error: "Forbidden" }, 403)

    const [updatedPage] = await db.update(pages).set({ isPublic: validatedData.isPublic, updatedAt: new Date() })
      .where(eq(pages.id, id)).returning({ id: pages.id, isPublic: pages.isPublic })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    return c.json({
      isPublic: updatedPage.isPublic,
      shareLink: `${baseUrl}/note/${id}`,
      message: validatedData.isPublic ? "Page is now public." : "Page is now private.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Validation failed", details: error.issues }, 400)
    console.error("Update share settings error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// DELETE /pages/:id/share
app.delete("/:id/share", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "share-delete", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429)

    const id = c.req.param("id")
    const linkId = c.req.query("linkId")
    if (!linkId) return c.json({ error: "linkId is required" }, 400)

    const [page] = await db.select({ ownerId: pages.ownerId }).from(pages).where(eq(pages.id, id))
    if (!page) return c.json({ error: "Page not found" }, 404)
    if (page.ownerId !== session.user.id) return c.json({ error: "Forbidden" }, 403)

    await db.delete(shareLinks).where(and(eq(shareLinks.id, linkId), eq(shareLinks.pageId, id)))
    return c.json({ success: true })
  } catch (error) {
    console.error("Delete share link error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// GET /pages/:id/collaborators
app.get("/:id/collaborators", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const id = c.req.param("id")
    const [page] = await db.select({ ownerId: pages.ownerId }).from(pages).where(eq(pages.id, id))
    if (!page) return c.json({ error: "Page not found" }, 404)

    const isOwner = page.ownerId === session.user.id
    const [isCollaborator] = await db.select().from(pageCollaborators)
      .where(and(eq(pageCollaborators.pageId, id), eq(pageCollaborators.userId, session.user.id)))
    if (!isOwner && !isCollaborator) return c.json({ error: "Forbidden" }, 403)

    const [owner] = await db.select({ id: users.id, name: users.name, email: users.email, avatar: users.image })
      .from(users).where(eq(users.id, page.ownerId))

    const collaborators = await db.select({
      id: pageCollaborators.id, role: pageCollaborators.role, createdAt: pageCollaborators.createdAt,
      user: { id: users.id, name: users.name, email: users.email, avatar: users.image },
    }).from(pageCollaborators).innerJoin(users, eq(pageCollaborators.userId, users.id)).where(eq(pageCollaborators.pageId, id))

    return c.json({ owner: { ...owner, role: "owner" }, collaborators })
  } catch (error) {
    console.error("Get collaborators error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// POST /pages/:id/collaborators
app.post("/:id/collaborators", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "collaborator-add", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429)

    const id = c.req.param("id")
    const body = await c.req.json()
    const validatedData = addCollaboratorSchema.parse(body)

    const [page] = await db.select({ ownerId: pages.ownerId }).from(pages).where(eq(pages.id, id))
    if (!page) return c.json({ error: "Page not found" }, 404)
    if (page.ownerId !== session.user.id) return c.json({ error: "Forbidden" }, 403)

    const [targetUser] = await db.select().from(users).where(eq(users.id, validatedData.userId))
    if (!targetUser) return c.json({ error: "User not found" }, 404)
    if (validatedData.userId === page.ownerId) return c.json({ error: "Cannot add owner as collaborator" }, 400)

    const [existing] = await db.select().from(pageCollaborators)
      .where(and(eq(pageCollaborators.pageId, id), eq(pageCollaborators.userId, validatedData.userId)))

    if (existing) {
      if (existing.role !== validatedData.role) {
        await db.update(pageCollaborators).set({ role: validatedData.role }).where(eq(pageCollaborators.id, existing.id))
      }
      return c.json({ message: "Collaborator updated" })
    }

    const [newCollaborator] = await db.insert(pageCollaborators)
      .values({ pageId: id, userId: validatedData.userId, role: validatedData.role }).returning()
    return c.json({ collaborator: newCollaborator }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Validation failed", details: error.issues }, 400)
    console.error("Add collaborator error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// DELETE /pages/:id/collaborators
app.delete("/:id/collaborators", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "collaborator-remove", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429)

    const id = c.req.param("id")
    const userId = c.req.query("userId")
    if (!userId) return c.json({ error: "userId is required" }, 400)

    const [page] = await db.select({ ownerId: pages.ownerId }).from(pages).where(eq(pages.id, id))
    if (!page) return c.json({ error: "Page not found" }, 404)

    const isOwner = page.ownerId === session.user.id
    const isSelf = userId === session.user.id
    if (!isOwner && !isSelf) return c.json({ error: "Forbidden" }, 403)

    await db.delete(pageCollaborators).where(and(eq(pageCollaborators.pageId, id), eq(pageCollaborators.userId, userId)))
    return c.json({ success: true })
  } catch (error) {
    console.error("Remove collaborator error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// GET /pages/:id/tags
app.get("/:id/tags", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const pageId = c.req.param("id")
    const [page] = await db.select().from(pages).where(eq(pages.id, pageId))
    if (!page) return c.json({ error: "Page not found" }, 404)
    if (page.ownerId !== session.user.id) return c.json({ error: "Unauthorized" }, 403)

    const pageTagsData = await db.select({ id: tags.id, name: tags.name, color: tags.color, parentId: tags.parentId })
      .from(pageTags).innerJoin(tags, eq(pageTags.tagId, tags.id))
      .where(eq(pageTags.pageId, pageId)).orderBy(tags.name)

    return c.json({ tags: pageTagsData })
  } catch (error) {
    console.error("Get page tags error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// PUT /pages/:id/tags
app.put("/:id/tags", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const pageId = c.req.param("id")
    const body = await c.req.json()
    const { tagIds } = z.object({ tagIds: z.array(z.string().uuid()) }).parse(body)

    const [page] = await db.select().from(pages).where(eq(pages.id, pageId))
    if (!page) return c.json({ error: "Page not found" }, 404)
    if (page.ownerId !== session.user.id) return c.json({ error: "Unauthorized" }, 403)

    if (tagIds.length > 0) {
      const userTags = await db.select({ id: tags.id }).from(tags)
        .where(and(eq(tags.userId, session.user.id), inArray(tags.id, tagIds)))
      if (userTags.length !== tagIds.length) return c.json({ error: "One or more tags not found" }, 404)
    }

    await db.delete(pageTags).where(eq(pageTags.pageId, pageId))
    if (tagIds.length > 0) {
      await db.insert(pageTags).values(tagIds.map((tagId) => ({ pageId, tagId })))
    }

    const updatedTags = await db.select({ id: tags.id, name: tags.name, color: tags.color, parentId: tags.parentId })
      .from(pageTags).innerJoin(tags, eq(pageTags.tagId, tags.id))
      .where(eq(pageTags.pageId, pageId)).orderBy(tags.name)

    return c.json({ tags: updatedTags })
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Validation failed", details: error.issues }, 400)
    console.error("Update page tags error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// POST /pages/:id/tags
app.post("/:id/tags", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const pageId = c.req.param("id")
    const body = await c.req.json()
    const { tagId } = body
    if (!tagId) return c.json({ error: "tagId is required" }, 400)

    const [page] = await db.select().from(pages).where(eq(pages.id, pageId))
    if (!page) return c.json({ error: "Page not found" }, 404)
    if (page.ownerId !== session.user.id) return c.json({ error: "Unauthorized" }, 403)

    const [tag] = await db.select().from(tags).where(and(eq(tags.id, tagId), eq(tags.userId, session.user.id)))
    if (!tag) return c.json({ error: "Tag not found" }, 404)

    const [existingPageTag] = await db.select().from(pageTags).where(and(eq(pageTags.pageId, pageId), eq(pageTags.tagId, tagId)))
    if (existingPageTag) return c.json({ error: "Page already has this tag" }, 409)

    await db.insert(pageTags).values({ pageId, tagId })
    return c.json({ success: true, tag })
  } catch (error) {
    console.error("Add page tag error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// DELETE /pages/:id/tags
app.delete("/:id/tags", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const pageId = c.req.param("id")
    const tagId = c.req.query("tagId")
    if (!tagId) return c.json({ error: "tagId is required" }, 400)

    const [page] = await db.select().from(pages).where(eq(pages.id, pageId))
    if (!page) return c.json({ error: "Page not found" }, 404)
    if (page.ownerId !== session.user.id) return c.json({ error: "Unauthorized" }, 403)

    await db.delete(pageTags).where(and(eq(pageTags.pageId, pageId), eq(pageTags.tagId, tagId)))
    return c.json({ success: true })
  } catch (error) {
    console.error("Remove page tag error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// POST /pages/:id/move
app.post("/:id/move", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "page-move", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429)

    const id = c.req.param("id")
    const body = await c.req.json()
    const { targetFolderId } = z.object({ targetFolderId: z.string().uuid("Invalid folder ID") }).parse(body)

    const [page] = await db.select().from(pages).where(eq(pages.id, id))
    if (!page) return c.json({ error: "Page not found" }, 404)
    if (page.ownerId !== session.user.id) return c.json({ error: "Forbidden" }, 403)

    if (page.folderId === targetFolderId) return c.json({ page })

    const [targetFolder] = await db.select().from(folders).where(eq(folders.id, targetFolderId))
    if (!targetFolder) return c.json({ error: "Target folder not found" }, 404)
    if (targetFolder.ownerId !== session.user.id) return c.json({ error: "Forbidden" }, 403)

    const existingPages = await db.select({ sortOrder: pages.sortOrder }).from(pages).where(eq(pages.folderId, targetFolderId))
    const maxSortOrder = existingPages.reduce((max, p) => Math.max(max, p.sortOrder), -1)

    const [updatedPage] = await db.update(pages).set({
      folderId: targetFolderId, sortOrder: maxSortOrder + 1, updatedAt: new Date(),
    }).where(eq(pages.id, id)).returning()

    return c.json({ page: updatedPage })
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Validation failed", details: error.issues }, 400)
    console.error("Move page error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

export default app

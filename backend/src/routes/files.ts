import { Hono } from "hono"
import { db, files } from "../db/index.js"
import { eq, and, desc, sql } from "drizzle-orm"
import { getServerSession } from "../lib/auth-utils.js"
import { rateLimitMemory, RATE_LIMITS } from "../lib/rate-limit.js"
import { uploadFile, deleteFile, isR2Configured } from "../lib/storage/r2.js"
import { z } from "zod"

const app = new Hono()

function getFileType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType === "application/pdf") return "pdf"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.includes("document") || mimeType.includes("word") || mimeType.includes("spreadsheet") ||
      mimeType.includes("excel") || mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "document"
  return "file"
}

const STORAGE_LIMITS = {
  free: 50 * 1024 * 1024,
  pro: 100 * 1024 * 1024,
  team: 500 * 1024 * 1024,
}

const MAX_FILE_SIZE = {
  free: 5 * 1024 * 1024,
  pro: 20 * 1024 * 1024,
  team: 100 * 1024 * 1024,
}

const SAFE_FILE_COLUMNS = {
  id: files.id, userId: files.userId, pageId: files.pageId, folderId: files.folderId,
  name: files.name, originalName: files.originalName, mimeType: files.mimeType,
  size: files.size, url: files.url, thumbnailUrl: files.thumbnailUrl, type: files.type,
  isStarred: files.isStarred, accessedAt: files.accessedAt, createdAt: files.createdAt, updatedAt: files.updatedAt,
}

const patchFileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  folderId: z.string().uuid().nullable().optional(),
  pageId: z.string().uuid().nullable().optional(),
  isStarred: z.boolean().optional(),
})

// GET /files
app.get("/", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const type = c.req.query("type")
    const folderId = c.req.query("folderId")
    const starred = c.req.query("starred") === "true"
    const recent = c.req.query("recent") === "true"
    const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200)
    const offset = Math.max(parseInt(c.req.query("offset") || "0"), 0)

    const conditions = [eq(files.userId, session.user.id)]
    if (type && type !== "all") conditions.push(eq(files.type, type))
    if (folderId) conditions.push(eq(files.folderId, folderId))
    if (starred) conditions.push(eq(files.isStarred, true))

    const userFiles = await db.select(SAFE_FILE_COLUMNS).from(files)
      .where(and(...conditions))
      .orderBy(recent ? desc(files.accessedAt) : desc(files.createdAt))
      .limit(limit).offset(offset)

    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(files).where(and(...conditions))
    const [storageResult] = await db.select({ total: sql<number>`coalesce(sum(${files.size}), 0)::bigint` })
      .from(files).where(eq(files.userId, session.user.id))

    const tier = "free" as keyof typeof STORAGE_LIMITS
    return c.json({
      files: userFiles, total: countResult?.count || 0,
      storage: {
        used: Number(storageResult?.total || 0),
        limit: STORAGE_LIMITS[tier],
        percentage: Math.round((Number(storageResult?.total || 0) / STORAGE_LIMITS[tier]) * 100),
      },
    })
  } catch (error) {
    console.error("GET /files error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// POST /files (multipart upload)
app.post("/", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "file-upload", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429)

    const formData = await c.req.formData()
    const file = formData.get("file") as File | null
    const pageId = formData.get("pageId") as string | null
    const folderId = formData.get("folderId") as string | null

    if (!file) return c.json({ error: "No file provided" }, 400)

    const blockedTypes = ["application/x-msdownload", "application/x-executable", "text/x-shellscript"]
    if (blockedTypes.includes(file.type)) return c.json({ error: "File type not allowed" }, 400)

    const tier = "free" as keyof typeof MAX_FILE_SIZE
    if (file.size > MAX_FILE_SIZE[tier]) return c.json({ error: "File too large", maxSize: MAX_FILE_SIZE[tier] }, 413)

    const [storageResult] = await db.select({ total: sql<number>`coalesce(sum(${files.size}), 0)::bigint` })
      .from(files).where(eq(files.userId, session.user.id))
    const currentStorage = Number(storageResult?.total || 0)
    if (currentStorage + file.size > STORAGE_LIMITS[tier]) {
      return c.json({ error: "Storage quota exceeded", used: currentStorage, limit: STORAGE_LIMITS[tier] }, 403)
    }

    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin"
    const storageName = `${timestamp}-${randomStr}.${extension}`
    const storageKey = `uploads/${session.user.id}/${storageName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let url: string
    if (isR2Configured()) {
      url = await uploadFile(storageKey, buffer, file.type)
    } else {
      url = `data:${file.type};base64,${buffer.toString("base64")}`
    }

    const fileType = getFileType(file.type)
    const [newFile] = await db.insert(files).values({
      userId: session.user.id, pageId: pageId || null, folderId: folderId || null,
      name: storageName, originalName: file.name.replace(/\.\.|\/|\\|\0/g, "_").slice(0, 255),
      mimeType: file.type, size: file.size, storageKey, url,
      thumbnailUrl: fileType === "image" ? url : null, type: fileType,
    }).returning()

    return c.json({ file: newFile }, 201)
  } catch (error) {
    console.error("POST /files error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// POST /files/extract-text
app.post("/extract-text", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    function sanitizeText(text: string): string {
      return text
        .replace(/[一-鿿㐀-䶿豈-﫿]/g, "")
        .replace(/[-]/g, "")
        .replace(/[ -‏]/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .split("\n").map(line => line.trim()).join("\n").trim()
    }

    async function parsePDF(buffer: Buffer): Promise<{ text: string; numpages: number; info: unknown }> {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
      const path = await import("path")
      const { pathToFileURL } = await import("url")
      const workerPath = path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
      pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href
      const uint8Array = new Uint8Array(buffer)
      const pdf = await pdfjsLib.getDocument({ data: uint8Array, useSystemFonts: true, disableFontFace: true }).promise
      let fullText = ""
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: unknown) => (item as { str?: string }).str || "").join(" ")
        fullText += pageText + "\n\n"
      }
      const metadata = await pdf.getMetadata().catch(() => null)
      return { text: fullText.trim(), numpages: pdf.numPages, info: metadata?.info || {} }
    }

    let buffer: Buffer
    const contentType = c.req.header("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData()
      const file = formData.get("file") as File | null
      if (!file) return c.json({ error: "No file provided" }, 400)
      if (file.type !== "application/pdf") return c.json({ error: "File is not a PDF" }, 400)
      buffer = Buffer.from(await file.arrayBuffer())
    } else {
      const body = await c.req.json()
      const { url, fileId, base64 } = body

      if (base64) {
        buffer = Buffer.from(base64, "base64")
      } else if (fileId) {
        const [file] = await db.select().from(files).where(and(eq(files.id, fileId), eq(files.userId, session.user.id)))
        if (!file) return c.json({ error: "File not found" }, 404)
        if (!file.mimeType.includes("pdf")) return c.json({ error: "File is not a PDF" }, 400)
        const response = await fetch(file.url)
        if (!response.ok) return c.json({ error: "Failed to fetch PDF from storage" }, 400)
        buffer = Buffer.from(await response.arrayBuffer())
      } else if (url) {
        if (url.startsWith("data:application/pdf;base64,")) {
          buffer = Buffer.from(url.replace("data:application/pdf;base64,", ""), "base64")
        } else if (url.startsWith("blob:")) {
          return c.json({ error: "Blob URLs cannot be processed server-side. Please upload the file directly." }, 400)
        } else {
          const response = await fetch(url)
          if (!response.ok) return c.json({ error: "Failed to fetch PDF" }, 400)
          buffer = Buffer.from(await response.arrayBuffer())
        }
      } else {
        return c.json({ error: "Either file, url, fileId, or base64 is required" }, 400)
      }
    }

    const data = await parsePDF(buffer)
    let text = sanitizeText(data.text)
    const maxLength = 50000
    if (text.length > maxLength) text = text.substring(0, maxLength) + "\n\n[... Content truncated due to length ...]"

    return c.json({ success: true, text, metadata: { pages: data.numpages, info: data.info }, charCount: text.length, estimatedTokens: Math.ceil(text.length / 4) })
  } catch (error) {
    console.error("PDF text extraction error:", error)
    return c.json({ error: error instanceof Error ? error.message : "Failed to extract text from PDF" }, 500)
  }
})

// GET /files/:id
app.get("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const id = c.req.param("id")
    const [file] = await db.select(SAFE_FILE_COLUMNS).from(files)
      .where(and(eq(files.id, id), eq(files.userId, session.user.id)))
    if (!file) return c.json({ error: "File not found" }, 404)

    await db.update(files).set({ accessedAt: new Date() }).where(and(eq(files.id, id), eq(files.userId, session.user.id)))
    return c.json({ file })
  } catch (error) {
    console.error("Get file error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// PATCH /files/:id
app.patch("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "file-patch", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429)

    const id = c.req.param("id")
    const body = await c.req.json()
    const updates = patchFileSchema.parse(body)

    const [existingFile] = await db.select({ id: files.id }).from(files)
      .where(and(eq(files.id, id), eq(files.userId, session.user.id)))
    if (!existingFile) return c.json({ error: "File not found" }, 404)

    const [updatedFile] = await db.update(files).set({ ...updates, updatedAt: new Date() })
      .where(and(eq(files.id, id), eq(files.userId, session.user.id))).returning(SAFE_FILE_COLUMNS)
    return c.json({ file: updatedFile })
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Validation failed", details: error.issues }, 400)
    console.error("Update file error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// DELETE /files/:id
app.delete("/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "file-delete", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429)

    const id = c.req.param("id")
    const [existingFile] = await db.select({ id: files.id, storageKey: files.storageKey }).from(files)
      .where(and(eq(files.id, id), eq(files.userId, session.user.id)))
    if (!existingFile) return c.json({ error: "File not found" }, 404)

    if (isR2Configured() && existingFile.storageKey) {
      try { await deleteFile(existingFile.storageKey) } catch (err) { console.error("Failed to delete from R2:", err) }
    }

    await db.delete(files).where(and(eq(files.id, id), eq(files.userId, session.user.id)))
    return c.json({ success: true })
  } catch (error) {
    console.error("Delete file error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

export default app

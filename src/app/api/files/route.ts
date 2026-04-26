import { NextRequest, NextResponse } from "next/server"
import { db, files, fileFolders } from "@/db"
import { eq, desc, and, sql } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { rateLimitMemory, RATE_LIMITS } from "@/lib/rate-limit"
import { uploadFile, isR2Configured } from "@/lib/storage/r2"

function getFileType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType === "application/pdf") return "pdf"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint")
  ) return "document"
  return "file"
}

// Storage limits per tier (bytes) — updated to new tiers
const STORAGE_LIMITS = {
  free: 50 * 1024 * 1024,   // 50 MB
  pro: 100 * 1024 * 1024,   // 100 MB
  team: 500 * 1024 * 1024,  // 500 MB
}

const MAX_FILE_SIZE = {
  free: 5 * 1024 * 1024,    // 5 MB
  pro: 20 * 1024 * 1024,    // 20 MB
  team: 100 * 1024 * 1024,  // 100 MB
}

// GET /api/files — list files for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const params = request.nextUrl.searchParams
    const type = params.get("type")
    const folderId = params.get("folderId")
    const starred = params.get("starred") === "true"
    const recent = params.get("recent") === "true"
    const limit = Math.min(parseInt(params.get("limit") || "50"), 200)
    const offset = Math.max(parseInt(params.get("offset") || "0"), 0)

    const conditions = [eq(files.userId, session.user.id)]
    if (type && type !== "all") conditions.push(eq(files.type, type))
    if (folderId) conditions.push(eq(files.folderId, folderId))
    if (starred) conditions.push(eq(files.isStarred, true))

    const userFiles = await db
      .select({
        id: files.id,
        userId: files.userId,
        pageId: files.pageId,
        folderId: files.folderId,
        name: files.name,
        originalName: files.originalName,
        mimeType: files.mimeType,
        size: files.size,
        url: files.url,
        thumbnailUrl: files.thumbnailUrl,
        type: files.type,
        isStarred: files.isStarred,
        accessedAt: files.accessedAt,
        createdAt: files.createdAt,
        updatedAt: files.updatedAt,
        // storageKey intentionally omitted
      })
      .from(files)
      .where(and(...conditions))
      .orderBy(recent ? desc(files.accessedAt) : desc(files.createdAt))
      .limit(limit)
      .offset(offset)

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(files)
      .where(and(...conditions))

    const [storageResult] = await db
      .select({ total: sql<number>`coalesce(sum(${files.size}), 0)::bigint` })
      .from(files)
      .where(eq(files.userId, session.user.id))

    const tier = "free" as keyof typeof STORAGE_LIMITS

    return NextResponse.json({
      files: userFiles,
      total: countResult?.count || 0,
      storage: {
        used: Number(storageResult?.total || 0),
        limit: STORAGE_LIMITS[tier],
        percentage: Math.round((Number(storageResult?.total || 0) / STORAGE_LIMITS[tier]) * 100),
      },
    })
  } catch (error) {
    console.error("GET /api/files error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/files — upload a new file
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "file-upload", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, { status: 429 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const pageId = formData.get("pageId") as string | null
    const folderId = formData.get("folderId") as string | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    // Validate MIME type — prevent executable uploads
    const blockedTypes = ["application/x-msdownload", "application/x-executable", "text/x-shellscript"]
    if (blockedTypes.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
    }

    const tier = "free" as keyof typeof MAX_FILE_SIZE

    if (file.size > MAX_FILE_SIZE[tier]) {
      return NextResponse.json({ error: "File too large", maxSize: MAX_FILE_SIZE[tier] }, { status: 413 })
    }

    const [storageResult] = await db
      .select({ total: sql<number>`coalesce(sum(${files.size}), 0)::bigint` })
      .from(files)
      .where(eq(files.userId, session.user.id))

    const currentStorage = Number(storageResult?.total || 0)
    if (currentStorage + file.size > STORAGE_LIMITS[tier]) {
      return NextResponse.json({ error: "Storage quota exceeded", used: currentStorage, limit: STORAGE_LIMITS[tier] }, { status: 403 })
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
      // Fallback: base64 data URL for local dev without R2 configured
      url = `data:${file.type};base64,${buffer.toString("base64")}`
    }

    const fileType = getFileType(file.type)

    const [newFile] = await db
      .insert(files)
      .values({
        userId: session.user.id,
        pageId: pageId || null,
        folderId: folderId || null,
        name: storageName,
        originalName: file.name.replace(/\.\.|\/|\\|\0/g, "_").slice(0, 255),
        mimeType: file.type,
        size: file.size,
        storageKey,
        url,
        thumbnailUrl: fileType === "image" ? url : null,
        type: fileType,
      })
      .returning()

    return NextResponse.json({ file: newFile }, { status: 201 })
  } catch (error) {
    console.error("POST /api/files error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

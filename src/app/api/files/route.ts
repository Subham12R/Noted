import { NextRequest, NextResponse } from "next/server"
import { db, files, fileFolders } from "@/db"
import { eq, desc, and, sql } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { rateLimitMemory, RATE_LIMITS } from "@/lib/rate-limit"

// File type detection
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
  ) {
    return "document"
  }
  return "file"
}

// Storage limits by tier (in bytes)
const STORAGE_LIMITS = {
  free: 100 * 1024 * 1024, // 100 MB
  pro: 10 * 1024 * 1024 * 1024, // 10 GB
  team: 100 * 1024 * 1024 * 1024, // 100 GB
}

const MAX_FILE_SIZE = {
  free: 5 * 1024 * 1024, // 5 MB
  pro: 100 * 1024 * 1024, // 100 MB
  team: 500 * 1024 * 1024, // 500 MB
}

// GET /api/files - List files for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") // Filter by file type
    const folderId = searchParams.get("folderId")
    const starred = searchParams.get("starred") === "true"
    const recent = searchParams.get("recent") === "true"
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Build query conditions
    const conditions = [eq(files.userId, session.user.id)]

    if (type && type !== "all") {
      conditions.push(eq(files.type, type))
    }

    if (folderId) {
      conditions.push(eq(files.folderId, folderId))
    }

    if (starred) {
      conditions.push(eq(files.isStarred, true))
    }

    // Query files
    const userFiles = await db
      .select()
      .from(files)
      .where(and(...conditions))
      .orderBy(recent ? desc(files.accessedAt) : desc(files.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(files)
      .where(and(...conditions))

    // Get storage usage
    const [storageResult] = await db
      .select({ total: sql<number>`coalesce(sum(${files.size}), 0)::bigint` })
      .from(files)
      .where(eq(files.userId, session.user.id))

    // Get user's subscription tier (simplified - you might want to fetch this from subscriptions table)
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
    console.error("Get files error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/files - Upload a new file
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = rateLimitMemory({
      identifier: session.user.id,
      endpoint: "file-upload",
      ...RATE_LIMITS.API_GENERAL,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const pageId = formData.get("pageId") as string | null
    const folderId = formData.get("folderId") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Get user's subscription tier
    const tier = "free" as keyof typeof MAX_FILE_SIZE

    // Check file size
    if (file.size > MAX_FILE_SIZE[tier]) {
      return NextResponse.json(
        {
          error: "File too large",
          maxSize: MAX_FILE_SIZE[tier],
          currentSize: file.size,
        },
        { status: 413 }
      )
    }

    // Check storage quota
    const [storageResult] = await db
      .select({ total: sql<number>`coalesce(sum(${files.size}), 0)::bigint` })
      .from(files)
      .where(eq(files.userId, session.user.id))

    const currentStorage = Number(storageResult?.total || 0)
    if (currentStorage + file.size > STORAGE_LIMITS[tier]) {
      return NextResponse.json(
        {
          error: "Storage quota exceeded",
          used: currentStorage,
          limit: STORAGE_LIMITS[tier],
        },
        { status: 403 }
      )
    }

    // Generate unique file name
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split(".").pop() || ""
    const storageName = `${timestamp}-${randomStr}.${extension}`
    const storageKey = `uploads/${session.user.id}/${storageName}`

    // For now, we'll use a simple base64 data URL approach
    // In production, you'd upload to S3/R2/Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const dataUrl = `data:${file.type};base64,${base64}`

    // Determine file type
    const fileType = getFileType(file.type)

    // Create file record
    const [newFile] = await db
      .insert(files)
      .values({
        userId: session.user.id,
        pageId: pageId || null,
        folderId: folderId || null,
        name: storageName,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        storageKey,
        url: dataUrl,
        thumbnailUrl: fileType === "image" ? dataUrl : null,
        type: fileType,
      })
      .returning()

    return NextResponse.json({ file: newFile }, { status: 201 })
  } catch (error) {
    console.error("Upload file error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

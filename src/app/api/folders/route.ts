import { NextRequest, NextResponse } from "next/server"
import { db, folders } from "@/db"
import { eq, asc, isNull } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { createFolderSchema } from "@/lib/validation"
import { rateLimitMemory, RATE_LIMITS } from "@/lib/rate-limit"
import { canCreateFolder } from "@/lib/subscription"

// GET /api/folders - List all folders for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parentId = request.nextUrl.searchParams.get("parentId")

    // Get folders for the user
    const userFolders = await db
      .select()
      .from(folders)
      .where(eq(folders.ownerId, session.user.id))
      .orderBy(asc(folders.sortOrder), asc(folders.createdAt))

    // If parentId is specified, filter by parent
    if (parentId) {
      const filtered = userFolders.filter((f) =>
        parentId === "null" ? f.parentId === null : f.parentId === parentId
      )
      return NextResponse.json({ folders: filtered })
    }

    return NextResponse.json({ folders: userFolders })
  } catch (error) {
    console.error("Get folders error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/folders - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = rateLimitMemory({
      identifier: session.user.id,
      endpoint: "folder-create",
      ...RATE_LIMITS.FOLDER_CREATE,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    // Check subscription limits
    const limitCheck = await canCreateFolder(session.user.id)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Limit reached",
          message: limitCheck.reason,
          current: limitCheck.current,
          limit: limitCheck.limit,
          code: "FOLDER_LIMIT_REACHED",
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createFolderSchema.parse(body)

    // If parentId is provided, verify it exists and belongs to the user
    if (validatedData.parentId) {
      const [parentFolder] = await db
        .select()
        .from(folders)
        .where(eq(folders.id, validatedData.parentId))

      if (!parentFolder || parentFolder.ownerId !== session.user.id) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 })
      }
    }

    // Get the highest sort order for folders at this level
    const existingFolders = await db
      .select({ sortOrder: folders.sortOrder })
      .from(folders)
      .where(eq(folders.ownerId, session.user.id))

    const maxSortOrder = existingFolders.reduce(
      (max, f) => Math.max(max, f.sortOrder),
      -1
    )

    // Create the folder
    const [newFolder] = await db
      .insert(folders)
      .values({
        name: validatedData.name,
        ownerId: session.user.id,
        parentId: validatedData.parentId || null,
        color: validatedData.color || null,
        sortOrder: maxSortOrder + 1,
      })
      .returning()

    return NextResponse.json({ folder: newFolder }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 })
    }
    console.error("Create folder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

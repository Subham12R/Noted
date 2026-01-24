import { NextRequest, NextResponse } from "next/server"
import { db, folders } from "@/db"
import { eq } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { z } from "zod"

const moveFolderSchema = z.object({
    targetParentId: z.string().uuid().nullable(),
})

// Helper function to check if targetId is a descendant of folderId
async function isDescendant(folderId: string, targetId: string | null): Promise<boolean> {
    if (!targetId) return false
    if (folderId === targetId) return true

    // Get all folders
    const allFolders = await db.select().from(folders)

    const folderMap = new Map(allFolders.map(f => [f.id, f]))

    // Walk up the tree from targetId
    let current = folderMap.get(targetId)
    while (current) {
        if (current.id === folderId) {
            return true
        }
        if (!current.parentId) break
        current = folderMap.get(current.parentId)
    }

    return false
}

// POST /api/folders/[id]/move - Move a folder to a different parent
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession()
        const { id } = await params

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const validatedData = moveFolderSchema.parse(body)

        // Get the folder and verify ownership
        const [folder] = await db
            .select()
            .from(folders)
            .where(eq(folders.id, id))

        if (!folder) {
            return NextResponse.json({ error: "Folder not found" }, { status: 404 })
        }

        if (folder.ownerId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Prevent moving to itself
        if (validatedData.targetParentId === id) {
            return NextResponse.json({ error: "Cannot move folder into itself" }, { status: 400 })
        }

        // If moving to the same parent, just return success
        if (folder.parentId === validatedData.targetParentId) {
            return NextResponse.json({ folder })
        }

        // Prevent circular references - check if targetParentId is a descendant of this folder
        if (validatedData.targetParentId) {
            const wouldCreateCycle = await isDescendant(id, validatedData.targetParentId)
            if (wouldCreateCycle) {
                return NextResponse.json({ error: "Cannot move folder into its own subfolder" }, { status: 400 })
            }

            // Verify target parent exists and belongs to user
            const [targetParent] = await db
                .select()
                .from(folders)
                .where(eq(folders.id, validatedData.targetParentId))

            if (!targetParent) {
                return NextResponse.json({ error: "Target folder not found" }, { status: 404 })
            }

            if (targetParent.ownerId !== session.user.id) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 })
            }
        }

        // Get the highest sort order at the target level
        const siblingFolders = validatedData.targetParentId
            ? await db
                .select({ sortOrder: folders.sortOrder })
                .from(folders)
                .where(eq(folders.parentId, validatedData.targetParentId))
            : await db
                .select({ sortOrder: folders.sortOrder })
                .from(folders)
                .where(eq(folders.ownerId, session.user.id))

        const maxSortOrder = siblingFolders
            .filter(f => f.sortOrder !== null)
            .reduce((max, f) => Math.max(max, f.sortOrder), -1)

        // Move the folder
        const [updatedFolder] = await db
            .update(folders)
            .set({
                parentId: validatedData.targetParentId,
                sortOrder: maxSortOrder + 1,
                updatedAt: new Date(),
            })
            .where(eq(folders.id, id))
            .returning()

        return NextResponse.json({ folder: updatedFolder })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 })
        }
        console.error("Move folder error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

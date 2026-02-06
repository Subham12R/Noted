import { NextResponse } from "next/server"
import { db, pageCollaborators, folderCollaborators } from "@/db"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"

// DELETE /api/shared-with-me/[id] - Remove access to a shared page or folder
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "page"

    if (type === "folder") {
      // Remove folder collaboration
      await db
        .delete(folderCollaborators)
        .where(
          and(
            eq(folderCollaborators.folderId, id),
            eq(folderCollaborators.userId, session.user.id)
          )
        )
    } else {
      // Remove page collaboration
      await db
        .delete(pageCollaborators)
        .where(
          and(
            eq(pageCollaborators.pageId, id),
            eq(pageCollaborators.userId, session.user.id)
          )
        )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Remove shared access error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

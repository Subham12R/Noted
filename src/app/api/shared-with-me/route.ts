import { NextResponse } from "next/server"
import { db, pages, folders, pageCollaborators, folderCollaborators, users } from "@/db"
import { eq, and, or, isNull, gt } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { shareLinks } from "@/db/schema"

export interface SharedPage {
  id: string
  name: string
  content: string | null
  folderId: string
  folderName: string
  ownerId: string
  ownerName: string | null
  ownerEmail: string
  ownerImage: string | null
  role: string
  sharedAt: string
  updatedAt: string
}

export interface SharedFolder {
  id: string
  name: string
  color: string | null
  image: string | null
  ownerId: string
  ownerName: string | null
  ownerEmail: string
  ownerImage: string | null
  role: string
  sharedAt: string
  pageCount: number
}

// GET /api/shared-with-me - Get all pages and folders shared with the current user
export async function GET() {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get pages shared directly with the user via pageCollaborators
    const sharedPages = await db
      .select({
        id: pages.id,
        name: pages.name,
        content: pages.content,
        folderId: pages.folderId,
        folderName: folders.name,
        ownerId: pages.ownerId,
        ownerName: users.name,
        ownerEmail: users.email,
        ownerImage: users.image,
        role: pageCollaborators.role,
        sharedAt: pageCollaborators.createdAt,
        updatedAt: pages.updatedAt,
      })
      .from(pageCollaborators)
      .innerJoin(pages, eq(pageCollaborators.pageId, pages.id))
      .innerJoin(folders, eq(pages.folderId, folders.id))
      .innerJoin(users, eq(pages.ownerId, users.id))
      .where(eq(pageCollaborators.userId, session.user.id))

    // Get folders shared with the user via folderCollaborators
    const sharedFoldersData = await db
      .select({
        id: folders.id,
        name: folders.name,
        color: folders.color,
        image: folders.image,
        ownerId: folders.ownerId,
        ownerName: users.name,
        ownerEmail: users.email,
        ownerImage: users.image,
        role: folderCollaborators.role,
        sharedAt: folderCollaborators.createdAt,
      })
      .from(folderCollaborators)
      .innerJoin(folders, eq(folderCollaborators.folderId, folders.id))
      .innerJoin(users, eq(folders.ownerId, users.id))
      .where(eq(folderCollaborators.userId, session.user.id))

    // Get page counts for shared folders
    const sharedFolders: SharedFolder[] = await Promise.all(
      sharedFoldersData.map(async (folder) => {
        const folderPages = await db
          .select({ id: pages.id })
          .from(pages)
          .where(eq(pages.folderId, folder.id))

        return {
          ...folder,
          sharedAt: folder.sharedAt.toISOString(),
          pageCount: folderPages.length,
        }
      })
    )

    // Get pages from shared folders that aren't already in sharedPages
    const sharedFolderIds = sharedFolders.map((f) => f.id)
    const sharedPageIds = sharedPages.map((p) => p.id)

    let pagesFromSharedFolders: SharedPage[] = []
    if (sharedFolderIds.length > 0) {
      const folderPagesData = await db
        .select({
          id: pages.id,
          name: pages.name,
          content: pages.content,
          folderId: pages.folderId,
          folderName: folders.name,
          ownerId: pages.ownerId,
          ownerName: users.name,
          ownerEmail: users.email,
          ownerImage: users.image,
          updatedAt: pages.updatedAt,
        })
        .from(pages)
        .innerJoin(folders, eq(pages.folderId, folders.id))
        .innerJoin(users, eq(pages.ownerId, users.id))
        .innerJoin(folderCollaborators, eq(folders.id, folderCollaborators.folderId))
        .where(
          and(
            eq(folderCollaborators.userId, session.user.id)
          )
        )

      // Get the role from the folder collaboration for these pages
      pagesFromSharedFolders = folderPagesData
        .filter((p) => !sharedPageIds.includes(p.id))
        .map((p) => {
          const folder = sharedFolders.find((f) => f.id === p.folderId)
          return {
            ...p,
            content: p.content,
            role: folder?.role || "viewer",
            sharedAt: folder?.sharedAt || new Date().toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          }
        })
    }

    // Combine and format the response
    const formattedSharedPages: SharedPage[] = sharedPages.map((p) => ({
      ...p,
      content: p.content,
      sharedAt: p.sharedAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))

    const allSharedPages = [...formattedSharedPages, ...pagesFromSharedFolders]

    return NextResponse.json({
      pages: allSharedPages,
      folders: sharedFolders,
    })
  } catch (error) {
    console.error("Get shared-with-me error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

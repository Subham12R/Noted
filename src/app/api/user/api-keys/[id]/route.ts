import { NextRequest, NextResponse } from "next/server"
import { db, userApiKeys } from "@/db"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"

type Params = { params: Promise<{ id: string }> }

// PATCH /api/user/api-keys/[id] — toggle active state
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const [existing] = await db
      .select({ id: userApiKeys.id })
      .from(userApiKeys)
      .where(and(eq(userApiKeys.id, id), eq(userApiKeys.userId, session.user.id)))

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const body = await request.json()
    const isActive = typeof body?.isActive === "boolean" ? body.isActive : undefined
    if (isActive === undefined) return NextResponse.json({ error: "isActive (boolean) is required" }, { status: 400 })

    const [updated] = await db
      .update(userApiKeys)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(userApiKeys.id, id), eq(userApiKeys.userId, session.user.id)))
      .returning({ id: userApiKeys.id, isActive: userApiKeys.isActive })

    return NextResponse.json({ key: updated })
  } catch (error) {
    console.error("PATCH /api/user/api-keys/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/user/api-keys/[id] — remove a saved key
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const [existing] = await db
      .select({ id: userApiKeys.id })
      .from(userApiKeys)
      .where(and(eq(userApiKeys.id, id), eq(userApiKeys.userId, session.user.id)))

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db.delete(userApiKeys).where(and(eq(userApiKeys.id, id), eq(userApiKeys.userId, session.user.id)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/user/api-keys/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

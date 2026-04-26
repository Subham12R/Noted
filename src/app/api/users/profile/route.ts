import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-utils"
import { rateLimitMemory, RATE_LIMITS } from "@/lib/rate-limit"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

// GET /api/users/profile - Get current user profile
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Failed to get user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/users/profile - Update user profile (name, image)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "profile-update", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, { status: 429 })
    }

    const body = await request.json()
    const { name, image } = body

    // Validate input
    if (name !== undefined && (typeof name !== "string" || name.length > 100)) {
      return NextResponse.json(
        { error: "Name must be a string with max 100 characters" },
        { status: 400 }
      )
    }

    if (image !== undefined && image !== null) {
      if (typeof image !== "string" || !image.match(/^https?:\/\/.+/)) {
        return NextResponse.json(
          { error: "Image must be a valid HTTP(S) URL or null" },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updateData: { name?: string | null; image?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    }

    if (name !== undefined) {
      updateData.name = name.trim() || null
    }

    if (image !== undefined) {
      updateData.image = image
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.user.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("Failed to update user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/users/profile - Delete user account
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { confirmation } = body

    // Require confirmation
    if (confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Please confirm deletion by sending { confirmation: 'DELETE' }" },
        { status: 400 }
      )
    }

    // Delete the user - cascades to all related data due to foreign key constraints
    await db.delete(users).where(eq(users.id, session.user.id))

    return NextResponse.json({ success: true, message: "Account deleted successfully" })
  } catch (error) {
    console.error("Failed to delete user account:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

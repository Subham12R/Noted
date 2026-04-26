import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-utils"
import { rateLimitMemory, RATE_LIMITS } from "@/lib/rate-limit"
import { db } from "@/db"
import { accounts } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import bcrypt from "bcryptjs"

// PATCH /api/users/password - Update user password
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "password-change", limit: 5, windowMs: 60 * 1000 })
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, { status: 429 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    // Validate input
    if (!currentPassword || typeof currentPassword !== "string" || !currentPassword.trim()) {
      return NextResponse.json(
        { error: "Current password is required" },
        { status: 400 }
      )
    }

    if (!newPassword || typeof newPassword !== "string" || !newPassword.trim()) {
      return NextResponse.json(
        { error: "New password is required" },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      )
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        { error: "New password must be at most 128 characters" },
        { status: 400 }
      )
    }

    // Find the credential account for this user
    const [account] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, session.user.id),
          eq(accounts.providerId, "credential")
        )
      )
      .limit(1)

    if (!account || !account.password) {
      return NextResponse.json(
        { error: "No password set for this account. You may have signed up with a social provider." },
        { status: 400 }
      )
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, account.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await db
      .update(accounts)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, account.id))

    return NextResponse.json({ success: true, message: "Password updated successfully" })
  } catch (error) {
    console.error("Failed to update password:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
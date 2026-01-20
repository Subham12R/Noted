import { NextRequest, NextResponse } from "next/server"
import { db, users } from "@/db"
import { eq } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"

// GET /api/users/search?email=xxx - Search for a user by email
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Search user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

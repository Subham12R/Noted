import { NextRequest, NextResponse } from "next/server"
import { db, flashcardDecks, flashcards } from "@/db"
import { eq, desc, sql } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { rateLimitMemory, RATE_LIMITS } from "@/lib/rate-limit"

// GET /api/flashcards/decks — list decks for the authenticated user
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decks = await db
      .select({
        id: flashcardDecks.id,
        title: flashcardDecks.title,
        description: flashcardDecks.description,
        sourcePageId: flashcardDecks.sourcePageId,
        createdAt: flashcardDecks.createdAt,
        updatedAt: flashcardDecks.updatedAt,
        cardCount: sql<number>`(select count(*) from flashcards where flashcards.deck_id = ${flashcardDecks.id})::int`,
      })
      .from(flashcardDecks)
      .where(eq(flashcardDecks.userId, session.user.id))
      .orderBy(desc(flashcardDecks.updatedAt))

    return NextResponse.json({ decks })
  } catch (error) {
    console.error("GET /api/flashcards/decks error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/flashcards/decks — create a new deck
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "flashcard-create", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })

    const body = await request.json()
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 255) : ""
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 })

    const description = typeof body?.description === "string" ? body.description.trim().slice(0, 1000) : null
    const sourcePageId = typeof body?.sourcePageId === "string" ? body.sourcePageId : null

    const [deck] = await db
      .insert(flashcardDecks)
      .values({ userId: session.user.id, title, description, sourcePageId })
      .returning()

    return NextResponse.json({ deck }, { status: 201 })
  } catch (error) {
    console.error("POST /api/flashcards/decks error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { db, flashcardDecks, flashcards } from "@/db"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { rateLimitMemory, RATE_LIMITS } from "@/lib/rate-limit"

type Params = { params: Promise<{ id: string }> }

// POST /api/flashcards/decks/[id]/cards — add a card to a deck
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "flashcard-card-create", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })

    const { id: deckId } = await params

    // Verify deck ownership
    const [deck] = await db
      .select({ id: flashcardDecks.id })
      .from(flashcardDecks)
      .where(and(eq(flashcardDecks.id, deckId), eq(flashcardDecks.userId, session.user.id)))

    if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 })

    const body = await request.json()
    const front = typeof body?.front === "string" ? body.front.trim() : ""
    const back = typeof body?.back === "string" ? body.back.trim() : ""

    if (!front || !back) return NextResponse.json({ error: "front and back are required" }, { status: 400 })

    const type = typeof body?.type === "string" ? body.type.slice(0, 20) : "basic"

    const [card] = await db
      .insert(flashcards)
      .values({ deckId, userId: session.user.id, front, back, type })
      .returning()

    // Bump deck updatedAt
    await db
      .update(flashcardDecks)
      .set({ updatedAt: new Date() })
      .where(eq(flashcardDecks.id, deckId))

    return NextResponse.json({ card }, { status: 201 })
  } catch (error) {
    console.error("POST /api/flashcards/decks/[id]/cards error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/flashcards/decks/[id]/cards?cardId=xxx — delete a card
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id: deckId } = await params
    const cardId = request.nextUrl.searchParams.get("cardId")
    if (!cardId) return NextResponse.json({ error: "cardId is required" }, { status: 400 })

    // Verify card belongs to this user and deck (ownership enforced on both)
    const [card] = await db
      .select({ id: flashcards.id })
      .from(flashcards)
      .where(and(eq(flashcards.id, cardId), eq(flashcards.deckId, deckId), eq(flashcards.userId, session.user.id)))

    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 })

    await db.delete(flashcards).where(eq(flashcards.id, cardId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/flashcards/decks/[id]/cards error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

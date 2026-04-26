import { NextRequest, NextResponse } from "next/server"
import { db, flashcardDecks, flashcards } from "@/db"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"

type Params = { params: Promise<{ id: string }> }

// GET /api/flashcards/decks/[id] — get a single deck with all its cards
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const [deck] = await db
      .select()
      .from(flashcardDecks)
      .where(and(eq(flashcardDecks.id, id), eq(flashcardDecks.userId, session.user.id)))

    if (!deck) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const cards = await db
      .select()
      .from(flashcards)
      .where(and(eq(flashcards.deckId, id), eq(flashcards.userId, session.user.id)))

    return NextResponse.json({ deck, cards })
  } catch (error) {
    console.error("GET /api/flashcards/decks/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/flashcards/decks/[id] — delete a deck (cascades to cards)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const [deck] = await db
      .select({ id: flashcardDecks.id })
      .from(flashcardDecks)
      .where(and(eq(flashcardDecks.id, id), eq(flashcardDecks.userId, session.user.id)))

    if (!deck) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db.delete(flashcardDecks).where(eq(flashcardDecks.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/flashcards/decks/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { Hono } from "hono"
import { db, flashcardDecks, flashcards } from "../db/index.js"
import { eq, and, desc, sql } from "drizzle-orm"
import { getServerSession } from "../lib/auth-utils.js"
import { rateLimitMemory, RATE_LIMITS } from "../lib/rate-limit.js"

const app = new Hono()

// GET /flashcards/decks
app.get("/decks", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const decks = await db.select({
      id: flashcardDecks.id, title: flashcardDecks.title, description: flashcardDecks.description,
      sourcePageId: flashcardDecks.sourcePageId, createdAt: flashcardDecks.createdAt, updatedAt: flashcardDecks.updatedAt,
      cardCount: sql<number>`(select count(*) from flashcards where flashcards.deck_id = ${flashcardDecks.id})::int`,
    }).from(flashcardDecks).where(eq(flashcardDecks.userId, session.user.id)).orderBy(desc(flashcardDecks.updatedAt))

    return c.json({ decks })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// POST /flashcards/decks
app.post("/decks", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "flashcard-create", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded" }, 429)

    const body = await c.req.json()
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 255) : ""
    if (!title) return c.json({ error: "title is required" }, 400)

    const description = typeof body?.description === "string" ? body.description.trim().slice(0, 1000) : null
    const sourcePageId = typeof body?.sourcePageId === "string" ? body.sourcePageId : null

    const [deck] = await db.insert(flashcardDecks).values({ userId: session.user.id, title, description, sourcePageId }).returning()
    return c.json({ deck }, 201)
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// GET /flashcards/decks/:id
app.get("/decks/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const id = c.req.param("id")
    const [deck] = await db.select().from(flashcardDecks).where(and(eq(flashcardDecks.id, id), eq(flashcardDecks.userId, session.user.id)))
    if (!deck) return c.json({ error: "Not found" }, 404)

    const cards = await db.select().from(flashcards).where(and(eq(flashcards.deckId, id), eq(flashcards.userId, session.user.id)))
    return c.json({ deck, cards })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// DELETE /flashcards/decks/:id
app.delete("/decks/:id", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const id = c.req.param("id")
    const [deck] = await db.select({ id: flashcardDecks.id }).from(flashcardDecks).where(and(eq(flashcardDecks.id, id), eq(flashcardDecks.userId, session.user.id)))
    if (!deck) return c.json({ error: "Not found" }, 404)

    await db.delete(flashcardDecks).where(eq(flashcardDecks.id, id))
    return c.json({ success: true })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// POST /flashcards/decks/:id/cards
app.post("/decks/:id/cards", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "flashcard-card-create", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded" }, 429)

    const deckId = c.req.param("id")
    const [deck] = await db.select({ id: flashcardDecks.id }).from(flashcardDecks).where(and(eq(flashcardDecks.id, deckId), eq(flashcardDecks.userId, session.user.id)))
    if (!deck) return c.json({ error: "Deck not found" }, 404)

    const body = await c.req.json()
    const front = typeof body?.front === "string" ? body.front.trim() : ""
    const back = typeof body?.back === "string" ? body.back.trim() : ""
    if (!front || !back) return c.json({ error: "front and back are required" }, 400)

    const type = typeof body?.type === "string" ? body.type.slice(0, 20) : "basic"
    const [card] = await db.insert(flashcards).values({ deckId, userId: session.user.id, front, back, type }).returning()
    await db.update(flashcardDecks).set({ updatedAt: new Date() }).where(eq(flashcardDecks.id, deckId))

    return c.json({ card }, 201)
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

// DELETE /flashcards/decks/:id/cards?cardId=
app.delete("/decks/:id/cards", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user) return c.json({ error: "Unauthorized" }, 401)

    const deckId = c.req.param("id")
    const cardId = c.req.query("cardId")
    if (!cardId) return c.json({ error: "cardId is required" }, 400)

    const [card] = await db.select({ id: flashcards.id }).from(flashcards).where(and(eq(flashcards.id, cardId), eq(flashcards.deckId, deckId), eq(flashcards.userId, session.user.id)))
    if (!card) return c.json({ error: "Card not found" }, 404)

    await db.delete(flashcards).where(eq(flashcards.id, cardId))
    return c.json({ success: true })
  } catch { return c.json({ error: "Internal server error" }, 500) }
})

export default app

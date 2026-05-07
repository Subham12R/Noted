"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const auth_utils_js_1 = require("../lib/auth-utils.js");
const rate_limit_js_1 = require("../lib/rate-limit.js");
const app = new hono_1.Hono();
// GET /flashcards/decks
app.get("/decks", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const decks = await index_js_1.db.select({
            id: index_js_1.flashcardDecks.id, title: index_js_1.flashcardDecks.title, description: index_js_1.flashcardDecks.description,
            sourcePageId: index_js_1.flashcardDecks.sourcePageId, createdAt: index_js_1.flashcardDecks.createdAt, updatedAt: index_js_1.flashcardDecks.updatedAt,
            cardCount: (0, drizzle_orm_1.sql) `(select count(*) from flashcards where flashcards.deck_id = ${index_js_1.flashcardDecks.id})::int`,
        }).from(index_js_1.flashcardDecks).where((0, drizzle_orm_1.eq)(index_js_1.flashcardDecks.userId, session.user.id)).orderBy((0, drizzle_orm_1.desc)(index_js_1.flashcardDecks.updatedAt));
        return c.json({ decks });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /flashcards/decks
app.post("/decks", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "flashcard-create", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded" }, 429);
        const body = await c.req.json();
        const title = typeof body?.title === "string" ? body.title.trim().slice(0, 255) : "";
        if (!title)
            return c.json({ error: "title is required" }, 400);
        const description = typeof body?.description === "string" ? body.description.trim().slice(0, 1000) : null;
        const sourcePageId = typeof body?.sourcePageId === "string" ? body.sourcePageId : null;
        const [deck] = await index_js_1.db.insert(index_js_1.flashcardDecks).values({ userId: session.user.id, title, description, sourcePageId }).returning();
        return c.json({ deck }, 201);
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// GET /flashcards/decks/:id
app.get("/decks/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const id = c.req.param("id");
        const [deck] = await index_js_1.db.select().from(index_js_1.flashcardDecks).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.flashcardDecks.id, id), (0, drizzle_orm_1.eq)(index_js_1.flashcardDecks.userId, session.user.id)));
        if (!deck)
            return c.json({ error: "Not found" }, 404);
        const cards = await index_js_1.db.select().from(index_js_1.flashcards).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.flashcards.deckId, id), (0, drizzle_orm_1.eq)(index_js_1.flashcards.userId, session.user.id)));
        return c.json({ deck, cards });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// DELETE /flashcards/decks/:id
app.delete("/decks/:id", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const id = c.req.param("id");
        const [deck] = await index_js_1.db.select({ id: index_js_1.flashcardDecks.id }).from(index_js_1.flashcardDecks).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.flashcardDecks.id, id), (0, drizzle_orm_1.eq)(index_js_1.flashcardDecks.userId, session.user.id)));
        if (!deck)
            return c.json({ error: "Not found" }, 404);
        await index_js_1.db.delete(index_js_1.flashcardDecks).where((0, drizzle_orm_1.eq)(index_js_1.flashcardDecks.id, id));
        return c.json({ success: true });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /flashcards/decks/:id/cards
app.post("/decks/:id/cards", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: session.user.id, endpoint: "flashcard-card-create", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded" }, 429);
        const deckId = c.req.param("id");
        const [deck] = await index_js_1.db.select({ id: index_js_1.flashcardDecks.id }).from(index_js_1.flashcardDecks).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.flashcardDecks.id, deckId), (0, drizzle_orm_1.eq)(index_js_1.flashcardDecks.userId, session.user.id)));
        if (!deck)
            return c.json({ error: "Deck not found" }, 404);
        const body = await c.req.json();
        const front = typeof body?.front === "string" ? body.front.trim() : "";
        const back = typeof body?.back === "string" ? body.back.trim() : "";
        if (!front || !back)
            return c.json({ error: "front and back are required" }, 400);
        const type = typeof body?.type === "string" ? body.type.slice(0, 20) : "basic";
        const [card] = await index_js_1.db.insert(index_js_1.flashcards).values({ deckId, userId: session.user.id, front, back, type }).returning();
        await index_js_1.db.update(index_js_1.flashcardDecks).set({ updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(index_js_1.flashcardDecks.id, deckId));
        return c.json({ card }, 201);
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// DELETE /flashcards/decks/:id/cards?cardId=
app.delete("/decks/:id/cards", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user)
            return c.json({ error: "Unauthorized" }, 401);
        const deckId = c.req.param("id");
        const cardId = c.req.query("cardId");
        if (!cardId)
            return c.json({ error: "cardId is required" }, 400);
        const [card] = await index_js_1.db.select({ id: index_js_1.flashcards.id }).from(index_js_1.flashcards).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.flashcards.id, cardId), (0, drizzle_orm_1.eq)(index_js_1.flashcards.deckId, deckId), (0, drizzle_orm_1.eq)(index_js_1.flashcards.userId, session.user.id)));
        if (!card)
            return c.json({ error: "Card not found" }, 404);
        await index_js_1.db.delete(index_js_1.flashcards).where((0, drizzle_orm_1.eq)(index_js_1.flashcards.id, cardId));
        return c.json({ success: true });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
exports.default = app;
//# sourceMappingURL=flashcards.js.map
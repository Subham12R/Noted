"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

export interface Flashcard {
  id: string
  deckId: string
  front: string
  back: string
  type: "basic" | "cloze" | "image"
  createdAt: Date
  updatedAt: Date
}

export interface FlashcardProgress {
  cardId: string
  easeFactor: number
  interval: number
  repetitions: number
  nextReview: Date | null
  lastReviewed: Date | null
  streak: number
}

export interface FlashcardDeck {
  id: string
  title: string
  description: string
  sourcePageId: string | null
  cardCount: number
  dueCount: number
  createdAt: Date
  updatedAt: Date
}

export type ReviewRating = "again" | "hard" | "good" | "easy"

interface FlashcardContextType {
  decks: FlashcardDeck[]
  currentDeck: FlashcardDeck | null
  currentCards: Flashcard[]
  dueCards: Flashcard[]
  isLoading: boolean
  error: string | null

  isReviewing: boolean
  currentReviewCard: Flashcard | null
  reviewProgress: { completed: number; total: number }
  isFlipped: boolean

  isModalOpen: boolean
  modalMode: "list" | "review" | "create" | "edit"

  fetchDecks: () => Promise<void>
  fetchDeckCards: (deckId: string) => Promise<void>
  fetchDueCards: () => Promise<void>
  createDeck: (title: string, description?: string, sourcePageId?: string) => Promise<FlashcardDeck | null>
  deleteDeck: (deckId: string) => Promise<void>
  createCard: (deckId: string, front: string, back: string, type?: Flashcard["type"]) => Promise<Flashcard | null>
  updateCard: (cardId: string, updates: Partial<Flashcard>) => Promise<void>
  deleteCard: (cardId: string) => Promise<void>
  generateFromNote: (pageId: string, pageContent: string, count?: number) => Promise<FlashcardDeck | null>

  startReview: (deckId?: string) => void
  endReview: () => void
  flipCard: () => void
  rateCard: (rating: ReviewRating) => Promise<void>
  skipCard: () => void

  openModal: (mode?: "list" | "review" | "create" | "edit") => void
  closeModal: () => void
  setCurrentDeck: (deck: FlashcardDeck | null) => void
}

const FlashcardContext = createContext<FlashcardContextType | null>(null)

const FSRS_MAX_INTERVAL = 36500

function calculateNextReview(rating: ReviewRating, progress: FlashcardProgress): Partial<FlashcardProgress> {
  const ratingMap: Record<ReviewRating, number> = { again: 1, hard: 2, good: 3, easy: 4 }
  const grade = ratingMap[rating]
  let { easeFactor, interval, repetitions, streak } = progress

  if (grade === 1) {
    repetitions = 0; interval = 1; easeFactor = Math.max(1.3, easeFactor - 0.2); streak = 0
  } else if (grade === 2) {
    interval = Math.max(1, Math.round(interval * 1.2)); easeFactor = Math.max(1.3, easeFactor - 0.15); repetitions += 1; streak += 1
  } else if (grade === 3) {
    interval = repetitions === 0 ? 1 : repetitions === 1 ? 6 : Math.round(interval * easeFactor)
    repetitions += 1; streak += 1
  } else {
    interval = repetitions === 0 ? 4 : Math.round(interval * easeFactor * 1.3)
    easeFactor += 0.15; repetitions += 1; streak += 1
  }

  interval = Math.min(interval, FSRS_MAX_INTERVAL)
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)
  return { easeFactor, interval, repetitions, nextReview, lastReviewed: new Date(), streak }
}

function normalizeDeck(raw: Record<string, unknown>): FlashcardDeck {
  return {
    id: raw.id as string,
    title: raw.title as string,
    description: (raw.description as string) ?? "",
    sourcePageId: (raw.sourcePageId as string) ?? null,
    cardCount: (raw.cardCount as number) ?? 0,
    dueCount: 0,
    createdAt: new Date(raw.createdAt as string),
    updatedAt: new Date(raw.updatedAt as string),
  }
}

function normalizeCard(raw: Record<string, unknown>): Flashcard {
  return {
    id: raw.id as string,
    deckId: raw.deckId as string,
    front: raw.front as string,
    back: raw.back as string,
    type: (raw.type as Flashcard["type"]) ?? "basic",
    createdAt: new Date(raw.createdAt as string),
    updatedAt: new Date(raw.updatedAt as string),
  }
}

export function FlashcardProvider({ children }: { children: ReactNode }) {
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [currentDeck, setCurrentDeck] = useState<FlashcardDeck | null>(null)
  const [currentCards, setCurrentCards] = useState<Flashcard[]>([])
  const [dueCards, setDueCards] = useState<Flashcard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([])
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  // Review progress lives in localStorage only — FSRS state is device-local
  const [cardProgress, setCardProgress] = useState<Map<string, FlashcardProgress>>(new Map())

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"list" | "review" | "create" | "edit">("list")

  const currentReviewCard = reviewQueue[currentReviewIndex] || null
  const reviewProgress = { completed: currentReviewIndex, total: reviewQueue.length }

  // Load FSRS progress from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem("noted-flashcard-progress")
      if (stored) {
        const data = JSON.parse(stored)
        const map = new Map<string, FlashcardProgress>()
        Object.entries(data).forEach(([key, value]) => {
          const p = value as FlashcardProgress
          p.nextReview = p.nextReview ? new Date(p.nextReview) : null
          p.lastReviewed = p.lastReviewed ? new Date(p.lastReviewed) : null
          map.set(key, p)
        })
        setCardProgress(map)
      }
    } catch { /* ignore corrupt storage */ }
  }, [])

  // Persist FSRS progress to localStorage
  useEffect(() => {
    if (typeof window === "undefined" || cardProgress.size === 0) return
    const data: Record<string, FlashcardProgress> = {}
    cardProgress.forEach((v, k) => { data[k] = v })
    localStorage.setItem("noted-flashcard-progress", JSON.stringify(data))
  }, [cardProgress])

  // Listen for slash command / sidebar open events
  useEffect(() => {
    const handler = (event: CustomEvent<{ mode?: "list" | "review" | "create" | "edit" }>) => {
      const mode = event.detail?.mode || "create"
      setModalMode(mode)
      setIsModalOpen(true)
      if (mode === "list") fetchDecks()
    }
    window.addEventListener("openFlashcardsModal", handler as EventListener)
    return () => window.removeEventListener("openFlashcardsModal", handler as EventListener)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDecks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/flashcards/decks")
      if (!res.ok) throw new Error("Failed to fetch decks")
      const data = await res.json()
      setDecks((data.decks as Record<string, unknown>[]).map(normalizeDeck))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch decks")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchDeckCards = useCallback(async (deckId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/flashcards/decks/${deckId}`)
      if (!res.ok) throw new Error("Failed to fetch cards")
      const data = await res.json()
      setCurrentCards((data.cards as Record<string, unknown>[]).map(normalizeCard))
      setCurrentDeck(normalizeDeck(data.deck))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch cards")
      setCurrentCards([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchDueCards = useCallback(async () => {
    const now = new Date()
    const due = currentCards.filter(card => {
      const progress = cardProgress.get(card.id)
      return !progress || !progress.nextReview || progress.nextReview <= now
    })
    setDueCards(due)
  }, [currentCards, cardProgress])

  const createDeck = useCallback(async (title: string, description?: string, sourcePageId?: string): Promise<FlashcardDeck | null> => {
    try {
      const res = await fetch("/api/flashcards/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, sourcePageId }),
      })
      if (!res.ok) throw new Error("Failed to create deck")
      const data = await res.json()
      const deck = normalizeDeck(data.deck)
      setDecks(prev => [deck, ...prev])
      return deck
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create deck")
      return null
    }
  }, [])

  const deleteDeck = useCallback(async (deckId: string) => {
    try {
      const res = await fetch(`/api/flashcards/decks/${deckId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete deck")
      setDecks(prev => prev.filter(d => d.id !== deckId))
      if (currentDeck?.id === deckId) { setCurrentDeck(null); setCurrentCards([]) }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete deck")
    }
  }, [currentDeck])

  const createCard = useCallback(async (deckId: string, front: string, back: string, type: Flashcard["type"] = "basic"): Promise<Flashcard | null> => {
    try {
      const res = await fetch(`/api/flashcards/decks/${deckId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ front, back, type }),
      })
      if (!res.ok) throw new Error("Failed to create card")
      const data = await res.json()
      const card = normalizeCard(data.card)
      setCurrentCards(prev => [...prev, card])
      setDecks(prev => prev.map(d => d.id === deckId ? { ...d, cardCount: d.cardCount + 1 } : d))
      return card
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create card")
      return null
    }
  }, [])

  const updateCard = useCallback(async (cardId: string, updates: Partial<Flashcard>) => {
    setCurrentCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updates, updatedAt: new Date() } : c))
  }, [])

  const deleteCard = useCallback(async (cardId: string) => {
    const card = currentCards.find(c => c.id === cardId)
    if (!card) return
    try {
      const res = await fetch(`/api/flashcards/decks/${card.deckId}/cards?cardId=${cardId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete card")
      setCurrentCards(prev => prev.filter(c => c.id !== cardId))
      setDecks(prev => prev.map(d => d.id === card.deckId ? { ...d, cardCount: Math.max(0, d.cardCount - 1) } : d))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete card")
    }
  }, [currentCards])

  const generateFromNote = useCallback(async (pageId: string, pageContent: string, count = 10): Promise<FlashcardDeck | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Generate ${count} flashcards from the following content. Return a JSON array with objects containing "front" (question) and "back" (answer) fields. Make the questions test understanding, not just memorization. Content:\n\n${pageContent}`,
          mode: "flashcard",
        }),
      })
      if (!res.ok) throw new Error("Failed to generate flashcards")

      const data = await res.json()
      let cards: { front: string; back: string }[] = []
      const content = data.content || data.response || ""

      const tryParse = (str: string) => { try { return JSON.parse(str) } catch { return null } }
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) cards = tryParse(jsonMatch[0]) ?? []
      if (!cards.length) {
        const codeMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
        if (codeMatch) cards = tryParse(codeMatch[1]) ?? []
      }
      if (!cards.length) {
        const s = content.indexOf("["), e = content.lastIndexOf("]")
        if (s !== -1 && e > s) cards = tryParse(content.substring(s, e + 1)) ?? []
      }
      if (!cards.length) {
        cards = [
          { front: "What is the main topic of this note?", back: "Based on the content provided" },
          { front: "What are the key concepts?", back: "The important concepts from the note" },
        ]
      }

      const deck = await createDeck("Flashcards from Note", "AI-generated flashcards", pageId)
      if (deck) {
        for (const card of cards) await createCard(deck.id, card.front, card.back)
        setCurrentDeck(deck)
        return deck
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate flashcards")
    } finally {
      setIsLoading(false)
    }
    return null
  }, [createDeck, createCard])

  const startReview = useCallback((deckId?: string) => {
    const now = new Date()
    let pool = deckId ? currentCards.filter(c => c.deckId === deckId) : [...dueCards]
    pool = pool.filter(card => {
      const p = cardProgress.get(card.id)
      return !p || !p.nextReview || p.nextReview <= now
    })
    pool.sort(() => Math.random() - 0.5)
    setReviewQueue(pool)
    setCurrentReviewIndex(0)
    setIsFlipped(false)
    setIsReviewing(true)
    setModalMode("review")
  }, [currentCards, dueCards, cardProgress])

  const endReview = useCallback(() => {
    setIsReviewing(false); setReviewQueue([]); setCurrentReviewIndex(0); setIsFlipped(false); setModalMode("list")
  }, [])

  const flipCard = useCallback(() => setIsFlipped(prev => !prev), [])

  const rateCard = useCallback(async (rating: ReviewRating) => {
    if (!currentReviewCard) return
    const current = cardProgress.get(currentReviewCard.id) || {
      cardId: currentReviewCard.id, easeFactor: 2.5, interval: 0, repetitions: 0, nextReview: null, lastReviewed: null, streak: 0,
    }
    const updates = calculateNextReview(rating, current)
    setCardProgress(prev => { const m = new Map(prev); m.set(currentReviewCard.id, { ...current, ...updates }); return m })
    if (currentReviewIndex < reviewQueue.length - 1) {
      setCurrentReviewIndex(prev => prev + 1); setIsFlipped(false)
    } else {
      endReview()
    }
  }, [currentReviewCard, currentReviewIndex, reviewQueue.length, cardProgress, endReview])

  const skipCard = useCallback(() => {
    if (currentReviewIndex < reviewQueue.length - 1) {
      setReviewQueue(prev => { const q = [...prev]; q.push(q.splice(currentReviewIndex, 1)[0]); return q })
      setIsFlipped(false)
    }
  }, [currentReviewIndex, reviewQueue.length])

  const openModal = useCallback((mode: "list" | "review" | "create" | "edit" = "list") => {
    setModalMode(mode); setIsModalOpen(true)
    if (mode === "list") fetchDecks()
  }, [fetchDecks])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    if (isReviewing) endReview()
  }, [isReviewing, endReview])

  return (
    <FlashcardContext.Provider
      value={{
        decks, currentDeck, currentCards, dueCards, isLoading, error,
        isReviewing, currentReviewCard, reviewProgress, isFlipped,
        isModalOpen, modalMode,
        fetchDecks, fetchDeckCards, fetchDueCards,
        createDeck, deleteDeck, createCard, updateCard, deleteCard, generateFromNote,
        startReview, endReview, flipCard, rateCard, skipCard,
        openModal, closeModal, setCurrentDeck,
      }}
    >
      {children}
    </FlashcardContext.Provider>
  )
}

export function useFlashcards() {
  const context = useContext(FlashcardContext)
  if (!context) throw new Error("useFlashcards must be used within a FlashcardProvider")
  return context
}

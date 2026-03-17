"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

export interface Flashcard {
  id: string
  deckId: string
  front: string
  back: string
  type: "basic" | "cloze" | "image"
  tags: string[]
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
  // State
  decks: FlashcardDeck[]
  currentDeck: FlashcardDeck | null
  currentCards: Flashcard[]
  dueCards: Flashcard[]
  isLoading: boolean
  error: string | null

  // Review state
  isReviewing: boolean
  currentReviewCard: Flashcard | null
  reviewProgress: { completed: number; total: number }
  isFlipped: boolean

  // Modal state
  isModalOpen: boolean
  modalMode: "list" | "review" | "create" | "edit"

  // Actions
  fetchDecks: () => Promise<void>
  fetchDeckCards: (deckId: string) => Promise<void>
  fetchDueCards: () => Promise<void>
  createDeck: (title: string, description?: string, sourcePageId?: string) => Promise<FlashcardDeck | null>
  deleteDeck: (deckId: string) => Promise<void>
  createCard: (deckId: string, front: string, back: string, type?: Flashcard["type"]) => Promise<Flashcard | null>
  updateCard: (cardId: string, updates: Partial<Flashcard>) => Promise<void>
  deleteCard: (cardId: string) => Promise<void>
  generateFromNote: (pageId: string, pageContent: string, count?: number) => Promise<FlashcardDeck | null>

  // Review actions
  startReview: (deckId?: string) => void
  endReview: () => void
  flipCard: () => void
  rateCard: (rating: ReviewRating) => Promise<void>
  skipCard: () => void

  // Modal actions
  openModal: (mode?: "list" | "review" | "create" | "edit") => void
  closeModal: () => void
  setCurrentDeck: (deck: FlashcardDeck | null) => void
}

const FlashcardContext = createContext<FlashcardContextType | null>(null)

// FSRS algorithm constants
const FSRS_PARAMS = {
  w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
  requestRetention: 0.9,
  maximumInterval: 36500,
}

function calculateNextReview(rating: ReviewRating, progress: FlashcardProgress): Partial<FlashcardProgress> {
  const ratingMap: Record<ReviewRating, number> = { again: 1, hard: 2, good: 3, easy: 4 }
  const grade = ratingMap[rating]

  let { easeFactor, interval, repetitions, streak } = progress

  if (grade === 1) {
    // Again - reset
    repetitions = 0
    interval = 1
    easeFactor = Math.max(1.3, easeFactor - 0.2)
    streak = 0
  } else if (grade === 2) {
    // Hard
    interval = Math.max(1, Math.round(interval * 1.2))
    easeFactor = Math.max(1.3, easeFactor - 0.15)
    repetitions += 1
    streak += 1
  } else if (grade === 3) {
    // Good
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
    repetitions += 1
    streak += 1
  } else {
    // Easy
    if (repetitions === 0) {
      interval = 4
    } else {
      interval = Math.round(interval * easeFactor * 1.3)
    }
    easeFactor = easeFactor + 0.15
    repetitions += 1
    streak += 1
  }

  interval = Math.min(interval, FSRS_PARAMS.maximumInterval)

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  return {
    easeFactor,
    interval,
    repetitions,
    nextReview,
    lastReviewed: new Date(),
    streak,
  }
}

export function FlashcardProvider({ children }: { children: ReactNode }) {
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [currentDeck, setCurrentDeck] = useState<FlashcardDeck | null>(null)
  const [currentCards, setCurrentCards] = useState<Flashcard[]>([])
  const [dueCards, setDueCards] = useState<Flashcard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Review state
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([])
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [cardProgress, setCardProgress] = useState<Map<string, FlashcardProgress>>(new Map())

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"list" | "review" | "create" | "edit">("list")

  const currentReviewCard = reviewQueue[currentReviewIndex] || null
  const reviewProgress = { completed: currentReviewIndex, total: reviewQueue.length }

  // Load progress and decks from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem("noted-flashcard-progress")
      if (stored) {
        const data = JSON.parse(stored)
        const map = new Map<string, FlashcardProgress>()
        Object.entries(data).forEach(([key, value]) => {
          const progress = value as FlashcardProgress
          progress.nextReview = progress.nextReview ? new Date(progress.nextReview) : null
          progress.lastReviewed = progress.lastReviewed ? new Date(progress.lastReviewed) : null
          map.set(key, progress)
        })
        setCardProgress(map)
      }
      const storedDecks = localStorage.getItem("noted-flashcard-decks")
      if (storedDecks) {
        setDecks(JSON.parse(storedDecks))
      }
    } catch (e) {
      console.error("Failed to load flashcard data:", e)
    }
  }, [])

  // Save progress to localStorage
  useEffect(() => {
    if (typeof window === "undefined" || cardProgress.size === 0) return
    const data: Record<string, FlashcardProgress> = {}
    cardProgress.forEach((value, key) => {
      data[key] = value
    })
    localStorage.setItem("noted-flashcard-progress", JSON.stringify(data))
  }, [cardProgress])

  // Save decks to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("noted-flashcard-decks", JSON.stringify(decks))
  }, [decks])

  // Listen for openFlashcardsModal events from slash menu
  useEffect(() => {
    const handleOpenModal = (event: CustomEvent<{ mode?: "list" | "review" | "create" | "edit" }>) => {
      const mode = event.detail?.mode || "create"
      setModalMode(mode)
      setIsModalOpen(true)
      if (mode === "list") {
        fetchDecks()
      }
    }

    window.addEventListener("openFlashcardsModal", handleOpenModal as EventListener)
    return () => {
      window.removeEventListener("openFlashcardsModal", handleOpenModal as EventListener)
    }
  }, [])

  const fetchDecks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const stored = localStorage.getItem("noted-flashcard-decks")
      if (stored) {
        const loadedDecks = JSON.parse(stored)
        if (decks.length === 0) {
          setDecks(loadedDecks)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch decks")
    } finally {
      setIsLoading(false)
    }
  }, [decks.length])

  const fetchDeckCards = useCallback(async (deckId: string) => {
    setIsLoading(true)
    try {
      const stored = localStorage.getItem("noted-flashcard-decks")
      if (stored) {
        const decks = JSON.parse(stored)
        const deck = decks.find((d: any) => d.id === deckId)
        setCurrentCards(deck?.cards || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch cards")
      setCurrentCards([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchDueCards = useCallback(async () => {
    // Calculate due cards from progress
    const now = new Date()
    const due: Flashcard[] = []

    currentCards.forEach(card => {
      const progress = cardProgress.get(card.id)
      if (!progress || !progress.nextReview || progress.nextReview <= now) {
        due.push(card)
      }
    })

    setDueCards(due)
  }, [currentCards, cardProgress])

  const createDeck = useCallback(async (title: string, description?: string, sourcePageId?: string): Promise<FlashcardDeck | null> => {
    const deck: FlashcardDeck = {
      id: `deck-${Date.now()}`,
      title,
      description: description || "",
      sourcePageId: sourcePageId || null,
      cardCount: 0,
      dueCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setDecks(prev => [...prev, deck])
    return deck
  }, [])

  const deleteDeck = useCallback(async (deckId: string) => {
    setDecks(prev => prev.filter(d => d.id !== deckId))
    if (currentDeck?.id === deckId) {
      setCurrentDeck(null)
      setCurrentCards([])
    }
  }, [currentDeck])

  const createCard = useCallback(async (deckId: string, front: string, back: string, type: Flashcard["type"] = "basic"): Promise<Flashcard | null> => {
    const card: Flashcard = {
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      deckId,
      front,
      back,
      type,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setCurrentCards(prev => [...prev, card])
    setDecks(prev => prev.map(d => d.id === deckId ? { ...d, cardCount: d.cardCount + 1 } : d))
    return card
  }, [])

  const updateCard = useCallback(async (cardId: string, updates: Partial<Flashcard>) => {
    setCurrentCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updates, updatedAt: new Date() } : c))
  }, [])

  const deleteCard = useCallback(async (cardId: string) => {
    const card = currentCards.find(c => c.id === cardId)
    setCurrentCards(prev => prev.filter(c => c.id !== cardId))
    if (card) {
      setDecks(prev => prev.map(d => d.id === card.deckId ? { ...d, cardCount: Math.max(0, d.cardCount - 1) } : d))
    }
  }, [currentCards])

  const generateFromNote = useCallback(async (pageId: string, pageContent: string, count: number = 10): Promise<FlashcardDeck | null> => {
    setIsLoading(true)
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

      // Parse the response - try multiple methods like in quiz
      try {
        const content = data.content || data.response || ""
        
        // Method 1: Try greedy JSON extraction
        let jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          try {
            cards = JSON.parse(jsonMatch[0])
          } catch {}
        }

        // Method 2: Try code blocks
        if (cards.length === 0) {
          jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
          if (jsonMatch) {
            try {
              cards = JSON.parse(jsonMatch[1])
            } catch {}
          }
        }

        // Method 3: Try with index positions
        if (cards.length === 0) {
          const startIdx = content.indexOf('[')
          const endIdx = content.lastIndexOf(']')
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            try {
              cards = JSON.parse(content.substring(startIdx, endIdx + 1))
            } catch {}
          }
        }
      } catch (e) {
        console.error("Failed to parse AI response:", e)
      }

      if (cards.length === 0) {
        // Generate sample cards for demo
        cards = [
          { front: "What is the main topic of this note?", back: "Based on the content provided" },
          { front: "What are the key concepts?", back: "The important concepts from the note" },
        ]
      }

      // Create deck and cards
      const deck = await createDeck(`Flashcards from Note`, "AI-generated flashcards", pageId)
      if (deck) {
        for (const card of cards) {
          await createCard(deck.id, card.front, card.back)
        }
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
    let cardsToReview: Flashcard[] = []

    if (deckId) {
      cardsToReview = currentCards.filter(c => c.deckId === deckId)
    } else {
      cardsToReview = [...dueCards]
    }

    // Filter to only due cards
    const now = new Date()
    cardsToReview = cardsToReview.filter(card => {
      const progress = cardProgress.get(card.id)
      return !progress || !progress.nextReview || progress.nextReview <= now
    })

    // Shuffle cards
    cardsToReview.sort(() => Math.random() - 0.5)

    setReviewQueue(cardsToReview)
    setCurrentReviewIndex(0)
    setIsFlipped(false)
    setIsReviewing(true)
    setModalMode("review")
  }, [currentCards, dueCards, cardProgress])

  const endReview = useCallback(() => {
    setIsReviewing(false)
    setReviewQueue([])
    setCurrentReviewIndex(0)
    setIsFlipped(false)
    setModalMode("list")
  }, [])

  const flipCard = useCallback(() => {
    setIsFlipped(prev => !prev)
  }, [])

  const rateCard = useCallback(async (rating: ReviewRating) => {
    if (!currentReviewCard) return

    const currentProgress = cardProgress.get(currentReviewCard.id) || {
      cardId: currentReviewCard.id,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: null,
      lastReviewed: null,
      streak: 0,
    }

    const updates = calculateNextReview(rating, currentProgress)
    const newProgress = { ...currentProgress, ...updates }

    setCardProgress(prev => {
      const newMap = new Map(prev)
      newMap.set(currentReviewCard.id, newProgress)
      return newMap
    })

    // Move to next card
    if (currentReviewIndex < reviewQueue.length - 1) {
      setCurrentReviewIndex(prev => prev + 1)
      setIsFlipped(false)
    } else {
      // Review complete
      endReview()
    }
  }, [currentReviewCard, currentReviewIndex, reviewQueue.length, cardProgress, endReview])

  const skipCard = useCallback(() => {
    if (currentReviewIndex < reviewQueue.length - 1) {
      // Move card to end of queue
      setReviewQueue(prev => {
        const newQueue = [...prev]
        const skipped = newQueue.splice(currentReviewIndex, 1)[0]
        newQueue.push(skipped)
        return newQueue
      })
      setIsFlipped(false)
    }
  }, [currentReviewIndex, reviewQueue.length])

  const openModal = useCallback((mode: "list" | "review" | "create" | "edit" = "list") => {
    setModalMode(mode)
    setIsModalOpen(true)
    if (mode === "list") {
      fetchDecks()
    }
  }, [fetchDecks])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    if (isReviewing) {
      endReview()
    }
  }, [isReviewing, endReview])

  return (
    <FlashcardContext.Provider
      value={{
        decks,
        currentDeck,
        currentCards,
        dueCards,
        isLoading,
        error,
        isReviewing,
        currentReviewCard,
        reviewProgress,
        isFlipped,
        isModalOpen,
        modalMode,
        fetchDecks,
        fetchDeckCards,
        fetchDueCards,
        createDeck,
        deleteDeck,
        createCard,
        updateCard,
        deleteCard,
        generateFromNote,
        startReview,
        endReview,
        flipCard,
        rateCard,
        skipCard,
        openModal,
        closeModal,
        setCurrentDeck,
      }}
    >
      {children}
    </FlashcardContext.Provider>
  )
}

export function useFlashcards() {
  const context = useContext(FlashcardContext)
  if (!context) {
    throw new Error("useFlashcards must be used within a FlashcardProvider")
  }
  return context
}

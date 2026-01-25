"use client"

import { useState, useEffect } from "react"
import { useFlashcards, ReviewRating } from "@/context/FlashcardContext"
import {
  X,
  Plus,
  Trash2,
  Play,
  ArrowLeft,
  RotateCcw,
  Layers,
  Sparkles,
  Check,
  ChevronRight,
} from "lucide-react"

export function FlashcardModal() {
  const {
    decks,
    currentDeck,
    currentCards,
    isLoading,
    isReviewing,
    currentReviewCard,
    reviewProgress,
    isFlipped,
    isModalOpen,
    modalMode,
    fetchDecks,
    fetchDeckCards,
    createDeck,
    deleteDeck,
    createCard,
    deleteCard,
    startReview,
    endReview,
    flipCard,
    rateCard,
    skipCard,
    openModal,
    closeModal,
    setCurrentDeck,
  } = useFlashcards()

  const [newDeckTitle, setNewDeckTitle] = useState("")
  const [newCardFront, setNewCardFront] = useState("")
  const [newCardBack, setNewCardBack] = useState("")
  const [showCreateDeck, setShowCreateDeck] = useState(false)
  const [showCreateCard, setShowCreateCard] = useState(false)

  useEffect(() => {
    if (isModalOpen && modalMode === "list") {
      fetchDecks()
    }
  }, [isModalOpen, modalMode, fetchDecks])

  useEffect(() => {
    if (currentDeck) {
      fetchDeckCards(currentDeck.id)
    }
  }, [currentDeck, fetchDeckCards])

  if (!isModalOpen) return null

  const handleCreateDeck = async () => {
    if (!newDeckTitle.trim()) return
    await createDeck(newDeckTitle.trim())
    setNewDeckTitle("")
    setShowCreateDeck(false)
  }

  const handleCreateCard = async () => {
    if (!newCardFront.trim() || !newCardBack.trim() || !currentDeck) return
    await createCard(currentDeck.id, newCardFront.trim(), newCardBack.trim())
    setNewCardFront("")
    setNewCardBack("")
    setShowCreateCard(false)
  }

  const handleRating = (rating: ReviewRating) => {
    rateCard(rating)
  }

  // Review Mode
  if (isReviewing && currentReviewCard) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="w-full max-w-2xl mx-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={endReview}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Exit Review</span>
            </button>
            <span className="text-zinc-400">
              {reviewProgress.completed + 1} / {reviewProgress.total}
            </span>
          </div>

          {/* Card */}
          <div
            onClick={flipCard}
            className="relative min-h-[400px] bg-zinc-900 rounded-2xl border border-zinc-800 cursor-pointer overflow-hidden transform transition-all duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 p-8 flex flex-col items-center justify-center backface-hidden"
              style={{ backfaceVisibility: "hidden" }}
            >
              <span className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Question</span>
              <p className="text-2xl text-white text-center leading-relaxed">
                {currentReviewCard.front}
              </p>
              <span className="mt-8 text-sm text-zinc-500">Click to reveal answer</span>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 p-8 flex flex-col items-center justify-center"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <span className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Answer</span>
              <p className="text-2xl text-white text-center leading-relaxed">
                {currentReviewCard.back}
              </p>
            </div>
          </div>

          {/* Rating buttons - only show when flipped */}
          {isFlipped && (
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => handleRating("again")}
                className="flex flex-col items-center gap-1 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
              >
                <span className="font-medium">Again</span>
                <span className="text-xs opacity-70">&lt;1m</span>
              </button>
              <button
                onClick={() => handleRating("hard")}
                className="flex flex-col items-center gap-1 px-6 py-3 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-xl transition-colors"
              >
                <span className="font-medium">Hard</span>
                <span className="text-xs opacity-70">6m</span>
              </button>
              <button
                onClick={() => handleRating("good")}
                className="flex flex-col items-center gap-1 px-6 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition-colors"
              >
                <span className="font-medium">Good</span>
                <span className="text-xs opacity-70">10m</span>
              </button>
              <button
                onClick={() => handleRating("easy")}
                className="flex flex-col items-center gap-1 px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl transition-colors"
              >
                <span className="font-medium">Easy</span>
                <span className="text-xs opacity-70">4d</span>
              </button>
            </div>
          )}

          {/* Progress bar */}
          <div className="mt-6">
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${((reviewProgress.completed + 1) / reviewProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Deck View (showing cards in a deck)
  if (currentDeck) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="w-full max-w-3xl max-h-[90vh] mx-4 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentDeck(null)}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-white">{currentDeck.title}</h2>
                <p className="text-sm text-zinc-400">{currentCards.length} cards</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => startReview(currentDeck.id)}
                disabled={currentCards.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Play size={16} />
                Review
              </button>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Cards list */}
          <div className="flex-1 overflow-y-auto p-4">
            {showCreateCard ? (
              <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-medium text-white mb-3">Add New Card</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Front (Question)</label>
                    <textarea
                      value={newCardFront}
                      onChange={e => setNewCardFront(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white resize-none"
                      rows={2}
                      placeholder="Enter the question..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Back (Answer)</label>
                    <textarea
                      value={newCardBack}
                      onChange={e => setNewCardBack(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white resize-none"
                      rows={2}
                      placeholder="Enter the answer..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowCreateCard(false)}
                      className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateCard}
                      disabled={!newCardFront.trim() || !newCardBack.trim()}
                      className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                      Add Card
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreateCard(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl text-zinc-400 hover:text-white transition-colors mb-4"
              >
                <Plus size={20} />
                Add Card
              </button>
            )}

            <div className="space-y-3">
              {currentCards.map((card, index) => (
                <div
                  key={card.id}
                  className="bg-zinc-800/50 rounded-xl p-4 hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-zinc-500">#{index + 1}</span>
                      </div>
                      <p className="text-sm text-white mb-2">{card.front}</p>
                      <p className="text-sm text-zinc-400">{card.back}</p>
                    </div>
                    <button
                      onClick={() => deleteCard(card.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {currentCards.length === 0 && !showCreateCard && (
                <div className="text-center py-12 text-zinc-500">
                  <Layers size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No cards yet</p>
                  <p className="text-sm mt-1">Add cards to start studying</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Deck List View
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] mx-4 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Layers className="text-indigo-400" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-white">Flashcards</h2>
          </div>
          <button
            onClick={closeModal}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Create Deck */}
          {showCreateDeck ? (
            <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
              <h3 className="text-sm font-medium text-white mb-3">Create New Deck</h3>
              <input
                type="text"
                value={newDeckTitle}
                onChange={e => setNewDeckTitle(e.target.value)}
                placeholder="Deck name..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white mb-3"
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleCreateDeck()}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCreateDeck(false)}
                  className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDeck}
                  disabled={!newDeckTitle.trim()}
                  className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateDeck(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl text-zinc-400 hover:text-white transition-colors mb-4"
            >
              <Plus size={20} />
              Create Deck
            </button>
          )}

          {/* Deck List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-12 text-zinc-500">Loading...</div>
            ) : decks.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Layers size={48} className="mx-auto mb-4 opacity-50" />
                <p>No decks yet</p>
                <p className="text-sm mt-1">Create a deck to start studying</p>
              </div>
            ) : (
              decks.map(deck => (
                <div
                  key={deck.id}
                  className="group flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors"
                  onClick={() => setCurrentDeck(deck)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-700 rounded-lg">
                      <Layers size={18} className="text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">{deck.title}</h3>
                      <p className="text-xs text-zinc-500">
                        {deck.cardCount} cards
                        {deck.dueCount > 0 && (
                          <span className="text-indigo-400 ml-2">{deck.dueCount} due</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        startReview(deck.id)
                      }}
                      disabled={deck.cardCount === 0}
                      className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-50 rounded-lg transition-colors"
                      title="Start Review"
                    >
                      <Play size={16} />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        deleteDeck(deck.id)
                      }}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Deck"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={16} className="text-zinc-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

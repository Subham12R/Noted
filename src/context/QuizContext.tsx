"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

export type QuestionType =
  | "multiple-choice"
  | "multiple-select"
  | "true-false"
  | "fill-blank"
  | "short-answer"

export interface QuizQuestion {
  id: string
  type: QuestionType
  question: string
  options?: string[]
  correctAnswer: string | string[]
  explanation?: string
  points: number
  difficulty: "easy" | "medium" | "hard"
  userAnswer?: string | string[]
  isCorrect?: boolean
}

export interface Quiz {
  id: string
  title: string
  description?: string
  questions: QuizQuestion[]
  sourcePageId?: string
  isAIGenerated: boolean
  createdAt: Date
}

export interface QuizSettings {
  displayMode: "modal" | "fullscreen" | "sidebar"
  timeLimit?: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  showTimer: boolean
  showProgress: boolean
  instantFeedback: boolean
  allowSkip: boolean
  allowBack: boolean
  passingScore: number
}

export interface QuizResult {
  quizId: string
  score: number
  totalPoints: number
  percentage: number
  correctCount: number
  totalQuestions: number
  timeTaken: number
  answers: { questionId: string; userAnswer: string | string[]; isCorrect: boolean }[]
  completedAt: Date
}

interface QuizContextType {
  // State
  quizzes: Quiz[]
  currentQuiz: Quiz | null
  isLoading: boolean
  error: string | null

  // Quiz taking state
  isTakingQuiz: boolean
  currentQuestionIndex: number
  answers: Map<string, string | string[]>
  startTime: number | null
  timeRemaining: number | null

  // Settings
  settings: QuizSettings

  // Results
  lastResult: QuizResult | null
  results: QuizResult[]

  // Modal state
  isModalOpen: boolean
  modalMode: "list" | "taking" | "results" | "create"
  isFullscreen: boolean

  // Actions
  fetchQuizzes: () => Promise<void>
  createQuiz: (title: string, questions: Omit<QuizQuestion, "id">[]) => Promise<Quiz | null>
  deleteQuiz: (quizId: string) => Promise<void>
  generateFromNote: (pageId: string, pageContent: string, count?: number, difficulty?: string) => Promise<Quiz | null>

  // Quiz taking actions
  startQuiz: (quizId: string) => void
  endQuiz: () => void
  submitAnswer: (questionId: string, answer: string | string[]) => void
  nextQuestion: () => void
  prevQuestion: () => void
  goToQuestion: (index: number) => void
  submitQuiz: () => QuizResult

  // Modal actions
  openModal: (mode?: "list" | "taking" | "results" | "create") => void
  closeModal: () => void
  toggleFullscreen: () => void
  updateSettings: (settings: Partial<QuizSettings>) => void
}

const defaultSettings: QuizSettings = {
  displayMode: "modal",
  shuffleQuestions: true,
  shuffleOptions: true,
  showTimer: true,
  showProgress: true,
  instantFeedback: false,
  allowSkip: true,
  allowBack: true,
  passingScore: 70,
}

const QuizContext = createContext<QuizContextType | null>(null)

export function QuizProvider({ children }: { children: ReactNode }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Quiz taking state
  const [isTakingQuiz, setIsTakingQuiz] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, string | string[]>>(new Map())
  const [startTime, setStartTime] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  // Settings
  const [settings, setSettings] = useState<QuizSettings>(defaultSettings)

  // Results
  const [lastResult, setLastResult] = useState<QuizResult | null>(null)
  const [results, setResults] = useState<QuizResult[]>([])

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"list" | "taking" | "results" | "create">("list")
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Load settings from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem("noted-quiz-settings")
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) })
      }
      const storedResults = localStorage.getItem("noted-quiz-results")
      if (storedResults) {
        setResults(JSON.parse(storedResults))
      }
    } catch (e) {
      console.error("Failed to load quiz settings:", e)
    }
  }, [])

  // Save settings
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("noted-quiz-settings", JSON.stringify(settings))
  }, [settings])

  // Save results
  useEffect(() => {
    if (typeof window === "undefined" || results.length === 0) return
    localStorage.setItem("noted-quiz-results", JSON.stringify(results.slice(-50))) // Keep last 50
  }, [results])

  // Timer effect
  useEffect(() => {
    if (!isTakingQuiz || !settings.timeLimit || timeRemaining === null) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isTakingQuiz, settings.timeLimit, timeRemaining])

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining === 0 && isTakingQuiz) {
      submitQuiz()
    }
  }, [timeRemaining, isTakingQuiz])

  const fetchQuizzes = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/quizzes")
      if (!res.ok) throw new Error("Failed to fetch quizzes")
      const data = await res.json()
      setQuizzes(data.quizzes || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch quizzes")
      setQuizzes([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createQuiz = useCallback(async (title: string, questions: Omit<QuizQuestion, "id">[]): Promise<Quiz | null> => {
    const quiz: Quiz = {
      id: `quiz-${Date.now()}`,
      title,
      questions: questions.map((q, i) => ({ ...q, id: `q-${Date.now()}-${i}` })),
      isAIGenerated: false,
      createdAt: new Date(),
    }

    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quiz),
      })
      if (res.ok) {
        const savedQuiz = await res.json()
        setQuizzes(prev => [...prev, savedQuiz])
        return savedQuiz
      }
    } catch (e) {
      // Use local quiz
    }

    setQuizzes(prev => [...prev, quiz])
    return quiz
  }, [])

  const deleteQuiz = useCallback(async (quizId: string) => {
    setQuizzes(prev => prev.filter(q => q.id !== quizId))
    try {
      await fetch(`/api/quizzes/${quizId}`, { method: "DELETE" })
    } catch (e) {
      // Local deletion done
    }
  }, [])

  const generateFromNote = useCallback(async (
    pageId: string,
    pageContent: string,
    count: number = 10,
    difficulty: string = "mixed"
  ): Promise<Quiz | null> => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Generate ${count} quiz questions from the following content. Include a mix of multiple-choice (4 options), true/false, and fill-in-the-blank questions. Difficulty: ${difficulty}. Return a JSON array with objects containing:
- "type": "multiple-choice" | "true-false" | "fill-blank"
- "question": the question text
- "options": array of options (for multiple-choice only)
- "correctAnswer": the correct answer
- "explanation": brief explanation
- "difficulty": "easy" | "medium" | "hard"
- "points": 1-3 based on difficulty

Content:
${pageContent}`,
          mode: "generate_quiz",
        }),
      })

      let questions: Omit<QuizQuestion, "id">[] = []

      if (res.ok) {
        const data = await res.json()
        try {
          const content = data.response || data.content || ""
          const jsonMatch = content.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            questions = JSON.parse(jsonMatch[0])
          }
        } catch (e) {
          console.error("Failed to parse AI response:", e)
        }
      }

      if (questions.length === 0) {
        // Generate sample questions for demo
        questions = [
          {
            type: "multiple-choice",
            question: "What is the main topic of this content?",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: "Option A",
            explanation: "Based on the content provided",
            difficulty: "easy",
            points: 1,
          },
          {
            type: "true-false",
            question: "This content covers important concepts.",
            options: ["True", "False"],
            correctAnswer: "True",
            explanation: "The content discusses key topics",
            difficulty: "easy",
            points: 1,
          },
        ]
      }

      const quiz = await createQuiz(`Quiz: ${new Date().toLocaleDateString()}`, questions)
      if (quiz) {
        quiz.sourcePageId = pageId
        quiz.isAIGenerated = true
        setCurrentQuiz(quiz)
        return quiz
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate quiz")
    } finally {
      setIsLoading(false)
    }
    return null
  }, [createQuiz])

  const startQuiz = useCallback((quizId: string) => {
    const quiz = quizzes.find(q => q.id === quizId)
    if (!quiz) return

    let questionsToUse = [...quiz.questions]

    // Shuffle questions if enabled
    if (settings.shuffleQuestions) {
      questionsToUse.sort(() => Math.random() - 0.5)
    }

    // Shuffle options if enabled
    if (settings.shuffleOptions) {
      questionsToUse = questionsToUse.map(q => {
        if (q.options && q.type === "multiple-choice") {
          const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5)
          return { ...q, options: shuffledOptions }
        }
        return q
      })
    }

    setCurrentQuiz({ ...quiz, questions: questionsToUse })
    setCurrentQuestionIndex(0)
    setAnswers(new Map())
    setStartTime(Date.now())
    setTimeRemaining(settings.timeLimit || null)
    setIsTakingQuiz(true)
    setModalMode("taking")
  }, [quizzes, settings])

  const endQuiz = useCallback(() => {
    setIsTakingQuiz(false)
    setCurrentQuiz(null)
    setCurrentQuestionIndex(0)
    setAnswers(new Map())
    setStartTime(null)
    setTimeRemaining(null)
    setModalMode("list")
  }, [])

  const submitAnswer = useCallback((questionId: string, answer: string | string[]) => {
    setAnswers(prev => {
      const newAnswers = new Map(prev)
      newAnswers.set(questionId, answer)
      return newAnswers
    })

    // If instant feedback, check answer
    if (settings.instantFeedback && currentQuiz) {
      const question = currentQuiz.questions.find(q => q.id === questionId)
      if (question) {
        const isCorrect = Array.isArray(question.correctAnswer)
          ? JSON.stringify([...answer].sort()) === JSON.stringify([...question.correctAnswer].sort())
          : answer === question.correctAnswer

        setCurrentQuiz(prev => {
          if (!prev) return prev
          return {
            ...prev,
            questions: prev.questions.map(q =>
              q.id === questionId ? { ...q, userAnswer: answer, isCorrect } : q
            ),
          }
        })
      }
    }
  }, [settings.instantFeedback, currentQuiz])

  const nextQuestion = useCallback(() => {
    if (currentQuiz && currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }, [currentQuiz, currentQuestionIndex])

  const prevQuestion = useCallback(() => {
    if (settings.allowBack && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }, [settings.allowBack, currentQuestionIndex])

  const goToQuestion = useCallback((index: number) => {
    if (currentQuiz && index >= 0 && index < currentQuiz.questions.length) {
      setCurrentQuestionIndex(index)
    }
  }, [currentQuiz])

  const submitQuiz = useCallback((): QuizResult => {
    if (!currentQuiz || !startTime) {
      throw new Error("No quiz in progress")
    }

    const timeTaken = Math.floor((Date.now() - startTime) / 1000)
    let correctCount = 0
    let totalPoints = 0
    let earnedPoints = 0

    const answerResults = currentQuiz.questions.map(question => {
      const userAnswer = answers.get(question.id) || ""
      const isCorrect = Array.isArray(question.correctAnswer)
        ? JSON.stringify([...(userAnswer as string[])].sort()) === JSON.stringify([...question.correctAnswer].sort())
        : userAnswer === question.correctAnswer

      totalPoints += question.points
      if (isCorrect) {
        correctCount++
        earnedPoints += question.points
      }

      return {
        questionId: question.id,
        userAnswer,
        isCorrect,
      }
    })

    const result: QuizResult = {
      quizId: currentQuiz.id,
      score: earnedPoints,
      totalPoints,
      percentage: Math.round((earnedPoints / totalPoints) * 100),
      correctCount,
      totalQuestions: currentQuiz.questions.length,
      timeTaken,
      answers: answerResults,
      completedAt: new Date(),
    }

    setLastResult(result)
    setResults(prev => [...prev, result])
    setIsTakingQuiz(false)
    setModalMode("results")

    return result
  }, [currentQuiz, startTime, answers])

  const openModal = useCallback((mode: "list" | "taking" | "results" | "create" = "list") => {
    setModalMode(mode)
    setIsModalOpen(true)
    if (mode === "list") {
      fetchQuizzes()
    }
  }, [fetchQuizzes])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setIsFullscreen(false)
    if (isTakingQuiz) {
      // Ask for confirmation before closing during quiz
      const confirmed = window.confirm("Are you sure you want to exit? Your progress will be lost.")
      if (confirmed) {
        endQuiz()
      } else {
        setIsModalOpen(true)
        return
      }
    }
  }, [isTakingQuiz, endQuiz])

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
    setSettings(prev => ({
      ...prev,
      displayMode: prev.displayMode === "fullscreen" ? "modal" : "fullscreen",
    }))
  }, [])

  const updateSettings = useCallback((newSettings: Partial<QuizSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  return (
    <QuizContext.Provider
      value={{
        quizzes,
        currentQuiz,
        isLoading,
        error,
        isTakingQuiz,
        currentQuestionIndex,
        answers,
        startTime,
        timeRemaining,
        settings,
        lastResult,
        results,
        isModalOpen,
        modalMode,
        isFullscreen,
        fetchQuizzes,
        createQuiz,
        deleteQuiz,
        generateFromNote,
        startQuiz,
        endQuiz,
        submitAnswer,
        nextQuestion,
        prevQuestion,
        goToQuestion,
        submitQuiz,
        openModal,
        closeModal,
        toggleFullscreen,
        updateSettings,
      }}
    >
      {children}
    </QuizContext.Provider>
  )
}

export function useQuiz() {
  const context = useContext(QuizContext)
  if (!context) {
    throw new Error("useQuiz must be used within a QuizProvider")
  }
  return context
}

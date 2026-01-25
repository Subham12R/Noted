"use client"

import { useState, useEffect } from "react"
import { useQuiz } from "@/context/QuizContext"
import {
  X,
  Plus,
  Trash2,
  Play,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  RotateCcw,
  Trophy,
  Layers,
} from "lucide-react"

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function QuizModal() {
  const {
    quizzes,
    currentQuiz,
    isLoading,
    isTakingQuiz,
    currentQuestionIndex,
    answers,
    timeRemaining,
    settings,
    lastResult,
    isModalOpen,
    modalMode,
    isFullscreen,
    fetchQuizzes,
    startQuiz,
    endQuiz,
    submitAnswer,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    submitQuiz,
    closeModal,
    toggleFullscreen,
  } = useQuiz()

  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null)

  useEffect(() => {
    if (isModalOpen && modalMode === "list") {
      fetchQuizzes()
    }
  }, [isModalOpen, modalMode, fetchQuizzes])

  // Reset selected answer when question changes
  useEffect(() => {
    if (currentQuiz) {
      const question = currentQuiz.questions[currentQuestionIndex]
      if (question) {
        setSelectedAnswer(answers.get(question.id) || null)
      }
    }
  }, [currentQuestionIndex, currentQuiz, answers])

  if (!isModalOpen) return null

  const currentQuestion = currentQuiz?.questions[currentQuestionIndex]
  const isLastQuestion = currentQuiz && currentQuestionIndex === currentQuiz.questions.length - 1

  const handleAnswerSelect = (answer: string) => {
    if (!currentQuestion) return

    if (currentQuestion.type === "multiple-select") {
      const current = (selectedAnswer as string[]) || []
      const newAnswer = current.includes(answer)
        ? current.filter(a => a !== answer)
        : [...current, answer]
      setSelectedAnswer(newAnswer)
      submitAnswer(currentQuestion.id, newAnswer)
    } else {
      setSelectedAnswer(answer)
      submitAnswer(currentQuestion.id, answer)
    }
  }

  const handleNext = () => {
    if (isLastQuestion) {
      submitQuiz()
    } else {
      nextQuestion()
    }
  }

  const containerClasses = isFullscreen
    ? "fixed inset-0 z-50 bg-zinc-950"
    : "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"

  const contentClasses = isFullscreen
    ? "h-full flex flex-col"
    : "w-full max-w-3xl max-h-[90vh] mx-4 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col"

  // Results View
  if (modalMode === "results" && lastResult) {
    const passed = lastResult.percentage >= settings.passingScore

    return (
      <div className={containerClasses}>
        <div className={contentClasses}>
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Quiz Results</h2>
            <button
              onClick={closeModal}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Score Display */}
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full mb-4 ${
                passed ? "bg-green-500/20" : "bg-red-500/20"
              }`}>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${passed ? "text-green-400" : "text-red-400"}`}>
                    {lastResult.percentage}%
                  </div>
                  <div className="text-sm text-zinc-400">Score</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-2">
                {passed ? (
                  <>
                    <Trophy className="text-yellow-400" size={24} />
                    <span className="text-xl font-semibold text-white">Great job!</span>
                  </>
                ) : (
                  <span className="text-xl font-semibold text-white">Keep practicing!</span>
                )}
              </div>

              <p className="text-zinc-400">
                {lastResult.correctCount} of {lastResult.totalQuestions} questions correct
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                Time: {formatTime(lastResult.timeTaken)}
              </p>
            </div>

            {/* Performance Breakdown */}
            <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-medium text-white mb-3">Performance Breakdown</h3>
              <div className="space-y-2">
                {["easy", "medium", "hard"].map(difficulty => {
                  const questions = currentQuiz?.questions.filter(q => q.difficulty === difficulty) || []
                  const correct = lastResult.answers.filter(a => {
                    const q = currentQuiz?.questions.find(q => q.id === a.questionId)
                    return q?.difficulty === difficulty && a.isCorrect
                  }).length

                  if (questions.length === 0) return null

                  const percentage = Math.round((correct / questions.length) * 100)

                  return (
                    <div key={difficulty} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400 w-16 capitalize">{difficulty}</span>
                      <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            percentage >= 80 ? "bg-green-500" :
                            percentage >= 50 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 w-20">
                        {percentage}% ({correct}/{questions.length})
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-3">
              <button
                onClick={() => currentQuiz && startQuiz(currentQuiz.id)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                <RotateCcw size={16} />
                Retry Quiz
              </button>
              <button
                onClick={closeModal}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Taking Quiz View
  if (isTakingQuiz && currentQuiz && currentQuestion) {
    return (
      <div className={containerClasses}>
        <div className={contentClasses}>
          {/* Header */}
          <div className={`p-4 border-b border-zinc-800 flex items-center justify-between ${
            isFullscreen ? "bg-zinc-900" : ""
          }`}>
            <div className="flex items-center gap-3">
              <button
                onClick={endQuiz}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <span className="text-white font-medium">{currentQuiz.title}</span>
            </div>
            <div className="flex items-center gap-4">
              {settings.showTimer && timeRemaining !== null && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Clock size={16} />
                  <span className="font-mono">{formatTime(timeRemaining)}</span>
                </div>
              )}
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Question Content */}
          <div className={`flex-1 overflow-y-auto p-6 ${isFullscreen ? "max-w-4xl mx-auto w-full" : ""}`}>
            {/* Progress */}
            {settings.showProgress && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-zinc-400 mb-2">
                  <span>Question {currentQuestionIndex + 1} of {currentQuiz.questions.length}</span>
                  <span className="capitalize">{currentQuestion.difficulty}</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Question */}
            <div className="mb-8">
              <h3 className="text-xl text-white leading-relaxed">{currentQuestion.question}</h3>
              {currentQuestion.type === "multiple-select" && (
                <p className="text-sm text-zinc-400 mt-2">Select all that apply</p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options?.map((option, index) => {
                const isSelected = Array.isArray(selectedAnswer)
                  ? selectedAnswer.includes(option)
                  : selectedAnswer === option

                const showResult = settings.instantFeedback && currentQuestion.userAnswer !== undefined
                const isCorrect = Array.isArray(currentQuestion.correctAnswer)
                  ? currentQuestion.correctAnswer.includes(option)
                  : currentQuestion.correctAnswer === option

                return (
                  <button
                    key={index}
                    onClick={() => !showResult && handleAnswerSelect(option)}
                    disabled={showResult}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      showResult
                        ? isCorrect
                          ? "border-green-500 bg-green-500/10"
                          : isSelected
                            ? "border-red-500 bg-red-500/10"
                            : "border-zinc-700 bg-zinc-800/50"
                        : isSelected
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/50"
                    }`}
                  >
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full border-2 text-sm font-medium ${
                      showResult
                        ? isCorrect
                          ? "border-green-500 text-green-400"
                          : isSelected
                            ? "border-red-500 text-red-400"
                            : "border-zinc-600 text-zinc-400"
                        : isSelected
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-zinc-600 text-zinc-400"
                    }`}>
                      {showResult ? (
                        isCorrect ? <CheckCircle size={16} /> : isSelected ? <XCircle size={16} /> : String.fromCharCode(65 + index)
                      ) : (
                        String.fromCharCode(65 + index)
                      )}
                    </span>
                    <span className={`flex-1 ${
                      showResult
                        ? isCorrect
                          ? "text-green-400"
                          : isSelected
                            ? "text-red-400"
                            : "text-zinc-300"
                        : "text-zinc-200"
                    }`}>
                      {option}
                    </span>
                  </button>
                )
              })}

              {/* Fill in the blank */}
              {currentQuestion.type === "fill-blank" && (
                <input
                  type="text"
                  value={(selectedAnswer as string) || ""}
                  onChange={e => {
                    setSelectedAnswer(e.target.value)
                    submitAnswer(currentQuestion.id, e.target.value)
                  }}
                  placeholder="Type your answer..."
                  className="w-full bg-zinc-800 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white outline-none transition-colors"
                />
              )}
            </div>

            {/* Explanation (if instant feedback) */}
            {settings.instantFeedback && currentQuestion.userAnswer !== undefined && currentQuestion.explanation && (
              <div className="mt-6 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                <h4 className="text-sm font-medium text-white mb-2">Explanation</h4>
                <p className="text-sm text-zinc-400">{currentQuestion.explanation}</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className={`p-4 border-t border-zinc-800 flex items-center justify-between ${
            isFullscreen ? "bg-zinc-900" : ""
          }`}>
            {/* Question dots */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none">
              {currentQuiz.questions.map((q, i) => {
                const answered = answers.has(q.id)
                const isCurrent = i === currentQuestionIndex

                return (
                  <button
                    key={i}
                    onClick={() => goToQuestion(i)}
                    className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                      isCurrent
                        ? "bg-indigo-600 text-white"
                        : answered
                          ? "bg-zinc-700 text-white"
                          : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-2">
              {settings.allowBack && currentQuestionIndex > 0 && (
                <button
                  onClick={prevQuestion}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  <ArrowLeft size={16} />
                  Previous
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                {isLastQuestion ? "Submit" : "Next"}
                {!isLastQuestion && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Quiz List View
  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <HelpCircle className="text-purple-400" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-white">Quizzes</h2>
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
          {/* Quiz List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-12 text-zinc-500">Loading...</div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <HelpCircle size={48} className="mx-auto mb-4 opacity-50" />
                <p>No quizzes yet</p>
                <p className="text-sm mt-1">Generate a quiz from your notes using AI</p>
              </div>
            ) : (
              quizzes.map(quiz => (
                <div
                  key={quiz.id}
                  className="group flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-700 rounded-lg">
                      <HelpCircle size={18} className="text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">{quiz.title}</h3>
                      <p className="text-xs text-zinc-500">
                        {quiz.questions.length} questions
                        {quiz.isAIGenerated && (
                          <span className="text-purple-400 ml-2">AI Generated</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startQuiz(quiz.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
                    >
                      <Play size={14} />
                      Start
                    </button>
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

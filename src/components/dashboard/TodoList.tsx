"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, CheckmarkCircle02Icon, Delete02Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

export function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTodoText, setNewTodoText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch todos from backend
  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/todos")
      if (!res.ok) throw new Error("Failed to fetch todos")
      const data = await res.json()
      setTodos(data.todos || [])
    } catch (error) {
      console.error("Failed to fetch todos:", error)
      toast.error("Failed to load tasks")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  // Listen for todo refresh events (e.g., when AI creates todos)
  useEffect(() => {
    const handleRefresh = () => {
      fetchTodos()
    }

    window.addEventListener("refreshTodos", handleRefresh)
    return () => window.removeEventListener("refreshTodos", handleRefresh)
  }, [fetchTodos])

  const addTodo = async () => {
    if (!newTodoText.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newTodoText.trim() }),
      })

      if (!res.ok) throw new Error("Failed to create todo")

      const data = await res.json()
      setTodos((prev) => [data.todo, ...prev])
      setNewTodoText("")
      setIsModalOpen(false)
      toast.success("Task added!")
    } catch (error) {
      console.error("Failed to create todo:", error)
      toast.error("Failed to add task")
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleTodo = async (id: string, completed: boolean) => {
    // Optimistic update
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !completed } : todo
      )
    )

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      })

      if (!res.ok) throw new Error("Failed to update todo")
    } catch (error) {
      // Revert on error
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, completed } : todo
        )
      )
      console.error("Failed to toggle todo:", error)
      toast.error("Failed to update task")
    }
  }

  const deleteTodo = async (id: string) => {
    // Optimistic update
    const previousTodos = todos
    setTodos((prev) => prev.filter((todo) => todo.id !== id))

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete todo")
      toast.success("Task deleted")
    } catch (error) {
      // Revert on error
      setTodos(previousTodos)
      console.error("Failed to delete todo:", error)
      toast.error("Failed to delete task")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      addTodo()
    }
    if (e.key === "Escape") {
      setIsModalOpen(false)
      setNewTodoText("")
    }
  }

  const completedCount = todos.filter((t) => t.completed).length
  const totalCount = todos.length

  return (
    <div className=" border border-zinc-200 dark:border-zinc-800 rounded-2xl h-max flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {totalCount > 0 ? `${completedCount}/${totalCount} done` : "No tasks"}
        </span>
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          title="Add task"
        >
          <HugeiconsIcon icon={Add01Icon} size={16} />
        </button>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="px-4 pb-2">
          <div className="h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Todo List - Scrollable with fixed height */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[200px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-400">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} className="mb-2 opacity-50" />
            <p className="text-sm">No tasks yet</p>
            <p className="text-xs">Click + to add a task</p>
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`group flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                todo.completed
                  ? "bg-zinc-100/50 dark:bg-zinc-800/30 border-zinc-200/50 dark:border-zinc-700/50"
                  : "bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-zinc-500/30"
              }`}
            >
              <button
                onClick={() => toggleTodo(todo.id, todo.completed)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                  todo.completed
                    ? "bg-zinc-500 border-zinc-500 text-white"
                    : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-500"
                }`}
              >
                {todo.completed && (
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
              <span
                className={`flex-1 text-sm transition-all wrap-break-word ${
                  todo.completed
                    ? "text-zinc-400 line-through"
                    : "text-zinc-900 dark:text-white"
                }`}
              >
                {todo.text}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all shrink-0"
              >
                <HugeiconsIcon icon={Delete02Icon} size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal for adding new task */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setIsModalOpen(false)
              setNewTodoText("")
            }}
          />

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Add New Task</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setNewTodoText("")
                }}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>

            <textarea
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What do you need to do?"
              autoFocus
              rows={3}
              className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500/50 resize-none"
            />

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setNewTodoText("")
                }}
                className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addTodo}
                disabled={!newTodoText.trim() || isSubmitting}
                className="px-4 py-2 bg-zinc-500 text-white text-sm font-medium rounded-lg hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Adding..." : "Add Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import Link from "next/link"

export default function ClaimSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [status, setStatus] = useState<"loading" | "claiming" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)
  const [pageId, setPageId] = useState<string | null>(null)

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return

    // If not logged in, redirect to login with this claim page as redirect
    if (!user) {
      router.replace(`/login?redirect=/share/${token}/claim`)
      return
    }

    // User is logged in, claim the access
    const claimAccess = async () => {
      setStatus("claiming")
      try {
        const response = await fetch(`/api/share/${token}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })

        const result = await response.json()

        if (!response.ok) {
          if (result.requiresPassword) {
            // Need to handle password - redirect back to share page
            router.replace(`/share/${token}`)
            return
          }
          throw new Error(result.error || "Failed to claim access")
        }

        setPageId(result.pageId)
        setStatus("success")

        // Redirect to the note editor after a brief moment
        setTimeout(() => {
          router.replace(`/note/${result.pageId}`)
        }, 1000)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        setStatus("error")
      }
    }

    claimAccess()
  }, [token, user, authLoading, router])

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === "claiming") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Claiming access to shared note...</p>
        </div>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
            <CheckIcon />
          </div>
          <h1 className="text-lg font-semibold text-white">Access Granted!</h1>
          <p className="text-sm text-zinc-400">Redirecting you to the note...</p>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <ErrorIcon />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Unable to claim access</h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/share/${token}`}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              Back to shared note
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}

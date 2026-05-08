"use client"

import { useState, FormEvent } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { OAuthButtons } from "./OAuthButtons"

export function RegisterForm() {
  const router = useRouter()
  const { signUpWithEmail, isLoading } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsSubmitting(true)

    try {
      const result = await signUpWithEmail(email, password, name)
      if (result.error) {
        setError(result.error)
      } else {
        router.push("/")
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const disabled = isLoading || isSubmitting

  return (
    <div className="w-full">
      <OAuthButtons disabled={disabled} />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-800" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-[#1a1a1a] text-neutral-500">
            or register with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-950/30 border border-red-900 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-300 mb-1.5">
            Full name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            disabled={disabled}
            className="w-full rounded px-4 py-3 bg-[#1a1a1a] border border-neutral-800 focus:border-white focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white placeholder-neutral-600"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={disabled}
            className="w-full rounded px-4 py-3 bg-[#1a1a1a] border border-neutral-800 focus:border-white focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white placeholder-neutral-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ characters"
              required
              disabled={disabled}
              minLength={8}
              className="w-full rounded px-4 py-3 bg-[#1a1a1a] border border-neutral-800 focus:border-white focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white placeholder-neutral-600"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-300 mb-1.5">
              Confirm
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm"
              required
              disabled={disabled}
              minLength={8}
              className="w-full rounded px-4 py-3 bg-[#1a1a1a] border border-neutral-800 focus:border-white focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white placeholder-neutral-600"
            />
          </div>
        </div>

        <p className="text-xs text-neutral-500">
          By creating an account, you agree to our{" "}
          <a href="#" className="text-neutral-300 hover:text-white transition-colors">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="text-neutral-300 hover:text-white transition-colors">Privacy Policy</a>
        </p>

        <button
          type="submit"
          disabled={disabled}
          className="w-full py-3 rounded px-4 bg-white hover:bg-neutral-200 text-black font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </button>
      </form>
    </div>
  )
}

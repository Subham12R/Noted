"use client"

import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
})

// Export commonly used functions and hooks
export const {
  useSession,
  signIn,
  signUp,
  signOut,
  getSession,
} = authClient

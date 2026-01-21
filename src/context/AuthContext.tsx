"use client"

import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
} from "react"
import { useSession, signIn, signUp, signOut } from "@/lib/auth-client"

interface User {
  id: string
  email: string
  name: string | null
  image?: string | null | undefined
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>
  signInWithGoogle: (redirectTo?: string) => Promise<void>
  signInWithGitHub: (redirectTo?: string) => Promise<void>
  signUpWithEmail: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const result = await signIn.email({
          email,
          password,
        })
        if (result.error) {
          return { error: result.error.message || "Failed to sign in" }
        }
        return {}
      } catch (error) {
        return { error: "An unexpected error occurred" }
      }
    },
    []
  )

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    await signIn.social({
      provider: "google",
      callbackURL: redirectTo || "/",
    })
  }, [])

  const signInWithGitHub = useCallback(async (redirectTo?: string) => {
    await signIn.social({
      provider: "github",
      callbackURL: redirectTo || "/",
    })
  }, [])

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      name: string
    ): Promise<{ error?: string }> => {
      try {
        const result = await signUp.email({
          email,
          password,
          name,
        })
        if (result.error) {
          return { error: result.error.message || "Failed to sign up" }
        }
        return {}
      } catch (error) {
        return { error: "An unexpected error occurred" }
      }
    },
    []
  )

  const logout = useCallback(async () => {
    await signOut()
  }, [])

  const value = useMemo<AuthContextType>(
    () => ({
      user: session?.user ?? null,
      isLoading: isPending,
      isAuthenticated: !!session?.user,
      signInWithEmail,
      signInWithGoogle,
      signInWithGitHub,
      signUpWithEmail,
      logout,
    }),
    [
      session,
      isPending,
      signInWithEmail,
      signInWithGoogle,
      signInWithGitHub,
      signUpWithEmail,
      logout,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

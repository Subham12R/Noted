// Authentication types

export interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
  userAgent: string | null
  ipAddress: string | null
}

export interface Account {
  id: string
  userId: string
  provider: "email" | "google" | "github"
  providerAccountId: string
  accessToken: string | null
  refreshToken: string | null
  expiresAt: Date | null
  createdAt: Date
}

export type AuthProvider = "email" | "google" | "github"

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  name: string
}

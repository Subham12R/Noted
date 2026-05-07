import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "../db/index.js"
import { users, accounts, sessions, verifications } from "../db/schema.js"

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "")
}

function parseOrigins(value?: string): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((v) => normalizeOrigin(v))
    .filter(Boolean)
}

const trustedOrigins = Array.from(new Set([
  normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  normalizeOrigin(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://noted-main.vercel.app",
  ...parseOrigins(process.env.TRUSTED_ORIGINS),
]))

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: users, account: accounts, session: sessions, verification: verifications },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  rateLimit: { window: 60, max: 10 },
  trustedOrigins,
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user

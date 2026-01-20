import { db, rateLimits } from "@/db"
import { eq, and, gt } from "drizzle-orm"

interface RateLimitOptions {
  identifier: string // userId or IP address
  endpoint: string
  limit: number
  windowMs: number // milliseconds
}

interface RateLimitResult {
  success: boolean
  remaining: number
  retryAfter?: number // seconds until retry is allowed
}

export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { identifier, endpoint, limit, windowMs } = options
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowMs)

  try {
    // Get current count in window
    const [existing] = await db
      .select()
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.identifier, identifier),
          eq(rateLimits.endpoint, endpoint),
          gt(rateLimits.windowStart, windowStart)
        )
      )

    if (!existing) {
      // Create new rate limit entry
      await db.insert(rateLimits).values({
        identifier,
        endpoint,
        count: 1,
        windowStart: now,
      })

      return { success: true, remaining: limit - 1 }
    }

    if (existing.count >= limit) {
      const retryAfter = Math.ceil(
        (existing.windowStart.getTime() + windowMs - now.getTime()) / 1000
      )
      return { success: false, remaining: 0, retryAfter: Math.max(0, retryAfter) }
    }

    // Increment count
    await db
      .update(rateLimits)
      .set({ count: existing.count + 1 })
      .where(eq(rateLimits.id, existing.id))

    return { success: true, remaining: limit - existing.count - 1 }
  } catch (error) {
    console.error("Rate limit error:", error)
    // Allow request on error to prevent blocking legitimate users
    return { success: true, remaining: limit }
  }
}

// In-memory rate limiter for development/fallback
const memoryStore = new Map<string, { count: number; windowStart: number }>()

export function rateLimitMemory(options: RateLimitOptions): RateLimitResult {
  const { identifier, endpoint, limit, windowMs } = options
  const key = `${identifier}:${endpoint}`
  const now = Date.now()

  const existing = memoryStore.get(key)

  if (!existing || now - existing.windowStart > windowMs) {
    // Start new window
    memoryStore.set(key, { count: 1, windowStart: now })
    return { success: true, remaining: limit - 1 }
  }

  if (existing.count >= limit) {
    const retryAfter = Math.ceil((existing.windowStart + windowMs - now) / 1000)
    return { success: false, remaining: 0, retryAfter: Math.max(0, retryAfter) }
  }

  // Increment count
  existing.count++
  return { success: true, remaining: limit - existing.count }
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  const maxAge = 60 * 60 * 1000 // 1 hour
  for (const [key, value] of memoryStore.entries()) {
    if (now - value.windowStart > maxAge) {
      memoryStore.delete(key)
    }
  }
}, 60 * 1000) // Run every minute

// Rate limit configurations
export const RATE_LIMITS = {
  AUTH: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
  PAGE_SAVE: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
  API_GENERAL: { limit: 100, windowMs: 60 * 1000 }, // 100 per minute
  FOLDER_CREATE: { limit: 20, windowMs: 60 * 1000 }, // 20 per minute
} as const

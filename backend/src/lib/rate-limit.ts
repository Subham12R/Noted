interface RateLimitOptions {
  identifier: string
  endpoint: string
  limit: number
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  retryAfter?: number
}

const memoryStore = new Map<string, { count: number; windowStart: number }>()

export function rateLimitMemory(options: RateLimitOptions): RateLimitResult {
  const { identifier, endpoint, limit, windowMs } = options
  const key = `${identifier}:${endpoint}`
  const now = Date.now()
  const existing = memoryStore.get(key)

  if (!existing || now - existing.windowStart > windowMs) {
    memoryStore.set(key, { count: 1, windowStart: now })
    return { success: true, remaining: limit - 1 }
  }

  if (existing.count >= limit) {
    const retryAfter = Math.ceil((existing.windowStart + windowMs - now) / 1000)
    return { success: false, remaining: 0, retryAfter: Math.max(0, retryAfter) }
  }

  existing.count++
  return { success: true, remaining: limit - existing.count }
}

setInterval(() => {
  const now = Date.now()
  const maxAge = 60 * 60 * 1000
  for (const [key, value] of memoryStore.entries()) {
    if (now - value.windowStart > maxAge) memoryStore.delete(key)
  }
}, 60 * 1000)

export const RATE_LIMITS = {
  AUTH: { limit: 10, windowMs: 60 * 1000 },
  PAGE_SAVE: { limit: 10, windowMs: 60 * 1000 },
  API_GENERAL: { limit: 100, windowMs: 60 * 1000 },
  FOLDER_CREATE: { limit: 20, windowMs: 60 * 1000 },
} as const

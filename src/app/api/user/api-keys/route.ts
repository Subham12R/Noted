import { NextRequest, NextResponse } from "next/server"
import { db, userApiKeys } from "@/db"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-utils"
import { encryptApiKey, maskApiKey } from "@/lib/encryption"
import { rateLimitMemory, RATE_LIMITS } from "@/lib/rate-limit"

const ALLOWED_PROVIDERS = ["openai", "anthropic", "gemini", "groq", "custom"] as const

// GET /api/user/api-keys — list the user's saved keys (keys are masked, never returned in plaintext)
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const keys = await db
      .select({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        label: userApiKeys.label,
        baseUrl: userApiKeys.baseUrl,
        modelOverride: userApiKeys.modelOverride,
        isActive: userApiKeys.isActive,
        createdAt: userApiKeys.createdAt,
        // encryptedKey intentionally excluded — never sent to client
      })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, session.user.id))

    return NextResponse.json({ keys })
  } catch (error) {
    console.error("GET /api/user/api-keys error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/user/api-keys — save a new API key (encrypted before storage)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const rl = rateLimitMemory({ identifier: session.user.id, endpoint: "api-key-create", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })

    const body = await request.json()

    const provider = typeof body?.provider === "string" ? body.provider : ""
    if (!ALLOWED_PROVIDERS.includes(provider as typeof ALLOWED_PROVIDERS[number])) {
      return NextResponse.json({ error: `provider must be one of: ${ALLOWED_PROVIDERS.join(", ")}` }, { status: 400 })
    }

    const label = typeof body?.label === "string" ? body.label.trim().slice(0, 100) : ""
    if (!label) return NextResponse.json({ error: "label is required" }, { status: 400 })

    const rawKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : ""
    if (!rawKey || rawKey.length < 8) return NextResponse.json({ error: "apiKey is required and must be at least 8 characters" }, { status: 400 })

    const baseUrl = typeof body?.baseUrl === "string" ? body.baseUrl.trim().slice(0, 500) || null : null
    const modelOverride = typeof body?.modelOverride === "string" ? body.modelOverride.trim().slice(0, 100) || null : null

    const encryptedKey = encryptApiKey(rawKey)
    const maskedKey = maskApiKey(rawKey)

    const [key] = await db
      .insert(userApiKeys)
      .values({
        userId: session.user.id,
        provider,
        label,
        encryptedKey,
        baseUrl,
        modelOverride,
        isActive: true,
      })
      .returning({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        label: userApiKeys.label,
        baseUrl: userApiKeys.baseUrl,
        modelOverride: userApiKeys.modelOverride,
        isActive: userApiKeys.isActive,
        createdAt: userApiKeys.createdAt,
      })

    return NextResponse.json({ key: { ...key, maskedKey } }, { status: 201 })
  } catch (error) {
    console.error("POST /api/user/api-keys error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// AI Generation API Endpoint
// POST /api/ai/generate

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-utils'
import { canUseAI, incrementAIUsage } from '@/lib/subscription'
import { generateAIResponse, generateAIResponseStream, streamToSSE } from '@/lib/ai/generate'
import { isAIAvailable } from '@/lib/ai/config'
import { db, pages, userApiKeys } from '@/db'
import { eq, and } from 'drizzle-orm'
import { decryptApiKey } from '@/lib/encryption'
import type { AIMode } from '@/types/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Validate mode
const VALID_MODES: AIMode[] = ['answer', 'expand', 'summarize', 'translate', 'explain', 'improve', 'flowchart', 'quiz', 'flashcard']

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check if AI is available
    if (!isAIAvailable()) {
      return NextResponse.json(
        { error: 'AI features are not configured. Please set up GROQ_API_KEY.' },
        { status: 503 }
      )
    }

    // Check AI usage quota
    const aiCheck = await canUseAI(userId)
    if (!aiCheck.allowed) {
      return NextResponse.json(
        {
          error: aiCheck.reason,
          current: aiCheck.current,
          limit: aiCheck.limit,
        },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { pageId, prompt, mode, model, stream = true, context: providedContext, provider: requestedProvider } = body

    // Validate required fields
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (prompt.length > 20000) {
      return NextResponse.json({ error: 'Prompt too long (max 20000 chars)' }, { status: 400 })
    }

    if (!mode || !VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}` },
        { status: 400 }
      )
    }

    // Sanitize model identifier — allow only safe chars, prevent injection
    if (model !== undefined && (typeof model !== 'string' || model.length > 100 || !/^[a-zA-Z0-9._:/-]+$/.test(model))) {
      return NextResponse.json({ error: 'Invalid model identifier' }, { status: 400 })
    }

    // Get context - use provided context (from dashboard) or fetch from page
    let context: string | undefined

    // If context is directly provided (e.g., from dashboard with folder data)
    if (providedContext && typeof providedContext === 'string') {
      context = providedContext
      // Limit context length
      if (context.length > 12000) {
        context = context.substring(0, 12000) + '...'
      }
    }
    // Otherwise, get page content for context if pageId provided
    else if (pageId) {
      const [page] = await db.select().from(pages).where(eq(pages.id, pageId))
      if (page?.content) {
        // Strip HTML tags for context
        context = page.content.replace(/<[^>]*>/g, ' ').trim()
        // Limit context length
        if (context.length > 8000) {
          context = context.substring(0, 8000) + '...'
        }
      }
    }

    // Look up active user API key for the selected provider (server-side only, never exposed to client)
    let userApiKey: string | undefined
    let userBaseUrl: string | undefined
    if (requestedProvider) {
      const [storedKey] = await db
        .select({ encryptedKey: userApiKeys.encryptedKey, baseUrl: userApiKeys.baseUrl })
        .from(userApiKeys)
        .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, requestedProvider), eq(userApiKeys.isActive, true)))
      if (storedKey) {
        try {
          userApiKey = decryptApiKey(storedKey.encryptedKey)
          userBaseUrl = storedKey.baseUrl ?? undefined
        } catch {
          console.warn('[AI Generate] Failed to decrypt user key for provider:', requestedProvider)
        }
      }
    }

    // Increment AI usage before generating
    await incrementAIUsage(userId)

    // Handle streaming response
    if (stream) {
      const encoder = new TextEncoder()

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            const generator = generateAIResponseStream({
              prompt,
              mode,
              context,
              model,
              provider: requestedProvider,
              userApiKey,
              userBaseUrl,
            })

            for await (const chunk of generator) {
              const sseData = streamToSSE(chunk)
              controller.enqueue(encoder.encode(sseData))
            }

            controller.close()
          } catch (error) {
            const errorChunk = streamToSSE({
              type: 'error',
              error: error instanceof Error ? error.message : 'Generation failed',
            })
            controller.enqueue(encoder.encode(errorChunk))
            controller.close()
          }
        },
      })

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // Non-streaming response
    const response = await generateAIResponse({
      prompt,
      mode,
      context,
      model,
      provider: requestedProvider,
      userApiKey,
      userBaseUrl,
    })

    return NextResponse.json({
      success: true,
      ...response,
    })
  } catch (error) {
    console.error('AI generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check AI availability and usage
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const aiCheck = await canUseAI(userId)
    const available = isAIAvailable()

    return NextResponse.json({
      available,
      ...aiCheck,
      provider: process.env.AI_PROVIDER || 'groq',
    })
  } catch (error) {
    console.error('AI check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// AI Models API Endpoint
// GET /api/ai/models - List available AI models

import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-utils'
import { AI_MODELS, AI_MODE_CONFIG, getEnabledModels } from '@/types/ai'
import { isAIAvailable, AI_CONFIG } from '@/lib/ai/config'
import { getAvailableProviders, isProviderAvailable } from '@/lib/ai/providers'
import { db, userApiKeys } from '@/db'
import { eq, and } from 'drizzle-orm'

// Default model to call for each provider when user hasn't set a modelOverride
const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  groq: 'compound-beta',
  gemini: 'gemini-2.5-flash',
  minimax: 'MiniMax-M2.5',
  nvidia: 'meta/llama-3.1-70b-instruct',
  custom: 'gpt-4o',
}

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's active saved keys — each becomes one model entry in the picker
    const savedKeys = await db
      .select({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        label: userApiKeys.label,
        modelOverride: userApiKeys.modelOverride,
        baseUrl: userApiKeys.baseUrl,
      })
      .from(userApiKeys)
      .where(and(eq(userApiKeys.userId, session.user.id), eq(userApiKeys.isActive, true)))

    const available = isAIAvailable()
    const enabledModels = getEnabledModels()
    const availableProviders = getAvailableProviders()

    // Base Noted-branded models (Groq only)
    const baseModels = AI_MODELS
      .filter((m) => m.enabled && isProviderAvailable(m.provider))
      .map((m) => ({ ...m, available: true, providerConfigured: true, userKeyId: null }))

    // One entry per user-saved key
    const userKeyModels = savedKeys.map((key) => ({
      id: key.modelOverride || PROVIDER_DEFAULT_MODELS[key.provider] || key.provider,
      name: key.label,
      provider: key.provider,
      brandName: undefined,
      contextWindow: 200000,
      description: `Your ${key.provider} key`,
      enabled: true,
      available: true,
      providerConfigured: true,
      userKeyId: key.id,
    }))

    const allModels = [...baseModels, ...userKeyModels]
    const defaultModel = allModels.find((m) => m.available)?.id || 'compound-beta'

    return NextResponse.json({
      available,
      activeProvider: AI_CONFIG.provider,
      availableProviders,
      models: enabledModels,
      allModels,
      defaultModel,
      modes: AI_MODE_CONFIG,
      config: {
        maxTokensPerRequest: AI_CONFIG.features.maxTokensPerRequest,
        streamingEnabled: AI_CONFIG.features.streamingEnabled,
        ollamaEnabled: AI_CONFIG.ollama.enabled,
      },
    })
  } catch (error) {
    console.error('AI models error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

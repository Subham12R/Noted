// AI Models API Endpoint
// GET /api/ai/models - List available AI models

import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-utils'
import { AI_MODELS, AI_MODE_CONFIG, getEnabledModels } from '@/types/ai'
import { isAIAvailable, AI_CONFIG } from '@/lib/ai/config'
import { getAvailableProviders, isProviderAvailable } from '@/lib/ai/providers'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const available = isAIAvailable()
    const enabledModels = getEnabledModels()
    const availableProviders = getAvailableProviders()

    // Map all models with availability status
    const allModelsWithStatus = AI_MODELS.map((model) => ({
      ...model,
      available: model.enabled && isProviderAvailable(model.provider),
      providerConfigured: isProviderAvailable(model.provider),
    }))

    // Get the default available model
    const defaultModel = allModelsWithStatus.find((m) => m.available)?.id || 'compound-beta'

    return NextResponse.json({
      available,
      activeProvider: AI_CONFIG.provider,
      availableProviders,
      models: enabledModels,
      allModels: allModelsWithStatus,
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

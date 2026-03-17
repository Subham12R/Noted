// AI Provider Factory
// Creates the appropriate client based on configuration

import OpenAI from 'openai'
import { AI_CONFIG, getActiveProviderConfig } from '../config'
import type { AIProvider } from '@/types/ai'

// Separate cache for OpenAI-compatible clients (groq, openai, ollama)
const openAIClients: Map<string, OpenAI> = new Map()

/**
 * Create an OpenAI-compatible client for groq, ollama, openai
 * This is the standard way - works perfectly for these providers
 */
export function createOpenAIClient(provider?: AIProvider): OpenAI {
  const targetProvider = provider || AI_CONFIG.provider

  // Don't create OpenAI client for gemini
  if (targetProvider === 'gemini') {
    throw new Error('Use createGeminiClient() for Gemini provider')
  }

  // Return cached instance if exists
  const apiKey = targetProvider === 'groq' ? AI_CONFIG.groq.apiKey : 
                 targetProvider === 'openai' ? AI_CONFIG.openai.apiKey : 'default'
  const cacheKey = `${targetProvider}-${apiKey || 'default'}`
  if (openAIClients.has(cacheKey)) {
    return openAIClients.get(cacheKey)!
  }

  let client: OpenAI

  switch (targetProvider) {
    case 'groq':
      client = new OpenAI({
        apiKey: AI_CONFIG.groq.apiKey,
        baseURL: AI_CONFIG.groq.baseUrl,
      })
      break

    case 'ollama':
      client = new OpenAI({
        apiKey: 'ollama',
        baseURL: `${AI_CONFIG.ollama.baseUrl}/v1`,
      })
      break

    case 'openai':
      client = new OpenAI({
        apiKey: AI_CONFIG.openai.apiKey,
        baseURL: AI_CONFIG.openai.baseUrl,
      })
      break

    default:
      // Default to groq
      client = new OpenAI({
        apiKey: AI_CONFIG.groq.apiKey,
        baseURL: AI_CONFIG.groq.baseUrl,
      })
  }

  openAIClients.set(cacheKey, client)
  return client
}

// Keep the old function for backward compatibility - but it will throw for gemini
export function createAIClient(provider?: AIProvider): OpenAI {
  return createOpenAIClient(provider)
}

/**
 * Get the default model for the active provider
 */
export function getDefaultModel(provider?: AIProvider): string {
  const targetProvider = provider || AI_CONFIG.provider
  const config = getActiveProviderConfig()

  switch (targetProvider) {
    case 'groq':
      return AI_CONFIG.groq.defaultModel
    case 'ollama':
      return AI_CONFIG.ollama.defaultModel
    case 'openai':
      return AI_CONFIG.openai.defaultModel
    case 'gemini':
      return AI_CONFIG.gemini.defaultModel
    default:
      return config.defaultModel
  }
}

/**
 * Check if a provider is available and configured
 */
export function isProviderAvailable(provider: AIProvider): boolean {
  switch (provider) {
    case 'groq':
      return AI_CONFIG.groq.enabled && !!AI_CONFIG.groq.apiKey
    case 'ollama':
      return AI_CONFIG.ollama.enabled
    case 'openai':
      return AI_CONFIG.openai.enabled && !!AI_CONFIG.openai.apiKey
    case 'gemini':
      return AI_CONFIG.gemini.enabled && !!AI_CONFIG.gemini.apiKey
    default:
      return false
  }
}

/**
 * List available providers
 */
export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = []

  if (isProviderAvailable('groq')) providers.push('groq')
  if (isProviderAvailable('ollama')) providers.push('ollama')
  if (isProviderAvailable('openai')) providers.push('openai')
  if (isProviderAvailable('gemini')) providers.push('gemini')

  return providers
}

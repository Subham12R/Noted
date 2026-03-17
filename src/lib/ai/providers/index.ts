// AI Provider Factory
// Creates the appropriate client based on configuration

import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { AI_CONFIG, getActiveProviderConfig } from '../config'
import type { AIProvider } from '@/types/ai'

// Provider instances cache
const providerInstances: Map<AIProvider, OpenAI | GoogleGenerativeAI> = new Map()

/**
 * Create an OpenAI-compatible client for any provider
 * Groq, Ollama, and OpenAI all support OpenAI's API format
 */
export function createAIClient(provider?: AIProvider): OpenAI | GoogleGenerativeAI {
  const targetProvider = provider || AI_CONFIG.provider

  // Return cached instance if exists
  if (providerInstances.has(targetProvider)) {
    return providerInstances.get(targetProvider)! as OpenAI | GoogleGenerativeAI
  }

  let client: OpenAI | GoogleGenerativeAI

  switch (targetProvider) {
    case 'groq':
      client = new OpenAI({
        apiKey: AI_CONFIG.groq.apiKey,
        baseURL: AI_CONFIG.groq.baseUrl,
      })
      break

    case 'ollama':
      // Ollama uses OpenAI-compatible API
      client = new OpenAI({
        apiKey: 'ollama', // Ollama doesn't require a real key
        baseURL: `${AI_CONFIG.ollama.baseUrl}/v1`,
      })
      break

    case 'openai':
      client = new OpenAI({
        apiKey: AI_CONFIG.openai.apiKey,
        baseURL: AI_CONFIG.openai.baseUrl,
      })
      break

    case 'gemini':
      // Gemini uses Google Generative AI SDK
      client = new GoogleGenerativeAI(AI_CONFIG.gemini.apiKey)
      break

    default:
      throw new Error(`Unknown AI provider: ${targetProvider}`)
  }

  providerInstances.set(targetProvider, client)
  return client as OpenAI | GoogleGenerativeAI
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

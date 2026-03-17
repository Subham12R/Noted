// AI Configuration
// Groq is active by default, Ollama is disabled until manually enabled

export const AI_CONFIG = {
  // Active provider
  provider: (process.env.AI_PROVIDER || 'groq') as 'groq' | 'ollama' | 'openai' | 'gemini',

  // Groq Configuration (Active)
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'compound-beta',
    enabled: true,
  },

  // Ollama Configuration (Disabled by default)
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.1:8b',
    enabled: process.env.ENABLE_OLLAMA === 'true', // Must explicitly enable
  },

  // OpenAI Configuration (Optional)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    enabled: !!process.env.OPENAI_API_KEY,
  },

  // Gemini Configuration (Google AI)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    defaultModel: 'gemini-3.1-flash-preview',
    enabled: true,
  },

  // Feature flags
  features: {
    aiEnabled: process.env.ENABLE_AI_FEATURES !== 'false', // Enabled by default
    streamingEnabled: true,
    maxTokensPerRequest: parseInt(process.env.AI_MAX_TOKENS_PER_REQUEST || '4096'),
    maxContextTokens: parseInt(process.env.AI_MAX_CONTEXT_TOKENS || '8192'),
  },

  // Temperature settings (0.0 = deterministic, 1.0 = creative, 2.0 = max randomness)
  temperature: {
    default: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    precise: parseFloat(process.env.AI_TEMPERATURE_PRECISE || '0.3'), // For structured outputs (quiz, flashcard, flowchart, translate)
    creative: parseFloat(process.env.AI_TEMPERATURE_CREATIVE || '0.9'), // For creative writing tasks
  },
}

// Validate configuration on startup
export function validateAIConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check if at least one provider is configured
  if (AI_CONFIG.provider === 'groq' && !AI_CONFIG.groq.apiKey) {
    errors.push('GROQ_API_KEY is not set. Get a free key at https://console.groq.com')
  }

  if (AI_CONFIG.provider === 'ollama' && AI_CONFIG.ollama.enabled) {
    // Ollama doesn't need an API key, but we'll validate connection later
  }

  if (AI_CONFIG.provider === 'openai' && !AI_CONFIG.openai.apiKey) {
    errors.push('OPENAI_API_KEY is not set')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Get the active provider configuration
export function getActiveProviderConfig() {
  const provider = AI_CONFIG.provider

  switch (provider) {
    case 'groq':
      return {
        ...AI_CONFIG.groq,
        provider: 'groq' as const,
      }
    case 'ollama':
      return {
        ...AI_CONFIG.ollama,
        provider: 'ollama' as const,
        apiKey: 'ollama', // Ollama doesn't need a real key
      }
    case 'openai':
      return {
        ...AI_CONFIG.openai,
        provider: 'openai' as const,
      }
    case 'gemini':
      return {
        ...AI_CONFIG.gemini,
        provider: 'gemini' as const,
      }
    default:
      return AI_CONFIG.groq
  }
}

// Check if AI features are available
export function isAIAvailable(): boolean {
  if (!AI_CONFIG.features.aiEnabled) return false

  const provider = AI_CONFIG.provider

  switch (provider) {
    case 'groq':
      return !!AI_CONFIG.groq.apiKey
    case 'ollama':
      return AI_CONFIG.ollama.enabled
    case 'openai':
      return !!AI_CONFIG.openai.apiKey
    case 'gemini':
      return !!AI_CONFIG.gemini.apiKey
    default:
      return false
  }
}

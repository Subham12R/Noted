// AI Types and Configuration

export type AIProvider = 'groq' | 'ollama' | 'openai' | 'anthropic' | 'gemini'

export type AIMode = 'answer' | 'expand' | 'summarize' | 'translate' | 'explain' | 'improve' | 'flowchart' | 'quiz' | 'flashcard'

export interface AIModel {
  id: string
  name: string
  provider: AIProvider
  contextWindow: number
  description: string
  enabled: boolean
}

export interface AIProviderConfig {
  provider: AIProvider
  apiKey?: string
  baseUrl: string
  defaultModel: string
  enabled: boolean
}

// Available models configuration
export const AI_MODELS: AIModel[] = [
  // Groq Models (Active)
  {
    id: 'compound-beta',
    name: 'Compound Beta (Agentic)',
    provider: 'groq',
    contextWindow: 128000,
    description: 'Agentic model with tool use and web search - Free',
    enabled: true,
  },
  {
    id: 'compound-beta-mini',
    name: 'Compound Beta Mini (Fast)',
    provider: 'groq',
    contextWindow: 128000,
    description: 'Faster agentic model - Free',
    enabled: true,
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Quality)',
    provider: 'groq',
    contextWindow: 131072,
    description: 'Best quality for complex tasks',
    enabled: true,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B (Fast)',
    provider: 'groq',
    contextWindow: 131072,
    description: 'Fast responses, good for quick tasks',
    enabled: true,
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    provider: 'groq',
    contextWindow: 32768,
    description: 'Good balance of speed and quality',
    enabled: true,
  },
  // Ollama Models (Disabled by default - local)
  {
    id: 'llama3.1:8b',
    name: 'Llama 3.1 8B (Local)',
    provider: 'ollama',
    contextWindow: 131072,
    description: 'Run locally with Ollama - requires setup',
    enabled: false, // Disabled until Ollama is configured
  },
  {
    id: 'mistral:7b',
    name: 'Mistral 7B (Local)',
    provider: 'ollama',
    contextWindow: 32768,
    description: 'Fast local model - requires setup',
    enabled: false,
  },
  // Gemini Models (Google AI) - 2026 Latest
  {
    id: 'gemini-3.1-flash-preview',
    name: 'Gemini 3.1 Flash (Recommended)',
    provider: 'gemini',
    contextWindow: 1048576,
    description: 'Latest - Best price-performance, reasoning capabilities',
    enabled: true,
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    provider: 'gemini',
    contextWindow: 1048576,
    description: 'Latest - Advanced reasoning and complex problem-solving',
    enabled: true,
  },
  {
    id: 'gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash-Lite',
    provider: 'gemini',
    contextWindow: 1048576,
    description: 'Latest - Most cost-efficient for high-volume tasks',
    enabled: true,
  },
  // Gemini 2.5 Models - Deprecated June 2026
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (Deprecated)',
    provider: 'gemini',
    contextWindow: 1048576,
    description: 'DEPRECATED - Use 3.1 Flash, works until June 2026',
    enabled: true,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro (Deprecated)',
    provider: 'gemini',
    contextWindow: 1048576,
    description: 'DEPRECATED - Use 3.1 Pro, works until June 2026',
    enabled: true,
  },
]

// Provider configurations
export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  groq: {
    provider: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'compound-beta',
    enabled: true, // Active by default
  },
  ollama: {
    provider: 'ollama',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    defaultModel: 'llama3.1:8b',
    enabled: false, // Disabled by default - see OLLAMA_SETUP.md
  },
  openai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    enabled: false,
  },
  anthropic: {
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-haiku-20240307',
    enabled: false,
  },
  gemini: {
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    defaultModel: 'gemini-2.5-flash',
    enabled: true,
  },
}

// AI Request types
export interface AIGenerateRequest {
  pageId: string
  prompt: string
  mode: AIMode
  model?: string
  context?: string // Page content for context
  stream?: boolean
}

export interface AIGenerateResponse {
  id: string
  content: string
  model: string
  mode: AIMode
  tokensUsed: number
  generationTimeMs: number
}

export interface AIStreamChunk {
  type: 'start' | 'chunk' | 'done' | 'error'
  content?: string
  id?: string
  model?: string
  tokensUsed?: number
  error?: string
}

// AI Block structure for TipTap
export interface AIBlockData {
  id: string
  prompt: string
  response: string
  model: string
  mode: AIMode
  timestamp: Date
  tokensUsed?: number
  isLoading?: boolean
  error?: string
}

// Get active provider
export function getActiveProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER as AIProvider
  if (provider && AI_PROVIDERS[provider]?.enabled) {
    return provider
  }
  // Default to groq
  return 'groq'
}

// Get enabled models
export function getEnabledModels(): AIModel[] {
  return AI_MODELS.filter(m => m.enabled)
}

// Get model by ID
export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find(m => m.id === id)
}

// Get default model for provider
export function getDefaultModel(provider: AIProvider): string {
  return AI_PROVIDERS[provider].defaultModel
}

// Mode descriptions for UI
export const AI_MODE_CONFIG: Record<AIMode, { label: string; description: string; icon: string }> = {
  answer: {
    label: 'Answer',
    description: 'Answer questions about your content',
    icon: 'MessageCircleQuestion',
  },
  expand: {
    label: 'Expand',
    description: 'Expand and add more detail',
    icon: 'Expand',
  },
  summarize: {
    label: 'Summarize',
    description: 'Create a concise summary',
    icon: 'ListCollapse',
  },
  translate: {
    label: 'Translate',
    description: 'Translate to another language',
    icon: 'Languages',
  },
  explain: {
    label: 'Explain',
    description: 'Explain in simpler terms',
    icon: 'Lightbulb',
  },
  improve: {
    label: 'Improve',
    description: 'Improve writing quality',
    icon: 'Sparkles',
  },
  flowchart: {
    label: 'Flowchart',
    description: 'Generate a visual flowchart',
    icon: 'Flowchart',
  },
  quiz: {
    label: 'Quiz',
    description: 'Generate quiz questions from your notes',
    icon: 'HelpCircle',
  },
  flashcard: {
    label: 'Flashcard',
    description: 'Create flashcards from your notes',
    icon: 'Layers',
  },
}

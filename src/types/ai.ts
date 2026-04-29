// AI Types and Configuration

export type AIProvider = 'groq' | 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'minimax' | 'nvidia'

export type AIMode = 'answer' | 'expand' | 'summarize' | 'translate' | 'explain' | 'improve' | 'flowchart' | 'quiz' | 'flashcard'

export interface AIModel {
  id: string
  name: string
  brandName?: string  // Branded display name shown in the UI (e.g. "NoteFast")
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
  // Noted branded models (powered by Groq)
  {
    id: 'compound-beta',
    name: 'Compound Beta',
    brandName: 'NoteFast',
    provider: 'groq',
    contextWindow: 128000,
    description: 'Fast, agentic model with tool use — balanced for everyday tasks',
    enabled: true,
  },
  {
    id: 'compound-beta-mini',
    name: 'Compound Beta Mini',
    brandName: 'NoteMini',
    provider: 'groq',
    contextWindow: 128000,
    description: 'Lightweight and quick — great for short tasks and drafts',
    enabled: true,
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    brandName: 'NoteMax',
    provider: 'groq',
    contextWindow: 131072,
    description: 'Most capable — best for complex reasoning and long documents',
    enabled: true,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
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

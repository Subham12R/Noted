export type AIProvider = 'groq' | 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'minimax' | 'nvidia'
export type AIMode = 'answer' | 'expand' | 'summarize' | 'translate' | 'explain' | 'improve' | 'flowchart' | 'quiz' | 'flashcard'

export interface AIModel {
  id: string
  name: string
  brandName?: string
  provider: AIProvider
  contextWindow: number
  description: string
  enabled: boolean
}

export interface AIStreamChunk {
  type: 'start' | 'chunk' | 'done' | 'error'
  id?: string
  model?: string
  content?: string
  tokensUsed?: number
  error?: string
}

export const AI_MODELS: AIModel[] = [
  { id: 'compound-beta', name: 'Compound Beta', brandName: 'NoteFast', provider: 'groq', contextWindow: 128000, description: 'Fast, agentic model with tool use', enabled: true },
  { id: 'compound-beta-mini', name: 'Compound Beta Mini', brandName: 'NoteMini', provider: 'groq', contextWindow: 128000, description: 'Lightweight and quick', enabled: true },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', brandName: 'NoteMax', provider: 'groq', contextWindow: 131072, description: 'Most capable', enabled: true },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'groq', contextWindow: 131072, description: 'Fast responses', enabled: true },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq', contextWindow: 32768, description: 'Good balance of speed and quality', enabled: true },
]

export const AI_MODE_CONFIG: Record<AIMode, { label: string; description: string }> = {
  answer: { label: 'Answer', description: 'Get answers based on your notes' },
  expand: { label: 'Expand', description: 'Expand and elaborate on content' },
  summarize: { label: 'Summarize', description: 'Create concise summaries' },
  translate: { label: 'Translate', description: 'Translate content to another language' },
  explain: { label: 'Explain', description: 'Get clear explanations' },
  improve: { label: 'Improve', description: 'Enhance writing quality' },
  flowchart: { label: 'Flowchart', description: 'Generate a Mermaid flowchart' },
  quiz: { label: 'Quiz', description: 'Generate quiz questions' },
  flashcard: { label: 'Flashcards', description: 'Generate flashcards' },
}

export function getEnabledModels(): AIModel[] {
  return AI_MODELS.filter(m => m.enabled)
}

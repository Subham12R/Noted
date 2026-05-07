export type AIProvider = 'groq' | 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'minimax' | 'nvidia';
export type AIMode = 'answer' | 'expand' | 'summarize' | 'translate' | 'explain' | 'improve' | 'flowchart' | 'quiz' | 'flashcard';
export interface AIModel {
    id: string;
    name: string;
    brandName?: string;
    provider: AIProvider;
    contextWindow: number;
    description: string;
    enabled: boolean;
}
export interface AIStreamChunk {
    type: 'start' | 'chunk' | 'done' | 'error';
    id?: string;
    model?: string;
    content?: string;
    tokensUsed?: number;
    error?: string;
}
export declare const AI_MODELS: AIModel[];
export declare const AI_MODE_CONFIG: Record<AIMode, {
    label: string;
    description: string;
}>;
export declare function getEnabledModels(): AIModel[];
//# sourceMappingURL=ai.d.ts.map
import type { AIMode, AIProvider, AIStreamChunk } from '../../types/ai.js';
export interface GenerateOptions {
    prompt: string;
    mode: AIMode;
    context?: string;
    model?: string;
    provider?: AIProvider;
    maxTokens?: number;
    temperature?: number;
    userApiKey?: string;
    userBaseUrl?: string;
}
/**
 * Generate AI response (non-streaming)
 */
export declare function generateAIResponse(options: GenerateOptions): Promise<{
    content: string;
    model: string;
    tokensUsed: number;
}>;
/**
 * Generate AI response with streaming
 */
export declare function generateAIResponseStream(options: GenerateOptions): AsyncGenerator<AIStreamChunk>;
/**
 * Convert streaming response to SSE format
 */
export declare function streamToSSE(chunk: AIStreamChunk): string;
//# sourceMappingURL=generate.d.ts.map
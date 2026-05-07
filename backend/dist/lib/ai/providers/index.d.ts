import OpenAI from 'openai';
import type { AIProvider } from '../../../types/ai.js';
/**
 * Create an OpenAI-compatible client for groq, ollama, openai
 * This is the standard way - works perfectly for these providers
 */
export declare function createOpenAIClient(provider?: AIProvider): OpenAI;
export declare function createAIClient(provider?: AIProvider): OpenAI;
/**
 * Get the default model for the active provider
 */
export declare function getDefaultModel(provider?: AIProvider): string;
/**
 * Check if a provider is available and configured
 */
export declare function isProviderAvailable(provider: AIProvider): boolean;
/**
 * List available providers
 */
export declare function getAvailableProviders(): AIProvider[];
//# sourceMappingURL=index.d.ts.map
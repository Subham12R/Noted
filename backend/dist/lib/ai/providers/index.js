"use strict";
// AI Provider Factory
// Creates the appropriate client based on configuration
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenAIClient = createOpenAIClient;
exports.createAIClient = createAIClient;
exports.getDefaultModel = getDefaultModel;
exports.isProviderAvailable = isProviderAvailable;
exports.getAvailableProviders = getAvailableProviders;
const openai_1 = __importDefault(require("openai"));
const config_js_1 = require("../config.js");
// Separate cache for OpenAI-compatible clients (groq, openai, ollama)
const openAIClients = new Map();
/**
 * Create an OpenAI-compatible client for groq, ollama, openai
 * This is the standard way - works perfectly for these providers
 */
function createOpenAIClient(provider) {
    const targetProvider = provider || config_js_1.AI_CONFIG.provider;
    // Don't create OpenAI client for gemini
    if (targetProvider === 'gemini') {
        throw new Error('Use createGeminiClient() for Gemini provider');
    }
    // Return cached instance if exists
    const apiKey = targetProvider === 'groq' ? config_js_1.AI_CONFIG.groq.apiKey :
        targetProvider === 'openai' ? config_js_1.AI_CONFIG.openai.apiKey : 'default';
    const cacheKey = `${targetProvider}-${apiKey || 'default'}`;
    if (openAIClients.has(cacheKey)) {
        return openAIClients.get(cacheKey);
    }
    let client;
    switch (targetProvider) {
        case 'groq':
            client = new openai_1.default({
                apiKey: config_js_1.AI_CONFIG.groq.apiKey,
                baseURL: config_js_1.AI_CONFIG.groq.baseUrl,
            });
            break;
        case 'ollama':
            client = new openai_1.default({
                apiKey: 'ollama',
                baseURL: `${config_js_1.AI_CONFIG.ollama.baseUrl}/v1`,
            });
            break;
        case 'openai':
            client = new openai_1.default({
                apiKey: config_js_1.AI_CONFIG.openai.apiKey,
                baseURL: config_js_1.AI_CONFIG.openai.baseUrl,
            });
            break;
        case 'minimax':
            client = new openai_1.default({
                apiKey: config_js_1.AI_CONFIG.minimax.apiKey,
                baseURL: config_js_1.AI_CONFIG.minimax.baseUrl,
            });
            break;
        case 'nvidia':
            client = new openai_1.default({
                apiKey: config_js_1.AI_CONFIG.nvidia.apiKey,
                baseURL: config_js_1.AI_CONFIG.nvidia.baseUrl,
            });
            break;
        default:
            // Default to groq
            client = new openai_1.default({
                apiKey: config_js_1.AI_CONFIG.groq.apiKey,
                baseURL: config_js_1.AI_CONFIG.groq.baseUrl,
            });
    }
    openAIClients.set(cacheKey, client);
    return client;
}
// Keep the old function for backward compatibility - but it will throw for gemini
function createAIClient(provider) {
    return createOpenAIClient(provider);
}
/**
 * Get the default model for the active provider
 */
function getDefaultModel(provider) {
    const targetProvider = provider || config_js_1.AI_CONFIG.provider;
    const config = (0, config_js_1.getActiveProviderConfig)();
    switch (targetProvider) {
        case 'groq':
            return config_js_1.AI_CONFIG.groq.defaultModel;
        case 'ollama':
            return config_js_1.AI_CONFIG.ollama.defaultModel;
        case 'openai':
            return config_js_1.AI_CONFIG.openai.defaultModel;
        case 'gemini':
            return config_js_1.AI_CONFIG.gemini.defaultModel;
        default:
            return config.defaultModel;
    }
}
/**
 * Check if a provider is available and configured
 */
function isProviderAvailable(provider) {
    switch (provider) {
        case 'groq':
            return config_js_1.AI_CONFIG.groq.enabled && !!config_js_1.AI_CONFIG.groq.apiKey;
        case 'ollama':
            return config_js_1.AI_CONFIG.ollama.enabled;
        case 'openai':
            return config_js_1.AI_CONFIG.openai.enabled && !!config_js_1.AI_CONFIG.openai.apiKey;
        case 'gemini':
            return config_js_1.AI_CONFIG.gemini.enabled && !!config_js_1.AI_CONFIG.gemini.apiKey;
        case 'minimax':
            return config_js_1.AI_CONFIG.minimax.enabled && !!config_js_1.AI_CONFIG.minimax.apiKey;
        case 'nvidia':
            return config_js_1.AI_CONFIG.nvidia.enabled && !!config_js_1.AI_CONFIG.nvidia.apiKey;
        default:
            return false;
    }
}
/**
 * List available providers
 */
function getAvailableProviders() {
    const providers = [];
    if (isProviderAvailable('groq'))
        providers.push('groq');
    if (isProviderAvailable('ollama'))
        providers.push('ollama');
    if (isProviderAvailable('openai'))
        providers.push('openai');
    if (isProviderAvailable('gemini'))
        providers.push('gemini');
    if (isProviderAvailable('minimax'))
        providers.push('minimax');
    if (isProviderAvailable('nvidia'))
        providers.push('nvidia');
    return providers;
}
//# sourceMappingURL=index.js.map
export declare const AI_CONFIG: {
    provider: "groq" | "ollama" | "openai" | "gemini" | "minimax" | "nvidia";
    groq: {
        apiKey: string | undefined;
        baseUrl: string;
        defaultModel: string;
        enabled: boolean;
    };
    ollama: {
        baseUrl: string;
        defaultModel: string;
        enabled: boolean;
    };
    openai: {
        apiKey: string | undefined;
        baseUrl: string;
        defaultModel: string;
        enabled: boolean;
    };
    gemini: {
        apiKey: string | undefined;
        baseUrl: string;
        defaultModel: string;
        enabled: boolean;
    };
    nvidia: {
        apiKey: string | undefined;
        baseUrl: string;
        defaultModel: string;
        enabled: boolean;
    };
    minimax: {
        apiKey: string | undefined;
        baseUrl: string;
        defaultModel: string;
        enabled: boolean;
    };
    features: {
        aiEnabled: boolean;
        streamingEnabled: boolean;
        maxTokensPerRequest: number;
        maxContextTokens: number;
    };
    temperature: {
        default: number;
        precise: number;
        creative: number;
    };
};
export declare function validateAIConfig(): {
    valid: boolean;
    errors: string[];
};
export declare function getActiveProviderConfig(): {
    apiKey: string | undefined;
    baseUrl: string;
    defaultModel: string;
    enabled: boolean;
} | {
    provider: "groq";
    apiKey: string | undefined;
    baseUrl: string;
    defaultModel: string;
    enabled: boolean;
} | {
    provider: "ollama";
    apiKey: string;
    baseUrl: string;
    defaultModel: string;
    enabled: boolean;
} | {
    provider: "openai";
    apiKey: string | undefined;
    baseUrl: string;
    defaultModel: string;
    enabled: boolean;
} | {
    provider: "gemini";
    apiKey: string | undefined;
    baseUrl: string;
    defaultModel: string;
    enabled: boolean;
};
export declare function isAIAvailable(): boolean;
//# sourceMappingURL=config.d.ts.map
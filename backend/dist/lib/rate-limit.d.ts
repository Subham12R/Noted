interface RateLimitOptions {
    identifier: string;
    endpoint: string;
    limit: number;
    windowMs: number;
}
interface RateLimitResult {
    success: boolean;
    remaining: number;
    retryAfter?: number;
}
export declare function rateLimitMemory(options: RateLimitOptions): RateLimitResult;
export declare const RATE_LIMITS: {
    readonly AUTH: {
        readonly limit: 10;
        readonly windowMs: number;
    };
    readonly PAGE_SAVE: {
        readonly limit: 10;
        readonly windowMs: number;
    };
    readonly API_GENERAL: {
        readonly limit: 100;
        readonly windowMs: number;
    };
    readonly FOLDER_CREATE: {
        readonly limit: 20;
        readonly windowMs: number;
    };
};
export {};
//# sourceMappingURL=rate-limit.d.ts.map
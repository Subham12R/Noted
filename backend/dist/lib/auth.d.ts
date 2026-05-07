export declare const auth: import("better-auth", { with: { "resolution-mode": "import" } }).Auth<{
    database: (options: import("better-auth", { with: { "resolution-mode": "import" } }).BetterAuthOptions) => import("better-auth", { with: { "resolution-mode": "import" } }).DBAdapter<import("better-auth", { with: { "resolution-mode": "import" } }).BetterAuthOptions>;
    emailAndPassword: {
        enabled: true;
        requireEmailVerification: false;
        minPasswordLength: number;
        maxPasswordLength: number;
    };
    socialProviders: {
        google: {
            clientId: string;
            clientSecret: string;
        };
        github: {
            clientId: string;
            clientSecret: string;
        };
    };
    session: {
        expiresIn: number;
        updateAge: number;
        cookieCache: {
            enabled: true;
            maxAge: number;
        };
    };
    rateLimit: {
        window: number;
        max: number;
    };
    trustedOrigins: string[];
}>;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
//# sourceMappingURL=auth.d.ts.map
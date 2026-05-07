import Stripe from "stripe";
export declare const stripe: Stripe;
export declare const STRIPE_PRICE_IDS: {
    readonly pro: {
        readonly monthly: string;
        readonly yearly: string;
    };
    readonly team: {
        readonly monthly: string;
        readonly yearly: string;
    };
};
export declare function getPriceId(tier: "pro" | "team", interval: "month" | "year"): string;
export declare function getTierFromPriceId(priceId: string): {
    tier: "pro" | "team";
    interval: "month" | "year";
} | null;
export declare function getOrCreateStripeCustomer(userId: string, email: string, name?: string): Promise<string>;
export declare function createCheckoutSession(customerId: string, priceId: string, userId: string, successUrl: string, cancelUrl: string): Promise<Stripe.Checkout.Session>;
export declare function createCustomerPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session>;
//# sourceMappingURL=stripe.d.ts.map
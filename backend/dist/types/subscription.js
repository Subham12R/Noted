"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBSCRIPTION_TIERS = void 0;
exports.isLimitReached = isLimitReached;
exports.SUBSCRIPTION_TIERS = {
    free: {
        name: "Free",
        price: 0,
        period: "forever",
        color: "from-zinc-600 to-zinc-800",
        limits: { maxNotes: 10, maxFolders: 3, maxCollaboratorsPerNote: 2, maxStorageMB: 50, maxAiRequestsPerMonth: 10 },
        features: ["Up to 10 notes", "3 folders", "10 AI requests/month"],
    },
    pro: {
        name: "Pro",
        price: 999,
        period: "month",
        color: "from-indigo-600 to-purple-600",
        limits: { maxNotes: -1, maxFolders: -1, maxCollaboratorsPerNote: 10, maxStorageMB: 10240, maxAiRequestsPerMonth: 500 },
        features: ["Unlimited notes", "Unlimited folders", "500 AI requests/month"],
    },
    team: {
        name: "Team",
        price: 1999,
        period: "month",
        color: "from-orange-500 to-pink-600",
        limits: { maxNotes: -1, maxFolders: -1, maxCollaboratorsPerNote: -1, maxStorageMB: 102400, maxAiRequestsPerMonth: -1 },
        features: ["Everything in Pro", "Unlimited collaborators", "Unlimited AI"],
    },
};
function isLimitReached(current, limit) {
    return limit !== -1 && current >= limit;
}
//# sourceMappingURL=subscription.js.map
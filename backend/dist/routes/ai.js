"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const auth_utils_js_1 = require("../lib/auth-utils.js");
const rate_limit_js_1 = require("../lib/rate-limit.js");
const subscription_js_1 = require("../lib/subscription.js");
const generate_js_1 = require("../lib/ai/generate.js");
const config_js_1 = require("../lib/ai/config.js");
const index_js_2 = require("../lib/ai/providers/index.js");
const ai_js_1 = require("../types/ai.js");
const encryption_js_1 = require("../lib/encryption.js");
const zod_1 = require("zod");
const app = new hono_1.Hono();
const VALID_MODES = ["answer", "expand", "summarize", "translate", "explain", "improve", "flowchart", "quiz", "flashcard"];
const PROVIDER_DEFAULT_MODELS = {
    anthropic: "claude-sonnet-4-6",
    openai: "gpt-4o",
    groq: "compound-beta",
    gemini: "gemini-2.5-flash",
    minimax: "MiniMax-M2.5",
    nvidia: "meta/llama-3.1-70b-instruct",
    custom: "gpt-4o",
};
// POST /ai/generate
app.post("/generate", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user?.id)
            return c.json({ error: "Unauthorized" }, 401);
        const userId = session.user.id;
        if (!(0, config_js_1.isAIAvailable)()) {
            return c.json({ error: "AI features are not configured. Please set up GROQ_API_KEY." }, 503);
        }
        const aiCheck = await (0, subscription_js_1.canUseAI)(userId);
        if (!aiCheck.allowed) {
            return c.json({ error: aiCheck.reason, current: aiCheck.current, limit: aiCheck.limit }, 429);
        }
        const body = await c.req.json();
        const { pageId, prompt, mode, model, stream = true, context: providedContext, provider: requestedProvider } = body;
        if (!prompt || typeof prompt !== "string")
            return c.json({ error: "Prompt is required" }, 400);
        if (prompt.length > 20000)
            return c.json({ error: "Prompt too long (max 20000 chars)" }, 400);
        if (!mode || !VALID_MODES.includes(mode)) {
            return c.json({ error: `Invalid mode. Must be one of: ${VALID_MODES.join(", ")}` }, 400);
        }
        if (model !== undefined && (typeof model !== "string" || model.length > 100 || !/^[a-zA-Z0-9._:/-]+$/.test(model))) {
            return c.json({ error: "Invalid model identifier" }, 400);
        }
        let context;
        if (providedContext && typeof providedContext === "string") {
            context = providedContext.length > 12000 ? providedContext.substring(0, 12000) + "..." : providedContext;
        }
        else if (pageId) {
            const [page] = await index_js_1.db.select().from(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, pageId));
            if (page?.content) {
                context = page.content.replace(/<[^>]*>/g, " ").trim();
                if (context.length > 8000)
                    context = context.substring(0, 8000) + "...";
            }
        }
        let userApiKey;
        let userBaseUrl;
        if (requestedProvider) {
            const [storedKey] = await index_js_1.db.select({ encryptedKey: index_js_1.userApiKeys.encryptedKey, baseUrl: index_js_1.userApiKeys.baseUrl })
                .from(index_js_1.userApiKeys).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.userApiKeys.userId, userId), (0, drizzle_orm_1.eq)(index_js_1.userApiKeys.provider, requestedProvider), (0, drizzle_orm_1.eq)(index_js_1.userApiKeys.isActive, true)));
            if (storedKey) {
                try {
                    userApiKey = (0, encryption_js_1.decryptApiKey)(storedKey.encryptedKey);
                    userBaseUrl = storedKey.baseUrl ?? undefined;
                }
                catch {
                    console.warn("[AI Generate] Failed to decrypt user key for provider:", requestedProvider);
                }
            }
        }
        await (0, subscription_js_1.incrementAIUsage)(userId);
        if (stream) {
            const encoder = new TextEncoder();
            const readableStream = new ReadableStream({
                async start(controller) {
                    try {
                        const generator = (0, generate_js_1.generateAIResponseStream)({ prompt, mode, context, model, provider: requestedProvider, userApiKey, userBaseUrl });
                        for await (const chunk of generator) {
                            controller.enqueue(encoder.encode((0, generate_js_1.streamToSSE)(chunk)));
                        }
                        controller.close();
                    }
                    catch (error) {
                        controller.enqueue(encoder.encode((0, generate_js_1.streamToSSE)({ type: "error", error: error instanceof Error ? error.message : "Generation failed" })));
                        controller.close();
                    }
                },
            });
            return new Response(readableStream, {
                headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
            });
        }
        const response = await (0, generate_js_1.generateAIResponse)({ prompt, mode, context, model, provider: requestedProvider, userApiKey, userBaseUrl });
        return c.json({ success: true, ...response });
    }
    catch (error) {
        console.error("AI generation error:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
    }
});
// GET /ai/generate (check availability)
app.get("/generate", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user?.id)
            return c.json({ error: "Unauthorized" }, 401);
        const aiCheck = await (0, subscription_js_1.canUseAI)(session.user.id);
        const available = (0, config_js_1.isAIAvailable)();
        return c.json({ available, ...aiCheck, provider: process.env.AI_PROVIDER || "groq" });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// GET /ai/models
app.get("/models", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user?.id)
            return c.json({ error: "Unauthorized" }, 401);
        const savedKeys = await index_js_1.db.select({ id: index_js_1.userApiKeys.id, provider: index_js_1.userApiKeys.provider, label: index_js_1.userApiKeys.label, modelOverride: index_js_1.userApiKeys.modelOverride, baseUrl: index_js_1.userApiKeys.baseUrl })
            .from(index_js_1.userApiKeys).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.userApiKeys.userId, session.user.id), (0, drizzle_orm_1.eq)(index_js_1.userApiKeys.isActive, true)));
        const available = (0, config_js_1.isAIAvailable)();
        const enabledModels = (0, ai_js_1.getEnabledModels)();
        const availableProviders = (0, index_js_2.getAvailableProviders)();
        const baseModels = ai_js_1.AI_MODELS.filter((m) => m.enabled && (0, index_js_2.isProviderAvailable)(m.provider))
            .map((m) => ({ ...m, available: true, providerConfigured: true, userKeyId: null }));
        const userKeyModels = savedKeys.map((key) => ({
            id: key.modelOverride || PROVIDER_DEFAULT_MODELS[key.provider] || key.provider,
            name: key.label, provider: key.provider, brandName: undefined, contextWindow: 200000,
            description: `Your ${key.provider} key`, enabled: true, available: true, providerConfigured: true, userKeyId: key.id,
        }));
        const allModels = [...baseModels, ...userKeyModels];
        const defaultModel = allModels.find((m) => m.available)?.id || "compound-beta";
        return c.json({
            available, activeProvider: config_js_1.AI_CONFIG.provider, availableProviders, models: enabledModels, allModels, defaultModel, modes: ai_js_1.AI_MODE_CONFIG,
            config: { maxTokensPerRequest: config_js_1.AI_CONFIG.features.maxTokensPerRequest, streamingEnabled: config_js_1.AI_CONFIG.features.streamingEnabled, ollamaEnabled: config_js_1.AI_CONFIG.ollama.enabled },
        });
    }
    catch {
        return c.json({ error: "Internal server error" }, 500);
    }
});
// POST /ai/actions
app.post("/actions", async (c) => {
    try {
        const session = await (0, auth_utils_js_1.getServerSession)(c.req.raw);
        if (!session?.user?.id)
            return c.json({ error: "Unauthorized" }, 401);
        const userId = session.user.id;
        const rl = (0, rate_limit_js_1.rateLimitMemory)({ identifier: userId, endpoint: "ai-actions", ...rate_limit_js_1.RATE_LIMITS.API_GENERAL });
        if (!rl.success)
            return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429);
        const ActionSchema = zod_1.z.discriminatedUnion("type", [
            zod_1.z.object({ type: zod_1.z.literal("create_folder"), name: zod_1.z.string().min(1).max(100), parentId: zod_1.z.string().nullable().optional() }),
            zod_1.z.object({ type: zod_1.z.literal("rename_folder"), folderId: zod_1.z.string(), newName: zod_1.z.string().min(1).max(100) }),
            zod_1.z.object({ type: zod_1.z.literal("delete_folder"), folderId: zod_1.z.string() }),
            zod_1.z.object({ type: zod_1.z.literal("move_folder"), folderId: zod_1.z.string(), newParentId: zod_1.z.string().nullable() }),
            zod_1.z.object({ type: zod_1.z.literal("create_page"), name: zod_1.z.string().min(1).max(200), folderId: zod_1.z.string(), content: zod_1.z.string().optional() }),
            zod_1.z.object({ type: zod_1.z.literal("rename_page"), pageId: zod_1.z.string(), newName: zod_1.z.string().min(1).max(200) }),
            zod_1.z.object({ type: zod_1.z.literal("delete_page"), pageId: zod_1.z.string() }),
            zod_1.z.object({ type: zod_1.z.literal("move_page"), pageId: zod_1.z.string(), newFolderId: zod_1.z.string() }),
            zod_1.z.object({ type: zod_1.z.literal("update_page_content"), pageId: zod_1.z.string(), content: zod_1.z.string() }),
            zod_1.z.object({ type: zod_1.z.literal("create_todo"), text: zod_1.z.string().min(1).max(500) }),
            zod_1.z.object({ type: zod_1.z.literal("update_todo"), todoId: zod_1.z.string(), text: zod_1.z.string().min(1).max(500).optional(), completed: zod_1.z.boolean().optional() }),
            zod_1.z.object({ type: zod_1.z.literal("delete_todo"), todoId: zod_1.z.string() }),
            zod_1.z.object({ type: zod_1.z.literal("complete_todo"), todoId: zod_1.z.string() }),
        ]);
        const folderColors = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6"];
        const getRandomColor = () => folderColors[Math.floor(Math.random() * folderColors.length)];
        async function executeAction(action) {
            switch (action.type) {
                case "create_folder": {
                    if (action.parentId) {
                        const [parent] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.folders.id, action.parentId), (0, drizzle_orm_1.eq)(index_js_1.folders.ownerId, userId)));
                        if (!parent)
                            throw new Error("Parent folder not found");
                    }
                    const [newFolder] = await index_js_1.db.insert(index_js_1.folders).values({ name: action.name, ownerId: userId, parentId: action.parentId || null, color: getRandomColor(), sortOrder: 0 }).returning();
                    return { folder: newFolder };
                }
                case "rename_folder": {
                    const [folder] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.folders.id, action.folderId), (0, drizzle_orm_1.eq)(index_js_1.folders.ownerId, userId)));
                    if (!folder)
                        throw new Error("Folder not found");
                    const [updated] = await index_js_1.db.update(index_js_1.folders).set({ name: action.newName, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, action.folderId)).returning();
                    return { folder: updated };
                }
                case "delete_folder": {
                    const [folder] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.folders.id, action.folderId), (0, drizzle_orm_1.eq)(index_js_1.folders.ownerId, userId)));
                    if (!folder)
                        throw new Error("Folder not found");
                    await index_js_1.db.delete(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.folderId, action.folderId));
                    await index_js_1.db.delete(index_js_1.folders).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, action.folderId));
                    return { deleted: true };
                }
                case "move_folder": {
                    const [folder] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.folders.id, action.folderId), (0, drizzle_orm_1.eq)(index_js_1.folders.ownerId, userId)));
                    if (!folder)
                        throw new Error("Folder not found");
                    if (action.newParentId) {
                        const [parent] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.folders.id, action.newParentId), (0, drizzle_orm_1.eq)(index_js_1.folders.ownerId, userId)));
                        if (!parent)
                            throw new Error("Target parent folder not found");
                        if (action.newParentId === action.folderId)
                            throw new Error("Cannot move folder into itself");
                    }
                    const [updated] = await index_js_1.db.update(index_js_1.folders).set({ parentId: action.newParentId, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(index_js_1.folders.id, action.folderId)).returning();
                    return { folder: updated };
                }
                case "create_page": {
                    const [folder] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.folders.id, action.folderId), (0, drizzle_orm_1.eq)(index_js_1.folders.ownerId, userId)));
                    if (!folder)
                        throw new Error("Folder not found");
                    const [newPage] = await index_js_1.db.insert(index_js_1.pages).values({ name: action.name, folderId: action.folderId, ownerId: userId, content: action.content || "", sortOrder: 0 }).returning();
                    return { page: newPage };
                }
                case "rename_page": {
                    const [page] = await index_js_1.db.select().from(index_js_1.pages).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pages.id, action.pageId), (0, drizzle_orm_1.eq)(index_js_1.pages.ownerId, userId)));
                    if (!page)
                        throw new Error("Page not found");
                    const [updated] = await index_js_1.db.update(index_js_1.pages).set({ name: action.newName, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, action.pageId)).returning();
                    return { page: updated };
                }
                case "delete_page": {
                    const [page] = await index_js_1.db.select().from(index_js_1.pages).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pages.id, action.pageId), (0, drizzle_orm_1.eq)(index_js_1.pages.ownerId, userId)));
                    if (!page)
                        throw new Error("Page not found");
                    await index_js_1.db.delete(index_js_1.pages).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, action.pageId));
                    return { deleted: true };
                }
                case "move_page": {
                    const [page] = await index_js_1.db.select().from(index_js_1.pages).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pages.id, action.pageId), (0, drizzle_orm_1.eq)(index_js_1.pages.ownerId, userId)));
                    if (!page)
                        throw new Error("Page not found");
                    const [targetFolder] = await index_js_1.db.select().from(index_js_1.folders).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.folders.id, action.newFolderId), (0, drizzle_orm_1.eq)(index_js_1.folders.ownerId, userId)));
                    if (!targetFolder)
                        throw new Error("Target folder not found");
                    const [updated] = await index_js_1.db.update(index_js_1.pages).set({ folderId: action.newFolderId, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, action.pageId)).returning();
                    return { page: updated };
                }
                case "update_page_content": {
                    const [page] = await index_js_1.db.select().from(index_js_1.pages).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.pages.id, action.pageId), (0, drizzle_orm_1.eq)(index_js_1.pages.ownerId, userId)));
                    if (!page)
                        throw new Error("Page not found");
                    const [updated] = await index_js_1.db.update(index_js_1.pages).set({ content: action.content, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(index_js_1.pages.id, action.pageId)).returning();
                    return { page: updated };
                }
                case "create_todo": {
                    const [newTodo] = await index_js_1.db.insert(index_js_1.todos).values({ userId, text: action.text, completed: false }).returning();
                    return { todo: newTodo };
                }
                case "update_todo": {
                    const [todo] = await index_js_1.db.select().from(index_js_1.todos).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.todos.id, action.todoId), (0, drizzle_orm_1.eq)(index_js_1.todos.userId, userId)));
                    if (!todo)
                        throw new Error("Todo not found");
                    const updates = { updatedAt: new Date() };
                    if (action.text !== undefined)
                        updates.text = action.text;
                    if (action.completed !== undefined)
                        updates.completed = action.completed;
                    const [updated] = await index_js_1.db.update(index_js_1.todos).set(updates).where((0, drizzle_orm_1.eq)(index_js_1.todos.id, action.todoId)).returning();
                    return { todo: updated };
                }
                case "delete_todo": {
                    const [todo] = await index_js_1.db.select().from(index_js_1.todos).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.todos.id, action.todoId), (0, drizzle_orm_1.eq)(index_js_1.todos.userId, userId)));
                    if (!todo)
                        throw new Error("Todo not found");
                    await index_js_1.db.delete(index_js_1.todos).where((0, drizzle_orm_1.eq)(index_js_1.todos.id, action.todoId));
                    return { deleted: true };
                }
                case "complete_todo": {
                    const [todo] = await index_js_1.db.select().from(index_js_1.todos).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.todos.id, action.todoId), (0, drizzle_orm_1.eq)(index_js_1.todos.userId, userId)));
                    if (!todo)
                        throw new Error("Todo not found");
                    const [updated] = await index_js_1.db.update(index_js_1.todos).set({ completed: true, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(index_js_1.todos.id, action.todoId)).returning();
                    return { todo: updated };
                }
                default:
                    throw new Error("Unknown action type");
            }
        }
        const body = await c.req.json();
        const { actions } = zod_1.z.object({ actions: zod_1.z.array(ActionSchema) }).parse(body);
        const results = [];
        for (const action of actions) {
            try {
                const result = await executeAction(action);
                results.push({ action, success: true, result });
            }
            catch (error) {
                results.push({ action, success: false, error: error instanceof Error ? error.message : "Action failed" });
            }
        }
        return c.json({ success: results.every(r => r.success), results });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return c.json({ error: "Invalid action format", details: error.issues }, 400);
        console.error("AI actions error:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
    }
});
exports.default = app;
//# sourceMappingURL=ai.js.map
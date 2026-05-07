import { Hono } from "hono"
import { db, pages, userApiKeys, folders, todos } from "../db/index.js"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "../lib/auth-utils.js"
import { rateLimitMemory, RATE_LIMITS } from "../lib/rate-limit.js"
import { canUseAI, incrementAIUsage } from "../lib/subscription.js"
import { generateAIResponse, generateAIResponseStream, streamToSSE } from "../lib/ai/generate.js"
import { isAIAvailable, AI_CONFIG } from "../lib/ai/config.js"
import { getAvailableProviders, isProviderAvailable } from "../lib/ai/providers/index.js"
import { AI_MODELS, AI_MODE_CONFIG, getEnabledModels } from "../types/ai.js"
import { decryptApiKey } from "../lib/encryption.js"
import { z } from "zod"
import type { AIMode } from "../types/ai.js"

const app = new Hono()

const VALID_MODES: AIMode[] = ["answer", "expand", "summarize", "translate", "explain", "improve", "flowchart", "quiz", "flashcard"]

const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  groq: "compound-beta",
  gemini: "gemini-2.5-flash",
  minimax: "MiniMax-M2.5",
  nvidia: "meta/llama-3.1-70b-instruct",
  custom: "gpt-4o",
}

// POST /ai/generate
app.post("/generate", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401)

    const userId = session.user.id

    if (!isAIAvailable()) {
      return c.json({ error: "AI features are not configured. Please set up GROQ_API_KEY." }, 503)
    }

    const aiCheck = await canUseAI(userId)
    if (!aiCheck.allowed) {
      return c.json({ error: aiCheck.reason, current: aiCheck.current, limit: aiCheck.limit }, 429)
    }

    const body = await c.req.json()
    const { pageId, prompt, mode, model, stream = true, context: providedContext, provider: requestedProvider } = body

    if (!prompt || typeof prompt !== "string") return c.json({ error: "Prompt is required" }, 400)
    if (prompt.length > 20000) return c.json({ error: "Prompt too long (max 20000 chars)" }, 400)
    if (!mode || !VALID_MODES.includes(mode)) {
      return c.json({ error: `Invalid mode. Must be one of: ${VALID_MODES.join(", ")}` }, 400)
    }
    if (model !== undefined && (typeof model !== "string" || model.length > 100 || !/^[a-zA-Z0-9._:/-]+$/.test(model))) {
      return c.json({ error: "Invalid model identifier" }, 400)
    }

    let context: string | undefined
    if (providedContext && typeof providedContext === "string") {
      context = providedContext.length > 12000 ? providedContext.substring(0, 12000) + "..." : providedContext
    } else if (pageId) {
      const [page] = await db.select().from(pages).where(eq(pages.id, pageId))
      if (page?.content) {
        context = page.content.replace(/<[^>]*>/g, " ").trim()
        if (context.length > 8000) context = context.substring(0, 8000) + "..."
      }
    }

    let userApiKey: string | undefined
    let userBaseUrl: string | undefined
    if (requestedProvider) {
      const [storedKey] = await db.select({ encryptedKey: userApiKeys.encryptedKey, baseUrl: userApiKeys.baseUrl })
        .from(userApiKeys).where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, requestedProvider), eq(userApiKeys.isActive, true)))
      if (storedKey) {
        try {
          userApiKey = decryptApiKey(storedKey.encryptedKey)
          userBaseUrl = storedKey.baseUrl ?? undefined
        } catch {
          console.warn("[AI Generate] Failed to decrypt user key for provider:", requestedProvider)
        }
      }
    }

    await incrementAIUsage(userId)

    if (stream) {
      const encoder = new TextEncoder()
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            const generator = generateAIResponseStream({ prompt, mode, context, model, provider: requestedProvider, userApiKey, userBaseUrl })
            for await (const chunk of generator) {
              controller.enqueue(encoder.encode(streamToSSE(chunk)))
            }
            controller.close()
          } catch (error) {
            controller.enqueue(encoder.encode(streamToSSE({ type: "error", error: error instanceof Error ? error.message : "Generation failed" })))
            controller.close()
          }
        },
      })
      return new Response(readableStream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      })
    }

    const response = await generateAIResponse({ prompt, mode, context, model, provider: requestedProvider, userApiKey, userBaseUrl })
    return c.json({ success: true, ...response })
  } catch (error) {
    console.error("AI generation error:", error)
    return c.json({ error: error instanceof Error ? error.message : "Internal server error" }, 500)
  }
})

// GET /ai/generate (check availability)
app.get("/generate", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401)

    const aiCheck = await canUseAI(session.user.id)
    const available = isAIAvailable()
    return c.json({ available, ...aiCheck, provider: process.env.AI_PROVIDER || "groq" })
  } catch {
    return c.json({ error: "Internal server error" }, 500)
  }
})

// GET /ai/models
app.get("/models", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401)

    const savedKeys = await db.select({ id: userApiKeys.id, provider: userApiKeys.provider, label: userApiKeys.label, modelOverride: userApiKeys.modelOverride, baseUrl: userApiKeys.baseUrl })
      .from(userApiKeys).where(and(eq(userApiKeys.userId, session.user.id), eq(userApiKeys.isActive, true)))

    const available = isAIAvailable()
    const enabledModels = getEnabledModels()
    const availableProviders = getAvailableProviders()

    const baseModels = AI_MODELS.filter((m) => m.enabled && isProviderAvailable(m.provider))
      .map((m) => ({ ...m, available: true, providerConfigured: true, userKeyId: null }))

    const userKeyModels = savedKeys.map((key) => ({
      id: key.modelOverride || PROVIDER_DEFAULT_MODELS[key.provider] || key.provider,
      name: key.label, provider: key.provider, brandName: undefined, contextWindow: 200000,
      description: `Your ${key.provider} key`, enabled: true, available: true, providerConfigured: true, userKeyId: key.id,
    }))

    const allModels = [...baseModels, ...userKeyModels]
    const defaultModel = allModels.find((m) => m.available)?.id || "compound-beta"

    return c.json({
      available, activeProvider: AI_CONFIG.provider, availableProviders, models: enabledModels, allModels, defaultModel, modes: AI_MODE_CONFIG,
      config: { maxTokensPerRequest: AI_CONFIG.features.maxTokensPerRequest, streamingEnabled: AI_CONFIG.features.streamingEnabled, ollamaEnabled: AI_CONFIG.ollama.enabled },
    })
  } catch {
    return c.json({ error: "Internal server error" }, 500)
  }
})

// POST /ai/actions
app.post("/actions", async (c) => {
  try {
    const session = await getServerSession(c.req.raw)
    if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401)

    const userId = session.user.id
    const rl = rateLimitMemory({ identifier: userId, endpoint: "ai-actions", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) return c.json({ error: "Rate limit exceeded", retryAfter: rl.retryAfter }, 429)

    const ActionSchema = z.discriminatedUnion("type", [
      z.object({ type: z.literal("create_folder"), name: z.string().min(1).max(100), parentId: z.string().nullable().optional() }),
      z.object({ type: z.literal("rename_folder"), folderId: z.string(), newName: z.string().min(1).max(100) }),
      z.object({ type: z.literal("delete_folder"), folderId: z.string() }),
      z.object({ type: z.literal("move_folder"), folderId: z.string(), newParentId: z.string().nullable() }),
      z.object({ type: z.literal("create_page"), name: z.string().min(1).max(200), folderId: z.string(), content: z.string().optional() }),
      z.object({ type: z.literal("rename_page"), pageId: z.string(), newName: z.string().min(1).max(200) }),
      z.object({ type: z.literal("delete_page"), pageId: z.string() }),
      z.object({ type: z.literal("move_page"), pageId: z.string(), newFolderId: z.string() }),
      z.object({ type: z.literal("update_page_content"), pageId: z.string(), content: z.string() }),
      z.object({ type: z.literal("create_todo"), text: z.string().min(1).max(500) }),
      z.object({ type: z.literal("update_todo"), todoId: z.string(), text: z.string().min(1).max(500).optional(), completed: z.boolean().optional() }),
      z.object({ type: z.literal("delete_todo"), todoId: z.string() }),
      z.object({ type: z.literal("complete_todo"), todoId: z.string() }),
    ])

    type Action = z.infer<typeof ActionSchema>

    const folderColors = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6"]
    const getRandomColor = () => folderColors[Math.floor(Math.random() * folderColors.length)]

    async function executeAction(action: Action): Promise<unknown> {
      switch (action.type) {
        case "create_folder": {
          if (action.parentId) {
            const [parent] = await db.select().from(folders).where(and(eq(folders.id, action.parentId), eq(folders.ownerId, userId)))
            if (!parent) throw new Error("Parent folder not found")
          }
          const [newFolder] = await db.insert(folders).values({ name: action.name, ownerId: userId, parentId: action.parentId || null, color: getRandomColor(), sortOrder: 0 }).returning()
          return { folder: newFolder }
        }
        case "rename_folder": {
          const [folder] = await db.select().from(folders).where(and(eq(folders.id, action.folderId), eq(folders.ownerId, userId)))
          if (!folder) throw new Error("Folder not found")
          const [updated] = await db.update(folders).set({ name: action.newName, updatedAt: new Date() }).where(eq(folders.id, action.folderId)).returning()
          return { folder: updated }
        }
        case "delete_folder": {
          const [folder] = await db.select().from(folders).where(and(eq(folders.id, action.folderId), eq(folders.ownerId, userId)))
          if (!folder) throw new Error("Folder not found")
          await db.delete(pages).where(eq(pages.folderId, action.folderId))
          await db.delete(folders).where(eq(folders.id, action.folderId))
          return { deleted: true }
        }
        case "move_folder": {
          const [folder] = await db.select().from(folders).where(and(eq(folders.id, action.folderId), eq(folders.ownerId, userId)))
          if (!folder) throw new Error("Folder not found")
          if (action.newParentId) {
            const [parent] = await db.select().from(folders).where(and(eq(folders.id, action.newParentId), eq(folders.ownerId, userId)))
            if (!parent) throw new Error("Target parent folder not found")
            if (action.newParentId === action.folderId) throw new Error("Cannot move folder into itself")
          }
          const [updated] = await db.update(folders).set({ parentId: action.newParentId, updatedAt: new Date() }).where(eq(folders.id, action.folderId)).returning()
          return { folder: updated }
        }
        case "create_page": {
          const [folder] = await db.select().from(folders).where(and(eq(folders.id, action.folderId), eq(folders.ownerId, userId)))
          if (!folder) throw new Error("Folder not found")
          const [newPage] = await db.insert(pages).values({ name: action.name, folderId: action.folderId, ownerId: userId, content: action.content || "", sortOrder: 0 }).returning()
          return { page: newPage }
        }
        case "rename_page": {
          const [page] = await db.select().from(pages).where(and(eq(pages.id, action.pageId), eq(pages.ownerId, userId)))
          if (!page) throw new Error("Page not found")
          const [updated] = await db.update(pages).set({ name: action.newName, updatedAt: new Date() }).where(eq(pages.id, action.pageId)).returning()
          return { page: updated }
        }
        case "delete_page": {
          const [page] = await db.select().from(pages).where(and(eq(pages.id, action.pageId), eq(pages.ownerId, userId)))
          if (!page) throw new Error("Page not found")
          await db.delete(pages).where(eq(pages.id, action.pageId))
          return { deleted: true }
        }
        case "move_page": {
          const [page] = await db.select().from(pages).where(and(eq(pages.id, action.pageId), eq(pages.ownerId, userId)))
          if (!page) throw new Error("Page not found")
          const [targetFolder] = await db.select().from(folders).where(and(eq(folders.id, action.newFolderId), eq(folders.ownerId, userId)))
          if (!targetFolder) throw new Error("Target folder not found")
          const [updated] = await db.update(pages).set({ folderId: action.newFolderId, updatedAt: new Date() }).where(eq(pages.id, action.pageId)).returning()
          return { page: updated }
        }
        case "update_page_content": {
          const [page] = await db.select().from(pages).where(and(eq(pages.id, action.pageId), eq(pages.ownerId, userId)))
          if (!page) throw new Error("Page not found")
          const [updated] = await db.update(pages).set({ content: action.content, updatedAt: new Date() }).where(eq(pages.id, action.pageId)).returning()
          return { page: updated }
        }
        case "create_todo": {
          const [newTodo] = await db.insert(todos).values({ userId, text: action.text, completed: false }).returning()
          return { todo: newTodo }
        }
        case "update_todo": {
          const [todo] = await db.select().from(todos).where(and(eq(todos.id, action.todoId), eq(todos.userId, userId)))
          if (!todo) throw new Error("Todo not found")
          const updates: { text?: string; completed?: boolean; updatedAt: Date } = { updatedAt: new Date() }
          if (action.text !== undefined) updates.text = action.text
          if (action.completed !== undefined) updates.completed = action.completed
          const [updated] = await db.update(todos).set(updates).where(eq(todos.id, action.todoId)).returning()
          return { todo: updated }
        }
        case "delete_todo": {
          const [todo] = await db.select().from(todos).where(and(eq(todos.id, action.todoId), eq(todos.userId, userId)))
          if (!todo) throw new Error("Todo not found")
          await db.delete(todos).where(eq(todos.id, action.todoId))
          return { deleted: true }
        }
        case "complete_todo": {
          const [todo] = await db.select().from(todos).where(and(eq(todos.id, action.todoId), eq(todos.userId, userId)))
          if (!todo) throw new Error("Todo not found")
          const [updated] = await db.update(todos).set({ completed: true, updatedAt: new Date() }).where(eq(todos.id, action.todoId)).returning()
          return { todo: updated }
        }
        default:
          throw new Error("Unknown action type")
      }
    }

    const body = await c.req.json()
    const { actions } = z.object({ actions: z.array(ActionSchema) }).parse(body)

    const results: { action: Action; success: boolean; error?: string; result?: unknown }[] = []
    for (const action of actions) {
      try {
        const result = await executeAction(action)
        results.push({ action, success: true, result })
      } catch (error) {
        results.push({ action, success: false, error: error instanceof Error ? error.message : "Action failed" })
      }
    }

    return c.json({ success: results.every(r => r.success), results })
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: "Invalid action format", details: error.issues }, 400)
    console.error("AI actions error:", error)
    return c.json({ error: error instanceof Error ? error.message : "Internal server error" }, 500)
  }
})

export default app

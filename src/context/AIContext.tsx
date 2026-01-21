"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"
import type { AIModel, AIMode, AIProvider, AIStreamChunk } from "@/types/ai"

interface AIModelsResponse {
  available: boolean
  activeProvider: AIProvider
  availableProviders: AIProvider[]
  models: AIModel[]
  allModels: AIModel[]
  modes: Record<AIMode, { label: string; description: string; icon: string }>
  config: {
    maxTokensPerRequest: number
    streamingEnabled: boolean
    ollamaEnabled: boolean
  }
}

interface AIGenerationState {
  isGenerating: boolean
  currentPrompt: string | null
  currentMode: AIMode | null
  response: string
  error: string | null
  tokensUsed: number | null
}

interface AIContextType {
  // AI availability and configuration
  isAvailable: boolean
  isLoading: boolean
  activeProvider: AIProvider | null
  availableProviders: AIProvider[]
  models: AIModel[]
  allModels: AIModel[]
  modes: Record<AIMode, { label: string; description: string; icon: string }> | null
  config: AIModelsResponse['config'] | null

  // Selected model
  selectedModel: string | null
  setSelectedModel: (modelId: string) => void

  // Generation state
  generation: AIGenerationState

  // AI Panel state
  isPanelOpen: boolean
  panelMode: AIMode
  panelContext: string
  openPanel: (mode?: AIMode, context?: string) => void
  closePanel: () => void

  // Actions
  generate: (options: {
    pageId: string
    prompt: string
    mode: AIMode
    model?: string
    context?: string
  }) => Promise<string>
  cancelGeneration: () => void
  clearGeneration: () => void
  refetchModels: () => Promise<void>
}

const AIContext = createContext<AIContextType | null>(null)

const initialGenerationState: AIGenerationState = {
  isGenerating: false,
  currentPrompt: null,
  currentMode: null,
  response: "",
  error: null,
  tokensUsed: null,
}

export function AIProvider({ children }: { children: ReactNode }) {
  // AI configuration state
  const [isLoading, setIsLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(false)
  const [activeProvider, setActiveProvider] = useState<AIProvider | null>(null)
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([])
  const [models, setModels] = useState<AIModel[]>([])
  const [allModels, setAllModels] = useState<AIModel[]>([])
  const [modes, setModes] = useState<Record<AIMode, { label: string; description: string; icon: string }> | null>(null)
  const [config, setConfig] = useState<AIModelsResponse['config'] | null>(null)

  // Selected model
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  // Generation state
  const [generation, setGeneration] = useState<AIGenerationState>(initialGenerationState)

  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState<AIMode>("answer")
  const [panelContext, setPanelContext] = useState("")

  // Abort controller for cancelling requests
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  // Fetch AI models and configuration
  const fetchModels = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/ai/models")

      if (!res.ok) {
        if (res.status === 401) {
          // User not logged in
          setIsAvailable(false)
          setIsLoading(false)
          return
        }
        throw new Error("Failed to fetch AI models")
      }

      const data: AIModelsResponse = await res.json()

      setIsAvailable(data.available)
      setActiveProvider(data.activeProvider)
      setAvailableProviders(data.availableProviders)
      setModels(data.models)
      setAllModels(data.allModels)
      setModes(data.modes)
      setConfig(data.config)

      // Set default model if not already set
      if (!selectedModel && data.models.length > 0) {
        setSelectedModel(data.models[0].id)
      }
    } catch (err) {
      console.error("Error fetching AI models:", err)
      setIsAvailable(false)
    } finally {
      setIsLoading(false)
    }
  }, [selectedModel])

  // Fetch models on mount
  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  // Listen for openAIPanel events from slash menu
  useEffect(() => {
    const handleOpenPanel = (event: CustomEvent<{ mode: AIMode; context?: string }>) => {
      openPanel(event.detail.mode, event.detail.context)
    }

    window.addEventListener("openAIPanel", handleOpenPanel as EventListener)
    return () => {
      window.removeEventListener("openAIPanel", handleOpenPanel as EventListener)
    }
  }, [])

  const openPanel = useCallback((mode: AIMode = "answer", context: string = "") => {
    setPanelMode(mode)
    setPanelContext(context)
    setIsPanelOpen(true)
  }, [])

  const closePanel = useCallback(() => {
    setIsPanelOpen(false)
    setPanelContext("")
  }, [])

  const generate = useCallback(async (options: {
    pageId: string
    prompt: string
    mode: AIMode
    model?: string
    context?: string
  }): Promise<string> => {
    const { pageId, prompt, mode, model, context } = options

    // Cancel any existing generation
    if (abortController) {
      abortController.abort()
    }

    const controller = new AbortController()
    setAbortController(controller)

    setGeneration({
      isGenerating: true,
      currentPrompt: prompt,
      currentMode: mode,
      response: "",
      error: null,
      tokensUsed: null,
    })

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          prompt,
          mode,
          model: model || selectedModel,
          context,
          stream: config?.streamingEnabled ?? true,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Generation failed")
      }

      // Handle streaming response
      if (config?.streamingEnabled && res.headers.get("content-type")?.includes("text/event-stream")) {
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ""

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data: AIStreamChunk = JSON.parse(line.slice(6))

                  if (data.type === "chunk" && data.content) {
                    fullResponse += data.content
                    setGeneration(prev => ({
                      ...prev,
                      response: fullResponse,
                    }))
                  } else if (data.type === "done") {
                    setGeneration(prev => ({
                      ...prev,
                      isGenerating: false,
                      tokensUsed: data.tokensUsed || null,
                    }))
                  } else if (data.type === "error") {
                    throw new Error(data.error || "Stream error")
                  }
                } catch (parseError) {
                  // Skip invalid JSON
                }
              }
            }
          }
        }

        return fullResponse
      } else {
        // Non-streaming response
        const data = await res.json()
        setGeneration({
          isGenerating: false,
          currentPrompt: prompt,
          currentMode: mode,
          response: data.content,
          error: null,
          tokensUsed: data.tokensUsed,
        })
        return data.content
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setGeneration(prev => ({
          ...prev,
          isGenerating: false,
          error: "Generation cancelled",
        }))
        return ""
      }

      const errorMessage = err instanceof Error ? err.message : "Generation failed"
      setGeneration(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage,
      }))
      throw err
    } finally {
      setAbortController(null)
    }
  }, [abortController, selectedModel, config?.streamingEnabled])

  const cancelGeneration = useCallback(() => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
  }, [abortController])

  const clearGeneration = useCallback(() => {
    setGeneration(initialGenerationState)
  }, [])

  return (
    <AIContext.Provider
      value={{
        isAvailable,
        isLoading,
        activeProvider,
        availableProviders,
        models,
        allModels,
        modes,
        config,
        selectedModel,
        setSelectedModel,
        generation,
        isPanelOpen,
        panelMode,
        panelContext,
        openPanel,
        closePanel,
        generate,
        cancelGeneration,
        clearGeneration,
        refetchModels: fetchModels,
      }}
    >
      {children}
    </AIContext.Provider>
  )
}

export function useAI() {
  const context = useContext(AIContext)
  if (!context) {
    throw new Error("useAI must be used within an AIProvider")
  }
  return context
}

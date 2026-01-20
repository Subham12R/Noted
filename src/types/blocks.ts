// Block-based content model for AI features
export interface Block {
  id: string
  type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote"
  content: string | CanvasSnapshot | null
  attrs?: BlockAttrs
}

export interface BlockAttrs {
  level?: 1 | 2 | 3 | 4 | 5 | 6 // For headings
  language?: string // For code blocks
  listType?: "bullet" | "ordered" | "task" // For lists
  checked?: boolean // For task list items
  alt?: string // For images
  src?: string // For images
  aiPrompt?: string // For AI blocks - the prompt used
  aiModel?: string // For AI blocks - model used
  [key: string]: unknown
}

export interface CanvasSnapshot {
  elements: CanvasElement[]
  appState?: CanvasAppState
  version: number
}

export interface CanvasElement {
  id: string
  type: string
  x: number
  y: number
  width?: number
  height?: number
  [key: string]: unknown
}

export interface CanvasAppState {
  viewBackgroundColor?: string
  zoom?: number
  scrollX?: number
  scrollY?: number
  [key: string]: unknown
}

// Helper to create a new block
export function createBlock(
  type: Block["type"],
  content: Block["content"] = null,
  attrs?: Block["attrs"]
): Block {
  return {
    id: crypto.randomUUID(),
    type,
    content,
    attrs,
  }
}

// Helper to create text block
export function createTextBlock(content: string): Block {
  return createBlock("text", content)
}

// Helper to create heading block
export function createHeadingBlock(content: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 1): Block {
  return createBlock("heading", content, { level })
}

// Helper to create canvas block
export function createCanvasBlock(snapshot: CanvasSnapshot): Block {
  return createBlock("canvas", snapshot)
}

// Helper to create AI block
export function createAIBlock(content: string, prompt: string, model?: string): Block {
  return createBlock("ai", content, { aiPrompt: prompt, aiModel: model })
}

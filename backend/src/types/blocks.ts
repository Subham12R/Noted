export interface Block {
  id: string
  type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote"
  content: string | CanvasSnapshot | null
  attrs?: BlockAttrs
}

export interface BlockAttrs {
  level?: 1 | 2 | 3 | 4 | 5 | 6
  language?: string
  listType?: "bullet" | "ordered" | "task"
  checked?: boolean
  alt?: string
  src?: string
  aiPrompt?: string
  aiModel?: string
  [key: string]: unknown
}

export interface CanvasSnapshot {
  elements: unknown[]
  appState?: unknown
  version: number   
}

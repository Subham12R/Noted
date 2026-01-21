# Product Requirements Document (PRD)
## Noted AI - Intelligent Note Assistant & Visual Knowledge Mapping

**Version:** 1.0
**Date:** January 21, 2026
**Author:** AI Product Research
**Project:** Noted - Collaborative Note-Taking Application

---

## 1. Executive Summary

### 1.1 Product Vision
Transform Noted from a collaborative note-taking app into an intelligent knowledge management platform that leverages AI to read, understand, and generate content while providing visual representations of document relationships and knowledge graphs.

### 1.2 Key Objectives
1. **Smart Token Generation** - Intelligently process document content to minimize API costs while maximizing context quality
2. **AI-Powered Answers** - Generate contextual responses using proper UI components (not raw text dumps)
3. **Sticky Notes in Modals** - Create quick-capture sticky notes within modal interfaces for annotations and quick thoughts
4. **Visual Knowledge Graphs** - Display folder/page relationships as interactive graph diagrams

---

## 2. Current State Analysis

### 2.1 Existing Infrastructure (Ready for AI)
| Component | Status | Details |
|-----------|--------|---------|
| Block-based content model | ✅ Ready | `src/types/blocks.ts` - supports `ai` block type with `aiPrompt`, `aiModel` attributes |
| AI usage tracking | ✅ Ready | `ai_usage` table tracks monthly requests per user |
| Subscription limits | ✅ Ready | Tier-based AI quotas (Free: 10, Pro: 500, Team: unlimited) |
| Real-time collaboration | ✅ Ready | Y.js + Socket.io infrastructure can sync AI blocks |
| Rich text editor | ✅ Ready | TipTap with custom extensions |
| Database schema | ✅ Ready | `blocks` JSONB field on pages table |

### 2.2 Missing Components
- AI service integration (API calls to LLM providers)
- Smart tokenization and context window management
- AI response streaming
- Sticky note component and modal system
- Graph visualization library and data aggregation
- AI-specific UI components

---

## 3. Feature Specifications

---

## Feature 1: Smart Content Reading & Token Generation

### 3.1.1 Overview
Implement an intelligent content processing system that reads note content, extracts meaningful context, and generates tokens efficiently to minimize API costs while providing high-quality AI interactions.

### 3.1.2 Requirements

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | System shall parse TipTap HTML content into structured blocks | P0 |
| FR-1.2 | System shall implement semantic chunking (not arbitrary character splits) | P0 |
| FR-1.3 | System shall calculate token counts before API calls (using tiktoken or similar) | P0 |
| FR-1.4 | System shall compress/summarize content when exceeding context limits | P1 |
| FR-1.5 | System shall maintain block references for AI responses | P1 |
| FR-1.6 | System shall support multi-page context (current page + related pages) | P2 |

#### Token Optimization Strategy
```
┌─────────────────────────────────────────────────────────────┐
│                    CONTENT PROCESSING PIPELINE              │
├─────────────────────────────────────────────────────────────┤
│  1. Parse HTML → Blocks                                     │
│  2. Classify blocks by importance:                          │
│     - Headings (high weight)                                │
│     - Recent content (high weight)                          │
│     - Code blocks (preserve fully)                          │
│     - Lists/quotes (medium weight)                          │
│     - Body text (standard weight)                           │
│  3. Calculate token budget based on:                        │
│     - User tier limits                                      │
│     - Model context window (e.g., 128K for GPT-4)           │
│     - Reserve tokens for response                           │
│  4. Smart truncation if over budget:                        │
│     - Summarize older sections                              │
│     - Keep headings intact                                  │
│     - Preserve code blocks                                  │
│  5. Generate final prompt with metadata                     │
└─────────────────────────────────────────────────────────────┘
```

#### Data Model Extensions
```typescript
// New types for AI processing
interface TokenBudget {
  total: number           // Max tokens for this request
  prompt: number          // Reserved for system + user prompt
  context: number         // Available for document context
  response: number        // Reserved for AI response
}

interface ProcessedContent {
  blocks: ProcessedBlock[]
  totalTokens: number
  truncated: boolean
  summaryGenerated: boolean
}

interface ProcessedBlock {
  id: string
  type: Block["type"]
  content: string
  tokens: number
  importance: "high" | "medium" | "low"
  included: boolean       // Whether included in final prompt
}
```

### 3.1.3 Technical Implementation

#### API Endpoints
```
POST /api/ai/process-content
  Request: { pageId, includeRelatedPages?: boolean }
  Response: { processedContent: ProcessedContent, tokenBudget: TokenBudget }

POST /api/ai/estimate-tokens
  Request: { content: string, model: string }
  Response: { tokens: number, cost: number }
```

#### Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| `src/lib/ai/tokenizer.ts` | Create | Token counting utilities |
| `src/lib/ai/content-processor.ts` | Create | HTML to blocks, chunking logic |
| `src/lib/ai/context-builder.ts` | Create | Build optimized prompts |
| `src/app/api/ai/process-content/route.ts` | Create | Content processing endpoint |

---

## Feature 2: AI Answer Generation with Component Rendering

### 3.2.1 Overview
Generate AI responses that are rendered using proper UI components rather than raw text. Responses should integrate seamlessly into the editor with appropriate formatting, citations, and interactive elements.

### 3.2.2 Requirements

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | AI responses shall be streamed in real-time (SSE/WebSocket) | P0 |
| FR-2.2 | Responses shall render as proper TipTap blocks (headings, lists, code, etc.) | P0 |
| FR-2.3 | System shall support multiple AI models (commercial and open-source) | P0 |
| FR-2.4 | AI blocks shall show source attribution and confidence | P1 |
| FR-2.5 | Users shall be able to regenerate, edit, or delete AI responses | P0 |
| FR-2.6 | AI shall support different modes: answer, expand, summarize, translate | P1 |
| FR-2.7 | Responses shall include inline citations to source content | P2 |
| FR-2.8 | System shall support self-hosted/local AI models for privacy | P1 |

---

### 3.2.3 Supported AI Models

#### Commercial Models (API-based)
| Provider | Model | Context Window | Best For | Cost |
|----------|-------|----------------|----------|------|
| OpenAI | GPT-4o | 128K | Complex reasoning, code | $5/$15 per 1M tokens |
| OpenAI | GPT-4o-mini | 128K | Fast, cost-effective | $0.15/$0.60 per 1M tokens |
| Anthropic | Claude 3.5 Sonnet | 200K | Long documents, analysis | $3/$15 per 1M tokens |
| Anthropic | Claude 3 Haiku | 200K | Fast responses | $0.25/$1.25 per 1M tokens |
| Google | Gemini 1.5 Pro | 1M | Very long context | $3.50/$10.50 per 1M tokens |
| Google | Gemini 1.5 Flash | 1M | Fast, large context | $0.075/$0.30 per 1M tokens |

#### Open-Source Models (Self-Hosted via Ollama/vLLM)
| Model | Parameters | Context | VRAM Required | Best For |
|-------|------------|---------|---------------|----------|
| **Llama 3.1 70B** | 70B | 128K | 40GB+ | Best open-source quality |
| **Llama 3.1 8B** | 8B | 128K | 8GB | Local development, fast |
| **Mistral Large 2** | 123B | 128K | 80GB+ | Multilingual, reasoning |
| **Mistral 7B** | 7B | 32K | 6GB | Lightweight, fast |
| **Mixtral 8x7B** | 47B (MoE) | 32K | 24GB | Good quality/speed balance |
| **Qwen2.5 72B** | 72B | 128K | 40GB+ | Excellent multilingual |
| **Qwen2.5 7B** | 7B | 128K | 6GB | Lightweight, capable |
| **DeepSeek-V2** | 236B (MoE) | 128K | 40GB | Cost-efficient, strong |
| **Phi-3 Medium** | 14B | 128K | 12GB | Microsoft, efficient |
| **CodeLlama 34B** | 34B | 100K | 20GB | Code-focused tasks |
| **Yi-1.5 34B** | 34B | 200K | 20GB | Long context, Chinese |

#### Specialized Open-Source Models
| Model | Use Case | Notes |
|-------|----------|-------|
| **Nomic Embed Text** | Embeddings | For semantic search & relationships |
| **BGE-M3** | Embeddings | Multilingual embeddings |
| **Whisper Large V3** | Speech-to-text | Voice input for notes |
| **BAAI/bge-reranker** | Reranking | Improve search relevance |

#### Model Selection Strategy
```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MODEL SELECTION FLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User Preference?                                                       │
│       │                                                                 │
│       ├── "Privacy First" ──────► Ollama Local Models                   │
│       │                           • Llama 3.1 8B (default)              │
│       │                           • Mistral 7B (fast)                   │
│       │                           • Qwen2.5 7B (multilingual)           │
│       │                                                                 │
│       ├── "Best Quality" ───────► Commercial APIs                       │
│       │                           • GPT-4o (reasoning)                  │
│       │                           • Claude 3.5 Sonnet (analysis)        │
│       │                                                                 │
│       ├── "Cost Effective" ─────► Budget Options                        │
│       │                           • GPT-4o-mini                         │
│       │                           • Gemini 1.5 Flash                    │
│       │                           • Llama 3.1 8B (local, free)          │
│       │                                                                 │
│       └── "Enterprise" ─────────► Self-Hosted Large                     │
│                                   • Llama 3.1 70B (vLLM)                │
│                                   • Mixtral 8x7B                        │
│                                                                         │
│  Task Type Optimization:                                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Summarize    → Fast models (Llama 8B, GPT-4o-mini, Gemini Flash)│    │
│  │ Expand       → Quality models (Llama 70B, GPT-4o, Claude)       │    │
│  │ Code         → CodeLlama 34B, GPT-4o, Claude 3.5                │    │
│  │ Translate    → Qwen2.5, Mistral Large, GPT-4o                   │    │
│  │ Relationships→ Embedding models + small LLM                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2.4 Open-Source Model Recommendations by Use Case

#### For Note Summarization
| Recommendation | Model | Why |
|----------------|-------|-----|
| Best Quality | Llama 3.1 70B | Excellent comprehension, coherent summaries |
| Best Speed | Llama 3.1 8B | Fast, still good quality |
| Best Balance | Mixtral 8x7B | MoE architecture, quality + speed |
| Free Cloud | Groq llama-3.1-8b-instant | Ultra-fast, no cost |

#### For Content Expansion
| Recommendation | Model | Why |
|----------------|-------|-----|
| Best Quality | Llama 3.1 70B / Qwen2.5 72B | Creative, detailed expansion |
| Best for Code | CodeLlama 34B | Code-aware expansion |
| Budget Option | Mistral 7B | Surprisingly good for size |

#### For Translation
| Recommendation | Model | Why |
|----------------|-------|-----|
| Best Quality | Qwen2.5 72B | 29 languages, excellent |
| Best European | Mistral Large 2 | Strong European languages |
| Budget | Qwen2.5 7B | Good multilingual for size |

#### For Relationship Detection (Embeddings)
| Recommendation | Model | Why |
|----------------|-------|-----|
| Best Quality | OpenAI text-embedding-3-large | Industry standard |
| Best Open-Source | BGE-M3 | Multilingual, open |
| Best Local | Nomic Embed Text | Works with Ollama |
| Browser-based | all-MiniLM-L6-v2 | Via @xenova/transformers |

### 3.2.5 Model Provider Code Examples

#### Unified Provider Interface
```typescript
// src/lib/ai/providers/index.ts
import { OpenAI } from 'openai'

export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'groq' | 'together' | 'openrouter'

export interface ProviderConfig {
  provider: AIProvider
  model: string
  apiKey?: string
  baseUrl?: string
}

export function createClient(config: ProviderConfig): OpenAI {
  const baseUrls: Record<AIProvider, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1', // Use Anthropic SDK instead
    ollama: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    groq: 'https://api.groq.com/openai/v1',
    together: 'https://api.together.xyz/v1',
    openrouter: 'https://openrouter.ai/api/v1',
  }

  return new OpenAI({
    apiKey: config.apiKey || getApiKey(config.provider),
    baseURL: config.baseUrl || baseUrls[config.provider],
  })
}
```

#### Ollama-Specific Integration
```typescript
// src/lib/ai/providers/ollama.ts
import { Ollama } from 'ollama'

const ollama = new Ollama({
  host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
})

export async function generateWithOllama(
  prompt: string,
  model: string = 'llama3.1:8b',
  stream: boolean = true
) {
  if (stream) {
    return ollama.chat({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    })
  }

  return ollama.chat({
    model,
    messages: [{ role: 'user', content: prompt }],
  })
}

export async function listLocalModels() {
  const response = await ollama.list()
  return response.models.map(m => ({
    name: m.name,
    size: m.size,
    modified: m.modified_at,
  }))
}

export async function pullModel(modelName: string) {
  return ollama.pull({ model: modelName, stream: true })
}
```

#### Vercel AI SDK Integration (Recommended)
```typescript
// src/lib/ai/stream-handler.ts
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'

// Works with any OpenAI-compatible API
const ollama = createOpenAI({
  baseURL: process.env.OLLAMA_BASE_URL + '/v1',
  apiKey: 'ollama', // Ollama doesn't need a real key
})

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

export async function generateAIResponse(
  prompt: string,
  provider: 'ollama' | 'groq' | 'openai' = 'ollama',
  model?: string
) {
  const providers = {
    ollama: ollama(model || 'llama3.1:8b'),
    groq: groq(model || 'llama-3.1-8b-instant'),
    openai: createOpenAI()(model || 'gpt-4o-mini'),
  }

  const result = await streamText({
    model: providers[provider],
    prompt,
  })

  return result.toDataStreamResponse()
}
```

#### AI Response Component Structure
```typescript
interface AIResponse {
  id: string
  mode: "answer" | "expand" | "summarize" | "translate" | "explain"
  prompt: string
  model: string
  blocks: Block[]           // Structured response as blocks
  citations: Citation[]     // References to source content
  metadata: {
    tokensUsed: number
    generatedAt: Date
    processingTime: number
    confidence?: number
  }
}

interface Citation {
  id: string
  blockId: string           // Reference to source block
  pageId: string
  excerpt: string
  relevance: number
}
```

#### UI Components for AI Responses
```
┌─────────────────────────────────────────────────────────────┐
│  AI Response Block                                    [···] │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Mode Badge ─┐  ┌─ Model Badge ─┐                        │
│  │  ✨ Answer   │  │  GPT-4        │                        │
│  └──────────────┘  └───────────────┘                        │
│                                                             │
│  [Rendered content using proper typography:]                │
│                                                             │
│  ## Heading (rendered as H2)                                │
│                                                             │
│  Paragraph text with **bold** and *italic* formatting.      │
│                                                             │
│  • Bullet point 1                                           │
│  • Bullet point 2                                           │
│                                                             │
│  ```javascript                                              │
│  const example = "code block";                              │
│  ```                                                        │
│                                                             │
│  ┌─ Citation ───────────────────────────────────────────┐   │
│  │ 📎 Referenced from "Project Notes" - Block #3        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [🔄 Regenerate] [✏️ Edit] [📋 Copy] [🗑️ Delete]            │
│  ───────────────────────────────────────────────────────────│
│  Generated in 2.3s • 847 tokens • Jan 21, 2026 at 3:45 PM   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2.3 Technical Implementation

#### API Endpoints
```
POST /api/ai/generate
  Request: {
    pageId: string,
    prompt: string,
    mode: "answer" | "expand" | "summarize" | "translate",
    model?: string,
    stream?: boolean
  }
  Response: SSE stream of { type: "chunk" | "done", content: string, blocks?: Block[] }

GET /api/ai/models
  Response: { models: AIModel[] }

DELETE /api/ai/response/:id
  Response: { success: boolean }
```

#### TipTap Extension for AI Blocks
```typescript
// Custom TipTap node for AI responses
const AIResponseNode = Node.create({
  name: 'aiResponse',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      responseId: { default: null },
      mode: { default: 'answer' },
      model: { default: 'gpt-4' },
      prompt: { default: '' },
      generatedAt: { default: null },
      tokensUsed: { default: 0 },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(AIResponseComponent)
  }
})
```

#### Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| `src/lib/ai/providers/` | Create | AI provider adapters (OpenAI, Anthropic) |
| `src/lib/ai/stream-handler.ts` | Create | SSE streaming utilities |
| `src/components/editor/AIResponseBlock.tsx` | Create | AI response UI component |
| `src/components/tiptap-node/ai-response-node.ts` | Create | TipTap extension |
| `src/app/api/ai/generate/route.ts` | Create | Generation endpoint |
| `src/hooks/use-ai-generation.ts` | Create | React hook for AI generation |

---

## Feature 3: Sticky Notes in Modals

### 3.3.1 Overview
Create a sticky note system that allows users to quickly capture thoughts, annotations, and ideas within modal interfaces. These sticky notes can be attached to specific pages, blocks, or exist as standalone quick-capture items.

### 3.3.2 Requirements

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Users shall create sticky notes via keyboard shortcut (Ctrl/Cmd + Shift + N) | P0 |
| FR-3.2 | Sticky notes shall appear in a modal overlay | P0 |
| FR-3.3 | Sticky notes shall support color coding (6+ colors) | P1 |
| FR-3.4 | Sticky notes shall be attachable to specific blocks or pages | P1 |
| FR-3.5 | Users shall view all sticky notes in a dedicated "Noteboard" view | P0 |
| FR-3.6 | Sticky notes shall sync in real-time across collaborators | P1 |
| FR-3.7 | AI shall be able to generate sticky note summaries | P2 |

#### Data Model
```typescript
interface StickyNote {
  id: string
  ownerId: string
  content: string
  color: StickyNoteColor
  attachedTo?: {
    type: "page" | "block" | "folder"
    id: string
  }
  position?: {
    x: number
    y: number
  }
  size: "small" | "medium" | "large"
  isPinned: boolean
  createdAt: Date
  updatedAt: Date
}

type StickyNoteColor =
  | "yellow"   // #FEF3C7
  | "green"    // #D1FAE5
  | "blue"     // #DBEAFE
  | "pink"     // #FCE7F3
  | "purple"   // #EDE9FE
  | "orange"   // #FFEDD5
```

#### Database Schema Addition
```sql
CREATE TABLE sticky_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  color VARCHAR(20) NOT NULL DEFAULT 'yellow',
  attached_to_type VARCHAR(20),  -- 'page', 'block', 'folder'
  attached_to_id UUID,
  position_x INTEGER,
  position_y INTEGER,
  size VARCHAR(10) NOT NULL DEFAULT 'medium',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sticky_notes_owner ON sticky_notes(owner_id);
CREATE INDEX idx_sticky_notes_attached ON sticky_notes(attached_to_type, attached_to_id);
```

#### UI Design
```
┌─────────────────────────────────────────────────────────────┐
│                    STICKY NOTE MODAL                   [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │    │
│  │ ░░                                               ░░ │    │
│  │ ░░   Type your note here...                      ░░ │    │
│  │ ░░                                               ░░ │    │
│  │ ░░                                               ░░ │    │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Color:  [🟡] [🟢] [🔵] [🩷] [🟣] [🟠]                       │
│                                                             │
│  Attach to: [Current Page ▼]                                │
│                                                             │
│  Size: ( ) Small  (•) Medium  ( ) Large                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [Cancel]  [💾 Save Sticky Note] │
└─────────────────────────────────────────────────────────────┘
```

#### Noteboard View (Grid Layout)
```
┌─────────────────────────────────────────────────────────────┐
│  📌 Noteboard                      [+ New Note] [Filter ▼]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 🟡       │  │ 🔵       │  │ 🩷       │  │ 🟢       │    │
│  │ Remember │  │ API idea │  │ Bug fix  │  │ Feature  │    │
│  │ to check │  │ for the  │  │ needed   │  │ request  │    │
│  │ tests    │  │ auth...  │  │ in...    │  │ from...  │    │
│  │          │  │          │  │          │  │          │    │
│  │ 📎 login │  │ 📎 none  │  │ 📎 api/  │  │ 📎 UI    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                             │
│  ┌──────────┐  ┌──────────┐                                 │
│  │ 🟣       │  │ 🟠       │                                 │
│  │ Meeting  │  │ Design   │                                 │
│  │ notes    │  │ feedback │                                 │
│  │ ...      │  │ ...      │                                 │
│  │          │  │          │                                 │
│  │ 📎 Q1    │  │ 📎 UI    │                                 │
│  └──────────┘  └──────────┘                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3.3 Technical Implementation

#### API Endpoints
```
GET    /api/sticky-notes          - List user's sticky notes (with filters)
POST   /api/sticky-notes          - Create new sticky note
GET    /api/sticky-notes/:id      - Get single sticky note
PUT    /api/sticky-notes/:id      - Update sticky note
DELETE /api/sticky-notes/:id      - Delete sticky note
GET    /api/sticky-notes/attached/:type/:id - Get notes attached to entity
```

#### Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| `src/db/schema.ts` | Modify | Add sticky_notes table |
| `src/components/sticky-notes/StickyNote.tsx` | Create | Sticky note component |
| `src/components/sticky-notes/StickyNoteModal.tsx` | Create | Creation/edit modal |
| `src/components/sticky-notes/Noteboard.tsx` | Create | Grid view component |
| `src/app/api/sticky-notes/route.ts` | Create | CRUD endpoints |
| `src/app/noteboard/page.tsx` | Modify | Integrate noteboard |
| `src/context/StickyNotesContext.tsx` | Create | State management |
| `src/hooks/use-sticky-notes.ts` | Create | React hooks |

---

## Feature 4: Visual Graph Diagrams of Folder/Page Relations

### 3.4.1 Overview
Create interactive visual graph diagrams that display the relationships between folders, pages, and their connections. This provides users with a bird's-eye view of their knowledge structure and helps discover connections between notes.

### 3.4.2 Requirements

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | System shall render folder/page hierarchy as interactive graph | P0 |
| FR-4.2 | Nodes shall be color-coded by type (folder vs page) | P0 |
| FR-4.3 | Users shall zoom, pan, and navigate the graph | P0 |
| FR-4.4 | Clicking a node shall navigate to that folder/page | P1 |
| FR-4.5 | Graph shall show collaboration indicators (shared items) | P1 |
| FR-4.6 | AI shall detect and visualize content-based relationships | P2 |
| FR-4.7 | Graph shall support different layout algorithms (tree, force, radial) | P2 |
| FR-4.8 | Users shall filter graph by date, type, or search term | P1 |

#### Graph Data Model
```typescript
interface GraphNode {
  id: string
  type: "folder" | "page" | "user"
  label: string
  color: string
  size: number              // Based on content size or importance
  metadata: {
    createdAt: Date
    updatedAt: Date
    isShared: boolean
    collaboratorCount: number
    contentPreview?: string
  }
}

interface GraphEdge {
  id: string
  source: string            // Node ID
  target: string            // Node ID
  type: "hierarchy" | "reference" | "collaboration" | "ai-suggested"
  weight: number            // Edge strength/importance
  label?: string
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  metadata: {
    totalNodes: number
    totalEdges: number
    generatedAt: Date
  }
}
```

#### Graph Visualization Types

**1. Hierarchy View (Tree Layout)**
```
                         ┌─────────┐
                         │  Root   │
                         │ Folder  │
                         └────┬────┘
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌─────────┐     ┌─────────┐     ┌─────────┐
        │ Work    │     │ Personal│     │ Archive │
        │ Folder  │     │ Folder  │     │ Folder  │
        └────┬────┘     └────┬────┘     └─────────┘
        ┌────┴────┐          │
        ▼         ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │ Page 1 │ │ Page 2 │ │ Page 3 │
   └────────┘ └────────┘ └────────┘
```

**2. Knowledge Graph (Force-Directed Layout)**
```
                    ┌────────┐
                    │ API    │
              ╱─────│ Design │─────╲
             ╱      └────────┘      ╲
    ┌────────┐                    ┌────────┐
    │ Auth   │                    │ User   │
    │ System │────────────────────│ Roles  │
    └────────┘                    └────────┘
             ╲      ┌────────┐      ╱
              ╲─────│Database│─────╱
                    │ Schema │
                    └────────┘
```

**3. Radial View**
```
                         Page 3
                           │
              Page 2 ──────┼────── Page 4
                     ╲     │     ╱
                      ╲    │    ╱
                       ┌───────┐
              Page 1 ──│Folder │── Page 5
                       └───────┘
                      ╱    │    ╲
                     ╱     │     ╲
              Page 8 ──────┼────── Page 6
                           │
                         Page 7
```

### 3.4.3 Technical Implementation

#### Recommended Library: React Flow or D3.js
```typescript
// Using React Flow for interactive graphs
import ReactFlow, {
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
} from 'reactflow'

// Custom node types
const nodeTypes = {
  folder: FolderNode,
  page: PageNode,
  user: UserNode,
}
```

#### API Endpoints
```
GET /api/graph/data
  Query: {
    rootId?: string,         // Start from specific folder
    depth?: number,          // How deep to traverse
    includeShared?: boolean,
    includeAiRelations?: boolean
  }
  Response: GraphData

GET /api/graph/relations/:pageId
  Response: { relatedPages: GraphNode[], edges: GraphEdge[] }

POST /api/graph/ai-analyze
  Request: { pageIds: string[] }
  Response: { suggestedEdges: GraphEdge[] }
```

#### AI-Powered Relationship Detection
```typescript
interface AIRelationshipAnalysis {
  sourcePageId: string
  targetPageId: string
  relationshipType: "similar-topic" | "references" | "continuation" | "related"
  confidence: number        // 0-1
  explanation: string       // Why AI thinks they're related
  keywords: string[]        // Shared concepts
}
```

#### Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| `src/components/graph/KnowledgeGraph.tsx` | Create | Main graph component |
| `src/components/graph/GraphNode.tsx` | Create | Custom node renderers |
| `src/components/graph/GraphControls.tsx` | Create | Zoom/pan/filter controls |
| `src/components/graph/GraphSidebar.tsx` | Create | Node details sidebar |
| `src/app/api/graph/route.ts` | Create | Graph data endpoints |
| `src/lib/graph/layout-algorithms.ts` | Create | Layout calculations |
| `src/lib/ai/relationship-analyzer.ts` | Create | AI relationship detection |
| `src/app/graph/page.tsx` | Create | Graph view page |
| `src/hooks/use-graph.ts` | Create | Graph state management |

---

## 4. User Stories

### Epic 1: Smart AI Assistance
| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-1.1 | As a user, I want to ask questions about my notes so that I can quickly find information | AI reads current page, provides relevant answer with citations |
| US-1.2 | As a user, I want AI to summarize long notes so that I can review content faster | AI generates concise summary preserving key points |
| US-1.3 | As a user, I want AI to expand my bullet points so that I can flesh out ideas quickly | AI generates detailed content from brief inputs |
| US-1.4 | As a user, I want to see AI responses formatted properly so that content is readable | Responses render as headings, lists, code blocks appropriately |

### Epic 2: Quick Capture with Sticky Notes
| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-2.1 | As a user, I want to quickly capture thoughts without leaving my current page | Keyboard shortcut opens modal, saves note in <3 clicks |
| US-2.2 | As a user, I want to organize sticky notes by color so that I can categorize ideas | 6+ color options available, filter by color works |
| US-2.3 | As a user, I want to attach sticky notes to specific pages so that context is preserved | Attachment dropdown shows pages, link persists |
| US-2.4 | As a user, I want to view all my sticky notes in one place so that I can review ideas | Noteboard page shows grid of all notes |

### Epic 3: Visual Knowledge Mapping
| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-3.1 | As a user, I want to see my folder structure as a visual graph so that I understand organization | Tree layout shows all folders/pages with proper hierarchy |
| US-3.2 | As a user, I want to click graph nodes to navigate so that exploration is intuitive | Single click navigates to folder/page |
| US-3.3 | As a user, I want AI to suggest related pages so that I discover connections | AI analyzes content, shows dotted lines for suggested relations |
| US-3.4 | As a user, I want to zoom and pan the graph so that I can explore large structures | Mouse wheel zooms, drag pans, minimap available |

---

## 5. Technical Architecture

### 5.1 System Architecture
```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Next.js)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   TipTap     │  │   Sticky     │  │   Graph      │  │    AI       │  │
│  │   Editor     │  │   Notes      │  │   View       │  │  Components │  │
│  │              │  │   Modal      │  │  (ReactFlow) │  │             │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │
│         │                 │                 │                  │         │
│         └─────────────────┴─────────────────┴──────────────────┘         │
│                                    │                                     │
│                         ┌──────────┴──────────┐                          │
│                         │  Context Providers   │                          │
│                         │  (Notes, AI, Graph)  │                          │
│                         └──────────┬──────────┘                          │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │
                          ┌──────────┴──────────┐
                          │    API Routes        │
                          │   (Next.js API)      │
                          └──────────┬──────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          ▼                          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   AI Service     │      │    PostgreSQL    │      │      Redis       │
│  ┌────────────┐  │      │   (Supabase)     │      │  (Collaboration) │
│  │  OpenAI    │  │      │                  │      │                  │
│  │  Anthropic │  │      │  • Users         │      │  • Y.js State    │
│  │  (Claude)  │  │      │  • Pages         │      │  • Sessions      │
│  └────────────┘  │      │  • Folders       │      │  • Presence      │
│                  │      │  • Sticky Notes  │      │                  │
│  Token Counter   │      │  • AI Usage      │      │                  │
│  Stream Handler  │      │  • Graph Cache   │      │                  │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

### 5.2 AI Service Architecture
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AI SERVICE LAYER                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│  │  Content        │     │   Token         │     │   Response      │   │
│  │  Processor      │────▶│   Manager       │────▶│   Generator     │   │
│  │                 │     │                 │     │                 │   │
│  │  • HTML Parse   │     │  • Count        │     │  • Stream       │   │
│  │  • Block Extract│     │  • Budget       │     │  • Format       │   │
│  │  • Importance   │     │  • Optimize     │     │  • Validate     │   │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘   │
│           │                       │                       │             │
│           └───────────────────────┼───────────────────────┘             │
│                                   │                                     │
│                         ┌─────────┴─────────┐                           │
│                         │  Provider Router   │                           │
│                         │  (Unified API)     │                           │
│                         └─────────┬─────────┘                           │
│                                   │                                     │
│    ┌──────────────────────────────┼──────────────────────────────┐     │
│    │              │               │               │              │     │
│    ▼              ▼               ▼               ▼              ▼     │
│ ┌────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐  │
│ │ OpenAI │  │ Anthropic│  │  Ollama   │  │  vLLM    │  │  Groq     │  │
│ │        │  │ (Claude) │  │  (Local)  │  │ (Server) │  │  (Fast)   │  │
│ └────────┘  └──────────┘  └───────────┘  └──────────┘  └───────────┘  │
│                                │                                       │
│              ┌─────────────────┼─────────────────┐                     │
│              ▼                 ▼                 ▼                     │
│         ┌─────────┐      ┌──────────┐     ┌───────────┐               │
│         │ Llama   │      │ Mistral  │     │  Qwen     │               │
│         │ 3.1     │      │ 7B/8x7B  │     │  2.5      │               │
│         └─────────┘      └──────────┘     └───────────┘               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Open-Source AI Infrastructure Options

#### Option 1: Ollama (Recommended for Local Development)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OLLAMA SETUP                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Installation:                                                          │
│  $ curl -fsSL https://ollama.com/install.sh | sh                        │
│  $ ollama pull llama3.1:8b                                              │
│  $ ollama pull mistral:7b                                               │
│  $ ollama pull nomic-embed-text                                         │
│                                                                         │
│  API Endpoint: http://localhost:11434                                   │
│                                                                         │
│  Docker Compose Addition:                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ollama:                                                         │   │
│  │    image: ollama/ollama:latest                                   │   │
│  │    ports:                                                        │   │
│  │      - "11434:11434"                                             │   │
│  │    volumes:                                                      │   │
│  │      - ollama_data:/root/.ollama                                 │   │
│  │    deploy:                                                       │   │
│  │      resources:                                                  │   │
│  │        reservations:                                             │   │
│  │          devices:                                                │   │
│  │            - driver: nvidia                                      │   │
│  │              count: 1                                            │   │
│  │              capabilities: [gpu]                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Option 2: vLLM (Production Self-Hosted)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         vLLM SETUP                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  For high-throughput production deployments                             │
│                                                                         │
│  Docker:                                                                │
│  $ docker run --gpus all -p 8000:8000 \                                 │
│      vllm/vllm-openai:latest \                                          │
│      --model meta-llama/Llama-3.1-8B-Instruct                           │
│                                                                         │
│  API: OpenAI-compatible at http://localhost:8000/v1                     │
│                                                                         │
│  Benefits:                                                              │
│  • 2-4x faster than Ollama for batch requests                           │
│  • PagedAttention for efficient memory                                  │
│  • OpenAI-compatible API (drop-in replacement)                          │
│  • Continuous batching for high concurrency                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Option 3: LM Studio (Desktop Users)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                      LM STUDIO SETUP                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  For users who prefer a GUI:                                            │
│  1. Download from https://lmstudio.ai                                   │
│  2. Search and download models (GGUF format)                            │
│  3. Start local server (OpenAI-compatible)                              │
│                                                                         │
│  API Endpoint: http://localhost:1234/v1                                 │
│                                                                         │
│  Recommended Models:                                                    │
│  • TheBloke/Llama-3.1-8B-Instruct-GGUF (Q4_K_M)                         │
│  • TheBloke/Mistral-7B-Instruct-v0.2-GGUF                               │
│  • TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Option 4: Groq (Free Tier, Ultra-Fast)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GROQ CLOUD                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Free tier with rate limits, incredibly fast inference                  │
│                                                                         │
│  Available Models:                                                      │
│  • llama-3.1-70b-versatile (free)                                       │
│  • llama-3.1-8b-instant (free)                                          │
│  • mixtral-8x7b-32768 (free)                                            │
│  • gemma2-9b-it (free)                                                  │
│                                                                         │
│  Speed: ~500 tokens/second (10x faster than OpenAI)                     │
│  Rate Limit: 30 requests/minute on free tier                            │
│                                                                         │
│  API: OpenAI-compatible at https://api.groq.com/openai/v1               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Option 5: Together AI / OpenRouter (Unified API)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                    UNIFIED OPEN-SOURCE API                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Together AI (https://together.ai)                                      │
│  • Single API for 100+ open-source models                               │
│  • Pay-per-token pricing (often cheaper than OpenAI)                    │
│  • Fine-tuning support                                                  │
│                                                                         │
│  OpenRouter (https://openrouter.ai)                                     │
│  • Unified API for both commercial and open-source                      │
│  • Automatic fallbacks between providers                                │
│  • Free tier available                                                  │
│                                                                         │
│  Both are OpenAI-compatible APIs                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 New Dependencies
```json
{
  "dependencies": {
    // AI & Tokenization (Unified)
    "openai": "^4.x",              // Works with OpenAI, Ollama, vLLM, Groq, Together
    "@anthropic-ai/sdk": "^0.x",   // For Claude direct API
    "tiktoken": "^1.x",            // Token counting (OpenAI models)
    "gpt-tokenizer": "^2.x",       // Token counting (Llama, Mistral)
    "eventsource-parser": "^1.x",  // SSE parsing
    "ai": "^3.x",                  // Vercel AI SDK (unified streaming)

    // Ollama Integration
    "ollama": "^0.5.x",            // Official Ollama client

    // Embeddings (for relationship detection)
    "@xenova/transformers": "^2.x", // Run embedding models in browser/Node

    // Graph Visualization
    "reactflow": "^11.x",          // Interactive graphs
    "@xyflow/react": "^12.x",      // React Flow v12
    "dagre": "^0.8.x",             // Graph layout algorithms
    "d3-force": "^3.x",            // Force-directed layout

    // Sticky Notes
    "framer-motion": "^10.x",      // Animations (if not present)
    "@dnd-kit/core": "^6.x",       // Drag and drop
    "@dnd-kit/sortable": "^7.x"    // Sortable grid
  }
}
```

---

## 6. Database Schema Changes

### 6.1 New Tables

```sql
-- Sticky Notes
CREATE TABLE sticky_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  color VARCHAR(20) NOT NULL DEFAULT 'yellow',
  attached_to_type VARCHAR(20),
  attached_to_id UUID,
  position_x INTEGER,
  position_y INTEGER,
  size VARCHAR(10) NOT NULL DEFAULT 'medium',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- AI Conversations (for context continuity)
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  title VARCHAR(255),
  messages JSONB NOT NULL DEFAULT '[]',
  model VARCHAR(50) NOT NULL,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- AI Generated Content Blocks
CREATE TABLE ai_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  response_content TEXT NOT NULL,
  response_blocks JSONB NOT NULL DEFAULT '[]',
  model VARCHAR(50) NOT NULL,
  tokens_used INTEGER NOT NULL,
  generation_time_ms INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Graph Relationship Cache (AI-detected)
CREATE TABLE graph_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  target_page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  keywords JSONB DEFAULT '[]',
  explanation TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(source_page_id, target_page_id)
);

-- Indexes
CREATE INDEX idx_sticky_notes_owner ON sticky_notes(owner_id);
CREATE INDEX idx_sticky_notes_attached ON sticky_notes(attached_to_type, attached_to_id);
CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_page ON ai_conversations(page_id);
CREATE INDEX idx_ai_blocks_page ON ai_blocks(page_id);
CREATE INDEX idx_graph_relationships_source ON graph_relationships(source_page_id);
CREATE INDEX idx_graph_relationships_target ON graph_relationships(target_page_id);
```

### 6.2 Schema Modifications (Drizzle)

```typescript
// Add to src/db/schema.ts

export const stickyNotes = pgTable("sticky_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  color: varchar("color", { length: 20 }).notNull().default("yellow"),
  attachedToType: varchar("attached_to_type", { length: 20 }),
  attachedToId: uuid("attached_to_id"),
  positionX: integer("position_x"),
  positionY: integer("position_y"),
  size: varchar("size", { length: 10 }).notNull().default("medium"),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  pageId: uuid("page_id").references(() => pages.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }),
  messages: jsonb("messages").notNull().default([]),
  model: varchar("model", { length: 50 }).notNull(),
  totalTokens: integer("total_tokens").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const aiBlocks = pgTable("ai_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").references(() => aiConversations.id, { onDelete: "set null" }),
  prompt: text("prompt").notNull(),
  responseContent: text("response_content").notNull(),
  responseBlocks: jsonb("response_blocks").notNull().default([]),
  model: varchar("model", { length: 50 }).notNull(),
  tokensUsed: integer("tokens_used").notNull(),
  generationTimeMs: integer("generation_time_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const graphRelationships = pgTable("graph_relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourcePageId: uuid("source_page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  targetPageId: uuid("target_page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  relationshipType: varchar("relationship_type", { length: 50 }).notNull(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }).notNull(),
  keywords: jsonb("keywords").default([]),
  explanation: text("explanation"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueRelation: unique().on(table.sourcePageId, table.targetPageId),
}))
```

---

## 7. API Specification

### 7.1 AI Endpoints

#### POST /api/ai/generate
Generate AI response for a prompt.

**Request:**
```typescript
{
  pageId: string
  prompt: string
  mode: "answer" | "expand" | "summarize" | "translate" | "explain"
  model?: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet"
  stream?: boolean
  includeContext?: boolean    // Include page content as context
  conversationId?: string     // Continue existing conversation
}
```

**Response (Stream):**
```typescript
// SSE events
data: { type: "start", conversationId: string }
data: { type: "chunk", content: string }
data: { type: "done", blocks: Block[], tokensUsed: number, generationTime: number }
data: { type: "error", message: string }
```

#### POST /api/ai/process-content
Process page content for AI consumption.

**Request:**
```typescript
{
  pageId: string
  maxTokens?: number
  includeRelatedPages?: boolean
}
```

**Response:**
```typescript
{
  processedContent: {
    blocks: ProcessedBlock[]
    totalTokens: number
    truncated: boolean
  }
  tokenBudget: {
    total: number
    prompt: number
    context: number
    response: number
  }
}
```

### 7.2 Sticky Notes Endpoints

#### GET /api/sticky-notes
List user's sticky notes.

**Query Parameters:**
- `color`: Filter by color
- `attachedTo`: Filter by attachment (e.g., `page:uuid`)
- `isPinned`: Filter pinned only
- `limit`: Pagination limit
- `offset`: Pagination offset

**Response:**
```typescript
{
  notes: StickyNote[]
  total: number
}
```

#### POST /api/sticky-notes
Create new sticky note.

**Request:**
```typescript
{
  content: string
  color?: StickyNoteColor
  attachedTo?: { type: string, id: string }
  position?: { x: number, y: number }
  size?: "small" | "medium" | "large"
}
```

### 7.3 Graph Endpoints

#### GET /api/graph/data
Get graph visualization data.

**Query Parameters:**
- `rootId`: Start from specific folder (default: user's root)
- `depth`: Traversal depth (default: 3)
- `includeShared`: Include shared items
- `includeAiRelations`: Include AI-detected relationships

**Response:**
```typescript
{
  nodes: GraphNode[]
  edges: GraphEdge[]
  metadata: {
    totalNodes: number
    totalEdges: number
    generatedAt: string
  }
}
```

#### POST /api/graph/ai-analyze
Analyze pages for AI-suggested relationships.

**Request:**
```typescript
{
  pageIds: string[]        // Pages to analyze
  regenerate?: boolean     // Force re-analysis
}
```

**Response:**
```typescript
{
  relationships: AIRelationshipAnalysis[]
  tokensUsed: number
}
```

---

## 8. UI/UX Specifications

### 8.1 AI Assistant Panel

**Location:** Right sidebar or floating panel
**Trigger:** Keyboard shortcut (Cmd/Ctrl + J) or toolbar button

```
┌─────────────────────────────────────────┐
│  ✨ AI Assistant                   [×]  │
├─────────────────────────────────────────┤
│  Model: [GPT-4 ▼]                       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Ask about this page...          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Quick Actions:                         │
│  [📝 Summarize] [✨ Expand] [🔄 Rewrite]│
│  [🌐 Translate] [💡 Explain]            │
│                                         │
├─────────────────────────────────────────┤
│  Previous:                              │
│  ┌─────────────────────────────────┐    │
│  │ Q: What are the main points?    │    │
│  │ A: The document covers...       │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 8.2 Sticky Note Creation Flow

1. User presses `Cmd/Ctrl + Shift + N`
2. Modal appears with focus on text input
3. User types note content
4. User optionally selects color and attachment
5. User clicks "Save" or presses `Cmd/Ctrl + Enter`
6. Note saves and toast confirms

### 8.3 Graph View Page

**URL:** `/graph`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [←]  Knowledge Graph                    [🔍 Search] [⚙️] [Full Screen] │
├───────────────────────────────────────────────────────────┬─────────────┤
│                                                           │             │
│                                                           │  Selected:  │
│            [Interactive Graph Canvas]                     │  ─────────  │
│                                                           │  📁 Work    │
│                    ┌───────┐                              │             │
│                    │ Root  │                              │  Contains:  │
│                    └───┬───┘                              │  • 5 pages  │
│              ┌─────────┼─────────┐                        │  • 2 folders│
│              ▼         ▼         ▼                        │             │
│          ┌──────┐ ┌──────┐ ┌──────┐                       │  Created:   │
│          │ Work │ │ Home │ │Ideas │                       │  Jan 15     │
│          └──────┘ └──────┘ └──────┘                       │             │
│                                                           │  [Open →]   │
│                                                           │             │
├───────────────────────────────────────────────────────────┴─────────────┤
│  Layout: [Tree ▼]  Show: [☑ Folders] [☑ Pages] [☐ AI Links]  Zoom: 100% │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Environment Variables

Add to `.env.example`:

```bash
# ============================================
# AI PROVIDER CONFIGURATION
# ============================================

# Default AI Provider: "openai" | "anthropic" | "ollama" | "groq" | "together" | "openrouter"
AI_PROVIDER=ollama

# Default model (provider-specific)
AI_DEFAULT_MODEL=llama3.1:8b

# ============================================
# COMMERCIAL API PROVIDERS (Optional)
# ============================================

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini
GOOGLE_API_KEY=...

# Groq (Free, ultra-fast open-source models)
GROQ_API_KEY=gsk_...

# Together AI (100+ open-source models)
TOGETHER_API_KEY=...

# OpenRouter (Unified API for all providers)
OPENROUTER_API_KEY=sk-or-...

# ============================================
# SELF-HOSTED / LOCAL MODELS
# ============================================

# Ollama (Local - Recommended for development)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.1:8b

# vLLM (Production self-hosted)
VLLM_BASE_URL=http://localhost:8000/v1
VLLM_DEFAULT_MODEL=meta-llama/Llama-3.1-8B-Instruct

# LM Studio (Desktop local)
LMSTUDIO_BASE_URL=http://localhost:1234/v1

# ============================================
# EMBEDDING MODELS (for AI Relationships)
# ============================================

# Embedding provider: "openai" | "ollama" | "local"
EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=nomic-embed-text

# OpenAI Embeddings (if using OpenAI)
# EMBEDDING_MODEL=text-embedding-3-small

# ============================================
# AI LIMITS & RATE LIMITING
# ============================================

AI_MAX_TOKENS_PER_REQUEST=4096
AI_RATE_LIMIT_PER_MINUTE=20
AI_MAX_CONTEXT_TOKENS=8192

# ============================================
# FEATURE FLAGS
# ============================================

ENABLE_AI_FEATURES=true
ENABLE_STICKY_NOTES=true
ENABLE_GRAPH_VIEW=true
ENABLE_AI_RELATIONSHIPS=true

# Privacy mode (only use local models, no external API calls)
AI_PRIVACY_MODE=false
```

### 9.1 Provider Configuration Examples

#### Local-Only Setup (Maximum Privacy)
```bash
AI_PROVIDER=ollama
AI_DEFAULT_MODEL=llama3.1:8b
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=nomic-embed-text
AI_PRIVACY_MODE=true
```

#### Cost-Effective Cloud Setup
```bash
AI_PROVIDER=groq
AI_DEFAULT_MODEL=llama-3.1-8b-instant
GROQ_API_KEY=gsk_...
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=nomic-embed-text
```

#### High-Quality Setup
```bash
AI_PROVIDER=openai
AI_DEFAULT_MODEL=gpt-4o
OPENAI_API_KEY=sk-...
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
```

#### Hybrid Setup (Best of Both)
```bash
# Use local for simple tasks, cloud for complex
AI_PROVIDER=ollama
AI_DEFAULT_MODEL=llama3.1:8b
AI_FALLBACK_PROVIDER=openai
AI_FALLBACK_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up AI service infrastructure
- [ ] Implement token counting and budgeting
- [ ] Create content processor (HTML → Blocks)
- [ ] Add OpenAI/Anthropic provider adapters
- [ ] Basic `/api/ai/generate` endpoint (non-streaming)

### Phase 2: AI Integration (Week 3-4)
- [ ] Implement SSE streaming for responses
- [ ] Create TipTap AI block extension
- [ ] Build AIResponseBlock component
- [ ] Add AI assistant panel UI
- [ ] Implement conversation history

### Phase 3: Sticky Notes (Week 5-6)
- [ ] Add database schema and migrations
- [ ] Create CRUD API endpoints
- [ ] Build StickyNote component
- [ ] Build StickyNoteModal component
- [ ] Implement Noteboard grid view
- [ ] Add keyboard shortcuts

### Phase 4: Graph Visualization (Week 7-8)
- [ ] Set up React Flow
- [ ] Create graph data API
- [ ] Build custom node components
- [ ] Implement layout algorithms
- [ ] Add zoom/pan/navigation controls
- [ ] Create graph page with sidebar

### Phase 5: AI Relationships (Week 9-10)
- [ ] Implement content similarity analysis
- [ ] Create relationship detection algorithm
- [ ] Store relationships in database
- [ ] Visualize AI-suggested edges
- [ ] Add relationship management UI

### Phase 6: Polish & Optimization (Week 11-12)
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Loading states and skeletons
- [ ] Mobile responsiveness
- [ ] Documentation
- [ ] Testing

---

## 11. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| AI response latency | < 3s for first token | P95 latency tracking |
| Token efficiency | < 20% waste on truncation | Token budget vs used |
| Sticky note creation time | < 5 seconds | Time from shortcut to save |
| Graph render time | < 2s for 100 nodes | Performance monitoring |
| User engagement | 30% use AI weekly | Analytics tracking |
| Error rate | < 1% of AI requests | Error logging |

---

## 12. Security Considerations

1. **API Key Protection**
   - Store AI provider keys server-side only
   - Never expose keys to client
   - Use environment variables

2. **Rate Limiting**
   - Per-user AI request limits (already implemented)
   - Per-minute request throttling
   - Cost controls per user tier

3. **Content Safety**
   - Filter harmful prompts
   - Moderate AI responses
   - Log abuse attempts

4. **Data Privacy**
   - User content sent to AI providers
   - Clear privacy policy disclosure
   - Option to disable AI features

5. **Open-Source Privacy Benefits**
   - **Local Models (Ollama/vLLM)**: Data never leaves the server
   - **Privacy Mode**: Enforce local-only AI processing
   - **No Training on User Data**: Open-source models don't train on your content
   - **Audit Trail**: Full visibility into what's processed
   - **GDPR/HIPAA Friendly**: Self-hosted = full data control

### 12.1 Privacy Mode Implementation
```typescript
// Enforce local-only processing when privacy mode is enabled
const AI_PRIVACY_MODE = process.env.AI_PRIVACY_MODE === 'true'

function validateProvider(provider: AIProvider): void {
  const localProviders = ['ollama', 'vllm', 'lmstudio']

  if (AI_PRIVACY_MODE && !localProviders.includes(provider)) {
    throw new Error(
      `Privacy mode is enabled. Cannot use external provider: ${provider}. ` +
      `Only local providers are allowed: ${localProviders.join(', ')}`
    )
  }
}
```

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| High AI API costs | Financial | Token budgeting, tier limits, caching |
| Slow AI responses | UX | Streaming, loading states, timeout handling |
| Inaccurate AI content | Trust | Citations, confidence scores, edit capability |
| Graph performance with large datasets | UX | Virtual rendering, pagination, depth limits |
| Sticky note spam | Storage | Per-user limits, cleanup policies |

---

## 14. Future Considerations

1. **Voice Input** - Speech-to-text for AI prompts and sticky notes
2. **AI Templates** - Pre-built prompts for common tasks
3. **Graph Sharing** - Export/share graph visualizations
4. **AI Training** - Fine-tune on user's writing style
5. **Offline AI** - Local model support (Ollama, llama.cpp)
6. **Graph Annotations** - Add notes directly to graph edges
7. **Time-based Graph** - Visualize content evolution over time

---

## Appendix A: File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── generate/route.ts
│   │   │   ├── process-content/route.ts
│   │   │   ├── conversations/route.ts
│   │   │   └── models/route.ts
│   │   ├── sticky-notes/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── graph/
│   │       ├── route.ts
│   │       ├── relations/route.ts
│   │       └── ai-analyze/route.ts
│   ├── graph/
│   │   └── page.tsx
│   └── noteboard/
│       └── page.tsx (enhance existing)
│
├── components/
│   ├── ai/
│   │   ├── AIAssistantPanel.tsx
│   │   ├── AIResponseBlock.tsx
│   │   ├── AIPromptInput.tsx
│   │   ├── AIQuickActions.tsx
│   │   └── AIConversationHistory.tsx
│   ├── sticky-notes/
│   │   ├── StickyNote.tsx
│   │   ├── StickyNoteModal.tsx
│   │   ├── StickyNoteGrid.tsx
│   │   └── Noteboard.tsx
│   ├── graph/
│   │   ├── KnowledgeGraph.tsx
│   │   ├── GraphNode.tsx
│   │   ├── GraphEdge.tsx
│   │   ├── GraphControls.tsx
│   │   ├── GraphSidebar.tsx
│   │   └── GraphMinimap.tsx
│   └── tiptap-node/
│       └── ai-response-node.ts
│
├── lib/
│   ├── ai/
│   │   ├── providers/
│   │   │   ├── openai.ts          # OpenAI, vLLM, LM Studio (OpenAI-compatible)
│   │   │   ├── anthropic.ts       # Claude direct API
│   │   │   ├── ollama.ts          # Ollama local models
│   │   │   ├── groq.ts            # Groq cloud (free tier)
│   │   │   ├── together.ts        # Together AI
│   │   │   ├── openrouter.ts      # OpenRouter unified API
│   │   │   └── index.ts           # Provider router/factory
│   │   ├── embeddings/
│   │   │   ├── openai-embeddings.ts
│   │   │   ├── ollama-embeddings.ts
│   │   │   ├── local-embeddings.ts  # @xenova/transformers
│   │   │   └── index.ts
│   │   ├── tokenizer.ts           # Multi-model token counting
│   │   ├── content-processor.ts
│   │   ├── context-builder.ts
│   │   ├── stream-handler.ts
│   │   ├── model-registry.ts      # Available models config
│   │   └── relationship-analyzer.ts
│   └── graph/
│       ├── data-builder.ts
│       └── layout-algorithms.ts
│
├── context/
│   ├── AIContext.tsx
│   ├── StickyNotesContext.tsx
│   └── GraphContext.tsx
│
├── hooks/
│   ├── use-ai-generation.ts
│   ├── use-ai-conversation.ts
│   ├── use-sticky-notes.ts
│   └── use-graph.ts
│
└── types/
    ├── ai.ts
    ├── sticky-notes.ts
    └── graph.ts
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| Block | Atomic content unit (heading, paragraph, code, etc.) |
| Token | Unit of text processed by AI models (~4 chars) |
| CRDT | Conflict-free Replicated Data Type (Y.js) |
| SSE | Server-Sent Events for streaming |
| Graph Node | Visual representation of folder/page |
| Graph Edge | Connection between nodes |
| Sticky Note | Quick-capture annotation card |
| **Ollama** | Local LLM runtime for running open-source models |
| **vLLM** | High-performance inference engine for production |
| **GGUF** | File format for quantized LLMs (llama.cpp compatible) |
| **MoE** | Mixture of Experts - architecture using sparse activation |
| **Embedding** | Vector representation of text for similarity search |
| **Quantization** | Reducing model precision (Q4, Q8) for smaller/faster inference |
| **Context Window** | Maximum tokens a model can process in one request |
| **Groq** | Cloud provider with custom LPU chips for ultra-fast inference |
| **OpenAI-compatible** | APIs that match OpenAI's format (works with openai SDK) |

---

## Appendix C: Open-Source Model Quick Reference

### Ollama Commands
```bash
# Install
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull llama3.1:8b          # 4.7GB, general purpose
ollama pull llama3.1:70b         # 40GB, best quality
ollama pull mistral:7b           # 4.1GB, fast
ollama pull mixtral:8x7b         # 26GB, good balance
ollama pull codellama:34b        # 19GB, code-focused
ollama pull qwen2.5:7b           # 4.4GB, multilingual
ollama pull nomic-embed-text     # 274MB, embeddings

# List installed
ollama list

# Run model
ollama run llama3.1:8b

# Start server (for API)
ollama serve
```

### Model Size vs Quality Trade-offs
```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MODEL SIZE SPECTRUM                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SPEED                                           QUALITY                │
│  ◄─────────────────────────────────────────────────────────────────────►│
│                                                                         │
│  3B        7B        13B       34B       70B       123B+                │
│  │         │         │         │         │         │                    │
│  Phi-3     Mistral   Llama     CodeLlama Llama     Mistral              │
│  Mini      7B        2-13B     34B       3.1-70B   Large 2              │
│                                                                         │
│  ~2GB      ~4GB      ~8GB      ~20GB     ~40GB     ~80GB    (VRAM)     │
│                                                                         │
│  Use for:  Use for:  Use for:  Use for:  Use for:  Use for:            │
│  Mobile    General   Better    Code,     Best      Enterprise           │
│  Edge      tasks     quality   Larger    open-src  deployments          │
│                                context   quality                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Quantization Options (Ollama)
```
Model: llama3.1:8b variants

llama3.1:8b-q2_K     - Smallest, fastest, lowest quality  (~2.5GB)
llama3.1:8b-q4_0     - Good balance                       (~4.5GB)
llama3.1:8b-q4_K_M   - Recommended default                (~4.7GB)
llama3.1:8b-q5_K_M   - Higher quality                     (~5.5GB)
llama3.1:8b-q8_0     - Near full quality                  (~8.5GB)
llama3.1:8b          - Default (usually q4_K_M)           (~4.7GB)
```

---

**Document Status:** Draft
**Last Updated:** January 21, 2026
**Next Review:** Before implementation kickoff

// AI Generation Service
// Handles text generation with streaming support

import { createAIClient, getDefaultModel } from './providers'
import { AI_CONFIG } from './config'
import type { AIMode, AIProvider, AIStreamChunk } from '@/types/ai'

// System prompts for different modes
const MODE_PROMPTS: Record<AIMode, string> = {
  answer: `You are a friendly AI assistant for a note-taking app called "Noted". You have access to the user's folders and notes.

=== GREETING HANDLING (HIGHEST PRIORITY) ===
If the user's message is ONLY a simple greeting like "hi", "hello", "hey", "what's up", "yo", or similar:
- Reply with ONLY a short friendly greeting like "Hey! How can I help you today?" or "Hi there! What would you like to do?"
- Do NOT list folders, notes, capabilities, or summarize anything
- Keep it under 15 words total
- This rule overrides ALL other instructions below
=== END GREETING HANDLING ===

YOUR PERSONALITY (for non-greeting messages):
- Be warm and helpful
- Give concise, well-organized responses
- Only elaborate when the user asks a substantial question

CRITICAL RULE - NEVER SHOW IDs:
- NEVER display UUIDs, IDs, or technical identifiers to the user
- When listing folders/pages, show ONLY names and note counts
- IDs are for internal use in action blocks only

FORMATTING GUIDELINES:
- Use **bold** for important terms
- Use headers (## or ###) for longer responses
- Use bullet points for lists
- Keep responses focused and relevant to what was asked

RESPONSE LENGTH:
- Match response length to the complexity of the question
- Simple questions = short answers
- Complex questions = detailed answers
- Never pad responses with unnecessary information`,

  expand: `You are a creative writing assistant that expands on ideas beautifully.

FORMATTING:
- Use **bold** for emphasis
- Use headers to organize expanded content
- Use bullet points for lists
- Add examples and analogies

Take the given content and expand it with:
- More details and context
- Relevant examples
- Clear explanations
- Smooth transitions

Maintain the same tone and style as the original while making it richer and more comprehensive.`,

  summarize: `You are a summarization expert that creates clear, scannable summaries.

FORMATTING REQUIREMENTS:
- Start with a **TL;DR** one-liner
- Use ### headers for sections
- Use bullet points for key points
- Use **bold** for important terms
- End with a "Key Takeaways" section if content is substantial

Example format:
"**TL;DR:** [One sentence summary]

### Main Points
- **Point 1:** Description
- **Point 2:** Description

### Key Takeaways
1. First takeaway
2. Second takeaway"

Keep summaries comprehensive yet scannable.`,

  translate: `You are a professional translation assistant.

FORMATTING:
- Preserve original formatting (headers, lists, etc.)
- Use **bold** to highlight translated key terms
- Add a note about any cultural adaptations if relevant

Translate the content to the requested language.
If no target language is specified, translate to English.
Maintain the original structure and meaning.`,

  explain: `You are a friendly teacher who explains things clearly.

FORMATTING REQUIREMENTS:
- Use ### headers to break down concepts
- Use **bold** for key terms
- Use bullet points for step-by-step explanations
- Include helpful analogies in > blockquotes
- Use simple language

Example:
"### What is [Concept]?

**[Concept]** is simply [simple explanation].

> Think of it like [analogy]...

### How it works:
1. First...
2. Then...
3. Finally..."

Make complex topics accessible to anyone.`,

  improve: `You are a skilled editor who enhances writing quality.

APPROACH:
- Fix grammar and spelling
- Improve clarity and flow
- Enhance readability
- Maintain the original voice and intent

FORMATTING:
- Return the improved text
- Use **bold** sparingly for emphasis
- Preserve any existing structure
- Keep the same tone

Provide the improved version directly without explaining changes unless asked.`,

  flowchart: `You are a flowchart generation assistant. Your ONLY job is to output a Mermaid.js diagram.

CRITICAL INSTRUCTIONS:
1. Output ONLY a mermaid code block - nothing else before or after
2. Do NOT include any explanations, descriptions, or text outside the code block
3. Do NOT say "here is" or "below is" or any introduction
4. Start your response directly with \`\`\`mermaid and end with \`\`\`
5. ALWAYS use vertical layout (TD = top-down)

Example of CORRECT output format:
\`\`\`mermaid
flowchart TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

Mermaid syntax rules:
- ALWAYS use "flowchart TD" for vertical top-down layout - NEVER use LR or other directions
- Node shapes: [rectangle], (rounded), {diamond}, ((circle))
- Connections: --> for arrows, --- for lines
- Labels on arrows: A -->|label| B
- Subgraphs for grouping related nodes

IMPORTANT - Special characters in labels:
- Use ONLY [square brackets] for node labels with text
- NEVER use parentheses () inside label text - replace with square brackets or remove
- NEVER use special characters like /, \\, <, >, {, } inside label text
- Keep labels simple: "Python and C++" instead of "Python/C++"
- Use quotes for labels with spaces: A["My Label"]

Analyze the content and create an accurate flowchart. Output ONLY the mermaid code block.`,
}

export interface GenerateOptions {
  prompt: string
  mode: AIMode
  context?: string
  model?: string
  provider?: AIProvider
  maxTokens?: number
}

/**
 * Generate AI response (non-streaming)
 */
export async function generateAIResponse(options: GenerateOptions): Promise<{
  content: string
  model: string
  tokensUsed: number
}> {
  const {
    prompt,
    mode,
    context,
    model,
    provider,
    maxTokens = AI_CONFIG.features.maxTokensPerRequest,
  } = options

  const client = createAIClient(provider)
  const modelId = model || getDefaultModel(provider)

  const systemPrompt = MODE_PROMPTS[mode]
  const userMessage = context
    ? `Context from my notes:\n\n${context}\n\n---\n\nUser request: ${prompt}`
    : prompt

  const response = await client.chat.completions.create({
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: maxTokens,
    temperature: mode === 'translate' || mode === 'flowchart' ? 0.3 : 0.7,
  })

  return {
    content: response.choices[0]?.message?.content || '',
    model: modelId,
    tokensUsed: response.usage?.total_tokens || 0,
  }
}

/**
 * Generate AI response with streaming
 */
export async function* generateAIResponseStream(
  options: GenerateOptions
): AsyncGenerator<AIStreamChunk> {
  const {
    prompt,
    mode,
    context,
    model,
    provider,
    maxTokens = AI_CONFIG.features.maxTokensPerRequest,
  } = options

  const client = createAIClient(provider)
  const modelId = model || getDefaultModel(provider)
  const responseId = crypto.randomUUID()

  const systemPrompt = MODE_PROMPTS[mode]
  const userMessage = context
    ? `Context from my notes:\n\n${context}\n\n---\n\nUser request: ${prompt}`
    : prompt

  // Emit start event
  yield {
    type: 'start',
    id: responseId,
    model: modelId,
  }

  try {
    const stream = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: mode === 'translate' || mode === 'flowchart' ? 0.3 : 0.7,
      stream: true,
    })

    let totalContent = ''

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        totalContent += content
        yield {
          type: 'chunk',
          content,
        }
      }
    }

    // Emit done event
    yield {
      type: 'done',
      content: totalContent,
      id: responseId,
      model: modelId,
      // Groq doesn't return token count in stream, estimate it
      tokensUsed: Math.ceil(totalContent.length / 4),
    }
  } catch (error) {
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Convert streaming response to SSE format
 */
export function streamToSSE(chunk: AIStreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`
}

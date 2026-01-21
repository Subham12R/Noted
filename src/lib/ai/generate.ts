// AI Generation Service
// Handles text generation with streaming support

import { createAIClient, getDefaultModel } from './providers'
import { AI_CONFIG } from './config'
import type { AIMode, AIProvider, AIStreamChunk } from '@/types/ai'

// System prompts for different modes
const MODE_PROMPTS: Record<AIMode, string> = {
  answer: `You are a helpful assistant answering questions about the user's notes.
Be concise and accurate. If you reference specific parts of the content, mention them.
Format your response with proper markdown when appropriate.`,

  expand: `You are a writing assistant that expands on ideas.
Take the given content and expand it with more details, examples, and explanations.
Maintain the same tone and style as the original.
Use proper markdown formatting.`,

  summarize: `You are a summarization assistant.
Create a clear, concise summary of the main points.
Use bullet points for multiple key points.
Keep the summary under 200 words unless the content is very long.`,

  translate: `You are a translation assistant.
Translate the content to the requested language.
Maintain the original formatting and structure.
If no target language is specified, translate to English.`,

  explain: `You are an explanation assistant.
Explain the content in simpler terms that anyone can understand.
Break down complex concepts into easy-to-understand parts.
Use analogies and examples when helpful.`,

  improve: `You are a writing improvement assistant.
Improve the writing quality while maintaining the original meaning.
Fix grammar, improve clarity, and enhance readability.
Keep the same tone and intent.`,

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

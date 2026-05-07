"use strict";
// AI Generation Service
// Handles text generation with streaming support
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIResponse = generateAIResponse;
exports.generateAIResponseStream = generateAIResponseStream;
exports.streamToSSE = streamToSSE;
const index_js_1 = require("./providers/index.js");
const config_js_1 = require("./config.js");
const openai_1 = __importDefault(require("openai"));
// Only import Google Generative AI when actually needed (lazy import)
let GoogleGenerativeAI = null;
function getGoogleGenerativeAI() {
    if (!GoogleGenerativeAI) {
        GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
    }
    return GoogleGenerativeAI;
}
// Return the configured base URL for a provider (used when user key has no custom base URL)
function getProviderBaseUrl(provider) {
    if (!provider)
        return undefined;
    switch (provider) {
        case 'groq':
            return config_js_1.AI_CONFIG.groq.baseUrl;
        case 'ollama':
            return config_js_1.AI_CONFIG.ollama.baseUrl;
        case 'openai':
            return config_js_1.AI_CONFIG.openai.baseUrl;
        case 'minimax':
            return config_js_1.AI_CONFIG.minimax.baseUrl;
        case 'nvidia':
            return config_js_1.AI_CONFIG.nvidia.baseUrl;
        default:
            return undefined;
    }
}
// Helper to check if provider is Gemini - ONLY true if explicitly set to 'gemini'
function isGeminiProvider(provider) {
    return provider === 'gemini';
}
// Helper to get OpenAI-compatible client (groq, openai, ollama)
function getOpenAIClient(provider) {
    return (0, index_js_1.createOpenAIClient)(provider);
}
// System prompts for different modes
const MODE_PROMPTS = {
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
    quiz: `CRITICAL: You are a JSON-ONLY generator. Output NOTHING except a valid JSON array.

STRICT FORMAT REQUIREMENTS:
1. First character of your response: [
2. Last character of your response: ]
3. Between them: valid JSON objects separated by commas
4. FORBIDDEN: Any text, markdown, code blocks, explanations, or formatting

Generate quiz questions from the provided content. Each question object must have these exact fields:
- "type": "multiple-choice" or "true-false"
- "question": the question text
- "options": array of answer choices (4 for multiple-choice, ["True","False"] for true-false)
- "correctAnswer": the correct option (must match one of the options exactly)
- "explanation": brief explanation of why this is correct
- "difficulty": "easy", "medium", or "hard"
- "points": 1, 2, or 3

OUTPUT EXACTLY IN THIS FORMAT - NO DEVIATIONS:
[{"type":"multiple-choice","question":"Question here?","options":["Option A","Option B","Option C","Option D"],"correctAnswer":"Option A","explanation":"Explanation here","difficulty":"medium","points":2}]

Generate 5-8 questions based on the content provided. Output ONLY the JSON array - nothing else.`,
    flashcard: `You are a JSON generator. Your ONLY output must be a valid JSON array.

ABSOLUTE REQUIREMENTS - VIOLATION MEANS FAILURE:
- Your response MUST start with [ and end with ]
- NO text before the [
- NO text after the ]
- NO markdown formatting
- NO code blocks
- NO tables
- NO explanations
- ONLY valid JSON

Generate flashcards with "front" (question/term) and "back" (answer) fields.

Example of EXACT output format (your response must look like this):
[{"front":"What is X?","back":"X is the definition"},{"front":"Define Y","back":"Y means this"}]

Rules:
- front: clear question or term
- back: concise answer
- Generate 5-15 flashcards
- Focus on key concepts

START WITH [ AND END WITH ] - NOTHING ELSE`,
};
/**
 * Generate AI response (non-streaming)
 */
async function generateAIResponse(options) {
    const { prompt, mode, context, model, provider, maxTokens = config_js_1.AI_CONFIG.features.maxTokensPerRequest, temperature, userApiKey, userBaseUrl, } = options;
    const modelId = model || (0, index_js_1.getDefaultModel)(provider);
    const getDefaultTemperature = () => {
        if (['translate', 'flowchart', 'quiz', 'flashcard'].includes(mode))
            return config_js_1.AI_CONFIG.temperature.precise;
        if (['expand'].includes(mode))
            return config_js_1.AI_CONFIG.temperature.creative;
        return config_js_1.AI_CONFIG.temperature.default;
    };
    const finalTemperature = temperature ?? getDefaultTemperature();
    const systemPrompt = MODE_PROMPTS[mode];
    const userMessage = context
        ? `Context from my notes:\n\n${context}\n\n---\n\nUser request: ${prompt}`
        : prompt;
    console.log('[AI Generate] Mode:', mode);
    console.log('[AI Generate] Provider:', provider || config_js_1.AI_CONFIG.provider);
    console.log('[AI Generate] Model:', modelId);
    console.log('[AI Generate] User key override:', !!userApiKey);
    console.log('[AI Generate] Temperature:', finalTemperature);
    // Handle Gemini provider separately (user key or env key)
    if (isGeminiProvider(provider)) {
        try {
            const GenAI = getGoogleGenerativeAI();
            const genAI = new GenAI(userApiKey || config_js_1.AI_CONFIG.gemini.apiKey);
            const geminiModel = genAI.getGenerativeModel({
                model: modelId,
                systemInstruction: systemPrompt
            });
            const result = await geminiModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: userMessage }] }],
                generationConfig: { maxOutputTokens: maxTokens, temperature: finalTemperature },
            });
            const content = result.response.text();
            return { content: content || '', model: modelId, tokensUsed: Math.ceil((content?.length || 0) / 4) };
        }
        catch (error) {
            console.error('[AI Generate] Gemini error:', error);
            throw error;
        }
    }
    // If user supplied their own key, create an ad-hoc client (not cached)
    // so their key never leaks into the shared cached client pool
    let openAIClient;
    if (userApiKey) {
        openAIClient = new openai_1.default({
            apiKey: userApiKey,
            baseURL: userBaseUrl || getProviderBaseUrl(provider) || undefined,
            timeout: 120000,
            maxRetries: 0,
        });
    }
    else {
        openAIClient = getOpenAIClient(provider);
    }
    const response = await openAIClient.chat.completions.create({
        model: modelId,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature: finalTemperature,
    });
    return {
        content: response.choices[0]?.message?.content || '',
        model: modelId,
        tokensUsed: response.usage?.total_tokens || 0,
    };
}
/**
 * Generate AI response with streaming
 */
async function* generateAIResponseStream(options) {
    const { prompt, mode, context, model, provider, maxTokens = config_js_1.AI_CONFIG.features.maxTokensPerRequest, temperature, userApiKey, userBaseUrl, } = options;
    const modelId = model || (0, index_js_1.getDefaultModel)(provider);
    const responseId = crypto.randomUUID();
    const getDefaultTemperature = () => {
        if (['translate', 'flowchart', 'quiz', 'flashcard'].includes(mode))
            return config_js_1.AI_CONFIG.temperature.precise;
        if (['expand'].includes(mode))
            return config_js_1.AI_CONFIG.temperature.creative;
        return config_js_1.AI_CONFIG.temperature.default;
    };
    const finalTemperature = temperature ?? getDefaultTemperature();
    const systemPrompt = MODE_PROMPTS[mode];
    const userMessage = context
        ? `Context from my notes:\n\n${context}\n\n---\n\nUser request: ${prompt}`
        : prompt;
    console.log('[AI Generate Stream] Mode:', mode);
    console.log('[AI Generate Stream] Provider:', provider || config_js_1.AI_CONFIG.provider);
    console.log('[AI Generate Stream] Model:', modelId);
    console.log('[AI Generate Stream] User key override:', !!userApiKey);
    yield { type: 'start', id: responseId, model: modelId };
    try {
        if (isGeminiProvider(provider)) {
            try {
                const GenAI = getGoogleGenerativeAI();
                const genAI = new GenAI(userApiKey || config_js_1.AI_CONFIG.gemini.apiKey);
                console.log('[AI Generate Stream] Creating Gemini model with:', modelId);
                const geminiModel = genAI.getGenerativeModel({
                    model: modelId,
                    systemInstruction: systemPrompt
                });
                console.log('[AI Generate Stream] Sending request to Gemini...');
                // Use streaming for Gemini - simplified approach
                const result = await geminiModel.generateContentStream({
                    contents: [{
                            role: 'user',
                            parts: [{ text: userMessage }]
                        }],
                    generationConfig: {
                        maxOutputTokens: maxTokens,
                        temperature: finalTemperature,
                    },
                });
                console.log('[AI Generate Stream] Gemini response received');
                let totalContent = '';
                for await (const chunk of result.stream) {
                    const content = chunk.text();
                    if (content) {
                        totalContent += content;
                        yield {
                            type: 'chunk',
                            content,
                        };
                    }
                }
                // Emit done event
                yield {
                    type: 'done',
                    content: totalContent,
                    id: responseId,
                    model: modelId,
                    tokensUsed: Math.ceil(totalContent.length / 4),
                };
            }
            catch (geminiError) {
                console.error('[AI Generate Stream] Gemini error:', geminiError);
                yield {
                    type: 'error',
                    error: geminiError instanceof Error ? geminiError.message : 'Gemini API error',
                };
                return;
            }
        }
        else {
            try {
                let openAIClient;
                if (userApiKey) {
                    openAIClient = new openai_1.default({
                        apiKey: userApiKey,
                        baseURL: userBaseUrl || getProviderBaseUrl(provider) || undefined,
                        timeout: 120000,
                        maxRetries: 0,
                    });
                }
                else {
                    openAIClient = getOpenAIClient(provider);
                }
                const stream = await openAIClient.chat.completions.create({
                    model: modelId,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage },
                    ],
                    max_tokens: maxTokens,
                    temperature: finalTemperature,
                    stream: true,
                });
                let totalContent = '';
                for await (const chunk of stream) {
                    const delta = chunk.choices[0]?.delta;
                    // Handle thinking models that stream reasoning_content before content
                    const reasoning = delta?.reasoning_content;
                    if (reasoning) {
                        yield { type: 'chunk', content: reasoning };
                        totalContent += reasoning;
                    }
                    const content = delta?.content;
                    if (content) {
                        totalContent += content;
                        yield { type: 'chunk', content };
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
                };
            }
            catch (openaiError) {
                console.error('[AI Generate Stream] OpenAI client error:', openaiError);
                yield {
                    type: 'error',
                    error: openaiError instanceof Error ? openaiError.message : 'OpenAI client error',
                };
                return;
            }
        }
    }
    catch (error) {
        console.error('[AI Generate Stream] Final error:', error);
        yield {
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}
/**
 * Convert streaming response to SSE format
 */
function streamToSSE(chunk) {
    return `data: ${JSON.stringify(chunk)}\n\n`;
}
//# sourceMappingURL=generate.js.map
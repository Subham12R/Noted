"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useNotes, Folder, Page } from "@/context/NotesContext"
import type { AIModel } from "@/types/ai"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { MermaidChart } from "@/components/MermaidChart"
import { toast } from "sonner"

// Rotating messages with different lottie animations
const LOADING_STATES = [
  { message: "Reading your documents...", lottie: "/lottie/Notes.lottie" },
  { message: "Analyzing request...", lottie: "/lottie/Dynamic Tri-Cubes.lottie" },
  { message: "Processing content...", lottie: "/lottie/Octahedron - Cube Morph.lottie" },
  { message: "Connecting ideas...", lottie: "/lottie/Notes(1).lottie" },
]

// AI Action types
interface AIAction {
  type: 'create_folder' | 'rename_folder' | 'delete_folder' | 'move_folder' |
        'create_page' | 'rename_page' | 'delete_page' | 'move_page' | 'update_page_content' |
        'create_todo' | 'update_todo' | 'delete_todo' | 'complete_todo'
  [key: string]: unknown
}

interface PendingActions {
  actions: AIAction[]
  description: string
}

// Message type for conversation history
interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  pendingActions?: PendingActions
}

interface DashboardAIInputProps {
  preSelectedFolder?: Folder | null
}

// Extract all pages from a folder including subfolders
function getAllPagesFromFolder(folder: Folder): Page[] {
  const pages: Page[] = [...folder.pages]
  if (folder.folders) {
    for (const subFolder of folder.folders) {
      pages.push(...getAllPagesFromFolder(subFolder))
    }
  }
  return pages
}

// Build folder structure text for AI context - include full page content
function buildFolderContext(folder: Folder, indent: number = 0): string {
  const prefix = "  ".repeat(indent)
  let context = `${prefix}📁 Folder: ${folder.name}\n`

  for (const page of folder.pages) {
    context += `${prefix}  📄 Page: ${page.name}\n`
    if (page.content) {
      const cleanContent = page.content
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
      if (cleanContent) {
        context += `${prefix}    Content:\n${prefix}    ${cleanContent}\n\n`
      }
    }
  }

  if (folder.folders) {
    for (const subFolder of folder.folders) {
      context += buildFolderContext(subFolder, indent + 1)
    }
  }

  return context
}

// Build context from all folders
function buildAllFoldersContext(folders: Folder[]): { context: string; totalPages: number } {
  let context = ""
  let totalPages = 0

  for (const folder of folders) {
    context += buildFolderContext(folder)
    totalPages += getAllPagesFromFolder(folder).length
  }

  return { context, totalPages }
}

// Build complete ID reference for AI actions (all folders and pages with IDs)
function buildIdReference(folders: Folder[], indent: number = 0): string {
  let ref = ""
  const prefix = "  ".repeat(indent)

  for (const folder of folders) {
    ref += `${prefix}FOLDER: "${folder.name}" => ID: ${folder.id}\n`
    for (const page of folder.pages) {
      ref += `${prefix}  PAGE: "${page.name}" => ID: ${page.id} (in folder ${folder.id})\n`
    }
    if (folder.folders && folder.folders.length > 0) {
      ref += buildIdReference(folder.folders, indent + 1)
    }
  }

  return ref
}

// Parse AI actions from response content
function parseAIActions(content: string): { cleanContent: string; actions: AIAction[] } {
  const actionBlockRegex = /```ai-actions\n([\s\S]*?)```/g
  const actions: AIAction[] = []
  let cleanContent = content

  let match
  while ((match = actionBlockRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      if (Array.isArray(parsed)) {
        actions.push(...parsed)
      } else if (parsed.actions && Array.isArray(parsed.actions)) {
        actions.push(...parsed.actions)
      }
    } catch {
      // Invalid JSON, skip
    }
    cleanContent = cleanContent.replace(match[0], '')
  }

  return { cleanContent: cleanContent.trim(), actions }
}

// Get human-readable action description
function getActionDescription(action: AIAction): string {
  switch (action.type) {
    case 'create_folder':
      return `Create folder "${action.name}"${action.parentId ? ' (as subfolder)' : ''}`
    case 'rename_folder':
      return `Rename folder to "${action.newName}"`
    case 'delete_folder':
      return `Delete folder`
    case 'move_folder':
      return `Move folder to ${action.newParentId ? 'new location' : 'root'}`
    case 'create_page':
      return `Create note "${action.name}"${action.content ? ' with content' : ''}`
    case 'rename_page':
      return `Rename note to "${action.newName}"`
    case 'delete_page':
      return `Delete note`
    case 'move_page':
      return `Move note to different folder`
    case 'update_page_content':
      return `Update note content`
    case 'create_todo':
      return `Create task "${action.text}"`
    case 'update_todo':
      return `Update task${action.text ? ` to "${action.text}"` : ''}${action.completed !== undefined ? ` (${action.completed ? 'complete' : 'incomplete'})` : ''}`
    case 'delete_todo':
      return `Delete task`
    case 'complete_todo':
      return `Mark task as complete`
    default:
      return `Unknown action: ${action.type}`
  }
}

export function DashboardAIInput({ preSelectedFolder }: DashboardAIInputProps) {
  const { folders, refetch } = useNotes()
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(preSelectedFolder?.id || null)
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExecutingActions, setIsExecutingActions] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streamingContent, setStreamingContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState("")
  const [selectedModel, setSelectedModel] = useState("compound-beta")
  const [availableModels, setAvailableModels] = useState<(AIModel & { available: boolean })[]>([])
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)

  // Update selectedFolderId when preSelectedFolder prop changes
  useEffect(() => {
    if (preSelectedFolder?.id) {
      setSelectedFolderId(preSelectedFolder.id)
    }
  }, [preSelectedFolder?.id])

  // Get selected folder (null means search all)
  const selectedFolder = selectedFolderId
    ? preSelectedFolder && preSelectedFolder.id === selectedFolderId
      ? preSelectedFolder
      : folders.find(f => f.id === selectedFolderId) ||
        folders.flatMap(f => f.folders || []).find(sf => sf.id === selectedFolderId)
    : null

  // Typewriter effect with rotating lottie animations
  useEffect(() => {
    if (!isProcessing) {
      setDisplayedText("")
      return
    }

    const targetText = LOADING_STATES[currentMessageIndex].message
    let charIndex = 0
    setDisplayedText("")

    const typeInterval = setInterval(() => {
      if (charIndex < targetText.length) {
        setDisplayedText(targetText.slice(0, charIndex + 1))
        charIndex++
      } else {
        clearInterval(typeInterval)
        setTimeout(() => {
          setCurrentMessageIndex((prev) => (prev + 1) % LOADING_STATES.length)
        }, 1500)
      }
    }, 20)

    return () => clearInterval(typeInterval)
  }, [isProcessing, currentMessageIndex])

  // Auto-scroll to bottom when messages change or streaming
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, streamingContent])

  // Fetch available models
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/api/ai/models")
        if (res.ok) {
          const data = await res.json()
          setAvailableModels(data.allModels || [])
          if (data.defaultModel) {
            setSelectedModel(data.defaultModel)
          }
        }
      } catch (error) {
        console.error("Failed to fetch models:", error)
      }
    }
    fetchModels()
  }, [])

  // Close model dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Check if message is a simple greeting
  const isSimpleGreeting = (message: string): boolean => {
    const greetings = [
      'hi', 'hello', 'hey', 'hii', 'hiii', 'yo', 'sup', 'heya', 'hola',
      'hi!', 'hello!', 'hey!', 'yo!', 'heya!', 'hola!',
      'hi there', 'hello there', 'hey there',
      'good morning', 'good afternoon', 'good evening',
      'whats up', "what's up", 'wassup', 'wazzup'
    ]
    const normalized = message.toLowerCase().trim().replace(/[.!?,]+$/, '')
    return greetings.includes(normalized) || normalized.length <= 3
  }

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!inputValue.trim()) {
      toast.error("Please enter a message")
      return
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsProcessing(true)
    setError(null)
    setStreamingContent("")

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    // Check if this is a simple greeting - respond immediately without API call
    if (isSimpleGreeting(userMessage.content) && messages.length === 0) {
      // Simulate a brief delay for natural feel
      await new Promise(resolve => setTimeout(resolve, 300))

      const greetingResponses = [
        "Hey! How can I help you today?",
        "Hi there! What would you like to do?",
        "Hello! What can I help you with?",
        "Hey! Ready to help with your notes.",
      ]
      const randomGreeting = greetingResponses[Math.floor(Math.random() * greetingResponses.length)]

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: randomGreeting,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsProcessing(false)
      return
    }

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 60000) // 60 second timeout

    try {
      let contextText: string

      // Build conversation history for context
      const conversationHistory = messages
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n\n")

      // Build complete ID reference for AI to use in actions
      const fullIdReference = buildIdReference(folders)

      const actionInstructions = `
=== AI ACTIONS - YOU CAN MODIFY THE USER'S WORKSPACE ===
You can create, rename, delete, and move folders, notes, AND tasks!

CRITICAL: When the user asks you to create, organize, or modify ANYTHING, you MUST include an \`\`\`ai-actions code block. Without this block, NO actions will be executed. The user will see a confirmation dialog and click "Apply" to execute.

To perform actions, you MUST include a code block with language "ai-actions" containing a JSON array:

\`\`\`ai-actions
[
  { "type": "create_folder", "name": "Folder Name", "parentId": null },
  { "type": "create_page", "name": "Note Title", "folderId": "MUST-USE-ACTUAL-FOLDER-ID", "content": "Optional content" },
  { "type": "rename_folder", "folderId": "folder-id", "newName": "New Name" },
  { "type": "rename_page", "pageId": "page-id", "newName": "New Name" },
  { "type": "delete_folder", "folderId": "folder-id" },
  { "type": "delete_page", "pageId": "page-id" },
  { "type": "move_page", "pageId": "page-id", "newFolderId": "target-folder-id" },
  { "type": "move_folder", "folderId": "folder-id", "newParentId": "parent-folder-id-or-null" },
  { "type": "create_todo", "text": "Task description" },
  { "type": "update_todo", "todoId": "todo-id", "text": "New text", "completed": true },
  { "type": "delete_todo", "todoId": "todo-id" },
  { "type": "complete_todo", "todoId": "todo-id" }
]
\`\`\`

=== COMPLETE ID REFERENCE (use these exact IDs in actions) ===
${fullIdReference || "No folders yet - create a folder first, then you can add pages to it!"}
=== END ID REFERENCE ===

ACTION GUIDELINES:
- MANDATORY: You MUST ALWAYS include the \`\`\`ai-actions code block when asked to create/modify anything. Without it, nothing happens!
- CRITICAL: For create_page, you MUST use an actual folder ID from the reference above
- Always explain what you're about to do BEFORE the action block, then ALWAYS include the action block
- NEVER display UUIDs or IDs to the user! Only show friendly names in your text
- For new folders at root level, use "parentId": null
- For new pages, the folderId field is REQUIRED - use an ID from the reference
- You can include multiple actions in one block
- The user will see a confirmation before actions execute
- For todos: create_todo only needs "text" field - example: { "type": "create_todo", "text": "Buy groceries" }
- Note: You cannot see existing todos - just create new ones when asked

EXAMPLE - Creating todos:
User: "Create a task to study for exam"
Your response should include:
\`\`\`ai-actions
[{ "type": "create_todo", "text": "Study for exam" }]
\`\`\`

WHEN LISTING FOLDERS TO USER - use this format (NO IDs!):
### Your Folders
- **Assignment** - 1 note
- **Projects** - 3 notes

NEVER do this: "Assignment (ID: abc-123...)"
=== END OF ACTION INSTRUCTIONS ===
`

      if (selectedFolder) {
        const folderContext = buildFolderContext(selectedFolder)
        const allPages = getAllPagesFromFolder(selectedFolder)
        const pagesWithIds = selectedFolder.pages.map(p => `  PAGE: "${p.name}" => ID: ${p.id}`).join('\n')

        contextText = `
=== CRITICAL: GREETING DETECTION ===
If the user's message is ONLY a greeting like "hi", "hello", "hey", "what's up", "yo", or similar:
- Respond with ONLY ONE short friendly line like "Hey! How can I help you today?" or "Hi there! What would you like to do?"
- Do NOT mention folders, notes, capabilities, or anything else
- Do NOT summarize their content
- Keep it under 15 words
=== END GREETING DETECTION ===

You have COMPLETE ACCESS to the user's note-taking app "Noted". You can read AND modify their workspace!

=== CURRENT FOLDER CONTEXT ===
Folder Name: "${selectedFolder.name}"
Total Pages: ${allPages.length}
${selectedFolder.folders?.length ? `Subfolders: ${selectedFolder.folders.length}` : "No subfolders"}

=== CURRENT FOLDER ID REFERENCE (for actions) ===
FOLDER: "${selectedFolder.name}" => ID: ${selectedFolder.id}
${pagesWithIds || "No pages yet - you can create one!"}
=== END CURRENT FOLDER REFERENCE ===

=== DETAILED FOLDER CONTENT ===
${folderContext}
=== END OF CONTENT ===

${conversationHistory ? `=== CONVERSATION HISTORY ===\n${conversationHistory}\n=== END OF HISTORY ===\n\n` : ""}

${actionInstructions}

INSTRUCTIONS:
- You can see ALL the content above - use it to answer questions thoroughly
- Reference specific pages by name when relevant (e.g., "In your **Untitled** page...")
- Be generous with your responses - provide helpful details and suggestions
- Use beautiful markdown formatting: **bold**, headers, bullet points, blockquotes
- If listing folders/pages, format them nicely with bullet points
- Offer proactive suggestions when appropriate
- For flowcharts: output ONLY a mermaid code block with "flowchart TD"
- Keep responses conversational and friendly
- When asked to create a page in THIS folder, use folderId: "${selectedFolder.id}"
- When asked to create, organize, rename, or delete - USE ACTIONS!
        `.trim()
      } else {
        const { context: allContext, totalPages } = buildAllFoldersContext(folders)

        contextText = `
=== CRITICAL: GREETING DETECTION ===
If the user's message is ONLY a greeting like "hi", "hello", "hey", "what's up", "yo", or similar:
- Respond with ONLY ONE short friendly line like "Hey! How can I help you today?" or "Hi there! What would you like to do?"
- Do NOT mention folders, notes, capabilities, or anything else
- Do NOT summarize their content
- Keep it under 15 words
=== END GREETING DETECTION ===

You have COMPLETE ACCESS to ALL folders and notes in the user's "Noted" app. You can read AND modify their workspace!

=== WORKSPACE OVERVIEW ===
Total Folders: ${folders.length}
Total Pages Across All Folders: ${totalPages}

=== COMPLETE CONTENT OF ALL FOLDERS ===
${allContext}
=== END OF ALL CONTENT ===

${conversationHistory ? `=== CONVERSATION HISTORY ===\n${conversationHistory}\n=== END OF HISTORY ===\n\n` : ""}

${actionInstructions}

INSTRUCTIONS:
- You can see EVERYTHING above - all folders and all page content
- When listing folders, format them beautifully with names and page counts
- Reference specific folders and pages by name (e.g., "In your **Assignment** folder...")
- Be generous and thorough - provide helpful details and insights
- Use beautiful markdown formatting: **bold**, ### headers, bullet points, > blockquotes
- Offer proactive suggestions (e.g., "Would you like me to summarize this?")
- For flowcharts: output ONLY a mermaid code block with "flowchart TD"
- If the user asks what you can do, list your capabilities (including that you can CREATE and ORGANIZE folders/notes!)
- Keep responses conversational and friendly
- When asked to create, organize, rename, or delete - USE ACTIONS!
        `.trim()
      }

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage.content,
          mode: "answer",
          model: selectedModel,
          context: contextText,
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Generation failed")
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response stream")
      }

      let fullResponse = ""
      let lastChunkTime = Date.now()
      const streamTimeout = 30000 // 30 seconds without new data

      while (true) {
        // Check for stream stall timeout
        if (Date.now() - lastChunkTime > streamTimeout) {
          reader.cancel()
          throw new Error("Response stalled")
        }

        const { done, value } = await reader.read()
        if (done) break

        lastChunkTime = Date.now() // Reset timeout on new data

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n").filter((line) => line.startsWith("data: "))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === "chunk" && data.content) {
              fullResponse += data.content
              setStreamingContent(fullResponse)
            } else if (data.type === "error") {
              throw new Error(data.error)
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Check if we got an empty or very short response (potential hallucination/failure)
      if (!fullResponse.trim() || fullResponse.trim().length < 2) {
        throw new Error("Empty response received")
      }

      // Parse any AI actions from the response
      const { cleanContent, actions } = parseAIActions(fullResponse)

      // Add assistant message to history
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: cleanContent || fullResponse,
        timestamp: new Date(),
        pendingActions: actions.length > 0 ? {
          actions,
          description: `${actions.length} action${actions.length > 1 ? 's' : ''} ready to execute`
        } : undefined,
      }
      setMessages((prev) => [...prev, assistantMessage])
      setStreamingContent("")
    } catch (err) {
      // Handle timeout/abort error
      if (err instanceof Error && err.name === 'AbortError') {
        const errorMessage = "Sorry, the request took too long. Please try again."
        setError(errorMessage)
        // Add error as assistant message for better UX
        const errorAssistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I couldn't complete your request in time. Please try again.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorAssistantMessage])
      } else {
        // Handle other errors
        const errorMessage = err instanceof Error ? err.message : "Sorry, something went wrong. Please try again."
        setError(errorMessage)
        // Add friendly error message as assistant response
        const errorAssistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorAssistantMessage])
      }
      setStreamingContent("")
    } finally {
      clearTimeout(timeoutId)
      setIsProcessing(false)
    }
  }, [inputValue, selectedFolder, folders, messages])

  // Copy last response to clipboard
  const copyLastResponse = useCallback(() => {
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
    if (lastAssistantMessage) {
      navigator.clipboard.writeText(lastAssistantMessage.content)
      toast.success("Copied to clipboard")
    }
  }, [messages])

  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([])
    setStreamingContent("")
    setError(null)
    setInputValue("")
  }, [])

  // Execute AI actions
  const executeActions = useCallback(async (messageId: string, actions: AIAction[]) => {
    setIsExecutingActions(true)
    try {
      const res = await fetch("/api/ai/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to execute actions")
      }

      // Remove pending actions from the message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, pendingActions: undefined } : m
        )
      )

      // Refresh folder data
      await refetch()

      // Refresh todos if any todo actions were executed
      const hasTodoActions = actions.some(a =>
        a.type === 'create_todo' || a.type === 'update_todo' ||
        a.type === 'delete_todo' || a.type === 'complete_todo'
      )
      if (hasTodoActions) {
        window.dispatchEvent(new CustomEvent("refreshTodos"))
      }

      // Show success message
      const successCount = data.results.filter((r: { success: boolean }) => r.success).length
      const failCount = data.results.length - successCount

      if (failCount === 0) {
        toast.success(`${successCount} action${successCount > 1 ? 's' : ''} completed!`)
      } else {
        toast.warning(`${successCount} succeeded, ${failCount} failed`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to execute actions")
    } finally {
      setIsExecutingActions(false)
    }
  }, [refetch])

  // Dismiss pending actions
  const dismissActions = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, pendingActions: undefined } : m
      )
    )
    toast.info("Actions dismissed")
  }, [])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        if (inputValue.trim() && !isProcessing) {
          handleGenerate()
        }
      }
    },
    [inputValue, isProcessing, handleGenerate]
  )

  // Handle textarea auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"
  }

  const outputHeight = isExpanded ? 'h-96' : 'h-48'

  // Render markdown content
  const renderMarkdown = (content: string) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "")
          const isInline = !match && !className
          const codeContent = String(children).replace(/\n$/, "")

          if (isInline) {
            return <code className="text-indigo-300 bg-white/10 px-1.5 py-0.5 rounded text-xs" {...props}>{children}</code>
          }

          if (match && match[1] === "mermaid") {
            return (
              <div className="my-3">
                <MermaidChart chart={codeContent} />
              </div>
            )
          }

          return (
            <div className="relative group my-3">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => navigator.clipboard.writeText(codeContent)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                  title="Copy code"
                >
                  <CopyIcon className="w-3.5 h-3.5" />
                </button>
              </div>
              {match && (
                <div className="absolute top-2 left-3 text-xs text-zinc-500 font-mono">
                  {match[1]}
                </div>
              )}
              <SyntaxHighlighter
                style={oneDark as Record<string, React.CSSProperties>}
                language={match ? match[1] : "text"}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: "0.75rem",
                  padding: "2rem 1rem 1rem 1rem",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  fontSize: "0.8rem",
                }}
                {...props}
              >
                {codeContent}
              </SyntaxHighlighter>
            </div>
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pt-6 pb-4 px-4">
      {/* Backdrop blur gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(24, 24, 27, 0.98) 0%, rgba(24, 24, 27, 0.9) 30%, rgba(24, 24, 27, 0.6) 60%, rgba(24, 24, 27, 0) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          maskImage: 'linear-gradient(to top, black 0%, black 50%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, black 50%, transparent 100%)',
        }}
      />

      <div className="max-w-3xl mx-auto relative">
        {/* Chat Area */}
        {(messages.length > 0 || streamingContent || isProcessing || error) && (
          <div
            className="mb-4 rounded-2xl overflow-hidden transition-all duration-300 border border-white/10"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <CollapseIcon className="w-3.5 h-3.5" /> : <ExpandIcon className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={clearConversation}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                title="Clear conversation"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={chatContainerRef}
              className={`${outputHeight} overflow-y-auto`}
            >
              <div className="px-4 py-3 space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className="group">
                    {message.role === "user" ? (
                      // User message - right aligned
                      <div className="flex justify-end">
                        <p className="text-sm text-zinc-400 max-w-[80%] text-right">{message.content}</p>
                      </div>
                    ) : (
                      // Assistant message - left aligned
                      <div>
                        <div className="prose prose-invert prose-sm max-w-none
                          prose-p:text-zinc-200 prose-p:leading-relaxed prose-p:my-1
                          prose-headings:text-zinc-100 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                          prose-strong:text-zinc-100
                          prose-ul:my-1 prose-li:text-zinc-200 prose-li:my-0
                          prose-ol:my-1
                          prose-blockquote:border-l-2 prose-blockquote:border-zinc-600 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-zinc-400 prose-blockquote:my-2
                          prose-a:text-indigo-400
                        ">
                          {renderMarkdown(message.content)}
                        </div>

                        {/* Pending Actions UI */}
                        {message.pendingActions && message.pendingActions.actions.length > 0 && (
                          <div className="mt-3 p-3 border border-white/10 rounded-lg">
                            <p className="text-xs text-zinc-400 mb-2">{message.pendingActions.description}</p>
                            <div className="space-y-1 mb-3">
                              {message.pendingActions.actions.map((action, idx) => (
                                <p key={idx} className="text-xs text-zinc-300">
                                  {idx + 1}. {getActionDescription(action)}
                                </p>
                              ))}
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => executeActions(message.id, message.pendingActions!.actions)}
                                disabled={isExecutingActions}
                                className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                              >
                                {isExecutingActions ? "Applying..." : "Apply"}
                              </button>
                              <button
                                onClick={() => dismissActions(message.id)}
                                disabled={isExecutingActions}
                                className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(message.content)
                            toast.success("Copied")
                          }}
                          className="opacity-0 group-hover:opacity-100 mt-1 text-xs text-zinc-500 hover:text-zinc-300 transition-all"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Streaming response */}
                {streamingContent && (
                  <div className="prose prose-invert prose-sm max-w-none
                    prose-p:text-zinc-200 prose-p:leading-relaxed prose-p:my-1
                    prose-headings:text-zinc-100 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                    prose-strong:text-zinc-100
                    prose-ul:my-1 prose-li:text-zinc-200 prose-li:my-0
                    prose-ol:my-1
                  ">
                    {renderMarkdown(streamingContent)}
                  </div>
                )}

                {/* Loading indicator */}
                {isProcessing && !streamingContent && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 shrink-0">
                      <DotLottieReact
                        src={LOADING_STATES[currentMessageIndex].lottie}
                        loop
                        autoplay
                        style={{ width: "100%", height: "100%", background: "transparent" }}
                      />
                    </div>
                    <span className="text-sm text-zinc-400">
                      {displayedText}
                      <span className="animate-pulse">|</span>
                    </span>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="text-red-400 text-sm">{error}</div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* Main Input Container */}
        <div className="relative flex items-end gap-2 backdrop-blur-2xl bg-zinc-900/10 dark:bg-zinc-100/5 rounded-xl dark:border-zinc-600/40 border border-zinc-200/60 shadow-lg">
          {/* Folder Selector - Custom styled dropdown */}
          <div className="relative p-2 ml-1 group">
            <button
              onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800/50 border border-white/10 cursor-pointer hover:bg-zinc-700/50 transition-colors"
              title={selectedFolder ? selectedFolder.name : "All folders"}
            >
              <FolderIcon className={`w-4 h-4 ${selectedFolderId ? 'text-indigo-400' : 'text-zinc-400'}`} />
            </button>

            {/* Custom Dropdown Menu */}
            {isFolderDropdownOpen && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsFolderDropdownOpen(false)}
                />
                {/* Dropdown content */}
                <div className="absolute bottom-full left-0 mb-2 w-64 max-h-80 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50">
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setSelectedFolderId(null)
                        setIsFolderDropdownOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        !selectedFolderId
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      All folders
                    </button>
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setSelectedFolderId(f.id)
                          setIsFolderDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedFolderId === f.id
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={selectedFolder ? `Ask anything about "${selectedFolder.name}"...` : "Ask me anything, say hi, or search your notes..."}
            rows={1}
            disabled={isProcessing}
            className="flex-1 bg-transparent py-4 pr-2 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 resize-none focus:outline-none text-sm sm:text-base max-h-[200px] disabled:opacity-50"
          />

          {/* Model Selector and Send Button */}
          <div className="flex items-center  gap-1 px-2 py-2 relative">
            {/* Model Selector */}
             <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                disabled={isProcessing}
                className="absolute top-[-40%] bg-white/10 border border-white/10 backdrop-blur-3xl right-[50px] inline-flex items-center gap-1.5 px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors disabled:opacity-50"
                title="Select AI model"
              >
                <ModelIcon className="w-4 h-4" />
                <span className="max-w-[80px] truncate hidden sm:inline">
                  {availableModels.find(m => m.id === selectedModel)?.name?.split(' ')[0] || 'Model'}
                </span>
                <ChevronDownIcon className="w-3 h-3" />
              </button>

            <div className="relative" ref={modelDropdownRef}>
             
              {/* Model Dropdown */}
              {isModelDropdownOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-2 border-b border-zinc-800">
                    <p className="text-xs font-medium text-zinc-500 px-2">Select Model</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1">
                    {availableModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          if (model.available) {
                            setSelectedModel(model.id)
                            setIsModelDropdownOpen(false)
                          }
                        }}
                        disabled={!model.available}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedModel === model.id
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : model.available
                            ? 'text-zinc-300 hover:bg-zinc-800'
                            : 'text-zinc-600 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{model.name}</span>
                              {!model.available && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-400 shrink-0">
                                  Unavailable
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 truncate mt-0.5">
                              {model.description}
                            </p>
                          </div>
                          {selectedModel === model.id && model.available && (
                            <CheckIcon className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Send Button */}
            <button
              onClick={handleGenerate}
              disabled={isProcessing || !inputValue.trim()}
              className="p-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Send"
            >
              {isProcessing ? (
                <LoadingIcon className="w-5 h-5 animate-spin" />
              ) : (
                <SendIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        {!inputValue && (
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-zinc-500">Try:</span>
            {selectedFolder ? (
              <>
                <button
                  onClick={() => setInputValue("Summarize the notes in this folder")}
                  className="px-2.5 py-1 text-xs rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all"
                >
                  Summarize
                </button>
                <button
                  onClick={() => setInputValue("Create a new note about today's meeting")}
                  className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
                >
                  + New Note
                </button>
                <button
                  onClick={() => setInputValue("Create a flowchart of the main concepts")}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 transition-all"
                >
                  Flowchart
                </button>
                <button
                  onClick={() => setInputValue("Organize and rename the notes in this folder")}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 transition-all"
                >
                  Organize
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setInputValue("Hi! What can you help me with?")}
                  className="px-2.5 py-1 text-xs rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all"
                >
                  Say Hi
                </button>
                <button
                  onClick={() => setInputValue("Create a new folder for my projects")}
                  className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
                >
                  + New Folder
                </button>
                <button
                  onClick={() => setInputValue("Give me an overview of all my notes")}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 transition-all"
                >
                  Overview
                </button>
                <button
                  onClick={() => setInputValue("Help me organize my workspace with a good folder structure")}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 transition-all"
                >
                  Organize
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Icons
const FolderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const SendIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
)

const LoadingIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
  </svg>
)

const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
)

const RegenerateIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
)

const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
)

const ExpandIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 15-6-6-6 6" />
  </svg>
)

const CollapseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const ErrorIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
)

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
)

const ActionIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4" />
    <path d="m16.24 7.76-2.12 2.12" />
    <path d="M20 12h-4" />
    <path d="m16.24 16.24-2.12-2.12" />
    <path d="M12 18v4" />
    <path d="m7.76 16.24 2.12-2.12" />
    <path d="M4 12h4" />
    <path d="m7.76 7.76 2.12 2.12" />
  </svg>
)

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const ModelIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
)

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

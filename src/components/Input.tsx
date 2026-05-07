"use client";

import {
  useState,
  useRef,
  KeyboardEvent,
  ChangeEvent,
  useEffect,
  useCallback,
} from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useNotes, Page, Folder } from "@/context/NotesContext";
import { useFlashcards } from "@/context/FlashcardContext";
import { useQuiz, QuestionType } from "@/context/QuizContext";
import { Editor } from "@tiptap/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { marked } from "marked";
import { MermaidChart, extractMermaidBlocks } from "./MermaidChart";

// Rotating messages for the typewriter effect
const LOADING_MESSAGES = [
  "Reading your documents...",
  "Analyzing request...",
  "Processing content...",
  "Connecting ideas...",
];

// Lottie animation for processing state
const LOTTIE = [
  "/lottie/Notes.lottie",
  "/lottie/Dynamic Tri-Cubes.lottie",
  "/lottie/Dynamic Tri-Cubes.lottie",
  "/lottie/Learning.lottie",
];

interface ContextItem {
  id: string;
  name: string;
  type: "page";
  content?: string;
}

interface PendingEdit {
  content: string;
  action: "insert" | "replace";
}

import type { AIMode, AIModel } from "@/types/ai";

// Default prompts for each AI mode
const MODE_DEFAULT_PROMPTS: Record<AIMode, string> = {
  answer: "",
  expand: "Expand on this content with more details and examples",
  summarize: "Summarize the key points from this content",
  translate: "Translate this content to English",
  explain: "Explain this content in simpler terms",
  improve: "Improve the writing quality of this content",
  flowchart:
    "Create a flowchart visualizing the concepts and relationships in this content",
  quiz: "Generate quiz questions from this content to test understanding",
  flashcard: "Create flashcards from this content for study and review",
};

// Natural language patterns for detecting quiz/flashcard commands
const QUIZ_PATTERNS = [
  /create\s+(?:a\s+|me\s+(?:a\s+)?)?quiz/i,
  /make\s+(?:a\s+|me\s+(?:a\s+)?)?quiz/i,
  /generate\s+(?:a\s+)?quiz/i,
  /quiz\s+(?:me|from|on|about|this)/i,
  /test\s+(?:me|my\s+knowledge)/i,
  /\bquiz\b/i, // Match any message containing "quiz" as a word
];

const FLASHCARD_PATTERNS = [
  /create\s+(?:some\s+|me\s+(?:some\s+)?)?flashcards?/i,
  /make\s+(?:some\s+|me\s+(?:some\s+)?)?flashcards?/i,
  /generate\s+(?:some\s+)?flashcards?/i,
  /flashcards?\s+(?:from|for|about|this)/i,
  /\bflashcards?\b/i, // Match any message containing "flashcard(s)" as a word
];

// Detect if input is a quiz or flashcard command
function detectAICommand(input: string): AIMode | null {
  // Test against the input directly (patterns have 'i' flag for case insensitivity)
  for (const pattern of QUIZ_PATTERNS) {
    if (pattern.test(input)) {
      return "quiz";
    }
  }

  for (const pattern of FLASHCARD_PATTERNS) {
    if (pattern.test(input)) {
      return "flashcard";
    }
  }

  return null;
}

interface InputProps {
  isOpen: boolean;
  onClose: () => void;
  editor?: Editor | null;
  pageId?: string;
  initialMode?: string | null;
}

export const Input = ({
  isOpen,
  onClose,
  editor,
  pageId,
  initialMode,
}: InputProps) => {
  const { folders, activePage, getPageById } = useNotes();
  const {
    createDeck,
    createCard,
    openModal: openFlashcardModal,
    setCurrentDeck,
  } = useFlashcards();
  const { createQuiz, openModal: openQuizModal } = useQuiz();
  const [activeMode, setActiveMode] = useState<AIMode | null>(null);

  const [inputValue, setInputValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState("compound-beta");
  const [availableModels, setAvailableModels] = useState<
    (AIModel & { available: boolean })[]
  >([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isInspirationOpen, setIsInspirationOpen] = useState(false);

  // Get active tool object based on activeMode
  const tools = [
    { id: "summarize", label: "Summarize", icon: <AlignLeftIcon className="w-4 h-4 text-neutral-500" /> },
    { id: "improve", label: "Improve writing", icon: <WandIcon className="w-4 h-4 text-neutral-500" /> },
    { id: "explain", label: "Explain", icon: <MessageCircleIcon className="w-4 h-4 text-neutral-500" /> },
    { id: "flowchart", label: "Create flowchart", icon: <GitCommitIcon className="w-4 h-4 text-neutral-500" /> },
    { id: "quiz", label: "Generate quiz", icon: <HelpCircleIcon className="w-4 h-4 text-neutral-500" /> },
    { id: "flashcard", label: "Make flashcards", icon: <CardsIcon className="w-4 h-4 text-neutral-500" /> },
  ];
  const activeToolObj = activeMode ? tools.find((t) => t.id === activeMode) : null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const inspirationRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  // Get all pages from folders recursively
  const getAllPages = useCallback(
    (folderList: Folder[]): { page: Page; folderName: string }[] => {
      const pages: { page: Page; folderName: string }[] = [];

      const traverse = (folders: Folder[]) => {
        for (const folder of folders) {
          for (const page of folder.pages) {
            pages.push({ page, folderName: folder.name });
          }
          if (folder.folders) {
            traverse(folder.folders);
          }
        }
      };

      traverse(folderList);
      return pages;
    },
    [],
  );

  const allPages = getAllPages(folders);

  // Filter pages based on search
  const filteredPages = allPages.filter(({ page }) =>
    page.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Get current page info
  const currentPageInfo = activePage ? getPageById(activePage) : null;

  // Typewriter effect - slower typing and longer display
  useEffect(() => {
    if (!isProcessing) {
      setDisplayedText("");
      return;
    }

    const targetText = LOADING_MESSAGES[currentMessageIndex];
    let charIndex = 0;
    setDisplayedText("");

    const typeInterval = setInterval(() => {
      if (charIndex < targetText.length) {
        setDisplayedText(targetText.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        // Switch to next message after a brief pause
        setTimeout(() => {
          setCurrentMessageIndex(
            (prev) => (prev + 1) % LOADING_MESSAGES.length,
          );
        }, 1500);
      }
    }, 20); // Fast typing speed

    return () => clearInterval(typeInterval);
  }, [isProcessing, currentMessageIndex]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contextRef.current &&
        !contextRef.current.contains(e.target as Node)
      ) {
        setIsContextOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when context opens
  useEffect(() => {
    if (isContextOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isContextOpen]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Fetch available models
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/api/ai/models");
        if (res.ok) {
          const data = await res.json();
          setAvailableModels((data.allModels || []).filter((m: { available: boolean; brandName?: string; provider: string }) => m.available && (m.brandName || m.provider !== 'groq')));
          if (data.defaultModel) {
            setSelectedModel(data.defaultModel);
          }
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
      }
    }
    fetchModels();
    window.addEventListener("userApiKeysUpdated", fetchModels);
    return () => window.removeEventListener("userApiKeysUpdated", fetchModels);
  }, []);

  // Close model dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(e.target as Node)
      ) {
        setIsModelDropdownOpen(false);
      }
      if (
        inspirationRef.current &&
        !inspirationRef.current.contains(e.target as Node)
      ) {
        setIsInspirationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Track if we've already auto-executed for this mode
  const hasAutoExecutedRef = useRef<string | null>(null);

  // Handle initial mode - set prompt and auto-execute
  useEffect(() => {
    if (!isOpen || !initialMode) {
      hasAutoExecutedRef.current = null;
      return;
    }

    const mode = initialMode as AIMode;
    if (MODE_DEFAULT_PROMPTS[mode] === undefined) return;

    // Prevent re-executing if we've already done this mode
    if (hasAutoExecutedRef.current === initialMode) return;
    hasAutoExecutedRef.current = initialMode;

    // Set the active mode
    setActiveMode(mode);

    // Get the default prompt for this mode
    const defaultPrompt = MODE_DEFAULT_PROMPTS[mode];
    setInputValue(defaultPrompt);

    // Auto-add current page as context for context-aware modes
    if (
      currentPageInfo &&
      !contextItems.some((item) => item.id === currentPageInfo.page.id)
    ) {
      setContextItems([
        {
          id: currentPageInfo.page.id,
          name: currentPageInfo.page.name,
          type: "page",
          content: currentPageInfo.page.content || "",
        },
      ]);
    }

    // Auto-execute after a short delay to allow state to update
    const timer = setTimeout(() => {
      // Trigger submit programmatically
      handleAutoSubmit(mode, defaultPrompt);
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, initialMode, currentPageInfo]);

  // Separate function for auto-submit to avoid stale closure issues
  const handleAutoSubmit = async (mode: AIMode, prompt: string) => {
    setIsProcessing(true);
    setError(null);
    setResponse("");
    setPendingEdit(null);

    try {
      // Build context from current page
      let contextText = "";

      // Get selected text from editor if any
      if (editor) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const selectedText = editor.state.doc.textBetween(from, to, " ");
          contextText += `Selected text:\n${selectedText}\n\n`;
        }
      }

      // Add current page content as context
      if (currentPageInfo?.page.content) {
        const pageContent = currentPageInfo.page.content
          .replace(/<[^>]*>/g, " ")
          .trim();
        contextText += `Page content:\n${pageContent}\n\n`;
      }

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          prompt: prompt,
          mode: mode,
          model: selectedModel,
          provider: availableModels.find(m => m.id === selectedModel)?.provider,
          context: contextText,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Generation failed");
      }

      // Handle streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response stream");
      }

      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk
          .split("\n")
          .filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "chunk" && data.content) {
              fullResponse += data.content;
              setResponse(fullResponse);

              // Auto-scroll response
              if (responseRef.current) {
                responseRef.current.scrollTop =
                  responseRef.current.scrollHeight;
              }
            } else if (data.type === "error") {
              throw new Error(data.error);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsProcessing(false);
      setCurrentMessageIndex(0);
    }
  };

  // Get selected text from editor
  const getSelectedText = useCallback(() => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    if (from === to) return "";
    return editor.state.doc.textBetween(from, to, " ");
  }, [editor]);

  // Parse and create flashcards from AI response
  const handleFlashcardResponse = useCallback(
    async (responseText: string) => {
      try {
        let flashcards: { front: string; back: string }[] = [];

        // Helper function to try parsing JSON
        const tryParseFlashcards = (
          text: string,
        ): { front: string; back: string }[] | null => {
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Validate that it looks like flashcards
              if (parsed[0]?.front && parsed[0]?.back) {
                return parsed;
              }
            }
            return null;
          } catch {
            return null;
          }
        };

        // Helper to fix common JSON issues
        const fixJSON = (text: string): string => {
          let fixed = text.replace(/'([^']*)'/g, '"$1"');
          fixed = fixed.replace(
            /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
            '$1"$2":',
          );
          fixed = fixed.replace(/,\s*([\]}])/g, "$1");
          fixed = fixed.replace(/```json?/g, "").replace(/```/g, "");
          return fixed;
        };

        // Method 1: Try greedy JSON array extraction
        let jsonMatch = responseText.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          flashcards = tryParseFlashcards(jsonMatch[0]) || [];
          if (flashcards.length > 0)
            console.log("[Flashcard] Method 1 success:", flashcards.length);
        }

        // Method 2: Try to find JSON in code blocks
        if (flashcards.length === 0) {
          const codeBlockMatch = responseText.match(
            /```(?:json)?\s*(\[[\s\S]*?\])\s*```/,
          );
          if (codeBlockMatch) {
            flashcards = tryParseFlashcards(codeBlockMatch[1]) || [];
            if (flashcards.length > 0)
              console.log("[Flashcard] Method 2 success:", flashcards.length);
          }
        }

        // Method 3: Try with fixed JSON
        if (flashcards.length === 0) {
          const fixed = fixJSON(responseText);
          flashcards = tryParseFlashcards(fixed) || [];
          if (flashcards.length > 0)
            console.log("[Flashcard] Method 3 success:", flashcards.length);
        }

        // Method 4: Try to parse markdown table format
        if (flashcards.length === 0) {
          const tableRows = responseText.match(/\|([^|]+)\|([^|]+)\|/g);
          if (tableRows && tableRows.length > 1) {
            const dataRows = tableRows.filter(
              (row) =>
                !row.includes("---") && !row.toLowerCase().includes("front"),
            );
            flashcards = dataRows
              .map((row) => {
                const cells = row.split("|").filter((c) => c.trim());
                return {
                  front: cells[0]?.trim() || "",
                  back: cells[1]?.trim() || "",
                };
              })
              .filter((card) => card.front && card.back);
            if (flashcards.length > 0)
              console.log("[Flashcard] Method 4 success:", flashcards.length);
          }
        }

        // Method 5: Try extracting from "front": "back" patterns
        if (flashcards.length === 0) {
          const pairMatches = responseText.match(
            /"front"\s*:\s*"[^"]+"\s*,\s*"back"\s*:\s*"[^"]+"/g,
          );
          if (pairMatches) {
            const fixed = fixJSON(`[${pairMatches.join(",")}]`);
            flashcards = tryParseFlashcards(fixed) || [];
            if (flashcards.length > 0)
              console.log("[Flashcard] Method 5 success:", flashcards.length);
          }
        }

        if (flashcards.length === 0) {
          throw new Error(
            "Could not parse flashcard data. The AI response was not in the expected format.",
          );
        }

        console.log("[Flashcard] Parsed flashcards:", flashcards.length);

        // Create a new deck
        const currentPageInfo = activePage ? getPageById(activePage) : null;
        const deckTitle = currentPageInfo?.page.name
          ? `Flashcards: ${currentPageInfo.page.name}`
          : `Flashcards ${new Date().toLocaleDateString()}`;

        const deck = await createDeck(
          deckTitle,
          "AI-generated flashcards",
          activePage || undefined,
        );

        if (deck) {
          // Create cards in the deck
          for (const card of flashcards) {
            await createCard(deck.id, card.front, card.back);
          }

          setCurrentDeck(deck);
          openFlashcardModal("list");
          setResponse(
            `Created ${flashcards.length} flashcards in "${deckTitle}"! Opening flashcard deck...`,
          );

          // Close input after a delay
          setTimeout(() => {
            onClose();
            setResponse("");
            setInputValue("");
          }, 1500);
        }
      } catch (err) {
        console.error("Failed to create flashcards:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create flashcards",
        );
      }
    },
    [
      activePage,
      getPageById,
      createDeck,
      createCard,
      setCurrentDeck,
      openFlashcardModal,
      onClose,
    ],
  );

  // Parse and create quiz from AI response
  const handleQuizResponse = useCallback(
    async (responseText: string) => {
      try {
        let questions: {
          type: string;
          question: string;
          options?: string[];
          correctAnswer: string;
          explanation?: string;
          difficulty: string;
          points: number;
        }[] = [];

        console.log("[Quiz] Raw response length:", responseText.length);
        console.log(
          "[Quiz] Raw response preview:",
          responseText.substring(0, 300),
        );

        // Helper function to try parsing JSON
        const tryParse = (
          text: string,
        ):
          | {
              type: string;
              question: string;
              options?: string[];
              correctAnswer: string;
              explanation?: string;
              difficulty: string;
              points: number;
            }[]
          | null => {
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Validate that it looks like quiz questions
              if (parsed[0]?.question && parsed[0]?.correctAnswer) {
                return parsed;
              }
            }
            return null;
          } catch {
            return null;
          }
        };

        // Helper to normalize type strings to valid QuestionType
        const normalizeType = (type: string): string => {
          const t = type.toLowerCase().replace(/[-_\s]/g, "-");
          if (t.includes("multiple") && t.includes("select"))
            return "multiple-select";
          if (t.includes("multiple")) return "multiple-choice";
          if (
            t.includes("true-false") ||
            t.includes("truefalse") ||
            t === "boolean"
          )
            return "true-false";
          if (t.includes("fill") || t.includes("blank")) return "fill-blank";
          if (t.includes("short")) return "short-answer";
          return "multiple-choice"; // default
        };

        // Helper to fix common JSON issues
        const fixJSON = (text: string): string => {
          // Fix single quotes to double quotes
          let fixed = text.replace(/'([^']*)'/g, '"$1"');
          // Fix missing quotes around keys
          fixed = fixed.replace(
            /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
            '$1"$2":',
          );
          // Fix trailing commas
          fixed = fixed.replace(/,\s*([\]}])/g, "$1");
          // Remove any markdown code block markers
          fixed = fixed.replace(/```json?/g, "").replace(/```/g, "");
          return fixed;
        };

        // Method 1: Try greedy JSON array extraction
        let jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = tryParse(jsonMatch[0]) || [];
          if (questions.length > 0)
            console.log(
              "[Quiz] Method 1 success:",
              questions.length,
              "questions",
            );
        }

        // Method 2: Try to find JSON in code blocks (markdown)
        if (questions.length === 0) {
          const codeBlockMatch = responseText.match(
            /```(?:json)?\s*(\[[\s\S]*?\])\s*```/,
          );
          if (codeBlockMatch) {
            questions = tryParse(codeBlockMatch[1]) || [];
            if (questions.length > 0)
              console.log(
                "[Quiz] Method 2 success:",
                questions.length,
                "questions",
              );
          }
        }

        // Method 3: Clean response and try parsing
        if (questions.length === 0) {
          const startIdx = responseText.indexOf("[");
          const endIdx = responseText.lastIndexOf("]");
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            const cleaned = responseText.substring(startIdx, endIdx + 1);
            questions = tryParse(cleaned) || [];
            if (questions.length > 0)
              console.log(
                "[Quiz] Method 3 success:",
                questions.length,
                "questions",
              );
          }
        }

        // Method 4: Try with fixed JSON (common AI mistakes)
        if (questions.length === 0) {
          const fixed = fixJSON(responseText);
          questions = tryParse(fixed) || [];
          if (questions.length > 0)
            console.log(
              "[Quiz] Method 4 success:",
              questions.length,
              "questions",
            );
        }

        // Method 5: Try finding JSON array with more flexible regex
        if (questions.length === 0) {
          const flexibleMatch = responseText.match(
            /\[[\s\S]*?"[^"]+"\s*:[\s\S]*?\]/,
          );
          if (flexibleMatch) {
            questions = tryParse(flexibleMatch[0]) || [];
            if (questions.length > 0)
              console.log(
                "[Quiz] Method 5 success:",
                questions.length,
                "questions",
              );
          }
        }

        // Method 6: Try to extract and fix individual question objects
        if (questions.length === 0) {
          const questionMatches = responseText.match(/{[^}]*"question"[^}]*}/g);
          if (questionMatches) {
            const parsedQuestions = questionMatches
              .map((q) => {
                const fixed = fixJSON(q);
                return tryParse(`[${fixed}]`)?.[0];
              })
              .filter(Boolean);
            if (parsedQuestions.length > 0) {
              questions = parsedQuestions as any;
              console.log(
                "[Quiz] Method 6 success:",
                questions.length,
                "questions",
              );
            }
          }
        }

        // Method 7: Last resort - try extracting from any curly brace arrays
        if (questions.length === 0) {
          const allArrays = responseText.match(/\[[\s\S]{20,500}\]/g);
          if (allArrays) {
            for (const arr of allArrays) {
              const parsed = tryParse(arr);
              if (parsed && parsed.length > 0) {
                questions = parsed;
                console.log(
                  "[Quiz] Method 7 success:",
                  questions.length,
                  "questions",
                );
                break;
              }
            }
          }
        }

        if (questions.length === 0) {
          throw new Error(
            "Could not parse quiz data. The AI did not return valid JSON. Please try again.",
          );
        }

        // Normalize question types to valid QuestionType
        const normalizedQuestions = questions.map(
          (q): Omit<import("@/context/QuizContext").QuizQuestion, "id"> => ({
            question: q.question,
            type: normalizeType(q.type) as QuestionType,
            options: q.options || [],
            correctAnswer: Array.isArray(q.correctAnswer)
              ? q.correctAnswer[0]
              : q.correctAnswer,
            explanation: q.explanation,
            difficulty:
              (q.difficulty as "easy" | "medium" | "hard") || "medium",
            points: q.points || 1,
          }),
        );

        console.log("[Quiz] Parsed questions:", normalizedQuestions.length);

        // Create a new quiz
        const currentPageInfo = activePage ? getPageById(activePage) : null;
        const quizTitle = currentPageInfo?.page.name
          ? `Quiz: ${currentPageInfo.page.name}`
          : `Quiz ${new Date().toLocaleDateString()}`;

        const quiz = await createQuiz(quizTitle, normalizedQuestions);

        if (quiz) {
          openQuizModal("list");
          setResponse(
            `Created quiz with ${normalizedQuestions.length} questions! Opening quiz...`,
          );

          // Close input after a delay
          setTimeout(() => {
            onClose();
            setResponse("");
            setInputValue("");
          }, 1500);
        }
      } catch (err) {
        console.error("Failed to create quiz:", err);
        setError(err instanceof Error ? err.message : "Failed to create quiz");
      }
    },
    [activePage, getPageById, createQuiz, openQuizModal, onClose],
  );

  const handleSubmit = async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setResponse("");
    setPendingEdit(null);

    try {
      // Build context from selected items and current selection
      let contextText = "";
      const selectedText = getSelectedText();

      if (selectedText) {
        contextText += `Selected text:\n${selectedText}\n\n`;
      }

      // Add context from selected pages
      for (const item of contextItems) {
        if (item.content) {
          contextText += `From "${item.name}":\n${item.content}\n\n`;
        }
      }

      // Detect natural language commands for quiz/flashcard
      const detectedMode = detectAICommand(inputValue.trim());
      const modeToUse = activeMode || detectedMode || "answer";

      console.log("[AI Input] Input:", inputValue.trim());
      console.log("[AI Input] Detected mode:", detectedMode);
      console.log("[AI Input] Active mode:", activeMode);
      console.log("[AI Input] Using mode:", modeToUse);

      // If quiz/flashcard mode but no context, add current page
      if ((modeToUse === "quiz" || modeToUse === "flashcard") && !contextText) {
        const currentPageInfo = activePage ? getPageById(activePage) : null;
        if (currentPageInfo?.page.content) {
          const pageContent = currentPageInfo.page.content
            .replace(/<[^>]*>/g, " ")
            .trim();
          contextText = `Page content:\n${pageContent}\n\n`;
        }
      }

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          prompt: inputValue.trim(),
          mode: modeToUse,
          model: selectedModel,
          provider: availableModels.find(m => m.id === selectedModel)?.provider,
          context: contextText,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Generation failed");
      }

      // Handle streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response stream");
      }

      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk
          .split("\n")
          .filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "chunk" && data.content) {
              fullResponse += data.content;
              setResponse(fullResponse);

              // Auto-scroll response
              if (responseRef.current) {
                responseRef.current.scrollTop =
                  responseRef.current.scrollHeight;
              }
            } else if (data.type === "error") {
              throw new Error(data.error);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Handle quiz/flashcard responses after streaming completes
      if (modeToUse === "flashcard" && fullResponse) {
        await handleFlashcardResponse(fullResponse);
      } else if (modeToUse === "quiz" && fullResponse) {
        await handleQuizResponse(fullResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsProcessing(false);
      setCurrentMessageIndex(0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (pendingEdit) {
        setPendingEdit(null);
      } else {
        onClose();
      }
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachedFiles((prev) => [...prev, ...Array.from(files)]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeContextItem = (id: string) => {
    setContextItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const addCurrentPage = () => {
    if (
      currentPageInfo &&
      !contextItems.some((item) => item.id === currentPageInfo.page.id)
    ) {
      setContextItems((prev) => [
        ...prev,
        {
          id: currentPageInfo.page.id,
          name: currentPageInfo.page.name,
          type: "page",
          content: currentPageInfo.page.content || "",
        },
      ]);
    }
    setIsContextOpen(false);
    setSearchQuery("");
  };

  const addPage = (page: Page) => {
    if (!contextItems.some((item) => item.id === page.id)) {
      setContextItems((prev) => [
        ...prev,
        {
          id: page.id,
          name: page.name,
          type: "page",
          content: page.content || "",
        },
      ]);
    }
    setIsContextOpen(false);
    setSearchQuery("");
  };

  // Request to edit the page - shows approval dialog
  const requestEdit = (action: "insert" | "replace") => {
    if (!response) return;
    setPendingEdit({ content: response, action });
  };

  // Approve and apply the edit
  const approveEdit = async () => {
    if (!pendingEdit || !editor) return;

    const content = pendingEdit.content;

    // Check if content contains mermaid code block (handle various formats)
    // Match ```mermaid with optional whitespace and newlines
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/g;
    const mermaidMatches = [...content.matchAll(mermaidRegex)];

    console.log("Content to insert:", content);
    console.log("Mermaid matches found:", mermaidMatches.length);

    if (mermaidMatches.length > 0) {
      // Content has mermaid diagrams - insert them as MermaidNode
      let lastIndex = 0;
      const chain = editor.chain().focus();

      if (pendingEdit.action === "replace") {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          chain.deleteRange({ from, to });
        }
      }

      for (const match of mermaidMatches) {
        // Insert text before this mermaid block
        const textBefore = content.slice(lastIndex, match.index).trim();
        if (textBefore) {
          const htmlBefore = await marked.parse(textBefore, {
            gfm: true,
            breaks: true,
          });
          chain.insertContent(htmlBefore);
        }

        // Insert the mermaid diagram as a node
        const chartCode = match[1].trim();
        chain.insertContent({
          type: "mermaid",
          attrs: { chart: chartCode },
        });

        lastIndex = (match.index || 0) + match[0].length;
      }

      // Insert any remaining text after the last mermaid block
      const textAfter = content.slice(lastIndex).trim();
      if (textAfter) {
        const htmlAfter = await marked.parse(textAfter, {
          gfm: true,
          breaks: true,
        });
        chain.insertContent(htmlAfter);
      }

      chain.run();
    } else {
      // No mermaid diagrams - convert markdown to HTML for TipTap
      const htmlContent = await marked.parse(content, {
        gfm: true,
        breaks: true,
      });

      if (pendingEdit.action === "insert") {
        editor.chain().focus().insertContent(htmlContent).run();
      } else {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          editor
            .chain()
            .focus()
            .deleteRange({ from, to })
            .insertContent(htmlContent)
            .run();
        } else {
          editor.chain().focus().insertContent(htmlContent).run();
        }
      }
    }

    setPendingEdit(null);
    setResponse("");
    setInputValue("");
    onClose();
  };

  // Copy response to clipboard
  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(response);
    }
  };

  // Clear and regenerate
  const regenerate = () => {
    setResponse("");
    setError(null);
    handleSubmit();
  };

  // Clear everything
  const clearAll = () => {
    setResponse("");
    setError(null);
    setInputValue("");
    setContextItems([]);
    setAttachedFiles([]);
    setPendingEdit(null);
  };

  // always keep the ai box open
  if (!isOpen) return null;

  const outputHeight = isExpanded ? "h-96" : "h-48";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pt-6 pb-4 px-4 pointer-events-none">
      <div className="max-w-4xl mx-auto relative pointer-events-auto">
        {/* Output Area - Solid design */}
        {(response || isProcessing || error) && (
          <div
            className="mb-4 rounded-[32px] overflow-hidden transition-all duration-300 bg-white dark:bg-[#1C1C1C] border border-neutral-200 dark:border-neutral-800"
          >
            {/* Header - minimal with circle buttons */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-all"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <CollapseIcon className="w-4 h-4" />
                ) : (
                  <ExpandIcon className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={clearAll}
                className="w-8 h-8 rounded-full bg-neutral-100/50 hover:bg-neutral-200/50 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:text-zinc-400 dark:hover:text-white transition-all shadow-sm"
                title="Clear"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Response Content */}
            <div
              className={`${outputHeight} transition-all duration-300 relative`}
            >
              <div
                ref={responseRef}
                className="h-full overflow-y-auto px-5 py-4 text-neutral-800 dark:text-zinc-200"
              >
                {isProcessing && !response && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 shrink-0">
                      <DotLottieReact
                        src={LOTTIE[currentMessageIndex]}
                        loop
                        autoplay
                        style={{
                          width: "100%",
                          height: "100%",
                          background: "transparent",
                        }}
                      />
                    </div>
                    <span className="text-sm text-neutral-500 dark:text-zinc-400">
                      {displayedText}
                      <span className="animate-pulse">|</span>
                    </span>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-3 rounded-xl">
                    <ErrorIcon className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {response && (
                  <div
                    className="prose dark:prose-invert prose-sm max-w-none
                    prose-headings:text-neutral-900 dark:prose-headings:text-zinc-100 prose-headings:font-semibold
                    prose-h1:text-xl prose-h1:mt-4 prose-h1:mb-2
                    prose-h2:text-lg prose-h2:mt-3 prose-h2:mb-2
                    prose-h3:text-base prose-h3:mt-2 prose-h3:mb-1
                    prose-p:text-neutral-700 dark:prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:my-2
                    prose-strong:text-neutral-900 dark:prose-strong:text-zinc-100 prose-strong:font-semibold
                    prose-em:text-neutral-700 dark:prose-em:text-zinc-300
                    prose-code:text-indigo-600 dark:prose-code:text-indigo-300 prose-code:bg-indigo-50 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-transparent prose-pre:p-0 prose-pre:my-3
                    prose-ul:my-2 prose-ul:pl-4 prose-li:text-zinc-300 prose-li:my-0.5
                    prose-ol:my-2 prose-ol:pl-4
                    prose-blockquote:border-l-2 prose-blockquote:border-indigo-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-zinc-400
                    prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
                  "
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          const isInline = !match && !className;
                          const codeContent = String(children).replace(
                            /\n$/,
                            "",
                          );

                          if (isInline) {
                            return (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          }

                          // Render Mermaid diagrams
                          if (match && match[1] === "mermaid") {
                            return (
                              <div className="my-3">
                                <MermaidChart chart={codeContent} />
                              </div>
                            );
                          }

                          return (
                            <div className="relative group my-3">
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(codeContent);
                                  }}
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
                                style={oneDark}
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
                          );
                        },
                        h1: ({ children }) => (
                          <h1 className="text-xl font-semibold text-zinc-100 mt-4 mb-2">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-lg font-semibold text-zinc-100 mt-3 mb-2">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-base font-semibold text-zinc-100 mt-2 mb-1">
                            {children}
                          </h3>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside space-y-1 my-2 text-zinc-300">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside space-y-1 my-2 text-zinc-300">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-zinc-300">{children}</li>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-indigo-500 pl-4 italic text-zinc-400 my-2">
                            {children}
                          </blockquote>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-3">
                            <table className="min-w-full border border-white/10 rounded-lg overflow-hidden">
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({ children }) => (
                          <th className="bg-white/5 px-3 py-2 text-left text-xs font-semibold text-zinc-200 border-b border-white/10">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-3 py-2 text-sm text-zinc-300 border-b border-white/5">
                            {children}
                          </td>
                        ),
                      }}
                    >
                      {response}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Response Actions - Circle buttons */}
              {response && !pendingEdit && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {editor && (
                    <>
                      <button
                        onClick={() => requestEdit("insert")}
                        className="w-8 h-8 rounded-full bg-indigo-500/80 hover:bg-indigo-500 flex items-center justify-center text-white transition-all shadow-lg"
                        title="Insert"
                      >
                        <InsertIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => requestEdit("replace")}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-all"
                        title="Replace"
                      >
                        <ReplaceIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={copyResponse}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-all"
                    title="Copy"
                  >
                    <CopyIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={regenerate}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-all"
                    title="Regenerate"
                  >
                    <RegenerateIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Edit Approval Dialog */}
            {pendingEdit && (
              <div
                className="absolute inset-0 flex items-center justify-center z-20"
                style={{
                  background: "rgba(0, 0, 0, 0.8)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                <div className="text-center px-6">
                  <h3 className="text-base font-semibold text-white mb-2">
                    {pendingEdit.action === "insert"
                      ? "Insert content?"
                      : "Replace selection?"}
                  </h3>
                  <p className="text-zinc-400 text-xs mb-4">
                    This will{" "}
                    {pendingEdit.action === "insert" ? "add" : "replace"}{" "}
                    content in your document.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setPendingEdit(null)}
                      className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-all"
                      title="Cancel"
                    >
                      <CloseIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={approveEdit}
                      className="w-10 h-10 rounded-full bg-green-500/80 hover:bg-green-500 flex items-center justify-center text-white transition-all shadow-lg"
                      title="Approve"
                    >
                      <CheckIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Context Items Preview */}
        {contextItems.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 px-1">
            {contextItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-1.5 text-sm"
              >
                <PageIcon className="w-4 h-4 text-indigo-500" />
                <span className="max-w-[150px] truncate text-indigo-700 dark:text-indigo-300">
                  {item.name}
                </span>
                <button
                  onClick={() => removeContextItem(item.id)}
                  className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 px-1">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-1.5 text-sm"
              >
                <FileIcon className="w-4 h-4 text-neutral-500" />
                <span className="max-w-[150px] truncate text-neutral-700 dark:text-neutral-300">
                  {file.name}
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main Input Container */}
        <div className="relative flex flex-col bg-white dark:bg-[#1C1C1C] rounded-[32px] border border-neutral-200 dark:border-neutral-800 p-2">
          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to help with your notes..."
            rows={1}
            disabled={isProcessing}
            className="w-full bg-transparent px-4 pt-3 pb-2 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 resize-none focus:outline-none text-base max-h-50 disabled:opacity-50"
          />

          {/* Bottom Actions */}
          <div className="flex items-center justify-between mt-2 pl-2 pr-1 pb-1">
            <div className="flex items-center gap-2">
              {/* Plus Button for Upload */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center w-10 h-10 border border-neutral-200 dark:border-neutral-700 rounded-full text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  title="Upload file"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Inspiration Button */}
              <div className="relative" ref={inspirationRef}>
                <button
                  type="button"
                  onClick={() => setIsInspirationOpen(!isInspirationOpen)}
                  className="hidden sm:flex items-center gap-1.5 px-4 h-10 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  {activeToolObj ? (
                    activeToolObj.icon
                  ) : (
                    <SparklesIcon className="w-4 h-4 text-green-500" />
                  )}
                  {activeToolObj ? activeToolObj.label : "Inspiration"}
                  <ChevronDownIcon className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
                </button>

                {isInspirationOpen && (
                  <div className="absolute bottom-full left-0 mb-3 w-56 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-neutral-100 dark:border-neutral-800 overflow-hidden z-50 p-2">
                    {[
                      {
                        id: "summarize",
                        label: "Summarize",
                        icon: (
                          <AlignLeftIcon className="w-4 h-4 text-neutral-500" />
                        ),
                      },
                      {
                        id: "improve",
                        label: "Improve writing",
                        icon: <WandIcon className="w-4 h-4 text-neutral-500" />,
                      },
                      {
                        id: "explain",
                        label: "Explain",
                        icon: (
                          <MessageCircleIcon className="w-4 h-4 text-neutral-500" />
                        ),
                      },
                      {
                        id: "flowchart",
                        label: "Create flowchart",
                        icon: (
                          <GitCommitIcon className="w-4 h-4 text-neutral-500" />
                        ),
                      },
                      {
                        id: "quiz",
                        label: "Generate quiz",
                        icon: (
                          <HelpCircleIcon className="w-4 h-4 text-neutral-500" />
                        ),
                      },
                      {
                        id: "flashcard",
                        label: "Make flashcards",
                        icon: (
                          <CardsIcon className="w-4 h-4 text-neutral-500" />
                        ),
                      },
                    ].map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => {
                          setInputValue(
                            MODE_DEFAULT_PROMPTS[tool.id as AIMode],
                          );
                          setActiveMode(tool.id as AIMode);
                          setIsInspirationOpen(false);
                          setTimeout(() => textareaRef.current?.focus(), 0);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                      >
                        {tool.icon}
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          {tool.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Model Selector */}
              <div className="relative" ref={modelDropdownRef}>
                <button
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3 h-10 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-colors disabled:opacity-50"
                  title="Select AI model"
                >
                  <span className="truncate max-w-24 sm:max-w-none">
                    {(() => { const m = availableModels.find((m) => m.id === selectedModel); return m?.brandName || m?.name?.split(" ")[0] || "Model"; })()}
                  </span>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {/* Model Dropdown */}
                {isModelDropdownOpen && (
                  <div className="absolute bottom-full right-0 mb-3 w-64 bg-white dark:bg-[#1C1C1C] rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-[0_4px_24px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden z-50">
                    <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
                      <p className="text-xs font-medium text-neutral-500 px-2">
                        Select Model
                      </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1.5">
                      {availableModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            if (model.available) {
                              setSelectedModel(model.id);
                              setIsModelDropdownOpen(false);
                            }
                          }}
                          disabled={!model.available}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                            selectedModel === model.id
                              ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                              : model.available
                                ? "text-neutral-700 dark:text-neutral-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                : "text-neutral-400 dark:text-neutral-600 cursor-not-allowed opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">
                                  {model.brandName || model.name}
                                </span>
                                {!model.available && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-500 dark:text-zinc-400 shrink-0">
                                    Unavailable
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-500 dark:text-neutral-500 truncate mt-0.5">
                                {model.description}
                              </p>
                            </div>
                            {selectedModel === model.id && model.available && (
                              <CheckIcon className="w-4 h-4 text-indigo-500 shrink-0 ml-2" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Send Button */}
              <button
                onClick={handleSubmit}
                disabled={
                  isProcessing ||
                  (!inputValue.trim() && attachedFiles.length === 0)
                }
                className="flex items-center justify-center w-10 h-10 ml-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Send"
              >
                {isProcessing ? (
                  <LoadingIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowUpIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Helper Text */}
        <p className="text-center text-xs text-neutral-400 dark:text-neutral-600 mt-2">
          Add context with{" "}
          <span className="inline-flex items-center gap-0.5">
            <PlusIcon className="w-3 h-3" />
          </span>{" "}
          to help AI understand your request better
        </p>
      </div>
    </div>
  );
};

const DocumentIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const AlignLeftIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="15" x2="3" y1="12" y2="12" />
    <line x1="17" x2="3" y1="18" y2="18" />
  </svg>
);

const WandIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 4V2" />
    <path d="M15 16v-2" />
    <path d="M8 9h2" />
    <path d="M20 9h2" />
    <path d="M17.8 11.8 19 13" />
    <path d="M15 9h.01" />
    <path d="M17.8 6.2 19 5" />
    <path d="m3 21 9-9" />
    <path d="M12.2 6.2 11 5" />
  </svg>
);

const MessageCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </svg>
);

const GitCommitIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <line x1="3" x2="9" y1="12" y2="12" />
    <line x1="15" x2="21" y1="12" y2="12" />
  </svg>
);

const HelpCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

const CardsIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

const CubeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" x2="12" y1="22.08" y2="12" />
  </svg>
);

// Icons
const ArrowUpIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const UploadIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const FileIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const PageIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" x2="16" y1="13" y2="13" />
    <line x1="8" x2="16" y1="17" y2="17" />
  </svg>
);

const CurrentPageIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M12 2v6h6" />
    <circle cx="12" cy="15" r="2" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const LoadingIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 2v4" />
    <path d="M12 18v4" />
    <path d="m4.93 4.93 2.83 2.83" />
    <path d="m16.24 16.24 2.83 2.83" />
    <path d="M2 12h4" />
    <path d="M18 12h4" />
    <path d="m4.93 19.07 2.83-2.83" />
    <path d="m16.24 7.76 2.83-2.83" />
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const RegenerateIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const ExpandIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" x2="14" y1="3" y2="10" />
    <line x1="3" x2="10" y1="21" y2="14" />
  </svg>
);

const CollapseIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" x2="21" y1="10" y2="3" />
    <line x1="3" x2="10" y1="21" y2="14" />
  </svg>
);

const ErrorIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

const InsertIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const ReplaceIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 3h5v5" />
    <path d="M8 21H3v-5" />
    <path d="M21 3L14 10" />
    <path d="M3 21l7-7" />
  </svg>
);

const ModelIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

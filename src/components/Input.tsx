"use client";

import { useState, useRef, KeyboardEvent, ChangeEvent, useEffect, useCallback } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useNotes, Page, Folder } from "@/context/NotesContext";
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
const NOTES_LOTTIE = "/lottie/Notes.lottie";

interface ContextItem {
  id: string;
  name: string;
  type: "page";
  content?: string;
}

interface PendingEdit {
  content: string;
  action: 'insert' | 'replace';
}

import type { AIMode } from "@/types/ai";

// Default prompts for each AI mode
const MODE_DEFAULT_PROMPTS: Record<AIMode, string> = {
  answer: "",
  expand: "Expand on this content with more details and examples",
  summarize: "Summarize the key points from this content",
  translate: "Translate this content to English",
  explain: "Explain this content in simpler terms",
  improve: "Improve the writing quality of this content",
  flowchart: "Create a flowchart visualizing the concepts and relationships in this content",
};

interface InputProps {
  isOpen: boolean;
  onClose: () => void;
  editor?: Editor | null;
  pageId?: string;
  initialMode?: string | null;
}

export const Input = ({ isOpen, onClose, editor, pageId, initialMode }: InputProps) => {
  const { folders, activePage, getPageById } = useNotes();
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  // Get all pages from folders recursively
  const getAllPages = useCallback((folderList: Folder[]): { page: Page; folderName: string }[] => {
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
  }, []);

  const allPages = getAllPages(folders);

  // Filter pages based on search
  const filteredPages = allPages.filter(({ page }) =>
    page.name.toLowerCase().includes(searchQuery.toLowerCase())
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
          setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 1500);
      }
    }, 20); // Fast typing speed

    return () => clearInterval(typeInterval);
  }, [isProcessing, currentMessageIndex]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
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
    if (currentPageInfo && !contextItems.some((item) => item.id === currentPageInfo.page.id)) {
      setContextItems([{
        id: currentPageInfo.page.id,
        name: currentPageInfo.page.name,
        type: "page",
        content: currentPageInfo.page.content || ''
      }]);
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
      let contextText = '';

      // Get selected text from editor if any
      if (editor) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const selectedText = editor.state.doc.textBetween(from, to, ' ');
          contextText += `Selected text:\n${selectedText}\n\n`;
        }
      }

      // Add current page content as context
      if (currentPageInfo?.page.content) {
        const pageContent = currentPageInfo.page.content.replace(/<[^>]*>/g, ' ').trim();
        contextText += `Page content:\n${pageContent}\n\n`;
      }

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          prompt: prompt,
          mode: mode,
          model: 'compound-beta',
          context: contextText,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      // Handle streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream');
      }

      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'chunk' && data.content) {
              fullResponse += data.content;
              setResponse(fullResponse);

              // Auto-scroll response
              if (responseRef.current) {
                responseRef.current.scrollTop = responseRef.current.scrollHeight;
              }
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsProcessing(false);
      setCurrentMessageIndex(0);
    }
  };

  // Get selected text from editor
  const getSelectedText = useCallback(() => {
    if (!editor) return '';
    const { from, to } = editor.state.selection;
    if (from === to) return '';
    return editor.state.doc.textBetween(from, to, ' ');
  }, [editor]);

  const handleSubmit = async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setResponse("");
    setPendingEdit(null);

    try {
      // Build context from selected items and current selection
      let contextText = '';
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

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          prompt: inputValue.trim(),
          mode: activeMode || 'answer',
          model: 'compound-beta',
          context: contextText,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      // Handle streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream');
      }

      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'chunk' && data.content) {
              fullResponse += data.content;
              setResponse(fullResponse);

              // Auto-scroll response
              if (responseRef.current) {
                responseRef.current.scrollTop = responseRef.current.scrollHeight;
              }
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
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
    if (currentPageInfo && !contextItems.some((item) => item.id === currentPageInfo.page.id)) {
      setContextItems((prev) => [
        ...prev,
        {
          id: currentPageInfo.page.id,
          name: currentPageInfo.page.name,
          type: "page",
          content: currentPageInfo.page.content || ''
        },
      ]);
    }
    setIsContextOpen(false);
    setSearchQuery("");
  };

  const addPage = (page: Page) => {
    if (!contextItems.some((item) => item.id === page.id)) {
      setContextItems((prev) => [...prev, {
        id: page.id,
        name: page.name,
        type: "page",
        content: page.content || ''
      }]);
    }
    setIsContextOpen(false);
    setSearchQuery("");
  };

  // Request to edit the page - shows approval dialog
  const requestEdit = (action: 'insert' | 'replace') => {
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

    console.log('Content to insert:', content);
    console.log('Mermaid matches found:', mermaidMatches.length);

    if (mermaidMatches.length > 0) {
      // Content has mermaid diagrams - insert them as MermaidNode
      let lastIndex = 0;
      const chain = editor.chain().focus();

      if (pendingEdit.action === 'replace') {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          chain.deleteRange({ from, to });
        }
      }

      for (const match of mermaidMatches) {
        // Insert text before this mermaid block
        const textBefore = content.slice(lastIndex, match.index).trim();
        if (textBefore) {
          const htmlBefore = await marked.parse(textBefore, { gfm: true, breaks: true });
          chain.insertContent(htmlBefore);
        }

        // Insert the mermaid diagram as a node
        const chartCode = match[1].trim();
        chain.insertContent({
          type: 'mermaid',
          attrs: { chart: chartCode },
        });

        lastIndex = (match.index || 0) + match[0].length;
      }

      // Insert any remaining text after the last mermaid block
      const textAfter = content.slice(lastIndex).trim();
      if (textAfter) {
        const htmlAfter = await marked.parse(textAfter, { gfm: true, breaks: true });
        chain.insertContent(htmlAfter);
      }

      chain.run();
    } else {
      // No mermaid diagrams - convert markdown to HTML for TipTap
      const htmlContent = await marked.parse(content, {
        gfm: true,
        breaks: true,
      });

      if (pendingEdit.action === 'insert') {
        editor.chain().focus().insertContent(htmlContent).run();
      } else {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          editor.chain().focus().deleteRange({ from, to }).insertContent(htmlContent).run();
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

  if (!isOpen) return null;

  const outputHeight = isExpanded ? 'h-96' : 'h-48';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pt-6 pb-4 px-4">
      {/* Backdrop blur */}
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
        {/* Output Area - Glass design */}
        {(response || isProcessing || error) && (
          <div
            className={`mb-4 rounded-2xl overflow-hidden transition-all duration-300 border border-white/10`}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* Header - minimal with circle buttons */}
            <div className="flex items-center justify-between px-3 py-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <CollapseIcon className="w-3.5 h-3.5" />
                ) : (
                  <ExpandIcon className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={clearAll}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                title="Clear"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Response Content */}
            <div className={`${outputHeight} transition-all duration-300 relative`}>
              <div
                ref={responseRef}
                className="h-full overflow-y-auto px-4 py-3 text-zinc-200"
              >
                {isProcessing && !response && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 shrink-0">
                      <DotLottieReact
                        src={NOTES_LOTTIE}
                        loop
                        autoplay
                        style={{ width: "100%", height: "100%" }}
                      />
                    </div>
                    <span className="text-sm text-zinc-400">
                      {displayedText}
                      <span className="animate-pulse">|</span>
                    </span>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-3 rounded-xl">
                    <ErrorIcon className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {response && (
                  <div className="prose prose-invert prose-sm max-w-none
                    prose-headings:text-zinc-100 prose-headings:font-semibold
                    prose-h1:text-xl prose-h1:mt-4 prose-h1:mb-2
                    prose-h2:text-lg prose-h2:mt-3 prose-h2:mb-2
                    prose-h3:text-base prose-h3:mt-2 prose-h3:mb-1
                    prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:my-2
                    prose-strong:text-zinc-100 prose-strong:font-semibold
                    prose-em:text-zinc-300
                    prose-code:text-indigo-300 prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-transparent prose-pre:p-0 prose-pre:my-3
                    prose-ul:my-2 prose-ul:pl-4 prose-li:text-zinc-300 prose-li:my-0.5
                    prose-ol:my-2 prose-ol:pl-4
                    prose-blockquote:border-l-2 prose-blockquote:border-indigo-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-zinc-400
                    prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
                  ">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          const isInline = !match && !className;
                          const codeContent = String(children).replace(/\n$/, "");

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
                          <h1 className="text-xl font-semibold text-zinc-100 mt-4 mb-2">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-lg font-semibold text-zinc-100 mt-3 mb-2">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-base font-semibold text-zinc-100 mt-2 mb-1">{children}</h3>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside space-y-1 my-2 text-zinc-300">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside space-y-1 my-2 text-zinc-300">{children}</ol>
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
                        onClick={() => requestEdit('insert')}
                        className="w-8 h-8 rounded-full bg-indigo-500/80 hover:bg-indigo-500 flex items-center justify-center text-white transition-all shadow-lg"
                        title="Insert"
                      >
                        <InsertIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => requestEdit('replace')}
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
                  background: 'rgba(0, 0, 0, 0.8)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              >
                <div className="text-center px-6">
                  <h3 className="text-base font-semibold text-white mb-2">
                    {pendingEdit.action === 'insert' ? 'Insert content?' : 'Replace selection?'}
                  </h3>
                  <p className="text-zinc-400 text-xs mb-4">
                    This will {pendingEdit.action === 'insert' ? 'add' : 'replace'} content in your document.
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
        <div className="relative flex items-end gap-2 backdrop-blur-2xl bg-zinc-900/10 dark:bg-zinc-100/5 rounded-xl dark:border-zinc-600/40 border border-zinc-200/60 shadow-lg">
          {/* Plus Button for Context */}
          <div className="relative" ref={contextRef}>
            <button
              onClick={() => setIsContextOpen(!isContextOpen)}
              className="p-3 ml-1 my-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 rounded-lg transition-all"
              title="Add context"
            >
              <PlusIcon className="w-5 h-5" />
            </button>

            {/* Context Popover */}
            {isContextOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xl overflow-hidden z-50">
                {/* Search Input */}
                <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pages..."
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-neutral-900 dark:text-white placeholder-neutral-400"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {/* Current Page Option */}
                  {currentPageInfo && !searchQuery && (
                    <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
                      <button
                        onClick={addCurrentPage}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                          <CurrentPageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                            Current Page
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
                            {currentPageInfo.page.name}
                          </p>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Other Pages */}
                  <div className="p-2">
                    {!searchQuery && (
                      <p className="px-3 py-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        All Pages
                      </p>
                    )}
                    {filteredPages.length > 0 ? (
                      filteredPages.slice(0, 10).map(({ page, folderName }) => (
                        <button
                          key={page.id}
                          onClick={() => addPage(page)}
                          disabled={contextItems.some((item) => item.id === page.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PageIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-neutral-900 dark:text-white truncate">
                              {page.name}
                            </p>
                            <p className="text-xs text-neutral-500 truncate">{folderName}</p>
                          </div>
                          {contextItems.some((item) => item.id === page.id) && (
                            <CheckIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-4 text-sm text-neutral-500 text-center">
                        No pages found
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to help with your notes..."
            rows={1}
            disabled={isProcessing}
            className="flex-1 bg-transparent py-4 pr-2 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 resize-none focus:outline-none text-sm sm:text-base max-h-[200px] disabled:opacity-50"
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-1 px-2 py-2">
            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upload file"
            >
              <UploadIcon className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 rounded-lg transition-colors"
              title="Close"
            >
              <CloseIcon className="w-5 h-5" />
            </button>

            {/* Send Button */}
            <button
              onClick={handleSubmit}
              disabled={isProcessing || (!inputValue.trim() && attachedFiles.length === 0)}
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

// Icons
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

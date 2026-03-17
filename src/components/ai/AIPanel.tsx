"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  FormEvent,
} from "react";
import { Editor } from "@tiptap/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  SentIcon,
  Loading03Icon,
  CircleArrowExpand01Icon,
  CircleArrowShrink01Icon,
  Tick01Icon,
  CancelCircleIcon,
  Copy01Icon,
  RotateLeft01Icon,
} from "@hugeicons/core-free-icons";
import type { AIMode } from "@/types/ai";

interface AIPanelProps {
  editor: Editor;
  pageId?: string;
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AIMode;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
}

interface PendingEdit {
  content: string;
  action: "insert" | "replace";
}

export function AIPanel({
  editor,
  pageId,
  isOpen,
  onClose,
  initialMode = "answer",
}: AIPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<AIMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("compound-beta");
  const [aiAvailable, setAIAvailable] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  // Fetch available models on mount
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/api/ai/models");
        if (res.ok) {
          const data = await res.json();
          setModels(data.models || []);
          setAIAvailable(data.available);
          if (data.models?.length > 0) {
            setSelectedModel(data.models[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
      }
    }
    fetchModels();
  }, []);

  // Listen for openAIPanel events from slash commands
  useEffect(() => {
    function handleOpenAIPanel(
      e: CustomEvent<{ mode: AIMode; context?: string }>,
    ) {
      setMode(e.detail.mode);
      if (e.detail.context) {
        setPrompt(e.detail.context);
      }
    }

    window.addEventListener("openAIPanel", handleOpenAIPanel as EventListener);
    return () => {
      window.removeEventListener(
        "openAIPanel",
        handleOpenAIPanel as EventListener,
      );
    };
  }, []);

  // Update mode when initialMode changes
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Get selected text from editor
  const getSelectedText = useCallback(() => {
    const { from, to } = editor.state.selection;
    if (from === to) return "";
    return editor.state.doc.textBetween(from, to, " ");
  }, [editor]);

  // Get full page content
  const getPageContent = useCallback(() => {
    return editor.getText();
  }, [editor]);

  // Handle AI generation
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse("");
    setPendingEdit(null);

    try {
      // Get context based on mode
      let context = "";
      const selectedText = getSelectedText();

      if (selectedText) {
        context = selectedText;
      } else if (
        ["summarize", "expand", "improve", "translate"].includes(mode)
      ) {
        context = getPageContent();
      }

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          prompt: prompt.trim(),
          mode,
          model: selectedModel,
          context,
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
          } catch (parseErr) {
            // Skip invalid JSON
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsLoading(false);
    }
  }, [prompt, mode, selectedModel, pageId, getSelectedText, getPageContent]);

  // Request to edit the page - shows approval dialog
  const requestEdit = useCallback(
    (action: "insert" | "replace") => {
      if (!response) return;
      setPendingEdit({ content: response, action });
    },
    [response],
  );

  // Approve and apply the edit
  const approveEdit = useCallback(() => {
    if (!pendingEdit) return;

    if (pendingEdit.action === "insert") {
      editor.chain().focus().insertContent(pendingEdit.content).run();
    } else {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .insertContent(pendingEdit.content)
          .run();
      } else {
        editor.chain().focus().insertContent(pendingEdit.content).run();
      }
    }

    setPendingEdit(null);
    onClose();
  }, [editor, pendingEdit, onClose]);

  // Reject the edit
  const rejectEdit = useCallback(() => {
    setPendingEdit(null);
  }, []);

  // Copy response to clipboard
  const copyResponse = useCallback(() => {
    if (response) {
      navigator.clipboard.writeText(response);
    }
  }, [response]);

  // Clear and regenerate
  const regenerate = useCallback(() => {
    setResponse("");
    setError(null);
    handleGenerate();
  }, [handleGenerate]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (pendingEdit) {
          rejectEdit();
        } else {
          onClose();
        }
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (prompt.trim() && !isLoading && aiAvailable) {
          handleGenerate();
        }
      }
    },
    [
      onClose,
      pendingEdit,
      rejectEdit,
      prompt,
      isLoading,
      aiAvailable,
      handleGenerate,
    ],
  );

  // Handle form submission - prevents default form behavior
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleGenerate();
    },
    [handleGenerate],
  );

  if (!isOpen) return null;

  const outputHeight = isExpanded ? "h-96" : "h-48";

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col">
      <div
        className={`relative bg-white rounded-3xl shadow-xl border border-zinc-200 overflow-hidden transition-all duration-300 ${
          isExpanded ? "w-150" : "w-100"
        }`}
      >
        {/* Header with Expand and Close */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-zinc-50">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <HugeiconsIcon
              icon={
                isExpanded ? CircleArrowShrink01Icon : CircleArrowExpand01Icon
              }
              className="h-4 w-4"
            />
          </button>
          <span className="text-sm font-medium text-zinc-700">
            AI Assistant
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
          </button>
        </div>

        {/* Output Area - Fixed Height with Inner Scroll */}
        <div className={`${outputHeight} transition-all duration-300 relative`}>
          <div
            ref={responseRef}
            className="h-full overflow-y-auto px-4 py-4 text-zinc-700 bg-zinc-50"
          >
            {isLoading && !response && (
              <div className="flex items-center justify-center h-full">
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="h-8 w-8 animate-spin text-zinc-400"
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-200">
                <HugeiconsIcon
                  icon={CancelCircleIcon}
                  className="h-5 w-5 shrink-0"
                />
                <span>{error}</span>
              </div>
            )}

            {!isLoading && !error && !response && (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-center">
                <p className="text-base">Ask me anything</p>
                <p className="text-xs mt-1">
                  I can summarize, expand, improve, or translate
                </p>
              </div>
            )}

            {response && (
              <div className="prose prose-sm max-w-none prose-zinc">
                <div className="whitespace-pre-wrap text-sm">{response}</div>
              </div>
            )}
          </div>

          {/* Response Actions - Floating at bottom of output area */}
          {response && !pendingEdit && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1.5 bg-white rounded-full border border-zinc-200 shadow-md">
              <button
                type="button"
                onClick={() => requestEdit("insert")}
                className="px-2.5 py-1 text-xs bg-zinc-900 hover:bg-zinc-700 text-white rounded-full font-medium transition-colors"
              >
                Insert
              </button>
              <button
                type="button"
                onClick={() => requestEdit("replace")}
                className="px-2.5 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-full font-medium transition-colors"
              >
                Replace
              </button>
              <div className="w-px h-4 bg-zinc-300" />
              <button
                type="button"
                onClick={copyResponse}
                className="p-1 text-zinc-500 hover:text-zinc-800 transition-colors"
                title="Copy"
              >
                <HugeiconsIcon icon={Copy01Icon} className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={regenerate}
                className="p-1 text-zinc-500 hover:text-zinc-800 transition-colors"
                title="Regenerate"
              >
                <HugeiconsIcon
                  icon={RotateLeft01Icon}
                  className="h-3.5 w-3.5"
                />
              </button>
            </div>
          )}
        </div>

        {/* Edit Approval Dialog */}
        {pendingEdit && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-20">
            <div className="text-center px-6">
              <h3 className="text-base font-semibold text-zinc-900 mb-2">
                {pendingEdit.action === "insert"
                  ? "Insert content?"
                  : "Replace selection?"}
              </h3>
              <p className="text-zinc-500 text-xs mb-4">
                This will {pendingEdit.action === "insert" ? "add" : "replace"}{" "}
                content in your document.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={rejectEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <HugeiconsIcon icon={CancelCircleIcon} className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={approveEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <HugeiconsIcon icon={Tick01Icon} className="h-4 w-4" />
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input Box - Fixed at Bottom with Form to prevent unwanted submissions */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-zinc-200 bg-white px-3 py-3"
        >
          <div className="flex items-center gap-2">
            {/* Add Context Button */}
            <button
              type="button"
              className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors"
              title="Add context"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI to help with your notes..."
              disabled={isLoading || !aiAvailable}
              className="flex-1 px-3 py-2 bg-transparent text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none disabled:opacity-50"
            />

            {/* Upload Button */}
            <button
              type="button"
              className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors"
              title="Upload file"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading || !aiAvailable || !prompt.trim()}
              className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              {isLoading ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="h-5 w-5 animate-spin"
                />
              ) : (
                <HugeiconsIcon icon={SentIcon} className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Helper Text */}
          {!aiAvailable ? (
            <p className="mt-2 text-xs text-amber-600 text-center">
              AI not available. Configure GROQ_API_KEY in your environment.
            </p>
          ) : (
            <p className="mt-2 text-xs text-zinc-500 text-center">
              Add context with + to help AI understand your request better
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

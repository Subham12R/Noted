"use client";

import { useState, useRef, KeyboardEvent, ChangeEvent, useEffect, useCallback } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useNotes, Page, Folder } from "@/context/NotesContext";

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
}

export const Input = () => {
  const { folders, activePage, getPageById } = useNotes();

  const [inputValue, setInputValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;

    // Simulate processing
    setIsProcessing(true);

    console.log("Submitting:", {
      text: inputValue,
      files: attachedFiles,
      context: contextItems,
    });

    // Reset after simulated processing
    setTimeout(() => {
      setIsProcessing(false);
      setInputValue("");
      setAttachedFiles([]);
      setContextItems([]);
      setCurrentMessageIndex(0);
    }, 5000);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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
        { id: currentPageInfo.page.id, name: currentPageInfo.page.name, type: "page" },
      ]);
    }
    setIsContextOpen(false);
    setSearchQuery("");
  };

  const addPage = (page: Page) => {
    if (!contextItems.some((item) => item.id === page.id)) {
      setContextItems((prev) => [...prev, { id: page.id, name: page.name, type: "page" }]);
    }
    setIsContextOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 pt-6 pb-4 px-4">
      {/* Subtle glass blur background - only show during processing */}
      {isProcessing && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: 'linear-gradient(to top, rgba(24, 24, 27, 0.98) 0%, rgba(24, 24, 27, 0.9) 30%, rgba(24, 24, 27, 0.6) 60%, rgba(24, 24, 27, 0) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            maskImage: 'linear-gradient(to top, black 0%, black 50%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, black 50%, transparent 100%)',
          }}
        />
      )}
      <div className="max-w-3xl mx-auto relative">
        {/* Processing Animation */}
        {isProcessing && (
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 flex-shrink-0">
              <DotLottieReact
                src={NOTES_LOTTIE}
                loop
                autoplay
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            <span className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
              {displayedText}
              <span className="animate-pulse">|</span>
            </span>
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
                          <PageIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-neutral-900 dark:text-white truncate">
                              {page.name}
                            </p>
                            <p className="text-xs text-neutral-500 truncate">{folderName}</p>
                          </div>
                          {contextItems.some((item) => item.id === page.id) && (
                            <CheckIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
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

            {/* Send Button */}
            <button
              onClick={handleSubmit}
              disabled={isProcessing || (!inputValue.trim() && attachedFiles.length === 0)}
              className="p-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Send"
            >
              <SendIcon className="w-5 h-5" />
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
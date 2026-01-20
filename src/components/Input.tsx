"use client";

import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";

interface Folder {
  id: string;
  name: string;
}

const defaultFolders: Folder[] = [
  { id: "1", name: "General" },
  { id: "2", name: "Work" },
  { id: "3", name: "Personal" },
  { id: "4", name: "Ideas" },
];

export const Input = () => {
  const [inputValue, setInputValue] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<Folder>(defaultFolders[0]);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;

    console.log("Submitting:", {
      text: inputValue,
      folder: selectedFolder,
      files: attachedFiles,
    });

    setInputValue("");
    setAttachedFiles([]);
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

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0  pt-6 pb-4 px-4">
      <div className="max-w-3xl mx-auto">
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
        <div className="relative flex items-end gap-2 backdrop-blur-2xl bg-zinc-900/10 rounded-xl dark:border-zinc-600/40 border shadow-lg">

       
          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your note or ask AI..."
            rows={1}
            className="flex-1 bg-transparent px-4 py-4 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 resize-none focus:outline-none text-sm sm:text-base max-h-[200px]"
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-1 px-2 py-2">
            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
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
              disabled={!inputValue.trim() && attachedFiles.length === 0}
              className="p-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Send"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Helper Text */}
        <p className="text-center text-xs text-neutral-400 dark:text-neutral-600 mt-2">
          Ask Ai to summarize, brainstorm, or generate content for your notes!
        </p>
      </div>
    </div>
  );
};

// Icons


const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const UploadIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const FileIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

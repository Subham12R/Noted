"use client"

import { NodeViewContent, NodeViewWrapper, NodeViewProps } from "@tiptap/react"
import { useState, useCallback } from "react"
import { supportedLanguages } from "./code-block-node-extension"

export function CodeBlockComponent({ node, updateAttributes, extension }: NodeViewProps) {
  const [copied, setCopied] = useState(false)
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)

  const language = node.attrs.language || extension.options.defaultLanguage || "plaintext"

  const handleCopy = useCallback(async () => {
    const content = node.textContent
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [node.textContent])

  const handleLanguageChange = useCallback((newLanguage: string) => {
    updateAttributes({ language: newLanguage })
    setShowLanguageDropdown(false)
  }, [updateAttributes])

  return (
    <NodeViewWrapper className="code-block-wrapper group relative my-3">
      {/* Floating toolbar - appears on hover */}
      <div className="absolute -top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-md border border-zinc-700 transition-colors shadow-sm"
          >
            <span>{supportedLanguages.find(l => l.value === language)?.label || language}</span>
            <ChevronDownIcon />
          </button>

          {showLanguageDropdown && (
            <div className="absolute top-full right-0 mt-1 w-40 max-h-56 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => handleLanguageChange(lang.value)}
                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-700 transition-colors ${
                    language === lang.value ? "text-blue-400 bg-zinc-700/50" : "text-zinc-300"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="flex items-center justify-center w-7 h-7 text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-md border border-zinc-700 transition-colors shadow-sm"
          title={copied ? "Copied!" : "Copy code"}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>

      {/* Code content */}
      <div className="relative rounded-md bg-zinc-900 dark:bg-zinc-950 overflow-hidden">
        <pre className="m-0 p-4 overflow-x-auto">
          <code className={`language-${language} text-[13px] leading-relaxed font-mono`}>
            <NodeViewContent />
          </code>
        </pre>
      </div>
    </NodeViewWrapper>
  )
}

// Icons
function ChevronDownIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  )
}

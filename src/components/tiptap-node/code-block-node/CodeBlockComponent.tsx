"use client"

import { NodeViewContent, NodeViewWrapper, NodeViewProps } from "@tiptap/react"
import { useState, useCallback, useEffect, useRef } from "react"
import { supportedLanguages } from "./code-block-node-extension"

export function CodeBlockComponent({ node, updateAttributes, extension }: NodeViewProps) {
  const [copied, setCopied] = useState(false)
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const language = node.attrs.language || extension.options.defaultLanguage || "plaintext"

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false)
      }
    }

    if (showLanguageDropdown) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showLanguageDropdown])

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

  const languageLabel = supportedLanguages.find(l => l.value === language)?.label || language

  return (
    <NodeViewWrapper className="code-block-wrapper group relative my-4" data-language={language}>
      <div className="code-block-container">
        {/* Header bar */}
        <div className="code-block-header" contentEditable={false}>
          {/* Language selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="code-block-lang-btn"
            >
              <CodeIcon />
              <span>{languageLabel}</span>
              <ChevronDownIcon className={showLanguageDropdown ? "rotate-180" : ""} />
            </button>

            {showLanguageDropdown && (
              <div className="code-block-dropdown">
                <div className="code-block-dropdown-search">
                  <input
                    type="text"
                    placeholder="Search languages..."
                    className="code-block-search-input"
                    autoFocus
                    onChange={(e) => {
                      const searchValue = e.target.value.toLowerCase()
                      const items = document.querySelectorAll('.code-block-dropdown-item')
                      items.forEach((item) => {
                        const text = item.textContent?.toLowerCase() || ''
                        ;(item as HTMLElement).style.display = text.includes(searchValue) ? 'block' : 'none'
                      })
                    }}
                  />
                </div>
                <div className="code-block-dropdown-list">
                  {supportedLanguages.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => handleLanguageChange(lang.value)}
                      className={`code-block-dropdown-item ${language === lang.value ? "active" : ""}`}
                    >
                      {lang.label}
                      {language === lang.value && <CheckIcon />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`code-block-copy-btn ${copied ? "copied" : ""}`}
            title={copied ? "Copied!" : "Copy code"}
          >
            {copied ? (
              <>
                <CheckIcon />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Code area with line numbers */}
        <div className="code-block-content">
          <pre>
            <code className={`language-${language}`}>
              <NodeViewContent />
            </code>
          </pre>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

// Icons
function CodeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${className || ""}`}>
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

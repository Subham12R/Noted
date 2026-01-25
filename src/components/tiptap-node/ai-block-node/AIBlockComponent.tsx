'use client'

// AI Block Component - Renders AI responses in the editor
import React, { useCallback, useState } from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import {
  SparklesIcon,
  RefreshCwIcon,
  CopyIcon,
  TrashIcon,
  CheckIcon,
  AlertCircleIcon,
  LoaderIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from 'lucide-react'
import type { AIMode } from '@/types/ai'

interface AIBlockComponentProps {
  node: {
    attrs: {
      id: string
      prompt: string
      response: string
      model: string
      mode: AIMode
      timestamp: string
      tokensUsed: number
      isLoading: boolean
      error: string | null
    }
  }
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
  editor: any
}

const MODE_LABELS: Record<AIMode, string> = {
  answer: 'Answer',
  expand: 'Expand',
  summarize: 'Summary',
  translate: 'Translation',
  explain: 'Explanation',
  improve: 'Improved',
  flowchart: 'Flowchart',
  quiz: 'Quiz',
  flashcard: 'Flashcard',
}

export function AIBlockComponent({
  node,
  updateAttributes,
  deleteNode,
  editor,
}: AIBlockComponentProps) {
  const { id, prompt, response, model, mode, timestamp, tokensUsed, isLoading, error } = node.attrs
  const [copied, setCopied] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(response)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [response])

  const handleRegenerate = useCallback(async () => {
    if (isRegenerating || isLoading) return

    setIsRegenerating(true)
    updateAttributes({ isLoading: true, error: null })

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          mode,
          model,
          stream: false,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Generation failed')
      }

      const data = await res.json()
      updateAttributes({
        response: data.content,
        tokensUsed: data.tokensUsed,
        timestamp: new Date().toISOString(),
        isLoading: false,
        error: null,
      })
    } catch (err) {
      updateAttributes({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to regenerate',
      })
    } finally {
      setIsRegenerating(false)
    }
  }, [prompt, mode, model, isRegenerating, isLoading, updateAttributes])

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString()
    } catch {
      return ts
    }
  }

  const modelName = model.includes('70b') ? 'Llama 70B' : model.includes('8b') ? 'Llama 8B' : model

  return (
    <NodeViewWrapper className="ai-block-wrapper my-4" data-id={id}>
      <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 dark:border-purple-800 dark:from-purple-950/30 dark:to-indigo-950/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-200 px-4 py-2 dark:border-purple-800">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              AI {MODE_LABELS[mode] || mode}
            </span>
            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-600 dark:bg-purple-900 dark:text-purple-300">
              {modelName}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Regenerate */}
            <button
              onClick={handleRegenerate}
              disabled={isLoading || isRegenerating}
              className="rounded p-1.5 text-gray-500 hover:bg-purple-100 hover:text-purple-600 disabled:opacity-50 dark:hover:bg-purple-900"
              title="Regenerate"
            >
              <RefreshCwIcon
                className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`}
              />
            </button>
            {/* Copy */}
            <button
              onClick={handleCopy}
              disabled={isLoading || !response}
              className="rounded p-1.5 text-gray-500 hover:bg-purple-100 hover:text-purple-600 disabled:opacity-50 dark:hover:bg-purple-900"
              title="Copy"
            >
              {copied ? (
                <CheckIcon className="h-4 w-4 text-green-500" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
            </button>
            {/* Delete */}
            <button
              onClick={deleteNode}
              className="rounded p-1.5 text-gray-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Prompt (collapsible) */}
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="flex w-full items-center gap-2 border-b border-purple-100 px-4 py-2 text-left text-sm text-gray-600 hover:bg-purple-50/50 dark:border-purple-900 dark:text-gray-400 dark:hover:bg-purple-950/30"
        >
          {showPrompt ? (
            <ChevronUpIcon className="h-3 w-3" />
          ) : (
            <ChevronDownIcon className="h-3 w-3" />
          )}
          <span className="font-medium">Prompt:</span>
          <span className="truncate">{prompt}</span>
        </button>
        {showPrompt && (
          <div className="border-b border-purple-100 bg-purple-50/50 px-4 py-2 text-sm text-gray-700 dark:border-purple-900 dark:bg-purple-950/20 dark:text-gray-300">
            {prompt}
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-3">
          {isLoading ? (
            <div className="flex items-center gap-2 py-4 text-purple-600">
              <LoaderIcon className="h-5 w-5 animate-spin" />
              <span>Generating response...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 py-4 text-red-600">
              <AlertCircleIcon className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <NodeViewContent className="ai-block-content" />
              {!response && (
                <p className="text-gray-500 italic">AI response will appear here...</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && response && (
          <div className="flex items-center justify-between border-t border-purple-100 px-4 py-2 text-xs text-gray-500 dark:border-purple-900">
            <span>{formatTimestamp(timestamp)}</span>
            {tokensUsed > 0 && <span>{tokensUsed} tokens</span>}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

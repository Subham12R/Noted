"use client"

import { useEffect, useState, use } from "react"
import Image from "next/image"
import Link from "next/link"
import { EditorContent, useEditor } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"

import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"
import "@/components/tiptap-templates/simple/simple-editor.scss"

interface SharedPageData {
  page: {
    id: string
    name: string
    content: string
    updatedAt: string
  }
  owner: {
    name: string
    image?: string
  }
  permission: "view" | "edit"
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<SharedPageData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [password, setPassword] = useState("")
  const [requiresPassword, setRequiresPassword] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    editorProps: {
      attributes: {
        class: "simple-editor shared-view",
      },
    },
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: {
          openOnClick: true,
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Typography,
      Superscript,
      Subscript,
    ],
    content: "",
  })

  const fetchPage = async (pwd?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const headers: Record<string, string> = {}
      if (pwd) {
        headers["X-Share-Password"] = pwd
      }

      const response = await fetch(`/api/share/${token}`, { headers })
      const result = await response.json()

      if (!response.ok) {
        if (result.requiresPassword) {
          setRequiresPassword(true)
          setIsLoading(false)
          return
        }
        throw new Error(result.error || "Failed to load page")
      }

      setData(result)
      setRequiresPassword(false)
      if (editor) {
        editor.commands.setContent(result.page.content || "")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (editor && data?.page?.content) {
      editor.commands.setContent(data.page.content)
    }
  }, [editor, data])

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPage(password)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Loading shared note...</p>
        </div>
      </div>
    )
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <LockIcon />
            </div>
            <h1 className="text-lg font-semibold text-white">Protected Note</h1>
            <p className="text-sm text-zinc-400 mt-1">This note requires a password to view</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
            >
              View Note
            </button>
          </form>

          {error && (
            <p className="mt-4 text-sm text-red-400 text-center">{error}</p>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <ErrorIcon />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Unable to load note</h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Go to Noted
          </Link>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-grandhotel text-white">
              Noted.
            </Link>
            <span className="text-zinc-600">|</span>
            <h1 className="text-sm font-medium text-white truncate max-w-[200px] sm:max-w-none">
              {data.page.name}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>by</span>
              {data.owner.image ? (
                <Image
                  src={data.owner.image}
                  alt={data.owner.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white">
                  {getInitials(data.owner.name)}
                </div>
              )}
              <span className="text-white">{data.owner.name}</span>
            </div>
            {data.permission === "edit" && (
              <Link
                href={`/share/${token}/claim`}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <EditIcon />
                Sign in to edit
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="simple-editor-wrapper shared-wrapper">
          <EditorContent
            editor={editor}
            className="simple-editor-content prose prose-invert max-w-none"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between text-sm text-zinc-500">
          <span>
            Last updated: {new Date(data.page.updatedAt).toLocaleDateString()}
          </span>
          <Link href="/" className="hover:text-white transition-colors">
            Create your own notes with Noted
          </Link>
        </div>
      </footer>
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}

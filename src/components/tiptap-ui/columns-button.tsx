"use client"

import { useCurrentEditor } from "@tiptap/react"
import { Button } from "@/components/tiptap-ui-primitive/button"

export function ColumnsButton() {
  const { editor } = useCurrentEditor()

  if (!editor) return null

  const handleClick = () => {
    editor.chain().focus().setColumns(2).run()
  }

  return (
    <Button
      data-style="ghost"
      onClick={handleClick}
      title="Insert columns"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="18" rx="1" />
        <rect x="14" y="3" width="7" height="18" rx="1" />
      </svg>
    </Button>
  )
}

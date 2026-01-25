"use client"

import { forwardRef, useCallback } from "react"
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import type { Editor } from "@tiptap/react"
import { Button } from "@/components/tiptap-ui-primitive/button"

export interface ExcalidrawButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  editor?: Editor | null
  text?: string
}

export const ExcalidrawButton = forwardRef<HTMLButtonElement, ExcalidrawButtonProps>(
  ({ editor: providedEditor, text, onClick, children, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor)

    const canInsert = editor?.isEditable ?? false

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return

        if (editor && !editor.isDestroyed && editor.view?.dom) {
          try {
            // @ts-ignore - custom command
            editor.chain().focus().insertExcalidraw().run()
          } catch (e) {
            console.warn("Failed to insert Excalidraw:", e)
          }
        }
      },
      [editor, onClick]
    )

    if (!editor) {
      return null
    }

    return (
      <Button
        type="button"
        data-style="ghost"
        role="button"
        tabIndex={-1}
        disabled={!canInsert}
        data-disabled={!canInsert}
        aria-label="Insert Excalidraw"
        tooltip="Excalidraw"
        onClick={handleClick}
        {...buttonProps}
        ref={ref}
      >
        {children ?? (
          <>
            <ExcalidrawIcon className="tiptap-button-icon" />
            {text && <span className="tiptap-button-text">{text}</span>}
          </>
        )}
      </Button>
    )
  }
)

ExcalidrawButton.displayName = "ExcalidrawButton"

function ExcalidrawIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

export default ExcalidrawButton

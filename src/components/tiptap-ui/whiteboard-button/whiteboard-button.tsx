"use client"

import { forwardRef, useCallback } from "react"
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import type { Editor } from "@tiptap/react"
import { Button } from "@/components/tiptap-ui-primitive/button"

export interface WhiteboardButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  editor?: Editor | null
  text?: string
}

export const WhiteboardButton = forwardRef<HTMLButtonElement, WhiteboardButtonProps>(
  ({ editor: providedEditor, text, onClick, children, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor)

    const canInsert = editor?.isEditable ?? false

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return

        if (editor) {
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'whiteboard',
              attrs: {
                shapes: '[]',
                width: 800,
                height: 400,
              },
            })
            .run()
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
        aria-label="Insert whiteboard"
        tooltip="Whiteboard"
        onClick={handleClick}
        {...buttonProps}
        ref={ref}
      >
        {children ?? (
          <>
            <WhiteboardIcon className="tiptap-button-icon" />
            {text && <span className="tiptap-button-text">{text}</span>}
          </>
        )}
      </Button>
    )
  }
)

WhiteboardButton.displayName = "WhiteboardButton"

function WhiteboardIcon({ className }: { className?: string }) {
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
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="7" y="7" width="4" height="4" />
      <circle cx="16" cy="16" r="2" />
      <line x1="7" y1="16" x2="12" y2="11" />
    </svg>
  )
}

export default WhiteboardButton

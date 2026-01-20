"use client"

import { useEffect, useState, useRef } from "react"

interface CollaboratorCursorProps {
  userId: string
  userName: string
  color: string
  position: { from: number; to: number }
  editorElement: HTMLElement | null
}

export function CollaboratorCursor({
  userId,
  userName,
  color,
  position,
  editorElement,
}: CollaboratorCursorProps) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!editorElement) return

    // This is a simplified cursor positioning
    // In a real implementation, you'd use ProseMirror's coordsAtPos
    // For now, we'll hide the cursor if we can't position it properly
    setIsVisible(false)
  }, [position, editorElement])

  // Hide cursor after inactivity
  useEffect(() => {
    setIsVisible(true)

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }

    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 5000) // Hide after 5 seconds of no movement

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [position])

  if (!isVisible || !coords) {
    return null
  }

  return (
    <div
      className="absolute pointer-events-none z-50 transition-all duration-100"
      style={{
        left: coords.x,
        top: coords.y,
        transform: "translateY(-100%)",
      }}
    >
      {/* Cursor line */}
      <div
        className="w-0.5 h-5"
        style={{ backgroundColor: color }}
      />

      {/* Name label */}
      <div
        className="absolute left-0 -top-5 px-1.5 py-0.5 rounded text-xs text-white whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {userName}
      </div>
    </div>
  )
}

// Overlay container for all remote cursors
interface CursorOverlayProps {
  cursors: Array<{
    userId: string
    userName: string
    color: string
    position: { from: number; to: number }
  }>
  editorElement: HTMLElement | null
}

export function CursorOverlay({ cursors, editorElement }: CursorOverlayProps) {
  if (!editorElement) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {cursors.map((cursor) => (
        <CollaboratorCursor
          key={cursor.userId}
          userId={cursor.userId}
          userName={cursor.userName}
          color={cursor.color}
          position={cursor.position}
          editorElement={editorElement}
        />
      ))}
    </div>
  )
}

// Selection highlight for collaborators
interface SelectionHighlightProps {
  userId: string
  color: string
  ranges: Array<{ from: number; to: number }>
  editorElement: HTMLElement | null
}

export function SelectionHighlight({
  color,
  ranges,
  editorElement,
}: SelectionHighlightProps) {
  // This would require integration with ProseMirror's decoration system
  // For a full implementation, use the CollaborationCursor Tiptap extension
  return null
}

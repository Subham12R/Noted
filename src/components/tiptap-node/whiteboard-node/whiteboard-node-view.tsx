"use client"

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { useCallback, useState } from 'react'
import { Whiteboard } from '@/components/whiteboard'
import { Shape } from '@/components/whiteboard/types'

export function WhiteboardNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const shapes: Shape[] = (() => {
    try {
      return JSON.parse(node.attrs.shapes || '[]')
    } catch {
      return []
    }
  })()

  const handleChange = useCallback(
    (newShapes: Shape[]) => {
      updateAttributes({ shapes: JSON.stringify(newShapes) })
    },
    [updateAttributes]
  )

  const width = node.attrs.width || 800
  const height = node.attrs.height || 400

  // Prevent editor from capturing events
  const stopPropagation = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation()
  }

  return (
    <NodeViewWrapper
      className={`whiteboard-node my-4 ${selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : ''}`}
      data-type="whiteboard"
      contentEditable={false}
    >
      <div
        className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm"
        onMouseDown={stopPropagation}
        onPointerDown={stopPropagation}
        onDragStart={(e) => e.preventDefault()}
        draggable={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Whiteboard
            </span>
            <span className="text-xs text-zinc-400 bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded">
              {shapes.length} shape{shapes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2.5 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          className="bg-white dark:bg-zinc-950"
          style={{
            height: isExpanded ? height + 100 : height,
            transition: 'height 0.2s ease',
          }}
        >
          <Whiteboard
            initialShapes={shapes}
            onChange={handleChange}
            width={width}
            height={isExpanded ? height + 100 : height}
          />
        </div>

        {/* Resize handle */}
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize opacity-0 hover:opacity-100 transition-opacity"
          style={{
            background: 'linear-gradient(135deg, transparent 50%, #3b82f6 50%)',
            borderBottomRightRadius: '0.75rem',
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const startX = e.clientX
            const startY = e.clientY
            const startWidth = width
            const startHeight = height

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const newWidth = Math.max(400, startWidth + (moveEvent.clientX - startX))
              const newHeight = Math.max(200, startHeight + (moveEvent.clientY - startY))
              updateAttributes({ width: newWidth, height: newHeight })
            }

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        />
      </div>
    </NodeViewWrapper>
  )
}

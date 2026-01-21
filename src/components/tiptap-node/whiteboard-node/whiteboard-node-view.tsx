"use client"

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { useCallback, useRef } from 'react'
import { Whiteboard, WhiteboardRef } from '@/components/whiteboard'
import { Shape } from '@/components/whiteboard/types'

export function WhiteboardNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const whiteboardRef = useRef<WhiteboardRef>(null)

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
        ref={containerRef}
        className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm"
        onMouseDown={stopPropagation}
        onPointerDown={stopPropagation}
        onDragStart={(e) => e.preventDefault()}
        draggable={false}
      >
        {/* Canvas Container */}
        <div className="relative" style={{ height }}>
          <Whiteboard
            ref={whiteboardRef}
            initialShapes={shapes}
            onChange={handleChange}
            width={width}
            height={height}
            hideToolbar={false}
          />
        </div>

        {/* Resize handles */}
        {/* Bottom-right corner resize */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize group z-50"
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
        >
          <svg
            className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
          </svg>
        </div>

        {/* Right edge resize */}
        <div
          className="absolute top-0 right-0 w-2 h-full cursor-ew-resize hover:bg-blue-500/20 transition-colors z-50"
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const startX = e.clientX
            const startWidth = width

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const newWidth = Math.max(400, startWidth + (moveEvent.clientX - startX))
              updateAttributes({ width: newWidth })
            }

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        />

        {/* Bottom edge resize */}
        <div
          className="absolute bottom-0 left-0 h-2 cursor-ns-resize hover:bg-blue-500/20 transition-colors z-50"
          style={{ width: `calc(100% - 16px)` }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const startY = e.clientY
            const startHeight = height

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const newHeight = Math.max(200, startHeight + (moveEvent.clientY - startY))
              updateAttributes({ height: newHeight })
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

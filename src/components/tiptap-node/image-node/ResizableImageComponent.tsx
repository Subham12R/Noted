"use client"

import { NodeViewWrapper, NodeViewProps } from "@tiptap/react"
import { useCallback, useRef, useState } from "react"

export function ResizableImageComponent({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(1)

  const { src, alt, title, width, height, alignment } = node.attrs
  const showControls = selected || isHovering

  // Calculate aspect ratio when image loads
  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      const naturalWidth = imgRef.current.naturalWidth
      const naturalHeight = imgRef.current.naturalHeight
      setAspectRatio(naturalWidth / naturalHeight)

      // Set initial width if not set
      if (!width) {
        const initialWidth = Math.min(naturalWidth, 600)
        updateAttributes({ width: initialWidth })
      }
    }
  }, [width, updateAttributes])

  // Handle resize
  const handleResize = useCallback(
    (
      e: React.MouseEvent,
      direction: "e" | "w" | "se" | "sw" | "ne" | "nw"
    ) => {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startY = e.clientY
      const startWidth = width || imgRef.current?.offsetWidth || 300
      const startHeight = height || startWidth / aspectRatio

      setIsResizing(true)

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault()
        const deltaX = moveEvent.clientX - startX
        const deltaY = moveEvent.clientY - startY

        let newWidth = startWidth
        let newHeight = startHeight

        switch (direction) {
          case "e":
          case "se":
          case "ne":
            newWidth = Math.max(100, startWidth + deltaX)
            break
          case "w":
          case "sw":
          case "nw":
            newWidth = Math.max(100, startWidth - deltaX)
            break
        }

        // Maintain aspect ratio
        newHeight = newWidth / aspectRatio

        updateAttributes({
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        })
      }

      const handleMouseUp = () => {
        setIsResizing(false)
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [width, height, aspectRatio, updateAttributes]
  )

  // Handle alignment change
  const handleAlignmentChange = (newAlignment: "left" | "center" | "right") => {
    updateAttributes({ alignment: newAlignment })
  }

  const alignmentStyles: Record<string, React.CSSProperties> = {
    left: { marginRight: "auto", marginLeft: 0 },
    center: { marginLeft: "auto", marginRight: "auto" },
    right: { marginLeft: "auto", marginRight: 0 },
  }

  // Handle click to select
  const handleClick = useCallback(() => {
    const pos = getPos()
    if (typeof pos === "number" && editor) {
      editor.commands.setNodeSelection(pos)
    }
  }, [editor, getPos])

  return (
    <NodeViewWrapper
      className="resizable-image-wrapper"
      data-drag-handle
      style={{
        display: "flex",
        justifyContent:
          alignment === "left"
            ? "flex-start"
            : alignment === "right"
              ? "flex-end"
              : "center",
        overflow: "visible",
      }}
    >
      <div
        ref={containerRef}
        className={`resizable-image-container ${selected ? "selected" : ""} ${isResizing ? "resizing" : ""}`}
        style={{
          position: "relative",
          display: "inline-block",
          width: width ? `${width}px` : "auto",
          maxWidth: "100%",
          overflow: "visible",
          ...alignmentStyles[alignment || "center"],
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleClick}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt || ""}
          title={title || ""}
          onLoad={handleImageLoad}
          draggable={false}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            borderRadius: "0.375rem",
            cursor: isResizing ? "nwse-resize" : "pointer",
          }}
        />

        {/* Resize handles - show on hover or when selected */}
        {showControls && (
          <>
            {/* Corner handles */}
            <div
              className="resize-handle resize-handle-nw"
              onMouseDown={(e) => handleResize(e, "nw")}
              style={{
                position: "absolute",
                top: -6,
                left: -6,
                width: 12,
                height: 12,
                backgroundColor: "#3b82f6",
                borderRadius: "50%",
                cursor: "nwse-resize",
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                zIndex: 10,
                opacity: 1,
              }}
            />
            <div
              className="resize-handle resize-handle-ne"
              onMouseDown={(e) => handleResize(e, "ne")}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 12,
                height: 12,
                backgroundColor: "#3b82f6",
                borderRadius: "50%",
                cursor: "nesw-resize",
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                zIndex: 10,
                opacity: 1,
              }}
            />
            <div
              className="resize-handle resize-handle-sw"
              onMouseDown={(e) => handleResize(e, "sw")}
              style={{
                position: "absolute",
                bottom: -6,
                left: -6,
                width: 12,
                height: 12,
                backgroundColor: "#3b82f6",
                borderRadius: "50%",
                cursor: "nesw-resize",
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                zIndex: 10,
                opacity: 1,
              }}
            />
            <div
              className="resize-handle resize-handle-se"
              onMouseDown={(e) => handleResize(e, "se")}
              style={{
                position: "absolute",
                bottom: -6,
                right: -6,
                width: 12,
                height: 12,
                backgroundColor: "#3b82f6",
                borderRadius: "50%",
                cursor: "nwse-resize",
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                zIndex: 10,
                opacity: 1,
              }}
            />

            {/* Edge handles */}
            <div
              className="resize-handle resize-handle-e"
              onMouseDown={(e) => handleResize(e, "e")}
              style={{
                position: "absolute",
                top: "50%",
                right: -6,
                transform: "translateY(-50%)",
                width: 8,
                height: 32,
                backgroundColor: "#3b82f6",
                borderRadius: 4,
                cursor: "ew-resize",
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                zIndex: 10,
                opacity: 1,
              }}
            />
            <div
              className="resize-handle resize-handle-w"
              onMouseDown={(e) => handleResize(e, "w")}
              style={{
                position: "absolute",
                top: "50%",
                left: -6,
                transform: "translateY(-50%)",
                width: 8,
                height: 32,
                backgroundColor: "#3b82f6",
                borderRadius: 4,
                cursor: "ew-resize",
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                zIndex: 10,
                opacity: 1,
              }}
            />

            {/* Alignment toolbar */}
            <div
              className="image-toolbar"
              style={{
                position: "absolute",
                top: -40,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: 2,
                padding: 4,
                backgroundColor: "white",
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                border: "1px solid #e5e7eb",
              }}
            >
              <button
                onClick={() => handleAlignmentChange("left")}
                style={{
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 4,
                  border: "none",
                  backgroundColor:
                    alignment === "left" ? "#3b82f6" : "transparent",
                  color: alignment === "left" ? "white" : "#6b7280",
                  cursor: "pointer",
                }}
                title="Align left"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="15" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <button
                onClick={() => handleAlignmentChange("center")}
                style={{
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 4,
                  border: "none",
                  backgroundColor:
                    alignment === "center" ? "#3b82f6" : "transparent",
                  color: alignment === "center" ? "white" : "#6b7280",
                  cursor: "pointer",
                }}
                title="Align center"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="6" y1="12" x2="18" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <button
                onClick={() => handleAlignmentChange("right")}
                style={{
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 4,
                  border: "none",
                  backgroundColor:
                    alignment === "right" ? "#3b82f6" : "transparent",
                  color: alignment === "right" ? "white" : "#6b7280",
                  cursor: "pointer",
                }}
                title="Align right"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="9" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>

            {/* Selection outline */}
            <div
              style={{
                position: "absolute",
                inset: -2,
                border: "2px solid #3b82f6",
                borderRadius: "0.5rem",
                pointerEvents: "none",
              }}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  )
}

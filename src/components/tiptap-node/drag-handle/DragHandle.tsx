"use client"

import { Extension } from "@tiptap/core"
import { Plugin, PluginKey, NodeSelection } from "@tiptap/pm/state"
import { DOMSerializer } from "@tiptap/pm/model"

export interface DragHandleOptions {
  dragHandleWidth: number
}

function absoluteRect(node: Element) {
  const data = node.getBoundingClientRect()
  return {
    top: data.top,
    left: data.left,
    width: data.width,
  }
}

function nodeDOMAtCoords(coords: { x: number; y: number }) {
  const elements = document.elementsFromPoint(coords.x, coords.y)

  // First try to find a direct block element
  const blockElement = elements.find(
    (elem: Element) =>
      elem.parentElement?.matches?.(".ProseMirror") ||
      elem.matches(
        [
          "li",
          "p",
          "pre",
          "blockquote",
          "h1, h2, h3, h4, h5, h6",
          "[data-type]",
          "[data-node-view-wrapper]",
          ".tableWrapper",
          ".resizable-image-wrapper",
          ".whiteboard-node",
          ".node-view-wrapper",
        ].join(", ")
      )
  )

  // If found, return it
  if (blockElement) return blockElement

  // Otherwise look for the closest ProseMirror block
  for (const elem of elements) {
    const closest = elem.closest(".ProseMirror > *")
    if (closest) return closest
  }

  return undefined
}

function nodePosAtDOM(
  node: Element,
  view: import("@tiptap/pm/view").EditorView
) {
  const boundingRect = node.getBoundingClientRect()
  return view.posAtCoords({
    left: boundingRect.left + 1,
    top: boundingRect.top + 1,
  })?.inside
}

export const DragHandle = Extension.create<DragHandleOptions>({
  name: "dragHandle",

  addOptions() {
    return {
      dragHandleWidth: 24,
    }
  },

  addProseMirrorPlugins() {
    let dragHandleElement: HTMLElement | null = null
    let currentNode: Element | null = null
    const dragHandleWidth = this.options.dragHandleWidth

    const createDragHandle = () => {
      const handle = document.createElement("div")
      handle.draggable = true
      handle.dataset.dragHandle = ""
      handle.classList.add("drag-handle")
      handle.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="2"/>
          <circle cx="15" cy="5" r="2"/>
          <circle cx="9" cy="12" r="2"/>
          <circle cx="15" cy="12" r="2"/>
          <circle cx="9" cy="19" r="2"/>
          <circle cx="15" cy="19" r="2"/>
        </svg>
      `

      handle.style.cssText = `
        position: fixed;
        opacity: 0;
        pointer-events: none;
        width: ${dragHandleWidth}px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        border-radius: 4px;
        background: #f3f4f6;
        color: #6b7280;
        transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
        z-index: 9999;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      `

      handle.addEventListener("mouseenter", () => {
        handle.style.background = "#f3f4f6"
        handle.style.color = "#374151"
      })

      handle.addEventListener("mouseleave", () => {
        handle.style.background = "transparent"
        handle.style.color = "#9ca3af"
      })

      return handle
    }

    const showDragHandle = () => {
      if (dragHandleElement) {
        dragHandleElement.style.opacity = "1"
        dragHandleElement.style.pointerEvents = "auto"
      }
    }

    const hideDragHandle = () => {
      if (dragHandleElement) {
        dragHandleElement.style.opacity = "0"
        dragHandleElement.style.pointerEvents = "none"
      }
    }

    let hideTimeout: NodeJS.Timeout | null = null

    // Track the position of the node being dragged
    let draggedNodePos: number | null = null
    let draggedNodeSize: number | null = null

    return [
      new Plugin({
        key: new PluginKey("dragHandle"),
        view: (view) => {
          dragHandleElement = createDragHandle()
          document.body.appendChild(dragHandleElement)

          const handleDragStart = (event: DragEvent) => {
            if (!currentNode || !view.editable) return

            const pos = nodePosAtDOM(currentNode, view)
            if (pos === undefined || pos === null || pos < 0) return

            view.focus()

            const resolved = view.state.doc.resolve(pos)
            let nodePos = pos

            if (resolved.nodeAfter) {
              nodePos = pos
            } else if (resolved.parent && resolved.parent !== view.state.doc) {
              nodePos = resolved.before()
            }

            try {
              const nodeSelection = NodeSelection.create(view.state.doc, nodePos)
              view.dispatch(view.state.tr.setSelection(nodeSelection))

              // Store the position and size for deletion after drop
              draggedNodePos = nodePos
              draggedNodeSize = nodeSelection.node.nodeSize

              const slice = view.state.selection.content()

              // Create a temporary element to hold the serialized content
              const tempDiv = document.createElement("div")
              const serializer = DOMSerializer.fromSchema(view.state.schema)
              const domFragment = serializer.serializeFragment(slice.content)
              tempDiv.appendChild(domFragment)

              event.dataTransfer?.clearData()
              event.dataTransfer?.setData("text/html", tempDiv.innerHTML)
              event.dataTransfer?.setData("text/plain", tempDiv.textContent || "")
              // Store position info in dataTransfer for drop handling
              event.dataTransfer?.setData("application/x-prosemirror-drag", JSON.stringify({
                pos: nodePos,
                size: nodeSelection.node.nodeSize
              }))
              event.dataTransfer!.effectAllowed = "move"

              if (dragHandleElement) {
                dragHandleElement.style.cursor = "grabbing"
              }
            } catch (e) {
              console.warn("Could not create node selection:", e)
            }
          }

          const handleDragEnd = () => {
            if (dragHandleElement) {
              dragHandleElement.style.cursor = "grab"
            }
            // Reset drag state
            draggedNodePos = null
            draggedNodeSize = null
          }

          // Keep handle visible when mouse is over it
          const handleMouseEnterHandle = () => {
            if (hideTimeout) {
              clearTimeout(hideTimeout)
              hideTimeout = null
            }
            showDragHandle()
          }

          const handleMouseLeaveHandle = () => {
            hideTimeout = setTimeout(() => {
              hideDragHandle()
            }, 100)
          }

          dragHandleElement.addEventListener("dragstart", handleDragStart)
          dragHandleElement.addEventListener("dragend", handleDragEnd)
          dragHandleElement.addEventListener("mouseenter", handleMouseEnterHandle)
          dragHandleElement.addEventListener("mouseleave", handleMouseLeaveHandle)

          return {
            destroy: () => {
              if (hideTimeout) clearTimeout(hideTimeout)
              dragHandleElement?.removeEventListener("dragstart", handleDragStart)
              dragHandleElement?.removeEventListener("dragend", handleDragEnd)
              dragHandleElement?.removeEventListener("mouseenter", handleMouseEnterHandle)
              dragHandleElement?.removeEventListener("mouseleave", handleMouseLeaveHandle)
              dragHandleElement?.remove()
              dragHandleElement = null
            },
          }
        },
        props: {
          handleDOMEvents: {
            mousemove: (view, event) => {
              if (!view.editable) return false

              // Clear any pending hide
              if (hideTimeout) {
                clearTimeout(hideTimeout)
                hideTimeout = null
              }

              const node = nodeDOMAtCoords({
                x: event.clientX + dragHandleWidth,
                y: event.clientY,
              })

              if (!node) {
                hideDragHandle()
                currentNode = null
                return false
              }

              currentNode = node

              const rect = absoluteRect(node)
              if (!dragHandleElement) return false

              dragHandleElement.style.left = `${rect.left - dragHandleWidth - 8}px`
              dragHandleElement.style.top = `${rect.top + 2}px`

              showDragHandle()
              return false
            },
            mouseleave: () => {
              // Delay hiding to allow mouse to reach the handle
              hideTimeout = setTimeout(() => {
                hideDragHandle()
              }, 100)
              return false
            },
            drop: (view, event) => {
              // Check if this is our drag operation
              const dragData = event.dataTransfer?.getData("application/x-prosemirror-drag")
              if (!dragData || !draggedNodePos || !draggedNodeSize) return false

              try {
                const originalPos = draggedNodePos
                const originalSize = draggedNodeSize

                // Get drop position
                const dropCoords = view.posAtCoords({ left: event.clientX, top: event.clientY })
                if (!dropCoords) return false

                const dropPos = dropCoords.pos

                // Prevent dropping on itself
                if (dropPos >= originalPos && dropPos <= originalPos + originalSize) {
                  event.preventDefault()
                  return true
                }

                // Create a transaction that moves the node
                const { state } = view
                const resolvedOriginal = state.doc.resolve(originalPos)
                const nodeToMove = resolvedOriginal.nodeAfter

                if (!nodeToMove) return false

                // Calculate adjusted drop position
                let adjustedDropPos = dropPos

                // Create transaction
                let tr = state.tr

                // If dropping after the original position, we delete first then insert
                // If dropping before, we insert first then delete (with adjusted position)
                if (dropPos > originalPos) {
                  // Delete original first
                  tr = tr.delete(originalPos, originalPos + nodeToMove.nodeSize)
                  // Adjust drop position since we deleted content before it
                  adjustedDropPos = dropPos - nodeToMove.nodeSize
                  // Insert at adjusted position
                  tr = tr.insert(adjustedDropPos, nodeToMove)
                } else {
                  // Insert first
                  tr = tr.insert(dropPos, nodeToMove)
                  // Delete original (now shifted by the inserted content)
                  tr = tr.delete(originalPos + nodeToMove.nodeSize, originalPos + nodeToMove.nodeSize + nodeToMove.nodeSize)
                }

                view.dispatch(tr)

                // Prevent default to stop duplicate insertion
                event.preventDefault()

                // Reset drag state
                draggedNodePos = null
                draggedNodeSize = null

                return true
              } catch (e) {
                console.warn("Error handling drop:", e)
                return false
              }
            },
          },
        },
      }),
    ]
  },
})

export default DragHandle

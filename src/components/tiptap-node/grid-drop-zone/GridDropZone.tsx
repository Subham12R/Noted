"use client"

import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"

export interface GridDropZoneOptions {
  enabled: boolean
}

// Add global styles for drop zones
if (typeof document !== "undefined") {
  const styleId = "grid-drop-zone-styles"
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style")
    style.id = styleId
    style.textContent = `
      .grid-drop-zone {
        pointer-events: auto !important;
      }
      .grid-drop-zone.highlighted {
        background: rgba(59, 130, 246, 0.3) !important;
        border-color: #2563eb !important;
      }
    `
    document.head.appendChild(style)
  }
}

export const GridDropZone = Extension.create<GridDropZoneOptions>({
  name: "gridDropZone",

  addOptions() {
    return {
      enabled: true,
    }
  },

  addProseMirrorPlugins() {
    let leftZone: HTMLElement | null = null
    let rightZone: HTMLElement | null = null
    let currentDropSide: "left" | "right" | null = null
    let currentTargetBlock: HTMLElement | null = null
    let currentTargetPos: number | null = null
    let isDragging = false
    let dragSourcePos: number | null = null

    const createDropZone = (side: "left" | "right") => {
      const zone = document.createElement("div")
      zone.className = `grid-drop-zone grid-drop-zone-${side}`
      zone.dataset.side = side
      zone.style.cssText = `
        position: fixed;
        pointer-events: auto;
        background: rgba(59, 130, 246, 0.12);
        border: 2px dashed #3b82f6;
        border-radius: 8px;
        opacity: 0;
        transition: opacity 0.15s ease, background 0.15s ease;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: copy;
      `

      const label = document.createElement("span")
      label.className = "grid-drop-label"
      label.style.cssText = `
        background: #3b82f6;
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
      `
      label.textContent = side === "left" ? "← Drop left" : "Drop right →"
      zone.appendChild(label)

      return zone
    }

    const positionDropZones = (targetElement: HTMLElement) => {
      if (!leftZone || !rightZone) return

      const rect = targetElement.getBoundingClientRect()
      const zoneWidth = Math.max(rect.width * 0.45, 120)
      const zoneHeight = Math.max(rect.height, 60)

      // Left zone - covers left half
      leftZone.style.left = `${rect.left}px`
      leftZone.style.top = `${rect.top}px`
      leftZone.style.width = `${zoneWidth}px`
      leftZone.style.height = `${zoneHeight}px`

      // Right zone - covers right half
      rightZone.style.left = `${rect.right - zoneWidth}px`
      rightZone.style.top = `${rect.top}px`
      rightZone.style.width = `${zoneWidth}px`
      rightZone.style.height = `${zoneHeight}px`
    }

    const showDropZones = () => {
      if (leftZone) leftZone.style.opacity = "1"
      if (rightZone) rightZone.style.opacity = "1"
    }

    const hideDropZones = () => {
      if (leftZone) {
        leftZone.style.opacity = "0"
        leftZone.style.background = "rgba(59, 130, 246, 0.12)"
      }
      if (rightZone) {
        rightZone.style.opacity = "0"
        rightZone.style.background = "rgba(59, 130, 246, 0.12)"
      }
      currentDropSide = null
      currentTargetBlock = null
      currentTargetPos = null
    }

    const highlightZone = (side: "left" | "right" | null) => {
      if (leftZone) {
        leftZone.style.background = side === "left"
          ? "rgba(59, 130, 246, 0.25)"
          : "rgba(59, 130, 246, 0.12)"
      }
      if (rightZone) {
        rightZone.style.background = side === "right"
          ? "rgba(59, 130, 246, 0.25)"
          : "rgba(59, 130, 246, 0.12)"
      }
    }

    // Find the block element at coordinates
    const findBlockElementAtCoords = (
      view: import("@tiptap/pm/view").EditorView,
      x: number,
      y: number
    ): { element: HTMLElement; pos: number } | null => {
      const pos = view.posAtCoords({ left: x, top: y })
      if (!pos) return null

      const $pos = view.state.doc.resolve(pos.pos)

      // Find the top-level block
      for (let depth = $pos.depth; depth >= 1; depth--) {
        const node = $pos.node(depth)
        const parent = $pos.node(depth - 1)

        // Only consider blocks that are direct children of doc
        if (node.isBlock && parent.type.name === "doc") {
          const nodePos = $pos.before(depth)
          const dom = view.nodeDOM(nodePos)

          if (dom instanceof HTMLElement) {
            return { element: dom, pos: nodePos }
          }
        }
      }

      return null
    }

    return [
      new Plugin({
        key: new PluginKey("gridDropZone"),
        view: (view) => {
          leftZone = createDropZone("left")
          rightZone = createDropZone("right")
          document.body.appendChild(leftZone)
          document.body.appendChild(rightZone)

          // Handle dragover on the zones themselves
          const handleZoneDragOver = (e: DragEvent) => {
            if (!isDragging) return
            e.preventDefault()
            e.stopPropagation()

            const target = e.currentTarget as HTMLElement
            const side = target.dataset.side as "left" | "right"
            currentDropSide = side
            highlightZone(side)
          }

          const handleZoneDragLeave = (e: DragEvent) => {
            highlightZone(null)
          }

          const handleZoneDrop = (e: DragEvent) => {
            if (!isDragging || !currentDropSide || currentTargetPos === null || dragSourcePos === null) {
              hideDropZones()
              return
            }

            e.preventDefault()
            e.stopPropagation()

            const { state, dispatch } = view
            const { schema } = state
            let { tr } = state

            // Get the dragged content
            const draggedSlice = state.selection.content()
            if (!draggedSlice.content.size) {
              hideDropZones()
              return
            }

            // Find the target block node
            const $targetPos = state.doc.resolve(currentTargetPos)
            let targetNode = null
            let targetStart = currentTargetPos
            let targetEnd = currentTargetPos

            for (let depth = $targetPos.depth; depth >= 1; depth--) {
              const node = $targetPos.node(depth)
              const parent = $targetPos.node(depth - 1)
              if (node.isBlock && parent.type.name === "doc") {
                targetNode = node
                targetStart = $targetPos.before(depth)
                targetEnd = $targetPos.after(depth)
                break
              }
            }

            if (!targetNode) {
              hideDropZones()
              return
            }

            // Don't allow dropping on columns
            if (targetNode.type.name === "columns") {
              hideDropZones()
              return
            }

            // Get schema types
            const columnsType = schema.nodes.columns
            const columnType = schema.nodes.column

            if (!columnsType || !columnType) {
              hideDropZones()
              return
            }

            // Get the dragged content as nodes
            const draggedNodes: any[] = []
            draggedSlice.content.forEach((node) => {
              draggedNodes.push(node)
            })

            // Determine column contents based on drop side
            const leftContent = currentDropSide === "left" ? draggedNodes : [targetNode]
            const rightContent = currentDropSide === "right" ? draggedNodes : [targetNode]

            // Create the columns node
            const columnsNode = columnsType.create(
              { columns: 2 },
              [
                columnType.create(null, leftContent),
                columnType.create(null, rightContent),
              ]
            )

            // Get selection positions
            const selFrom = state.selection.from
            const selTo = state.selection.to

            // Determine the order of operations based on positions
            if (selFrom < targetStart) {
              // Dragged content is before target
              // First replace target, then delete source
              tr = tr.replaceWith(targetStart, targetEnd, columnsNode)

              // Calculate how much the document changed
              const sizeChange = columnsNode.nodeSize - (targetEnd - targetStart)

              // Now delete the original dragged content
              // The positions haven't changed yet since we replaced after
              tr = tr.delete(selFrom, selTo)
            } else {
              // Dragged content is after target
              // First delete source (it won't affect target positions)
              tr = tr.delete(selFrom, selTo)

              // Now replace target (positions are unchanged since deletion was after)
              tr = tr.replaceWith(targetStart, targetEnd, columnsNode)
            }

            dispatch(tr)
            hideDropZones()
            isDragging = false
            dragSourcePos = null
          }

          leftZone.addEventListener("dragover", handleZoneDragOver)
          leftZone.addEventListener("dragleave", handleZoneDragLeave)
          leftZone.addEventListener("drop", handleZoneDrop)
          rightZone.addEventListener("dragover", handleZoneDragOver)
          rightZone.addEventListener("dragleave", handleZoneDragLeave)
          rightZone.addEventListener("drop", handleZoneDrop)

          return {
            destroy: () => {
              leftZone?.removeEventListener("dragover", handleZoneDragOver)
              leftZone?.removeEventListener("dragleave", handleZoneDragLeave)
              leftZone?.removeEventListener("drop", handleZoneDrop)
              rightZone?.removeEventListener("dragover", handleZoneDragOver)
              rightZone?.removeEventListener("dragleave", handleZoneDragLeave)
              rightZone?.removeEventListener("drop", handleZoneDrop)
              leftZone?.remove()
              rightZone?.remove()
              leftZone = null
              rightZone = null
            },
          }
        },
        props: {
          handleDOMEvents: {
            dragstart: (view, event) => {
              isDragging = true
              dragSourcePos = view.state.selection.from
              return false
            },
            dragend: () => {
              isDragging = false
              dragSourcePos = null
              hideDropZones()
              return false
            },
            dragover: (view, event) => {
              if (!isDragging) return false

              const block = findBlockElementAtCoords(view, event.clientX, event.clientY)

              if (!block) {
                hideDropZones()
                return false
              }

              // Don't show zones if hovering over the dragged block itself
              const $pos = view.state.doc.resolve(block.pos)
              const selFrom = view.state.selection.from
              const selTo = view.state.selection.to

              if (block.pos >= selFrom && block.pos < selTo) {
                hideDropZones()
                return false
              }

              // Check if it's a columns node - don't show zones
              const node = view.state.doc.nodeAt(block.pos)
              if (node && node.type.name === "columns") {
                hideDropZones()
                return false
              }

              // Update target and show zones
              if (currentTargetBlock !== block.element) {
                currentTargetBlock = block.element
                currentTargetPos = block.pos
                positionDropZones(block.element)
                showDropZones()
              }

              // Determine which side the mouse is on
              const rect = block.element.getBoundingClientRect()
              const relativeX = event.clientX - rect.left
              const side = relativeX < rect.width / 2 ? "left" : "right"

              currentDropSide = side
              highlightZone(side)

              return false
            },
            dragleave: (view, event) => {
              // Only hide if we're leaving the editor entirely
              const relatedTarget = event.relatedTarget as HTMLElement
              const isOverZone = relatedTarget?.classList?.contains("grid-drop-zone")

              if (!relatedTarget || (!view.dom.contains(relatedTarget) && !isOverZone)) {
                hideDropZones()
              }
              return false
            },
          },
        },
      }),
    ]
  },
})

export default GridDropZone

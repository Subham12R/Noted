"use client"

import { NodeViewWrapper, NodeViewContent, NodeViewProps } from "@tiptap/react"
import { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { useCallback, useState } from "react"

export function ColumnsComponent({
  node,
  updateAttributes,
  selected,
  deleteNode,
  editor,
}: NodeViewProps) {
  const [isHovering, setIsHovering] = useState(false)
  const columns = node.attrs.columns || 2

  const handleAddColumn = useCallback(() => {
    if (columns < 4) {
      // Insert a new column node
      const pos = editor.state.selection.$from.pos
      editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          // Find the columns node position
          let foundPos: number | null = null
          let foundNode: ProseMirrorNode | null = null

          state.doc.nodesBetween(0, state.doc.content.size, (n, p) => {
            if (n.type.name === "columns" && n === node) {
              foundPos = p
              foundNode = n
              return false
            }
            return true
          })

          if (foundPos === null || !foundNode) return false

          const columnsPos = foundPos as number
          const columnsNode = foundNode as ProseMirrorNode

          // Create new column with empty paragraph
          const columnType = state.schema.nodes.column
          const paragraphType = state.schema.nodes.paragraph
          const newColumn = columnType.create(null, paragraphType.create())

          // Insert at the end of the columns content
          const insertPos = columnsPos + columnsNode.nodeSize - 1
          tr.insert(insertPos, newColumn)

          // Update columns count
          tr.setNodeMarkup(columnsPos, undefined, {
            ...columnsNode.attrs,
            columns: columns + 1,
          })

          return true
        })
        .run()
    }
  }, [columns, editor, node])

  const handleRemoveColumn = useCallback(() => {
    if (columns > 1) {
      editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          // Find the columns node position
          let foundPos: number | null = null
          let foundNode: ProseMirrorNode | null = null

          state.doc.nodesBetween(0, state.doc.content.size, (n, p) => {
            if (n.type.name === "columns" && n === node) {
              foundPos = p
              foundNode = n
              return false
            }
            return true
          })

          if (foundPos === null || !foundNode) return false

          const columnsPos = foundPos as number
          const columnsNode = foundNode as ProseMirrorNode

          // Remove the last column
          const lastColumnStart =
            columnsPos + columnsNode.nodeSize - columnsNode.lastChild!.nodeSize - 1
          const lastColumnEnd = columnsPos + columnsNode.nodeSize - 1

          tr.delete(lastColumnStart, lastColumnEnd)

          // Update columns count
          tr.setNodeMarkup(columnsPos, undefined, {
            ...columnsNode.attrs,
            columns: columns - 1,
          })

          return true
        })
        .run()
    } else {
      // Convert back to regular content
      editor.chain().focus().unsetColumns().run()
    }
  }, [columns, editor, node])

  return (
    <NodeViewWrapper
      className={`columns-node ${selected ? "selected" : ""}`}
      data-type="columns"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Toolbar */}
      {(isHovering || selected) && (
        <div
          className="columns-toolbar"
          contentEditable={false}
          style={{
            position: "absolute",
            top: -36,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 4,
            padding: "4px 8px",
            backgroundColor: "white",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            border: "1px solid #e5e7eb",
            zIndex: 10,
          }}
        >
          <button
            onClick={handleRemoveColumn}
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
              border: "none",
              backgroundColor: "transparent",
              color: "#6b7280",
              cursor: "pointer",
              fontSize: 14,
            }}
            title="Remove column"
          >
            −
          </button>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 8px",
              fontSize: 12,
              color: "#6b7280",
              fontWeight: 500,
            }}
          >
            {columns} col
          </span>
          <button
            onClick={handleAddColumn}
            disabled={columns >= 4}
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
              border: "none",
              backgroundColor: "transparent",
              color: columns >= 4 ? "#d1d5db" : "#6b7280",
              cursor: columns >= 4 ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
            title="Add column"
          >
            +
          </button>
          <div
            style={{
              width: 1,
              height: 20,
              backgroundColor: "#e5e7eb",
              margin: "0 4px",
            }}
          />
          <button
            onClick={() => deleteNode()}
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
              border: "none",
              backgroundColor: "transparent",
              color: "#ef4444",
              cursor: "pointer",
            }}
            title="Delete columns"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      )}

      {/* Content */}
      <div
        className="columns-content"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 16,
          padding: selected ? 8 : 0,
          border: selected ? "2px solid #3b82f6" : "2px solid transparent",
          borderRadius: 8,
          transition: "border-color 0.15s ease, padding 0.15s ease",
          position: "relative",
        }}
      >
        <NodeViewContent className="columns-inner" />
      </div>
    </NodeViewWrapper>
  )
}

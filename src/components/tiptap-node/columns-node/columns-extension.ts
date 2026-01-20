"use client"

import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { ColumnsComponent } from "./ColumnsComponent"

export interface ColumnsOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columns: {
      setColumns: (columns?: number) => ReturnType
      unsetColumns: () => ReturnType
    }
  }
}

export const Columns = Node.create<ColumnsOptions>({
  name: "columns",

  group: "block",

  content: "column+",

  defining: true,

  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      columns: {
        default: 2,
        parseHTML: (element) =>
          parseInt(element.getAttribute("data-columns") || "2", 10),
        renderHTML: (attributes) => ({
          "data-columns": attributes.columns,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="columns"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "columns",
        class: "columns-wrapper",
      }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnsComponent)
  },

  addCommands() {
    return {
      setColumns:
        (columns = 2) =>
        ({ commands, state }) => {
          const { selection } = state
          const { $from, $to } = selection

          // Get the content to wrap in columns
          const content: ReturnType<typeof state.doc.toJSON>[] = []
          state.doc.nodesBetween($from.pos, $to.pos, (node) => {
            if (node.isBlock && node.type.name !== "doc") {
              content.push(node.toJSON())
              return false
            }
            return true
          })

          // Create column nodes with content distributed
          const columnNodes: { type: string; content: unknown[] }[] = []
          const itemsPerColumn = Math.ceil(content.length / columns) || 1

          for (let i = 0; i < columns; i++) {
            const columnContent = content.slice(
              i * itemsPerColumn,
              (i + 1) * itemsPerColumn
            )
            columnNodes.push({
              type: "column",
              content:
                columnContent.length > 0
                  ? columnContent
                  : [{ type: "paragraph" }],
            })
          }

          return commands.insertContent({
            type: this.name,
            attrs: { columns },
            content: columnNodes,
          })
        },
      unsetColumns:
        () =>
        ({ commands, state }) => {
          const { selection } = state
          const { $from } = selection

          // Find the columns node
          let columnsPos = null
          let columnsNode = null

          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth)
            if (node.type.name === "columns") {
              columnsPos = $from.before(depth)
              columnsNode = node
              break
            }
          }

          if (columnsPos === null || !columnsNode) return false

          // Extract content from all columns
          const content: any[] = []
          columnsNode.forEach((column) => {
            column.forEach((child) => {
              content.push(child.toJSON())
            })
          })

          // Replace columns with extracted content
          return commands.command(({ tr }) => {
            tr.replaceWith(
              columnsPos!,
              columnsPos! + columnsNode!.nodeSize,
              content.map((c) => state.schema.nodeFromJSON(c))
            )
            return true
          })
        },
    }
  },
})

export const Column = Node.create({
  name: "column",

  group: "column",

  content: "block+",

  defining: true,

  isolating: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="column"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "column",
        class: "column",
      }),
      0,
    ]
  },
})

export default Columns

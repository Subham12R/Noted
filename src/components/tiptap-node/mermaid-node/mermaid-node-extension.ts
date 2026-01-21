import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { MermaidNodeView } from './mermaid-node-view'

export interface MermaidOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      insertMermaid: (chart: string) => ReturnType
    }
  }
}

export const MermaidNode = Node.create<MermaidOptions>({
  name: 'mermaid',

  group: 'block',

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      chart: {
        default: 'flowchart TD\n    A[Start] --> B[End]',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-chart') || '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-chart': attributes.chart,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'mermaid',
      }),
    ]
  },

  addCommands() {
    return {
      insertMermaid:
        (chart: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              chart,
            },
          })
        },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView)
  },
})

export default MermaidNode

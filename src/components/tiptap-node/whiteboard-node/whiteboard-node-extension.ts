import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { WhiteboardNodeView } from './whiteboard-node-view'

export interface WhiteboardOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    whiteboard: {
      insertWhiteboard: () => ReturnType
    }
  }
}

export const WhiteboardNode = Node.create<WhiteboardOptions>({
  name: 'whiteboard',

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
      shapes: {
        default: '[]',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-shapes') || '[]',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-shapes': attributes.shapes,
        }),
      },
      width: {
        default: 800,
        parseHTML: (element: HTMLElement) => parseInt(element.getAttribute('data-width') || '800', 10),
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-width': attributes.width,
        }),
      },
      height: {
        default: 400,
        parseHTML: (element: HTMLElement) => parseInt(element.getAttribute('data-height') || '400', 10),
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-height': attributes.height,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="whiteboard"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'whiteboard',
      }),
    ]
  },

  addCommands() {
    return {
      insertWhiteboard:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              shapes: '[]',
              width: 800,
              height: 400,
            },
          })
        },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(WhiteboardNodeView)
  },
})

export default WhiteboardNode

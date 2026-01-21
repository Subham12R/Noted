// TipTap AI Block Node Extension
// Renders AI-generated content as a special block

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { AIBlockComponent } from './AIBlockComponent'

export interface AIBlockAttributes {
  id: string
  prompt: string
  response: string
  model: string
  mode: string
  timestamp: string
  tokensUsed: number
  isLoading: boolean
  error: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiBlock: {
      /**
       * Insert an AI block
       */
      insertAIBlock: (attrs: Partial<AIBlockAttributes>) => ReturnType
      /**
       * Update AI block content
       */
      updateAIBlock: (id: string, attrs: Partial<AIBlockAttributes>) => ReturnType
    }
  }
}

export const AIBlockNode = Node.create({
  name: 'aiBlock',

  group: 'block',

  content: 'block*',

  defining: true,

  isolating: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => ({
          'data-id': attributes.id,
        }),
      },
      prompt: {
        default: '',
        parseHTML: element => element.getAttribute('data-prompt'),
        renderHTML: attributes => ({
          'data-prompt': attributes.prompt,
        }),
      },
      response: {
        default: '',
      },
      model: {
        default: 'llama-3.1-8b-instant',
        parseHTML: element => element.getAttribute('data-model'),
        renderHTML: attributes => ({
          'data-model': attributes.model,
        }),
      },
      mode: {
        default: 'answer',
        parseHTML: element => element.getAttribute('data-mode'),
        renderHTML: attributes => ({
          'data-mode': attributes.mode,
        }),
      },
      timestamp: {
        default: null,
        parseHTML: element => element.getAttribute('data-timestamp'),
        renderHTML: attributes => ({
          'data-timestamp': attributes.timestamp,
        }),
      },
      tokensUsed: {
        default: 0,
      },
      isLoading: {
        default: false,
      },
      error: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="ai-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'ai-block' }), 0]
  },

  addCommands() {
    return {
      insertAIBlock:
        (attrs = {}) =>
        ({ commands, editor }) => {
          const id = attrs.id || crypto.randomUUID()
          return commands.insertContent({
            type: this.name,
            attrs: {
              id,
              prompt: attrs.prompt || '',
              response: attrs.response || '',
              model: attrs.model || 'llama-3.1-8b-instant',
              mode: attrs.mode || 'answer',
              timestamp: attrs.timestamp || new Date().toISOString(),
              tokensUsed: attrs.tokensUsed || 0,
              isLoading: attrs.isLoading ?? true,
              error: attrs.error || null,
            },
          })
        },

      updateAIBlock:
        (id, attrs) =>
        ({ tr, state, dispatch }) => {
          let updated = false

          state.doc.descendants((node, pos) => {
            if (node.type.name === 'aiBlock' && node.attrs.id === id) {
              if (dispatch) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  ...attrs,
                })
                updated = true
              }
              return false // Stop iteration
            }
            return true
          })

          if (updated && dispatch) {
            dispatch(tr)
          }

          return updated
        },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(AIBlockComponent)
  },
})

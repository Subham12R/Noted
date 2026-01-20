"use client"

import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { ResizableImageComponent } from "./ResizableImageComponent"

export interface ResizableImageOptions {
  inline: boolean
  allowBase64: boolean
  HTMLAttributes: Record<string, unknown>
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    resizableImage: {
      setImage: (options: {
        src: string
        alt?: string
        title?: string
        width?: number
        height?: number
      }) => ReturnType
    }
  }
}

export const ResizableImage = Node.create<ResizableImageOptions>({
  name: "image",

  addOptions() {
    return {
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
    }
  },

  inline() {
    return this.options.inline
  },

  group() {
    return this.options.inline ? "inline" : "block"
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      alignment: {
        default: "center",
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})

export default ResizableImage

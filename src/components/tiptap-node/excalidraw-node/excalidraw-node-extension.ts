import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { ExcalidrawNodeView } from "./excalidraw-node-view"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    excalidraw: {
      insertExcalidraw: () => ReturnType
    }
  }
}

export const ExcalidrawNode = Node.create({
  name: "excalidraw",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      elements: {
        default: "[]",
        parseHTML: element => element.getAttribute("data-elements"),
        renderHTML: attributes => ({
          "data-elements": attributes.elements,
        }),
      },
      appState: {
        default: "{}",
        parseHTML: element => element.getAttribute("data-app-state"),
        renderHTML: attributes => ({
          "data-app-state": attributes.appState,
        }),
      },
      files: {
        default: "{}",
        parseHTML: element => element.getAttribute("data-files"),
        renderHTML: attributes => ({
          "data-files": attributes.files,
        }),
      },
      width: {
        default: 600,
        parseHTML: element => parseInt(element.getAttribute("data-width") || "600"),
        renderHTML: attributes => ({
          "data-width": attributes.width,
        }),
      },
      height: {
        default: 400,
        parseHTML: element => parseInt(element.getAttribute("data-height") || "400"),
        renderHTML: attributes => ({
          "data-height": attributes.height,
        }),
      },
      pageId: {
        default: null,
        parseHTML: element => element.getAttribute("data-page-id"),
        renderHTML: attributes => ({
          "data-page-id": attributes.pageId,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="excalidraw"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "excalidraw",
        class: "excalidraw-wrapper",
      }),
    ]
  },

  addCommands() {
    return {
      insertExcalidraw:
        (pageId?: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              elements: "[]",
              appState: "{}",
              files: "{}",
              width: 600,
              height: 400,
              pageId: pageId || null,
            },
          })
        },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawNodeView)
  },
})

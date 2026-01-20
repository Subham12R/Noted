import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { common, createLowlight } from "lowlight"
import { CodeBlockComponent } from "./CodeBlockComponent"

// Create lowlight instance with common languages
const lowlight = createLowlight(common)

// Export configured CodeBlockLowlight extension
export const EnhancedCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent)
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      // Tab for indentation
      Tab: ({ editor }) => {
        if (editor.isActive("codeBlock")) {
          editor.commands.insertContent("  ")
          return true
        }
        return false
      },
      // Shift+Tab for unindent
      "Shift-Tab": ({ editor }) => {
        if (editor.isActive("codeBlock")) {
          const { state } = editor
          const { selection } = state
          const { $from } = selection
          const lineStart = $from.start()
          const textBefore = state.doc.textBetween(lineStart, $from.pos)

          if (textBefore.startsWith("  ")) {
            editor.commands.command(({ tr }) => {
              tr.delete(lineStart, lineStart + 2)
              return true
            })
            return true
          }
        }
        return false
      },
      // Enter with auto-indent
      Enter: ({ editor }) => {
        if (editor.isActive("codeBlock")) {
          const { state } = editor
          const { selection } = state
          const { $from } = selection

          // Get the current line's indentation
          const lineStart = state.doc.resolve($from.pos).start()
          const lineText = state.doc.textBetween(lineStart, $from.pos)
          const indent = lineText.match(/^(\s*)/)?.[1] || ""

          // Check if the previous character is an opening bracket
          const charBefore = lineText.trim().slice(-1)
          const needsExtraIndent = ["{", "[", "(", ":"].includes(charBefore)

          const newIndent = needsExtraIndent ? indent + "  " : indent

          editor.commands.insertContent("\n" + newIndent)
          return true
        }
        return false
      },
      // Auto-close brackets
      "(": ({ editor }) => {
        if (editor.isActive("codeBlock")) {
          editor.commands.insertContent("()")
          editor.commands.setTextSelection(editor.state.selection.from - 1)
          return true
        }
        return false
      },
      "[": ({ editor }) => {
        if (editor.isActive("codeBlock")) {
          editor.commands.insertContent("[]")
          editor.commands.setTextSelection(editor.state.selection.from - 1)
          return true
        }
        return false
      },
      "{": ({ editor }) => {
        if (editor.isActive("codeBlock")) {
          editor.commands.insertContent("{}")
          editor.commands.setTextSelection(editor.state.selection.from - 1)
          return true
        }
        return false
      },
      '"': ({ editor }) => {
        if (editor.isActive("codeBlock")) {
          editor.commands.insertContent('""')
          editor.commands.setTextSelection(editor.state.selection.from - 1)
          return true
        }
        return false
      },
      "'": ({ editor }) => {
        if (editor.isActive("codeBlock")) {
          editor.commands.insertContent("''")
          editor.commands.setTextSelection(editor.state.selection.from - 1)
          return true
        }
        return false
      },
      "`": ({ editor }) => {
        if (editor.isActive("codeBlock")) {
          editor.commands.insertContent("``")
          editor.commands.setTextSelection(editor.state.selection.from - 1)
          return true
        }
        return false
      },
    }
  },
}).configure({
  lowlight,
  defaultLanguage: "javascript",
})

// Export supported languages for the language selector
export const supportedLanguages = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "json", label: "JSON" },
  { value: "xml", label: "XML" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
  { value: "bash", label: "Bash" },
  { value: "shell", label: "Shell" },
  { value: "plaintext", label: "Plain Text" },
]

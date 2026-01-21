"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
import { useNotes } from "@/context/NotesContext"
import Link from "next/link"

// Debounce hook
function useDebounce<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay]
  )
}

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Selection, Dropcursor } from "@tiptap/extensions"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import { EnhancedCodeBlock } from "@/components/tiptap-node/code-block-node/code-block-node-extension"
import { WhiteboardNode } from "@/components/tiptap-node/whiteboard-node/whiteboard-node-extension"
import { ResizableImage } from "@/components/tiptap-node/image-node"
import { DragHandle } from "@/components/tiptap-node/drag-handle"
import { Columns, Column } from "@/components/tiptap-node/columns-node"
import { GridDropZone } from "@/components/tiptap-node/grid-drop-zone"

import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"
import "@/components/tiptap-node/columns-node/columns-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover"
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"
import { WhiteboardButton } from "@/components/tiptap-ui/whiteboard-button"
import { ColumnsButton } from "@/components/tiptap-ui/columns-button"

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/components/tiptap-icons/link-icon"

// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"
import { useWindowSize } from "@/hooks/use-window-size"
import { useCursorVisibility } from "@/hooks/use-cursor-visibility"

// --- Components ---
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle"
import { ShareModal } from "@/components/collaboration/ShareModal"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

interface NoteEditorProps {
  pageId: string
}

interface SharedPageData {
  id: string
  name: string
  content: string
  folderId: string
  folder?: { id: string; name: string } | null
}

interface SharedPageState {
  page: SharedPageData | null
  role: string | null
  isLoading: boolean
  error: string | null
}

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  onShareClick,
  isMobile,
  folderId,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  onShareClick: () => void
  isMobile: boolean
  folderId: string | null
}) => {
  return (
    <>
      <ToolbarGroup>
        <Link href={folderId ? `/folder/${folderId}` : "/"}>
          <Button data-style="ghost">
            <ArrowLeftIcon className="tiptap-button-icon" />
          </Button>
        </Link>
      </ToolbarGroup>

      <ToolbarSeparator />

      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
        <WhiteboardButton />
        <ColumnsButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <Button data-style="ghost" onClick={onShareClick} title="Share">
          <ShareIcon className="tiptap-button-icon" />
        </Button>
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}
    </>
  )
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)

export function NoteEditor({ pageId }: NoteEditorProps) {
  const isMobile = useIsBreakpoint()
  const { height } = useWindowSize()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">("main")
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const { getPageById, getPageContent, updatePageContent, isLoading } = useNotes()
  const pageInfo = getPageById(pageId)

  // State for shared pages (not in local context)
  // Start with isLoading: true if we don't have pageInfo yet (need to check if it's shared)
  const [sharedPageState, setSharedPageState] = useState<{
    page: SharedPageData | null
    role: string | null
    isLoading: boolean
    hasFetched: boolean
    error: string | null
  }>({ page: null, role: null, isLoading: false, hasFetched: false, error: null })

  // Fetch shared page if not found in local context
  useEffect(() => {
    // Skip if we have the page locally (owned page) - no need to fetch
    if (pageInfo) {
      return
    }

    // Skip if still loading context or already fetched
    if (isLoading || !pageId || sharedPageState.hasFetched) {
      return
    }

    let cancelled = false

    const fetchSharedPage = async () => {
      try {
        const res = await fetch(`/api/pages/${pageId}`)
        if (!res.ok) throw new Error("Failed to fetch page")
        const data = await res.json()
        if (cancelled) return
        setSharedPageState({
          page: {
            id: data.page.id,
            name: data.page.name,
            content: data.page.content || "",
            folderId: data.page.folderId,
            folder: data.page.folder,
          },
          role: data.role,
          isLoading: false,
          hasFetched: true,
          error: null,
        })
      } catch (err) {
        if (cancelled) return
        console.error("Error fetching shared page:", err)
        setSharedPageState({ page: null, role: null, isLoading: false, hasFetched: true, error: err instanceof Error ? err.message : "Failed to fetch" })
      }
    }

    setSharedPageState(prev => ({ ...prev, isLoading: true, error: null }))
    fetchSharedPage()

    return () => { cancelled = true }
  }, [pageInfo, isLoading, pageId, sharedPageState.hasFetched])

  // Determine if this is a shared page or owned page
  const isSharedPage = !pageInfo && sharedPageState.page
  const userRole = pageInfo ? "owner" : sharedPageState.role
  const canEditPage = userRole === "owner" || userRole === "admin" || userRole === "editor"

  // Get initial content synchronously (it's already in memory from context)
  const initialContent = isSharedPage ? sharedPageState.page!.content : getPageContent(pageId)

  // Debounce the save operation to prevent cursor jumping
  const debouncedSave = useDebounce((id: string, content: string) => {
    updatePageContent(id, content)
  }, 500)

  // Save content for shared pages via API
  const saveSharedPageContent = useCallback(async (id: string, content: string) => {
    try {
      await fetch(`/api/pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
    } catch (err) {
      console.error("Error saving shared page:", err)
    }
  }, [])

  const debouncedSaveShared = useDebounce((id: string, content: string) => {
    saveSharedPageContent(id, content)
  }, 500)

  const editor = useEditor({
    immediatelyRender: false,
    editable: canEditPage,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        codeBlock: false, // Disabled in favor of EnhancedCodeBlock
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      EnhancedCodeBlock,
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      ResizableImage,
      Typography,
      Superscript,
      Subscript,
      Selection,
      Dropcursor.configure({
        color: "#3b82f6",
        width: 2,
      }),
      DragHandle,
      Columns,
      Column,
      GridDropZone,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
      WhiteboardNode,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      // Use debounced save to prevent cursor jumping
      if (isSharedPage) {
        debouncedSaveShared(pageId, editor.getHTML())
      } else {
        debouncedSave(pageId, editor.getHTML())
      }
    },
  }, [initialContent, canEditPage])

  // Update editor editable state when role changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(canEditPage)
    }
  }, [editor, canEditPage])

  // Store toolbar height in state to avoid ref access during render
  const [toolbarHeight, setToolbarHeight] = useState(0)

  useEffect(() => {
    if (toolbarRef.current) {
      setToolbarHeight(toolbarRef.current.getBoundingClientRect().height)
    }
  }, [])

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarHeight,
  })

  // Reset mobile view when switching to desktop
  const effectiveMobileView = !isMobile ? "main" : mobileView

  // Load content when pageId changes
  useEffect(() => {
    if (editor && pageId) {
      const content = getPageContent(pageId)
      editor.commands.setContent(content)
    }
  }, [pageId, editor, getPageContent])

  // Show loading spinner while data is being fetched
  // - Context is loading (checking owned pages)
  // - Shared page fetch is in progress
  // - Need to fetch shared page (not owned, context done loading, hasn't fetched yet)
  const needsSharedFetch = !pageInfo && !isLoading && !sharedPageState.hasFetched && !sharedPageState.isLoading
  if (isLoading || sharedPageState.isLoading || needsSharedFetch) {
    return (
      <div className="simple-editor-wrapper">
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
            <p className="text-sm text-zinc-500">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Check if we have either owned page or shared page
  const hasPage = pageInfo || isSharedPage

  if (!hasPage) {
    return (
      <div className="simple-editor-wrapper">
        <div className="flex items-center justify-center h-full">
          <p>Page not found</p>
        </div>
      </div>
    )
  }

  // Get page info (either from context or shared state)
  const pageName = pageInfo ? pageInfo.page.name : sharedPageState.page!.name
  const currentFolderId = pageInfo ? pageInfo.folderId : sharedPageState.page!.folderId

  return (
    <>
      <div className="simple-editor-wrapper">
        <div className="main-content">
          <EditorContext.Provider value={{ editor }}>
            {canEditPage ? (
              <Toolbar
                ref={toolbarRef}
                style={{
                  ...(isMobile
                    ? {
                        bottom: `calc(100% - ${height - rect.y}px)`,
                      }
                    : {}),
                }}
              >
                {effectiveMobileView === "main" ? (
                  <MainToolbarContent
                    onHighlighterClick={() => setMobileView("highlighter")}
                    onLinkClick={() => setMobileView("link")}
                    onShareClick={() => setIsShareModalOpen(true)}
                    isMobile={isMobile}
                    folderId={currentFolderId}
                  />
                ) : (
                  <MobileToolbarContent
                    type={effectiveMobileView === "highlighter" ? "highlighter" : "link"}
                    onBack={() => setMobileView("main")}
                  />
                )}
              </Toolbar>
            ) : (
              <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Link href="/">
                      <Button data-style="ghost">
                        <ArrowLeftIcon className="tiptap-button-icon" />
                      </Button>
                    </Link>
                    <span className="text-sm text-zinc-400">View only</span>
                  </div>
                  <span className="text-sm font-medium text-white truncate max-w-[200px]">
                    {pageName}
                  </span>
                </div>
              </div>
            )}

            <EditorContent
              editor={editor}
              role="presentation"
              className="simple-editor-content"
            />
          </EditorContext.Provider>
        </div>
      </div>

      {canEditPage && (
        <ShareModal
          pageId={pageId}
          pageName={pageName}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </>
  )
}

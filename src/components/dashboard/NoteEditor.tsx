"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
import { useNotes } from "@/context/NotesContext"
import Link from "next/link"
import { useHotkeys } from "react-hotkeys-hook"

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
import { useRealtimeSync } from "@/hooks/use-realtime-sync"

// --- Components ---
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle"
import { ShareModal } from "@/components/collaboration/ShareModal"
import { SlashCommandMenu } from "@/components/editor/SlashCommandMenu"
import { ExportMenu } from "@/components/editor/ExportMenu"
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal"

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
  onKeyboardShortcutsClick,
  isMobile,
  folderId,
  isConnected,
  activeUsers,
  editor,
  pageName,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  onShareClick: () => void
  onKeyboardShortcutsClick: () => void
  isMobile: boolean
  folderId: string | null
  isConnected: boolean
  activeUsers: { id: string; name: string; avatar: string | null; color: string }[]
  editor: ReturnType<typeof useEditor> | null
  pageName: string
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
        <ExportMenu editor={editor} pageName={pageName} />
        <Button data-style="ghost" onClick={onKeyboardShortcutsClick} title="Keyboard Shortcuts (Ctrl+K)">
          <KeyboardIcon className="tiptap-button-icon" />
        </Button>
        <ThemeToggle />
      </ToolbarGroup>

      {/* Active users indicator */}
      {activeUsers.length > 0 && (
        <>
          <ToolbarSeparator />
          <ToolbarGroup>
            <div className="flex items-center gap-1 px-2" title={`${activeUsers.length} other user(s) editing`}>
              {activeUsers.slice(0, 3).map((user) => (
                <div
                  key={user.id}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-zinc-800"
                  style={{ backgroundColor: user.color }}
                  title={user.name}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {activeUsers.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-300">
                  +{activeUsers.length - 3}
                </div>
              )}
            </div>
          </ToolbarGroup>
        </>
      )}

      {/* Connection status indicator */}
      {isConnected && (
        <div className="flex items-center gap-1 px-2" title="Real-time sync active">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      )}

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

function KeyboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" ry="2" />
      <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10" />
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
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false)
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 })
  const toolbarRef = useRef<HTMLDivElement>(null)

  const { getPageById, updatePageContent } = useNotes()
  const pageInfo = getPageById(pageId)

  // Keep pageInfo in a ref so we can use it in the fetch without triggering re-fetches
  const pageInfoRef = useRef(pageInfo)
  pageInfoRef.current = pageInfo

  // State for page data fetched from API (works for both owned and shared pages)
  const [pageState, setPageState] = useState<{
    page: SharedPageData | null
    role: string | null
    status: "idle" | "loading" | "success" | "error"
    error: string | null
  }>({ page: null, role: null, status: "idle", error: null })

  // Track which pageId we've fetched to avoid re-fetching
  const fetchedPageIdRef = useRef<string | null>(null)

  // Always fetch page content from API to ensure fresh data on refresh
  useEffect(() => {
    // Skip if no pageId
    if (!pageId) {
      return
    }

    // Skip if already fetched for this page
    if (fetchedPageIdRef.current === pageId) {
      return
    }

    let cancelled = false

    // Mark as loading immediately
    setPageState({ page: null, role: null, status: "loading", error: null })

    const fetchPageContent = async () => {
      try {
        const res = await fetch(`/api/pages/${pageId}`)
        if (cancelled) return

        if (!res.ok) throw new Error("Failed to fetch page")
        const data = await res.json()

        if (cancelled) return

        fetchedPageIdRef.current = pageId
        setPageState({
          page: {
            id: data.page.id,
            name: data.page.name,
            content: data.page.content || "",
            folderId: data.page.folderId,
            folder: data.page.folder,
          },
          role: data.role || (pageInfoRef.current ? "owner" : null),
          status: "success",
          error: null,
        })
      } catch (err) {
        if (cancelled) return
        console.error("Error fetching page:", err)
        setPageState({ page: null, role: null, status: "error", error: err instanceof Error ? err.message : "Failed to fetch" })
      }
    }

    fetchPageContent()

    return () => {
      cancelled = true
    }
  }, [pageId])

  // Determine if this is a shared page or owned page
  const isSharedPage = !pageInfo && pageState.page
  const userRole = pageInfo ? "owner" : pageState.role
  const canEditPage = userRole === "owner" || userRole === "admin" || userRole === "editor"

  // Get initial content from API fetch (ensures fresh data on refresh)
  const initialContent = pageState.page?.content || ""

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

  // Track if we're currently receiving a remote update to prevent echo
  const isRemoteUpdateRef = useRef(false)
  // Ref to hold the broadcast function so it doesn't cause editor recreation
  const broadcastContentRef = useRef<(content: string) => void>(() => {})

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
      // Skip if this update was triggered by a remote sync
      if (isRemoteUpdateRef.current) return

      const content = editor.getHTML()

      // Broadcast to other users via WebSocket (use ref to avoid stale closure)
      broadcastContentRef.current(content)

      // Use debounced save to persist to database
      if (isSharedPage) {
        debouncedSaveShared(pageId, content)
      } else {
        debouncedSave(pageId, content)
      }
    },
  }, [initialContent, canEditPage])

  // Real-time sync with other users - use stable pageId only, not canEditPage which changes
  const { broadcastContent, isConnected, activeUsers } = useRealtimeSync({
    pageId,
    editor,
    enabled: true, // Always enable if we have a pageId, the hook handles auth internally
  })

  // Keep broadcast ref in sync
  broadcastContentRef.current = broadcastContent

  // Keyboard shortcut to open shortcuts modal (Ctrl+K)
  useHotkeys("mod+k", (e) => {
    e.preventDefault()
    setIsKeyboardShortcutsOpen(true)
  }, { enableOnContentEditable: true, enableOnFormTags: true })

  // Slash command detection
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger on "/" key at the start of a line or after whitespace
      if (event.key === "/" && !slashMenuOpen) {
        const { selection } = editor.state
        const { $from } = selection
        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)

        // Check if we're at the start of a line or after a space
        if (textBefore === "" || textBefore.endsWith(" ")) {
          // Get cursor position for menu placement
          const coords = editor.view.coordsAtPos(selection.from)
          setSlashMenuPosition({
            top: coords.bottom + 8,
            left: coords.left,
          })

          // Delay opening to let the "/" be typed first
          setTimeout(() => {
            setSlashMenuOpen(true)
          }, 10)
        }
      }
    }

    const dom = editor.view.dom
    dom.addEventListener("keydown", handleKeyDown)

    return () => {
      dom.removeEventListener("keydown", handleKeyDown)
    }
  }, [editor, slashMenuOpen])

  // Close slash menu when editor loses focus or selection changes significantly
  useEffect(() => {
    if (!editor || !slashMenuOpen) return

    const handleSelectionChange = () => {
      // Check if the current line still starts with /
      const { selection } = editor.state
      const { $from } = selection
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)

      if (!textBefore.includes("/")) {
        setSlashMenuOpen(false)
      }
    }

    editor.on("selectionUpdate", handleSelectionChange)

    return () => {
      editor.off("selectionUpdate", handleSelectionChange)
    }
  }, [editor, slashMenuOpen])

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

  // Load content when pageState changes (fresh data from API)
  useEffect(() => {
    if (editor && pageState.page && pageState.status === "success") {
      const content = pageState.page.content || ""
      // Only update if content is different to avoid unnecessary re-renders
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content)
      }
    }
  }, [editor, pageState.page, pageState.status])

  // Show loading spinner while data is being fetched
  const isPageLoading = pageState.status === "idle" || pageState.status === "loading"
  if (isPageLoading) {
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

  // Check if we have page data from API
  const hasPage = pageState.page !== null

  if (!hasPage) {
    return (
      <div className="simple-editor-wrapper">
        <div className="flex items-center justify-center h-full">
          <p>Page not found</p>
        </div>
      </div>
    )
  }

  // Get page info from API state
  const pageName = pageState.page!.name
  const currentFolderId = pageState.page!.folderId

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
                    onKeyboardShortcutsClick={() => setIsKeyboardShortcutsOpen(true)}
                    isMobile={isMobile}
                    folderId={currentFolderId}
                    isConnected={isConnected}
                    activeUsers={activeUsers}
                    editor={editor}
                    pageName={pageName}
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

      {/* Slash Command Menu */}
      {editor && canEditPage && (
        <SlashCommandMenu
          editor={editor}
          isOpen={slashMenuOpen}
          position={slashMenuPosition}
          onClose={() => setSlashMenuOpen(false)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setIsKeyboardShortcutsOpen(false)}
      />
    </>
  )
}

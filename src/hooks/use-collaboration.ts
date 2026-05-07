"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import * as Y from "yjs"
import { IndexeddbPersistence } from "y-indexeddb"
import { useAuth } from "@/context/AuthContext"
import type { CursorPosition } from "@/types/collaboration"
import type { Block } from "@/types/blocks"
import {
  getYBlocks,
  yBlocksToArray,
  applyBlocksToYDoc,
  decodeYDocState,
} from "@/lib/collaboration/y-doc"

interface UseCollaborationOptions {
  pageId: string | null
  initialBlocks?: Block[]
  onBlocksChange?: (blocks: Block[]) => void
  onRemoteCursorUpdate?: (userId: string, position: CursorPosition, color: string, name: string) => void
}

// Active user type used by components
interface ActiveUser {
  id: string
  name: string
  avatar: string | null
  color: string
  status: "active" | "idle" | "away"
  cursorPosition?: CursorPosition
}

interface CollaborationState {
  isConnected: boolean
  activeUsers: ActiveUser[]
  connectionStatus: "connected" | "connecting" | "disconnected" | "reconnecting"
  ydoc: Y.Doc | null
}

export function useCollaboration(options: UseCollaborationOptions) {
  const { pageId, initialBlocks, onBlocksChange, onRemoteCursorUpdate } = options
  const { user, isAuthenticated } = useAuth()

  const socketRef = useRef<Socket | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const persistenceRef = useRef<IndexeddbPersistence | null>(null)
  const updateListenerRef = useRef<(() => void) | null>(null)

  const [state, setState] = useState<CollaborationState>({
    isConnected: false,
    activeUsers: [],
    connectionStatus: "disconnected",
    ydoc: null,
  })

  // Initialize Y.Doc and connect to server
  useEffect(() => {
    if (!pageId || !isAuthenticated || !user) return

    // Create Y.Doc
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    // Initialize with existing blocks if provided
    if (initialBlocks && initialBlocks.length > 0) {
      applyBlocksToYDoc(ydoc, initialBlocks)
    }

    // Setup IndexedDB persistence for offline support
    const persistence = new IndexeddbPersistence(`noted-page-${pageId}`, ydoc)
    persistenceRef.current = persistence

    persistence.on("synced", () => {
      console.log("IndexedDB synced for page:", pageId)
    })

    // Listen to Y.Doc changes and notify parent
    const yblocks = getYBlocks(ydoc)
    const blocksObserver = () => {
      const blocks = yBlocksToArray(ydoc)
      onBlocksChange?.(blocks)
    }
    yblocks.observe(blocksObserver)
    updateListenerRef.current = () => yblocks.unobserve(blocksObserver)

    // Connect to WebSocket server
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080"
    const socket = io(wsUrl, {
      auth: {
        userId: user.id,
        userName: user.name || "Anonymous",
        userAvatar: user.image,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
    socketRef.current = socket

    // Connection event handlers
    socket.on("connect", () => {
      console.log("Connected to collaboration server")
      setState((prev) => ({
        ...prev,
        isConnected: true,
        connectionStatus: "connected",
      }))

      // Join the page room
      socket.emit("join-page", pageId)
    })

    socket.on("disconnect", () => {
      console.log("Disconnected from collaboration server")
      setState((prev) => ({
        ...prev,
        isConnected: false,
        connectionStatus: "disconnected",
      }))
    })

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error)
      setState((prev) => ({
        ...prev,
        connectionStatus: "reconnecting",
      }))
    })

    // Sync state from server
    socket.on("sync-state", (encodedState: string) => {
      console.log("Received sync state from server")
      decodeYDocState(ydoc, encodedState)
      setState((prev) => ({ ...prev, ydoc }))
    })

    // Receive document updates
    socket.on("doc-update", (update: string) => {
      const updateArray = new Uint8Array(Buffer.from(update, "base64"))
      Y.applyUpdate(ydoc, updateArray)
    })

    // Transform server user data to ActiveUser format
    interface ServerUserInfo {
      userId: string
      userName: string
      avatar: string | null
      color: string
      status: "active" | "idle" | "away"
      cursorPosition?: CursorPosition
    }

    const transformUser = (serverUser: ServerUserInfo): ActiveUser => ({
      id: serverUser.userId,
      name: serverUser.userName,
      avatar: serverUser.avatar,
      color: serverUser.color,
      status: serverUser.status,
      cursorPosition: serverUser.cursorPosition,
    })

    // Receive room users list
    socket.on("room-users", (users: ServerUserInfo[]) => {
      setState((prev) => ({ ...prev, activeUsers: users.map(transformUser) }))
    })

    // User joined
    socket.on("user-joined", (userInfo: ServerUserInfo) => {
      const activeUser = transformUser(userInfo)
      setState((prev) => ({
        ...prev,
        activeUsers: [...prev.activeUsers.filter((u) => u.id !== activeUser.id), activeUser],
      }))
    })

    // User left
    socket.on("user-left", ({ userId }: { userId: string }) => {
      setState((prev) => ({
        ...prev,
        activeUsers: prev.activeUsers.filter((u) => u.id !== userId),
      }))
    })

    // Cursor updates
    socket.on(
      "cursor-update",
      (data: { userId: string; position: CursorPosition; color: string; name: string }) => {
        // Update user's cursor position in state
        setState((prev) => ({
          ...prev,
          activeUsers: prev.activeUsers.map((u) =>
            u.id === data.userId ? { ...u, cursorPosition: data.position } : u
          ),
        }))

        // Notify parent component
        onRemoteCursorUpdate?.(data.userId, data.position, data.color, data.name)
      }
    )

    // Presence updates
    socket.on("presence-update", ({ userId, status }: { userId: string; status: string }) => {
      setState((prev) => ({
        ...prev,
        activeUsers: prev.activeUsers.map((u) =>
          u.id === userId ? { ...u, status: status as ActiveUser["status"] } : u
        ),
      }))
    })

    // Listen to local Y.Doc changes and broadcast
    const updateHandler = (update: Uint8Array, origin: unknown) => {
      // Only broadcast changes that originated locally (not from remote)
      if (origin !== "remote" && socket.connected) {
        socket.emit("doc-update", Buffer.from(update).toString("base64"))
      }
    }
    ydoc.on("update", updateHandler)

    // Cleanup
    return () => {
      ydoc.off("update", updateHandler)
      updateListenerRef.current?.()

      socket.emit("leave-page")
      socket.disconnect()

      persistence.destroy()
      ydoc.destroy()

      socketRef.current = null
      ydocRef.current = null
      persistenceRef.current = null
    }
  }, [pageId, isAuthenticated, user, initialBlocks, onBlocksChange, onRemoteCursorUpdate])

  // Broadcast cursor position
  const broadcastCursor = useCallback((position: CursorPosition) => {
    socketRef.current?.emit("cursor-update", position)
  }, [])

  // Broadcast presence status
  const broadcastPresence = useCallback((status: "active" | "idle" | "away") => {
    socketRef.current?.emit("presence-update", status)
  }, [])

  // Update blocks in Y.Doc
  const updateBlocks = useCallback((blocks: Block[]) => {
    const ydoc = ydocRef.current
    if (!ydoc) return

    applyBlocksToYDoc(ydoc, blocks)
  }, [])

  // Get current blocks from Y.Doc
  const getBlocks = useCallback((): Block[] => {
    const ydoc = ydocRef.current
    if (!ydoc) return []

    return yBlocksToArray(ydoc)
  }, [])

  return {
    ...state,
    broadcastCursor,
    broadcastPresence,
    updateBlocks,
    getBlocks,
    isReady: state.isConnected && state.ydoc !== null,
  }
}

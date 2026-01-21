"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { useAuth } from "@/context/AuthContext"
import type { Editor } from "@tiptap/core"

interface UseRealtimeSyncOptions {
  pageId: string | null
  editor: Editor | null
  enabled?: boolean
}

interface ActiveUser {
  id: string
  name: string
  avatar: string | null
  color: string
}

interface RealtimeSyncState {
  isConnected: boolean
  activeUsers: ActiveUser[]
  connectionStatus: "connected" | "connecting" | "disconnected" | "reconnecting"
}

export function useRealtimeSync(options: UseRealtimeSyncOptions) {
  const { pageId, editor, enabled = true } = options
  const { user, isAuthenticated } = useAuth()

  const socketRef = useRef<Socket | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const isRemoteUpdateRef = useRef(false)
  const lastContentRef = useRef<string>("")
  const connectedPageRef = useRef<string | null>(null)
  const mountedRef = useRef(false)
  const initialConnectionAttemptRef = useRef(false)

  // Keep editor ref in sync
  editorRef.current = editor

  const [state, setState] = useState<RealtimeSyncState>({
    isConnected: false,
    activeUsers: [],
    connectionStatus: "disconnected",
  })

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Connect to WebSocket server - only depends on pageId and user auth state
  useEffect(() => {
    // Don't connect if missing required data or not mounted
    if (!pageId || !enabled) {
      return
    }

    // Wait for auth to be ready
    if (!isAuthenticated || !user?.id) {
      return
    }

    // Don't reconnect if already connected to this page
    if (socketRef.current?.connected && connectedPageRef.current === pageId) {
      return
    }

    // Clean up existing connection if switching pages
    if (socketRef.current) {
      socketRef.current.emit("leave-page")
      socketRef.current.disconnect()
      socketRef.current = null
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001"

    // Small delay on initial connection to avoid race conditions during hydration
    const connectionDelay = initialConnectionAttemptRef.current ? 0 : 100
    initialConnectionAttemptRef.current = true

    const connectTimeout = setTimeout(() => {
      // Check if still mounted and conditions still valid
      if (!mountedRef.current || !pageId || !enabled || !isAuthenticated || !user?.id) {
        return
      }

      console.log(`WebSocket: Connecting to ${wsUrl} as ${user.name}...`)

      const socket = io(wsUrl, {
        auth: {
          userId: user.id,
          userName: user.name || "Anonymous",
          userAvatar: user.image,
        },
        transports: ["polling", "websocket"], // Start with polling, upgrade to websocket
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
      })
      socketRef.current = socket
      connectedPageRef.current = pageId

      // Connection event handlers
      socket.on("connect", () => {
        if (!mountedRef.current) return
        console.log("WebSocket: Connected to collaboration server")
        setState((prev) => ({
          ...prev,
          isConnected: true,
          connectionStatus: "connected",
        }))

        // Join the page room
        socket.emit("join-page", pageId)
      })

      socket.on("disconnect", (reason) => {
        if (!mountedRef.current) return
        console.log("WebSocket: Disconnected -", reason)
        setState((prev) => ({
          ...prev,
          isConnected: false,
          connectionStatus: "disconnected",
        }))
      })

      socket.on("connect_error", (error) => {
        if (!mountedRef.current) return
        // Only log as warning, not error - connection errors during initial load are expected
        console.warn("WebSocket: Connection attempt failed, will retry -", error.message)
        setState((prev) => ({
          ...prev,
          connectionStatus: "reconnecting",
        }))
      })

      // Receive content updates from other users
      socket.on("content-update", (data: { userId: string; content: string }) => {
        if (!mountedRef.current) return
        const currentEditor = editorRef.current
        if (!currentEditor) return

        // Ignore updates from self
        if (data.userId === user.id) return

        // Prevent echo loop
        if (data.content === lastContentRef.current) return

        console.log("Received content update from:", data.userId)

        // Mark as remote update to prevent re-broadcasting
        isRemoteUpdateRef.current = true

        // Save cursor position
        const { from, to } = currentEditor.state.selection

        // Update editor content
        currentEditor.commands.setContent(data.content, { emitUpdate: false })

        // Restore cursor position if valid
        try {
          const docLength = currentEditor.state.doc.content.size
          const newFrom = Math.min(from, docLength - 1)
          const newTo = Math.min(to, docLength - 1)
          currentEditor.commands.setTextSelection({ from: Math.max(0, newFrom), to: Math.max(0, newTo) })
        } catch (e) {
          // Cursor position invalid, that's okay
        }

        // Reset flag after a tick
        setTimeout(() => {
          isRemoteUpdateRef.current = false
        }, 100)
      })

      // Receive room users list
      socket.on("room-users", (users: ActiveUser[]) => {
        if (!mountedRef.current) return
        setState((prev) => ({ ...prev, activeUsers: users.filter(u => u.id !== user.id) }))
      })

      // User joined
      socket.on("user-joined", (userInfo: ActiveUser) => {
        if (!mountedRef.current) return
        if (userInfo.id === user.id) return
        setState((prev) => ({
          ...prev,
          activeUsers: [...prev.activeUsers.filter((u) => u.id !== userInfo.id), userInfo],
        }))
      })

      // User left
      socket.on("user-left", ({ userId }: { userId: string }) => {
        if (!mountedRef.current) return
        setState((prev) => ({
          ...prev,
          activeUsers: prev.activeUsers.filter((u) => u.id !== userId),
        }))
      })
    }, connectionDelay)

    // Cleanup on unmount only
    return () => {
      clearTimeout(connectTimeout)
      if (socketRef.current) {
        console.log("WebSocket: Cleanup - disconnecting")
        socketRef.current.emit("leave-page")
        socketRef.current.disconnect()
        socketRef.current = null
        connectedPageRef.current = null
      }
    }
  }, [pageId, isAuthenticated, user?.id, user?.name, user?.image, enabled])

  // Broadcast content changes to other users
  const broadcastContent = useCallback((content: string) => {
    if (!socketRef.current?.connected || isRemoteUpdateRef.current) return

    // Don't broadcast if content hasn't changed
    if (content === lastContentRef.current) return

    lastContentRef.current = content
    socketRef.current.emit("content-update", { content })
  }, [])

  return {
    ...state,
    broadcastContent,
    isReady: state.isConnected,
  }
}

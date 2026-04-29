"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as Y from "yjs"
import { io, Socket } from "socket.io-client"
import { useAuth } from "@/context/AuthContext"

interface ActiveUser {
  id: string
  name: string
  avatar: string | null
  color: string
}

interface YjsSyncState {
  isConnected: boolean
  activeUsers: ActiveUser[]
  connectionStatus: "connected" | "connecting" | "disconnected" | "reconnecting"
}

interface UseYjsSyncOptions {
  pageId: string | null
  enabled?: boolean
}

interface UseYjsSyncResult extends YjsSyncState {
  ydoc: Y.Doc
}

// Stable Y.Doc instances keyed by pageId so they survive re-renders
const docRegistry = new Map<string, Y.Doc>()

function getOrCreateDoc(pageId: string): Y.Doc {
  if (!docRegistry.has(pageId)) {
    docRegistry.set(pageId, new Y.Doc())
  }
  return docRegistry.get(pageId)!
}

export function useYjsSync({ pageId, enabled = true }: UseYjsSyncOptions): UseYjsSyncResult {
  const { user, isAuthenticated } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const mountedRef = useRef(false)
  const connectedPageRef = useRef<string | null>(null)

  // Get or create a stable Y.Doc for this page
  const ydoc = pageId ? getOrCreateDoc(pageId) : new Y.Doc()

  const [state, setState] = useState<YjsSyncState>({
    isConnected: false,
    activeUsers: [],
    connectionStatus: "disconnected",
  })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const updateState = useCallback((partial: Partial<YjsSyncState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...partial }))
    }
  }, [])

  useEffect(() => {
    if (!pageId || !enabled || !isAuthenticated || !user?.id) return

    // Don't reconnect if already connected to this page
    if (socketRef.current?.connected && connectedPageRef.current === pageId) return

    // Clean up existing connection
    if (socketRef.current) {
      socketRef.current.emit("leave-page")
      socketRef.current.disconnect()
      socketRef.current = null
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001"

    updateState({ connectionStatus: "connecting" })

    const socket = io(wsUrl, {
      auth: {
        userId: user.id,
        userName: user.name || "Anonymous",
        userAvatar: user.image,
      },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })

    socketRef.current = socket

    socket.on("connect", () => {
      if (!mountedRef.current) return
      connectedPageRef.current = pageId
      updateState({ isConnected: true, connectionStatus: "connected" })
      socket.emit("join-page", pageId)
    })

    socket.on("disconnect", (reason) => {
      if (!mountedRef.current) return
      updateState({
        isConnected: false,
        connectionStatus: reason === "io client disconnect" ? "disconnected" : "reconnecting",
      })
    })

    socket.on("connect_error", () => {
      if (!mountedRef.current) return
      updateState({ isConnected: false, connectionStatus: "disconnected" })
    })

    socket.on("reconnect", () => {
      if (!mountedRef.current) return
      updateState({ isConnected: true, connectionStatus: "connected" })
      socket.emit("join-page", pageId)
    })

    // Server sends full current doc state when user joins
    socket.on("sync-state", (encodedState: string) => {
      if (!mountedRef.current) return
      try {
        const update = new Uint8Array(Buffer.from(encodedState, "base64"))
        Y.applyUpdate(ydoc, update, "remote")
      } catch (err) {
        console.error("YjsSync: failed to apply sync-state", err)
      }
    })

    // Server broadcasts incremental updates from other clients
    socket.on("doc-update", (encodedUpdate: string) => {
      if (!mountedRef.current) return
      try {
        const update = new Uint8Array(Buffer.from(encodedUpdate, "base64"))
        Y.applyUpdate(ydoc, update, "remote")
      } catch (err) {
        console.error("YjsSync: failed to apply doc-update", err)
      }
    })

    // Presence: full list of users already in room
    socket.on("room-users", (users: ActiveUser[]) => {
      if (!mountedRef.current) return
      updateState({ activeUsers: users.filter(u => u.id !== user.id) })
    })

    // Presence: new user joined
    socket.on("user-joined", (newUser: ActiveUser) => {
      if (!mountedRef.current || newUser.id === user.id) return
      setState(prev => ({
        ...prev,
        activeUsers: prev.activeUsers.some(u => u.id === newUser.id)
          ? prev.activeUsers
          : [...prev.activeUsers, newUser],
      }))
    })

    // Presence: user left
    socket.on("user-left", (leftUserId: string) => {
      if (!mountedRef.current) return
      setState(prev => ({
        ...prev,
        activeUsers: prev.activeUsers.filter(u => u.id !== leftUserId),
      }))
    })

    // Broadcast local Y.Doc changes to server (skip remote-applied updates)
    const handleUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return
      if (!socket.connected) return
      const encoded = Buffer.from(update).toString("base64")
      socket.emit("doc-update", encoded)
    }

    ydoc.on("update", handleUpdate)

    return () => {
      ydoc.off("update", handleUpdate)
      socket.emit("leave-page")
      socket.disconnect()
      socketRef.current = null
      connectedPageRef.current = null
      updateState({ isConnected: false, connectionStatus: "disconnected", activeUsers: [] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, enabled, isAuthenticated, user?.id])

  return { ydoc, ...state }
}

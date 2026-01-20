import { createServer } from "http"
import { Server, Socket } from "socket.io"
import * as Y from "yjs"
import { config } from "dotenv"

// Load environment variables
config({ path: "../.env.local" })

const PORT = process.env.WS_PORT || 3001
const CLIENT_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

// Create HTTP server
const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }))
    return
  }
  res.writeHead(404)
  res.end()
})

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingInterval: 25000,
  pingTimeout: 20000,
})

// Store active Y.Doc instances per page
const documents = new Map<string, Y.Doc>()

// Store active users per room
const roomUsers = new Map<string, Map<string, UserInfo>>()

interface UserInfo {
  id: string
  name: string
  avatar: string | null
  color: string
  socketId: string
  cursorPosition?: { from: number; to: number }
  lastActivity: number
}

// Generate deterministic color from user ID
function getUserColor(userId: string): string {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2",
  ]
  const hash = userId.split("").reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)
  return colors[Math.abs(hash) % colors.length]
}

// Get or create Y.Doc for a page
function getOrCreateDoc(pageId: string): Y.Doc {
  let doc = documents.get(pageId)
  if (!doc) {
    doc = new Y.Doc()
    documents.set(pageId, doc)
    console.log(`Created new Y.Doc for page ${pageId}`)
  }
  return doc
}

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  const userId = socket.handshake.auth.userId
  const userName = socket.handshake.auth.userName || "Anonymous"
  const userAvatar = socket.handshake.auth.userAvatar || null

  // In production, validate the token against the session
  // For now, just check that userId is provided
  if (!userId) {
    return next(new Error("Authentication required"))
  }

  socket.data.userId = userId
  socket.data.userName = userName
  socket.data.userAvatar = userAvatar
  socket.data.userColor = getUserColor(userId)

  next()
})

io.on("connection", (socket: Socket) => {
  console.log(`User connected: ${socket.data.userId} (${socket.id})`)

  // Join a page for collaboration
  socket.on("join-page", (pageId: string) => {
    const roomId = `page:${pageId}`
    socket.join(roomId)
    socket.data.currentPage = pageId

    // Get or create the Y.Doc for this page
    const ydoc = getOrCreateDoc(pageId)

    // Initialize room users map if needed
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Map())
    }

    // Add user to room
    const userInfo: UserInfo = {
      id: socket.data.userId,
      name: socket.data.userName,
      avatar: socket.data.userAvatar,
      color: socket.data.userColor,
      socketId: socket.id,
      lastActivity: Date.now(),
    }
    roomUsers.get(roomId)!.set(socket.data.userId, userInfo)

    // Send current document state to the joining client
    const state = Y.encodeStateAsUpdate(ydoc)
    socket.emit("sync-state", Buffer.from(state).toString("base64"))

    // Send current users in the room
    const users = Array.from(roomUsers.get(roomId)!.values())
    socket.emit("room-users", users)

    // Notify others in the room about the new user
    socket.to(roomId).emit("user-joined", userInfo)

    console.log(`User ${socket.data.userId} joined room ${roomId}. Total users: ${users.length}`)
  })

  // Handle document updates from clients
  socket.on("doc-update", (update: string) => {
    const pageId = socket.data.currentPage
    if (!pageId) return

    const roomId = `page:${pageId}`
    const ydoc = documents.get(pageId)
    if (!ydoc) return

    try {
      // Apply the update to the shared document
      const updateArray = new Uint8Array(Buffer.from(update, "base64"))
      Y.applyUpdate(ydoc, updateArray)

      // Broadcast to other clients in the room
      socket.to(roomId).emit("doc-update", update)

      // Update last activity
      const users = roomUsers.get(roomId)
      if (users?.has(socket.data.userId)) {
        users.get(socket.data.userId)!.lastActivity = Date.now()
      }
    } catch (error) {
      console.error("Error applying doc update:", error)
    }
  })

  // Handle cursor position updates
  socket.on("cursor-update", (position: { from: number; to: number }) => {
    const pageId = socket.data.currentPage
    if (!pageId) return

    const roomId = `page:${pageId}`
    const users = roomUsers.get(roomId)

    if (users?.has(socket.data.userId)) {
      users.get(socket.data.userId)!.cursorPosition = position
      users.get(socket.data.userId)!.lastActivity = Date.now()
    }

    // Broadcast cursor position to others
    socket.to(roomId).emit("cursor-update", {
      userId: socket.data.userId,
      position,
      color: socket.data.userColor,
      name: socket.data.userName,
    })
  })

  // Handle presence/status updates
  socket.on("presence-update", (status: "active" | "idle" | "away") => {
    const pageId = socket.data.currentPage
    if (!pageId) return

    const roomId = `page:${pageId}`
    socket.to(roomId).emit("presence-update", {
      userId: socket.data.userId,
      status,
    })
  })

  // Leave page
  socket.on("leave-page", () => {
    handleLeaveRoom(socket)
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.data.userId} (${socket.id})`)
    handleLeaveRoom(socket)
  })
})

function handleLeaveRoom(socket: Socket) {
  const pageId = socket.data.currentPage
  if (!pageId) return

  const roomId = `page:${pageId}`
  socket.leave(roomId)

  // Remove user from room
  const users = roomUsers.get(roomId)
  if (users) {
    users.delete(socket.data.userId)

    // Notify others
    socket.to(roomId).emit("user-left", {
      userId: socket.data.userId,
    })

    console.log(`User ${socket.data.userId} left room ${roomId}. Remaining users: ${users.size}`)

    // Clean up empty rooms after a delay
    if (users.size === 0) {
      setTimeout(() => {
        if (roomUsers.get(roomId)?.size === 0) {
          roomUsers.delete(roomId)
          // Keep the Y.Doc for a while in case someone rejoins
          setTimeout(() => {
            if (!roomUsers.has(roomId) || roomUsers.get(roomId)!.size === 0) {
              documents.delete(pageId)
              console.log(`Cleaned up Y.Doc for page ${pageId}`)
            }
          }, 5 * 60 * 1000) // 5 minutes
        }
      }, 10000) // 10 seconds
    }
  }

  socket.data.currentPage = null
}

// Periodic cleanup of stale connections
setInterval(() => {
  const now = Date.now()
  const staleThreshold = 5 * 60 * 1000 // 5 minutes

  for (const [roomId, users] of roomUsers.entries()) {
    for (const [userId, userInfo] of users.entries()) {
      if (now - userInfo.lastActivity > staleThreshold) {
        users.delete(userId)
        io.to(roomId).emit("user-left", { userId })
        console.log(`Removed stale user ${userId} from ${roomId}`)
      }
    }
  }
}, 60000) // Every minute

// Start server
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
  console.log(`Accepting connections from: ${CLIENT_URL}`)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...")
  io.close(() => {
    console.log("Socket.io server closed")
    process.exit(0)
  })
})

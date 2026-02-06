import { createServer } from "http"
import { Server, Socket } from "socket.io"
import { createAdapter } from "@socket.io/redis-adapter"
import { createClient, RedisClientType } from "redis"
import * as Y from "yjs"
import { config } from "dotenv"

// Load environment variables - try multiple paths
config({ path: "../.env" })
config({ path: "../.env.local" })

// Global error handlers to prevent crashes from connection resets
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason)
})

process.on("uncaughtException", (error) => {
  // Don't crash on connection reset errors
  if (error.message?.includes("ECONNRESET") || error.message?.includes("EPIPE")) {
    console.error("Connection reset error (handled):", error.message)
    return
  }
  console.error("Uncaught Exception:", error)
  // For other errors, exit gracefully
  process.exit(1)
})

const PORT = process.env.PORT || process.env.WS_PORT || 3001
const CLIENT_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
const REDIS_URL = process.env.REDIS_URL || ""

// Build allowed origins list
const allowedOrigins = [
  CLIENT_URL,
  "http://localhost:3000",
  "https://noted-main.vercel.app",
].filter(Boolean)

// Create HTTP server
const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      redis: redisConnected ? "connected" : "disconnected"
    }))
    return
  }
  res.writeHead(404)
  res.end()
})

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingInterval: 25000,
  pingTimeout: 20000,
})

// Redis clients for pub/sub adapter
let pubClient: RedisClientType
let subClient: RedisClientType
let redisConnected = false

// Store active Y.Doc instances per page (local to this server instance)
const documents = new Map<string, Y.Doc>()

// Store active users per room (local to this server instance)
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

// Initialize Redis connection
async function initRedis(): Promise<boolean> {
  // Skip Redis if URL is not configured
  if (!REDIS_URL) {
    console.log("REDIS_URL not configured - running in single instance mode")
    return false
  }

  console.log("Connecting to Redis...")

  try {
    // Check if using TLS (rediss://)
    const useTls = REDIS_URL.startsWith("rediss://")

    pubClient = createClient({
      url: REDIS_URL,
      socket: {
        connectTimeout: 10000,
        tls: useTls,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.log("Redis connection failed after 3 retries, running in single instance mode")
            return false
          }
          return Math.min(retries * 1000, 5000)
        }
      }
    })
    subClient = pubClient.duplicate()

    // Error handlers - only log once per error type
    let errorLogged = false
    pubClient.on("error", (err: Error) => {
      // Handle connection reset errors gracefully
      if (err.message?.includes("ECONNRESET") || err.message?.includes("EPIPE")) {
        if (!errorLogged) {
          console.log("Redis connection reset, will attempt to reconnect...")
          errorLogged = true
        }
        redisConnected = false
        return
      }
      if (!errorLogged) {
        console.error("Redis connection error:", err.message)
        errorLogged = true
      }
      redisConnected = false
    })

    subClient.on("error", (err: Error) => {
      // Silently handle connection resets for subscriber
      if (err.message?.includes("ECONNRESET") || err.message?.includes("EPIPE")) {
        redisConnected = false
        return
      }
      redisConnected = false
    })

    pubClient.on("ready", () => {
      redisConnected = true
      errorLogged = false
      console.log("Redis connected successfully")
    })

    pubClient.on("reconnecting", () => {
      console.log("Redis reconnecting...")
    })

    subClient.on("ready", () => {
      console.log("Redis subscriber ready")
    })

    // Connect both clients with timeout
    const connectPromise = Promise.all([pubClient.connect(), subClient.connect()])
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis connection timeout")), 5000)
    )

    await Promise.race([connectPromise, timeoutPromise])

    // Set up the Redis adapter for Socket.io
    io.adapter(createAdapter(pubClient, subClient))

    redisConnected = true
    console.log("Redis adapter initialized successfully")
    return true
  } catch (error) {
    // Clean up failed connections
    try {
      if (pubClient) await pubClient.quit().catch(() => {})
      if (subClient) await subClient.quit().catch(() => {})
    } catch {}

    console.log("Redis unavailable - running in single instance mode (this is fine for local development)")
    redisConnected = false
    return false
  }
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

// Store Y.Doc state to Redis for persistence across server instances
async function saveDocToRedis(pageId: string, doc: Y.Doc): Promise<void> {
  if (!redisConnected || !pubClient) return

  try {
    const state = Y.encodeStateAsUpdate(doc)
    await pubClient.set(`ydoc:${pageId}`, Buffer.from(state).toString("base64"), {
      EX: 60 * 60 * 24, // 24 hour expiry
    })
  } catch (error) {
    console.error(`Failed to save Y.Doc to Redis for page ${pageId}:`, error)
  }
}

// Load Y.Doc state from Redis
async function loadDocFromRedis(pageId: string, doc: Y.Doc): Promise<boolean> {
  if (!redisConnected || !pubClient) return false

  try {
    const state = await pubClient.get(`ydoc:${pageId}`)
    if (state) {
      const updateArray = new Uint8Array(Buffer.from(state, "base64"))
      Y.applyUpdate(doc, updateArray)
      console.log(`Loaded Y.Doc from Redis for page ${pageId}`)
      return true
    }
  } catch (error) {
    console.error(`Failed to load Y.Doc from Redis for page ${pageId}:`, error)
  }
  return false
}

// Socket authentication middleware
io.use((socket: Socket, next: (err?: Error) => void) => {
  // Token can be used for session validation in production
  const _token = socket.handshake.auth.token
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
  socket.on("join-page", async (pageId: string) => {
    const roomId = `page:${pageId}`
    socket.join(roomId)
    socket.data.currentPage = pageId

    // Get or create the Y.Doc for this page
    const ydoc = getOrCreateDoc(pageId)

    // Try to load existing state from Redis
    await loadDocFromRedis(pageId, ydoc)

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
  socket.on("doc-update", async (update: string) => {
    const pageId = socket.data.currentPage
    if (!pageId) return

    const roomId = `page:${pageId}`
    const ydoc = documents.get(pageId)
    if (!ydoc) return

    try {
      // Apply the update to the shared document
      const updateArray = new Uint8Array(Buffer.from(update, "base64"))
      Y.applyUpdate(ydoc, updateArray)

      // Broadcast to other clients in the room (Redis adapter handles cross-server)
      socket.to(roomId).emit("doc-update", update)

      // Save to Redis for persistence
      await saveDocToRedis(pageId, ydoc)

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

    // Broadcast cursor position to others (Redis adapter handles cross-server)
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

  // Handle HTML content updates (for TipTap editor sync)
  socket.on("content-update", (data: { content: string }) => {
    const pageId = socket.data.currentPage
    if (!pageId) return

    const roomId = `page:${pageId}`

    // Update last activity
    const users = roomUsers.get(roomId)
    if (users?.has(socket.data.userId)) {
      users.get(socket.data.userId)!.lastActivity = Date.now()
    }

    // Broadcast content to other clients in the room
    socket.to(roomId).emit("content-update", {
      userId: socket.data.userId,
      content: data.content,
    })

    console.log(`Content update from ${socket.data.userId} in room ${roomId}`)
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

async function handleLeaveRoom(socket: Socket) {
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
      setTimeout(async () => {
        if (roomUsers.get(roomId)?.size === 0) {
          roomUsers.delete(roomId)

          // Save the Y.Doc to Redis before cleanup
          const ydoc = documents.get(pageId)
          if (ydoc) {
            await saveDocToRedis(pageId, ydoc)
          }

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

// Periodic save of active documents to Redis
setInterval(async () => {
  if (!redisConnected) return

  try {
    for (const [pageId, doc] of documents.entries()) {
      await saveDocToRedis(pageId, doc)
    }
    if (documents.size > 0) {
      console.log(`Saved ${documents.size} documents to Redis`)
    }
  } catch (error) {
    console.error("Error during periodic Redis save:", error)
  }
}, 30000) // Every 30 seconds

// Start server
async function startServer() {
  // Initialize Redis
  await initRedis()

  // Start HTTP server
  httpServer.listen(PORT, () => {
    console.log(`WebSocket server running on port ${PORT}`)
    console.log(`Accepting connections from: ${CLIENT_URL}`)
    console.log(`Redis status: ${redisConnected ? "connected" : "disconnected (single instance mode)"}`)
  })
}

startServer()

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down...")

  // Save all documents to Redis before shutdown
  if (redisConnected) {
    console.log("Saving documents to Redis...")
    for (const [pageId, doc] of documents.entries()) {
      await saveDocToRedis(pageId, doc)
    }
  }

  // Close Redis connections
  if (pubClient) {
    await pubClient.quit().catch(() => {})
  }
  if (subClient) {
    await subClient.quit().catch(() => {})
  }

  // Close Socket.io
  io.close(() => {
    console.log("Socket.io server closed")
    process.exit(0)
  })
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)

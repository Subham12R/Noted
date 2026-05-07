"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_server_1 = require("@hono/node-server");
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("redis");
const Y = __importStar(require("yjs"));
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const health_js_1 = __importDefault(require("./routes/health.js"));
const todos_js_1 = __importDefault(require("./routes/todos.js"));
const tags_js_1 = __importDefault(require("./routes/tags.js"));
const subscription_js_1 = __importDefault(require("./routes/subscription.js"));
const users_js_1 = __importDefault(require("./routes/users.js"));
const user_js_1 = __importDefault(require("./routes/user.js"));
const flashcards_js_1 = __importDefault(require("./routes/flashcards.js"));
const search_js_1 = __importDefault(require("./routes/search.js"));
const shared_with_me_js_1 = __importDefault(require("./routes/shared-with-me.js"));
const share_js_1 = __importDefault(require("./routes/share.js"));
const folders_js_1 = __importDefault(require("./routes/folders.js"));
const stripe_js_1 = __importDefault(require("./routes/stripe.js"));
const pages_js_1 = __importDefault(require("./routes/pages.js"));
const files_js_1 = __importDefault(require("./routes/files.js"));
const ai_js_1 = __importDefault(require("./routes/ai.js"));
const PORT = parseInt(process.env.PORT || "8080");
const CLIENT_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const REDIS_URL = process.env.REDIS_URL || "";
function normalizeOrigin(origin) {
    return origin.trim().replace(/\/+$/, "");
}
function parseOrigins(value) {
    if (!value)
        return [];
    return value
        .split(",")
        .map((v) => normalizeOrigin(v))
        .filter(Boolean);
}
const allowedOrigins = Array.from(new Set([
    normalizeOrigin(CLIENT_URL),
    normalizeOrigin(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://noted-main.vercel.app",
    ...parseOrigins(process.env.TRUSTED_ORIGINS),
])).filter(Boolean);
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (error) => {
    if (error.message?.includes("ECONNRESET") || error.message?.includes("EPIPE")) {
        console.error("Connection reset (handled):", error.message);
        return;
    }
    console.error("Uncaught Exception:", error);
    process.exit(1);
});
// Hono app
const app = new hono_1.Hono();
app.use("*", (0, cors_1.cors)({
    origin: (origin) => {
        if (!origin)
            return allowedOrigins[0];
        const normalized = normalizeOrigin(origin);
        return allowedOrigins.includes(normalized) ? origin : allowedOrigins[0];
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Share-Password", "stripe-signature"],
}));
app.route("/api/auth", auth_js_1.default);
app.route("/api/health", health_js_1.default);
app.route("/api/todos", todos_js_1.default);
app.route("/api/tags", tags_js_1.default);
app.route("/api/subscription", subscription_js_1.default);
app.route("/api/users", users_js_1.default);
app.route("/api/user", user_js_1.default);
app.route("/api/flashcards", flashcards_js_1.default);
app.route("/api/search", search_js_1.default);
app.route("/api/shared-with-me", shared_with_me_js_1.default);
app.route("/api/share", share_js_1.default);
app.route("/api/folders", folders_js_1.default);
app.route("/api/stripe", stripe_js_1.default);
app.route("/api/pages", pages_js_1.default);
app.route("/api/files", files_js_1.default);
app.route("/api/ai", ai_js_1.default);
const documents = new Map();
const roomUsers = new Map();
let pubClient;
let subClient;
let redisConnected = false;
function getUserColor(userId) {
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2"];
    const hash = userId.split("").reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
    return colors[Math.abs(hash) % colors.length];
}
function getOrCreateDoc(pageId) {
    let doc = documents.get(pageId);
    if (!doc) {
        doc = new Y.Doc();
        documents.set(pageId, doc);
    }
    return doc;
}
async function saveDocToRedis(pageId, doc) {
    if (!redisConnected || !pubClient)
        return;
    try {
        const state = Y.encodeStateAsUpdate(doc);
        await pubClient.set(`ydoc:${pageId}`, Buffer.from(state).toString("base64"), { EX: 86400 });
    }
    catch (error) {
        console.error(`Failed to save Y.Doc to Redis for page ${pageId}:`, error);
    }
}
async function loadDocFromRedis(pageId, doc) {
    if (!redisConnected || !pubClient)
        return false;
    try {
        const state = await pubClient.get(`ydoc:${pageId}`);
        if (state) {
            Y.applyUpdate(doc, new Uint8Array(Buffer.from(state, "base64")));
            return true;
        }
    }
    catch (error) {
        console.error(`Failed to load Y.Doc from Redis for page ${pageId}:`, error);
    }
    return false;
}
async function initRedis() {
    if (!REDIS_URL) {
        console.log("REDIS_URL not configured — running in single instance mode");
        return false;
    }
    try {
        const useTls = REDIS_URL.startsWith("rediss://");
        pubClient = (0, redis_1.createClient)({
            url: REDIS_URL,
            socket: {
                connectTimeout: 10000, tls: useTls,
                reconnectStrategy: (retries) => retries > 3 ? false : Math.min(retries * 1000, 5000),
            },
        });
        subClient = pubClient.duplicate();
        let errorLogged = false;
        pubClient.on("error", (err) => {
            if (err.message?.includes("ECONNRESET") || err.message?.includes("EPIPE")) {
                redisConnected = false;
                return;
            }
            if (!errorLogged) {
                console.error("Redis error:", err.message);
                errorLogged = true;
            }
            redisConnected = false;
        });
        subClient.on("error", () => { redisConnected = false; });
        pubClient.on("ready", () => { redisConnected = true; errorLogged = false; console.log("Redis connected"); });
        pubClient.on("reconnecting", () => console.log("Redis reconnecting..."));
        await Promise.race([
            Promise.all([pubClient.connect(), subClient.connect()]),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Redis connection timeout")), 5000)),
        ]);
        redisConnected = true;
        return true;
    }
    catch {
        try {
            if (pubClient)
                await pubClient.quit().catch(() => { });
            if (subClient)
                await subClient.quit().catch(() => { });
        }
        catch { }
        console.log("Redis unavailable — running in single instance mode");
        redisConnected = false;
        return false;
    }
}
async function startServer() {
    const hasRedis = await initRedis();
    const server = (0, node_server_1.createAdaptorServer)({ fetch: app.fetch });
    const io = new socket_io_1.Server(server, {
        cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
        transports: ["websocket", "polling"],
        pingInterval: 25000,
        pingTimeout: 20000,
    });
    if (hasRedis) {
        io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
        console.log("Redis adapter attached to Socket.io");
    }
    io.use((socket, next) => {
        const userId = socket.handshake.auth.userId;
        if (!userId)
            return next(new Error("Authentication required"));
        socket.data.userId = userId;
        socket.data.userName = socket.handshake.auth.userName || "Anonymous";
        socket.data.userAvatar = socket.handshake.auth.userAvatar || null;
        socket.data.userColor = getUserColor(userId);
        next();
    });
    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.data.userId} (${socket.id})`);
        socket.on("join-page", async (pageId) => {
            const roomId = `page:${pageId}`;
            socket.join(roomId);
            socket.data.currentPage = pageId;
            const ydoc = getOrCreateDoc(pageId);
            await loadDocFromRedis(pageId, ydoc);
            if (!roomUsers.has(roomId))
                roomUsers.set(roomId, new Map());
            const userInfo = {
                id: socket.data.userId, name: socket.data.userName, avatar: socket.data.userAvatar,
                color: socket.data.userColor, socketId: socket.id, lastActivity: Date.now(),
            };
            roomUsers.get(roomId).set(socket.data.userId, userInfo);
            socket.emit("sync-state", Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64"));
            socket.emit("room-users", Array.from(roomUsers.get(roomId).values()));
            socket.to(roomId).emit("user-joined", userInfo);
        });
        socket.on("doc-update", async (update) => {
            const pageId = socket.data.currentPage;
            if (!pageId)
                return;
            const roomId = `page:${pageId}`;
            const ydoc = documents.get(pageId);
            if (!ydoc)
                return;
            try {
                Y.applyUpdate(ydoc, new Uint8Array(Buffer.from(update, "base64")));
                socket.to(roomId).emit("doc-update", update);
                await saveDocToRedis(pageId, ydoc);
                roomUsers.get(roomId)?.get(socket.data.userId) && (roomUsers.get(roomId).get(socket.data.userId).lastActivity = Date.now());
            }
            catch (error) {
                console.error("Error applying doc update:", error);
            }
        });
        socket.on("cursor-update", (position) => {
            const pageId = socket.data.currentPage;
            if (!pageId)
                return;
            const roomId = `page:${pageId}`;
            const users = roomUsers.get(roomId);
            if (users?.has(socket.data.userId)) {
                const u = users.get(socket.data.userId);
                u.cursorPosition = position;
                u.lastActivity = Date.now();
            }
            socket.to(roomId).emit("cursor-update", { userId: socket.data.userId, position, color: socket.data.userColor, name: socket.data.userName });
        });
        socket.on("presence-update", (status) => {
            const pageId = socket.data.currentPage;
            if (!pageId)
                return;
            socket.to(`page:${pageId}`).emit("presence-update", { userId: socket.data.userId, status });
        });
        socket.on("content-update", (data) => {
            const pageId = socket.data.currentPage;
            if (!pageId)
                return;
            const roomId = `page:${pageId}`;
            const u = roomUsers.get(roomId)?.get(socket.data.userId);
            if (u)
                u.lastActivity = Date.now();
            socket.to(roomId).emit("content-update", { userId: socket.data.userId, content: data.content });
        });
        socket.on("excalidraw-update", (data) => {
            const pageId = socket.data.currentPage;
            if (!pageId)
                return;
            const roomId = `page:${pageId}`;
            const u = roomUsers.get(roomId)?.get(socket.data.userId);
            if (u)
                u.lastActivity = Date.now();
            socket.to(roomId).emit("excalidraw-update", { userId: socket.data.userId, userName: socket.data.userName, userColor: socket.data.userColor, elements: data.elements, appState: data.appState });
        });
        socket.on("excalidraw-pointer", (data) => {
            const pageId = socket.data.currentPage;
            if (!pageId)
                return;
            socket.to(`page:${pageId}`).emit("excalidraw-pointer", { userId: socket.data.userId, userName: socket.data.userName, userColor: socket.data.userColor, x: data.x, y: data.y, tool: data.tool });
        });
        socket.on("excalidraw-sync-request", () => {
            const pageId = socket.data.currentPage;
            if (!pageId)
                return;
            socket.to(`page:${pageId}`).emit("excalidraw-user-joined", { userId: socket.data.userId, userName: socket.data.userName, userColor: socket.data.userColor });
        });
        socket.on("leave-page", () => handleLeaveRoom(socket));
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.data.userId} (${socket.id})`);
            handleLeaveRoom(socket);
        });
    });
    async function handleLeaveRoom(socket) {
        const pageId = socket.data.currentPage;
        if (!pageId)
            return;
        const roomId = `page:${pageId}`;
        socket.leave(roomId);
        const users = roomUsers.get(roomId);
        if (users) {
            users.delete(socket.data.userId);
            socket.to(roomId).emit("user-left", { userId: socket.data.userId });
            if (users.size === 0) {
                setTimeout(async () => {
                    if (roomUsers.get(roomId)?.size === 0) {
                        roomUsers.delete(roomId);
                        const ydoc = documents.get(pageId);
                        if (ydoc)
                            await saveDocToRedis(pageId, ydoc);
                        setTimeout(() => {
                            if (!roomUsers.has(roomId) || roomUsers.get(roomId).size === 0) {
                                documents.delete(pageId);
                            }
                        }, 5 * 60 * 1000);
                    }
                }, 10000);
            }
        }
        socket.data.currentPage = null;
    }
    // Periodic stale user cleanup
    setInterval(() => {
        const now = Date.now();
        const staleThreshold = 5 * 60 * 1000;
        for (const [roomId, users] of roomUsers.entries()) {
            for (const [userId, userInfo] of users.entries()) {
                if (now - userInfo.lastActivity > staleThreshold) {
                    users.delete(userId);
                    io.to(roomId).emit("user-left", { userId });
                }
            }
        }
    }, 60000);
    // Periodic Redis save
    setInterval(async () => {
        if (!redisConnected)
            return;
        for (const [pageId, doc] of documents.entries()) {
            await saveDocToRedis(pageId, doc);
        }
    }, 30000);
    // Graceful shutdown
    async function shutdown() {
        console.log("Shutting down...");
        if (redisConnected) {
            for (const [pageId, doc] of documents.entries())
                await saveDocToRedis(pageId, doc);
        }
        if (pubClient)
            await pubClient.quit().catch(() => { });
        if (subClient)
            await subClient.quit().catch(() => { });
        io.close(() => { console.log("Socket.io closed"); process.exit(0); });
    }
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
    server.listen(PORT, () => {
        console.log(`Backend running on port ${PORT}`);
        console.log(`Redis: ${redisConnected ? "connected" : "single instance mode"}`);
    });
}
startServer();
//# sourceMappingURL=index.js.map
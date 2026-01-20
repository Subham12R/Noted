// Collaboration types for real-time features

export interface CollaboratorInfo {
  userId: string
  userName: string
  avatar: string | null
  color: string
  cursorPosition?: CursorPosition
  selection?: SelectionRange
  lastActive: number
  status: "active" | "idle" | "away"
}

export interface CursorPosition {
  from: number
  to: number
}

export interface SelectionRange {
  from: number
  to: number
  blockId?: string
}

export interface PresenceState {
  isConnected: boolean
  activeUsers: CollaboratorInfo[]
  connectionStatus: "connected" | "connecting" | "disconnected" | "reconnecting"
}

export interface CollaborationRoom {
  pageId: string
  users: Map<string, CollaboratorInfo>
  createdAt: number
  lastActivity: number
}

// WebSocket event types
export type SocketEvent =
  | { type: "join-page"; pageId: string }
  | { type: "leave-page" }
  | { type: "doc-update"; update: string }
  | { type: "cursor-update"; position: CursorPosition }
  | { type: "presence-update"; status: CollaboratorInfo["status"] }

export type ServerEvent =
  | { type: "sync-state"; state: string }
  | { type: "doc-update"; update: string }
  | { type: "user-joined"; user: CollaboratorInfo }
  | { type: "user-left"; userId: string }
  | { type: "cursor-update"; userId: string; position: CursorPosition }
  | { type: "presence-update"; userId: string; status: CollaboratorInfo["status"] }

// Predefined cursor colors for collaborators
export const COLLABORATOR_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#96CEB4", // Green
  "#FFEAA7", // Yellow
  "#DDA0DD", // Plum
  "#98D8C8", // Mint
  "#F7DC6F", // Gold
  "#BB8FCE", // Purple
  "#85C1E2", // Light Blue
] as const

// Get a deterministic color based on user ID
export function getCollaboratorColor(userId: string): string {
  const hash = userId.split("").reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length]
}

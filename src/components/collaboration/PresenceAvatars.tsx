"use client"

import { useMemo } from "react"

// User info type that matches what NoteEditor passes
interface UserInfo {
  id: string
  name: string
  avatar: string | null
  color: string
  status: "active" | "idle" | "away"
}

interface PresenceAvatarsProps {
  users: UserInfo[]
  currentUserId?: string
  maxVisible?: number
}

export function PresenceAvatars({
  users,
  currentUserId,
  maxVisible = 5,
}: PresenceAvatarsProps) {
  // Filter out current user and sort by activity
  const otherUsers = useMemo(() => {
    return users
      .filter((user) => user.id !== currentUserId)
      .sort((a, b) => {
        const statusOrder = { active: 0, idle: 1, away: 2 }
        return statusOrder[a.status] - statusOrder[b.status]
      })
  }, [users, currentUserId])

  const visibleUsers = otherUsers.slice(0, maxVisible)
  const hiddenCount = otherUsers.length - maxVisible

  if (otherUsers.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <UserAvatar key={user.id} user={user} />
        ))}

        {hiddenCount > 0 && (
          <div
            className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 border-2 border-white text-xs font-medium text-gray-600 z-10"
            title={`${hiddenCount} more user${hiddenCount > 1 ? "s" : ""}`}
          >
            +{hiddenCount}
          </div>
        )}
      </div>
    </div>
  )
}

interface UserAvatarProps {
  user: UserInfo
}

function UserAvatar({ user }: UserAvatarProps) {
  const statusColors = {
    active: "bg-green-500",
    idle: "bg-yellow-500",
    away: "bg-gray-400",
  }

  return (
    <div
      className="relative group"
      title={`${user.name} (${user.status})`}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="w-8 h-8 rounded-full border-2 border-white object-cover"
          style={{ borderColor: user.color }}
        />
      ) : (
        <div
          className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
          style={{ backgroundColor: user.color }}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Status indicator */}
      <span
        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${statusColors[user.status]}`}
      />

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {user.name}
        <div className="text-gray-400 text-[10px]">{user.status}</div>
      </div>
    </div>
  )
}

// Connection status indicator
interface ConnectionStatusProps {
  status: "connected" | "connecting" | "disconnected" | "reconnecting"
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const statusConfig = {
    connected: { color: "bg-green-500", text: "Connected", animate: false },
    connecting: { color: "bg-yellow-500", text: "Connecting...", animate: true },
    disconnected: { color: "bg-red-500", text: "Offline", animate: false },
    reconnecting: { color: "bg-yellow-500", text: "Reconnecting...", animate: true },
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span
        className={`w-2 h-2 rounded-full ${config.color} ${config.animate ? "animate-pulse" : ""}`}
      />
      <span className="hidden sm:inline">{config.text}</span>
    </div>
  )
}

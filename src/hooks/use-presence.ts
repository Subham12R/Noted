"use client"

import { useEffect, useRef, useCallback } from "react"
import type { CollaboratorInfo } from "@/types/collaboration"

interface UsePresenceOptions {
  isConnected: boolean
  broadcastPresence: (status: "active" | "idle" | "away") => void
  idleTimeout?: number // ms before marking as idle
  awayTimeout?: number // ms before marking as away
}

export function usePresence(options: UsePresenceOptions) {
  const {
    isConnected,
    broadcastPresence,
    idleTimeout = 60000, // 1 minute
    awayTimeout = 300000, // 5 minutes
  } = options

  const statusRef = useRef<"active" | "idle" | "away">("active")
  const lastActivityRef = useRef<number>(Date.now())
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const awayTimerRef = useRef<NodeJS.Timeout | null>(null)

  const updateStatus = useCallback(
    (newStatus: "active" | "idle" | "away") => {
      if (statusRef.current !== newStatus && isConnected) {
        statusRef.current = newStatus
        broadcastPresence(newStatus)
      }
    },
    [isConnected, broadcastPresence]
  )

  const resetTimers = useCallback(() => {
    // Clear existing timers
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (awayTimerRef.current) clearTimeout(awayTimerRef.current)

    // Set status to active
    updateStatus("active")
    lastActivityRef.current = Date.now()

    // Set idle timer
    idleTimerRef.current = setTimeout(() => {
      updateStatus("idle")
    }, idleTimeout)

    // Set away timer
    awayTimerRef.current = setTimeout(() => {
      updateStatus("away")
    }, awayTimeout)
  }, [idleTimeout, awayTimeout, updateStatus])

  // Track user activity
  useEffect(() => {
    if (!isConnected) return

    const handleActivity = () => {
      resetTimers()
    }

    // Listen to user activity events
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"]
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetTimers()
      } else {
        updateStatus("away")
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Initial timer setup
    resetTimers()

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity)
      })
      document.removeEventListener("visibilitychange", handleVisibilityChange)

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current)
    }
  }, [isConnected, resetTimers, updateStatus])

  return {
    currentStatus: statusRef.current,
    resetActivity: resetTimers,
  }
}

// Helper to filter active/online users
export function getOnlineUsers(users: CollaboratorInfo[]): CollaboratorInfo[] {
  return users.filter((user) => user.status === "active" || user.status === "idle")
}

// Helper to sort users by activity
export function sortUsersByActivity(users: CollaboratorInfo[]): CollaboratorInfo[] {
  return [...users].sort((a, b) => {
    const statusOrder = { active: 0, idle: 1, away: 2 }
    return statusOrder[a.status] - statusOrder[b.status]
  })
}

"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import type { Block } from "@/types/blocks"

interface UseDebouncedSaveOptions {
  pageId: string | null
  debounceMs?: number
  onSaveStart?: () => void
  onSaveComplete?: (version: number, savedAt: string) => void
  onSaveError?: (error: Error) => void
  onVersionConflict?: (currentVersion: number) => void
}

interface SavePayload {
  blocks: Block[]
  ydocState?: string
  expectedVersion: number
}

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error"

export function useDebouncedSave(options: UseDebouncedSaveOptions) {
  const {
    pageId,
    debounceMs = 2000, // 2 second debounce
    onSaveStart,
    onSaveComplete,
    onSaveError,
    onVersionConflict,
  } = options

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingDataRef = useRef<SavePayload | null>(null)
  const versionRef = useRef<number>(1)
  const isSavingRef = useRef(false)
  const [status, setStatus] = useState<SaveStatus>("idle")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  // Set initial version
  const setVersion = useCallback((version: number) => {
    versionRef.current = version
  }, [])

  const save = useCallback(
    async (data: SavePayload): Promise<boolean> => {
      if (!pageId) return false

      try {
        isSavingRef.current = true
        setStatus("saving")
        onSaveStart?.()

        const response = await fetch(`/api/pages/${pageId}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })

        const result = await response.json()

        if (!response.ok) {
          if (response.status === 409) {
            // Version conflict
            onVersionConflict?.(result.currentVersion)
            setStatus("error")
            return false
          }

          if (response.status === 429) {
            // Rate limited - retry after delay
            const retryAfter = result.retryAfter || 10
            console.warn(`Rate limited. Retry after ${retryAfter}s`)
            setStatus("pending")

            // Schedule retry
            setTimeout(() => {
              if (pendingDataRef.current) {
                save(pendingDataRef.current)
              }
            }, retryAfter * 1000)

            return false
          }

          throw new Error(result.error || "Save failed")
        }

        versionRef.current = result.version
        setLastSavedAt(result.savedAt)
        setStatus("saved")
        onSaveComplete?.(result.version, result.savedAt)

        // Reset to idle after a short delay
        setTimeout(() => setStatus("idle"), 2000)

        return true
      } catch (error) {
        setStatus("error")
        onSaveError?.(error as Error)
        return false
      } finally {
        isSavingRef.current = false
      }
    },
    [pageId, onSaveStart, onSaveComplete, onSaveError, onVersionConflict]
  )

  const queueSave = useCallback(
    (blocks: Block[], ydocState?: string) => {
      const payload: SavePayload = {
        blocks,
        ydocState,
        expectedVersion: versionRef.current,
      }

      pendingDataRef.current = payload
      setStatus("pending")

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new debounced timeout
      timeoutRef.current = setTimeout(() => {
        if (pendingDataRef.current && !isSavingRef.current) {
          save(pendingDataRef.current)
          pendingDataRef.current = null
        }
      }, debounceMs)
    },
    [save, debounceMs]
  )

  const forceSave = useCallback(async (): Promise<boolean> => {
    // Clear debounce timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (pendingDataRef.current && !isSavingRef.current) {
      const data = pendingDataRef.current
      pendingDataRef.current = null
      return await save(data)
    }

    return true // Nothing to save
  }, [save])

  // Save on page close/navigation
  useEffect(() => {
    if (!pageId) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingDataRef.current) {
        // Use sendBeacon for reliable save on close
        const data = JSON.stringify(pendingDataRef.current)
        navigator.sendBeacon(`/api/pages/${pageId}/save`, data)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Force save when tab is hidden
        forceSave()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)

      // Clear timeout on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Save any pending data on unmount
      if (pendingDataRef.current) {
        const data = pendingDataRef.current
        pendingDataRef.current = null
        save(data)
      }
    }
  }, [pageId, forceSave, save])

  return {
    queueSave,
    forceSave,
    setVersion,
    status,
    lastSavedAt,
    isSaving: isSavingRef.current,
    hasPendingChanges: pendingDataRef.current !== null || status === "pending",
    currentVersion: versionRef.current,
  }
}

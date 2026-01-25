"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react"

type PomodoroMode = "focus" | "short-break" | "long-break"

interface PomodoroSettings {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
  soundEnabled: boolean
  soundVolume: number
  notificationsEnabled: boolean
  dailyGoal: number
}

interface PomodoroContextType {
  // Timer State
  isRunning: boolean
  isPaused: boolean
  mode: PomodoroMode
  timeRemaining: number
  sessionsCompleted: number
  dailySessionsCompleted: number

  // UI State
  isVisible: boolean
  isMinimized: boolean
  position: { x: number; y: number }

  // Settings
  settings: PomodoroSettings

  // Actions
  start: (duration?: number) => void
  pause: () => void
  resume: () => void
  stop: () => void
  skip: () => void
  reset: () => void
  setMode: (mode: PomodoroMode) => void
  toggleVisibility: () => void
  toggleMinimize: () => void
  updatePosition: (pos: { x: number; y: number }) => void
  updateSettings: (settings: Partial<PomodoroSettings>) => void

  // Linked content
  linkedPageId: string | null
  linkToPage: (pageId: string | null) => void
}

const defaultSettings: PomodoroSettings = {
  focusDuration: 25 * 60,
  shortBreakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  soundVolume: 0.5,
  notificationsEnabled: true,
  dailyGoal: 8,
}

const STORAGE_KEY = "noted-pomodoro-state"

interface PersistedState {
  isRunning: boolean
  isPaused: boolean
  mode: PomodoroMode
  timeRemaining: number
  sessionsCompleted: number
  dailySessionsCompleted: number
  startedAt: number | null
  pausedAt: number | null
  linkedPageId: string | null
  position: { x: number; y: number }
  settings: PomodoroSettings
  lastActiveDate: string
}

const PomodoroContext = createContext<PomodoroContextType | null>(null)

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [mode, setModeState] = useState<PomodoroMode>("focus")
  const [timeRemaining, setTimeRemaining] = useState(defaultSettings.focusDuration)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const [dailySessionsCompleted, setDailySessionsCompleted] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [settings, setSettings] = useState<PomodoroSettings>(defaultSettings)
  const [linkedPageId, setLinkedPageId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load persisted state
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const state: PersistedState = JSON.parse(stored)

        // Check if it's a new day - reset daily sessions
        const today = new Date().toDateString()
        const storedDate = state.lastActiveDate
        const isNewDay = today !== storedDate

        setSettings(state.settings || defaultSettings)
        setPosition(state.position || { x: 20, y: 20 })
        setLinkedPageId(state.linkedPageId)
        setSessionsCompleted(state.sessionsCompleted || 0)
        setDailySessionsCompleted(isNewDay ? 0 : (state.dailySessionsCompleted || 0))
        setModeState(state.mode || "focus")

        // If timer was running, calculate elapsed time
        if (state.isRunning && state.startedAt && !state.isPaused) {
          const elapsed = Math.floor((Date.now() - state.startedAt) / 1000)
          const remaining = Math.max(0, state.timeRemaining - elapsed)

          if (remaining > 0) {
            setTimeRemaining(remaining)
            setIsRunning(true)
            startedAtRef.current = Date.now()
          } else {
            // Timer completed while away
            setTimeRemaining(0)
            setIsRunning(false)
          }
        } else if (state.isPaused) {
          setTimeRemaining(state.timeRemaining)
          setIsPaused(true)
        } else {
          // Set default time based on mode
          const duration = getDurationForMode(state.mode || "focus", state.settings || defaultSettings)
          setTimeRemaining(state.timeRemaining || duration)
        }
      }
    } catch (e) {
      console.error("Failed to load pomodoro state:", e)
    }
    setIsInitialized(true)
  }, [])

  // Save state to localStorage
  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") return

    const state: PersistedState = {
      isRunning,
      isPaused,
      mode,
      timeRemaining,
      sessionsCompleted,
      dailySessionsCompleted,
      startedAt: startedAtRef.current,
      pausedAt: isPaused ? Date.now() : null,
      linkedPageId,
      position,
      settings,
      lastActiveDate: new Date().toDateString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [isRunning, isPaused, mode, timeRemaining, sessionsCompleted, dailySessionsCompleted, linkedPageId, position, settings, isInitialized])

  // Timer interval
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, isPaused])

  const getDurationForMode = (m: PomodoroMode, s: PomodoroSettings = settings): number => {
    switch (m) {
      case "focus":
        return s.focusDuration
      case "short-break":
        return s.shortBreakDuration
      case "long-break":
        return s.longBreakDuration
    }
  }

  const playSound = useCallback(() => {
    if (!settings.soundEnabled) return

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/timer-complete.mp3")
      }
      audioRef.current.volume = settings.soundVolume
      audioRef.current.play().catch(() => {
        // Audio play failed, likely due to autoplay restrictions
      })
    } catch (e) {
      console.error("Failed to play sound:", e)
    }
  }, [settings.soundEnabled, settings.soundVolume])

  const showNotification = useCallback((title: string, body: string) => {
    if (!settings.notificationsEnabled) return

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" })
    }
  }, [settings.notificationsEnabled])

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false)
    playSound()

    if (mode === "focus") {
      const newSessions = sessionsCompleted + 1
      setSessionsCompleted(newSessions)
      setDailySessionsCompleted(prev => prev + 1)

      showNotification("Focus Session Complete!", "Time for a break.")

      // Determine next break type
      const nextMode: PomodoroMode =
        newSessions % settings.sessionsUntilLongBreak === 0 ? "long-break" : "short-break"

      setModeState(nextMode)
      setTimeRemaining(getDurationForMode(nextMode))

      if (settings.autoStartBreaks) {
        setTimeout(() => {
          setIsRunning(true)
          startedAtRef.current = Date.now()
        }, 1000)
      }
    } else {
      showNotification("Break Complete!", "Ready to focus again?")
      setModeState("focus")
      setTimeRemaining(settings.focusDuration)

      if (settings.autoStartFocus) {
        setTimeout(() => {
          setIsRunning(true)
          startedAtRef.current = Date.now()
        }, 1000)
      }
    }
  }, [mode, sessionsCompleted, settings, playSound, showNotification])

  const start = useCallback((duration?: number) => {
    if (duration) {
      setTimeRemaining(duration)
    } else if (!isPaused) {
      setTimeRemaining(getDurationForMode(mode))
    }
    setIsRunning(true)
    setIsPaused(false)
    setIsVisible(true)
    startedAtRef.current = Date.now()

    // Request notification permission
    if (settings.notificationsEnabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [mode, isPaused, settings.notificationsEnabled])

  const pause = useCallback(() => {
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    setIsPaused(false)
    startedAtRef.current = Date.now()
  }, [])

  const stop = useCallback(() => {
    setIsRunning(false)
    setIsPaused(false)
    setTimeRemaining(getDurationForMode(mode))
    startedAtRef.current = null
  }, [mode])

  const skip = useCallback(() => {
    if (mode === "focus") {
      const nextMode: PomodoroMode =
        (sessionsCompleted + 1) % settings.sessionsUntilLongBreak === 0 ? "long-break" : "short-break"
      setModeState(nextMode)
      setTimeRemaining(getDurationForMode(nextMode))
    } else {
      setModeState("focus")
      setTimeRemaining(settings.focusDuration)
    }
    setIsRunning(false)
    setIsPaused(false)
  }, [mode, sessionsCompleted, settings])

  const reset = useCallback(() => {
    setTimeRemaining(getDurationForMode(mode))
    setIsRunning(false)
    setIsPaused(false)
    startedAtRef.current = null
  }, [mode])

  const setMode = useCallback((newMode: PomodoroMode) => {
    setModeState(newMode)
    setTimeRemaining(getDurationForMode(newMode))
    setIsRunning(false)
    setIsPaused(false)
  }, [])

  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev)
  }, [])

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev)
  }, [])

  const updatePosition = useCallback((pos: { x: number; y: number }) => {
    setPosition(pos)
  }, [])

  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      // Update time remaining if not running
      if (!isRunning && !isPaused) {
        setTimeRemaining(getDurationForMode(mode, updated))
      }
      return updated
    })
  }, [isRunning, isPaused, mode])

  const linkToPage = useCallback((pageId: string | null) => {
    setLinkedPageId(pageId)
  }, [])

  return (
    <PomodoroContext.Provider
      value={{
        isRunning,
        isPaused,
        mode,
        timeRemaining,
        sessionsCompleted,
        dailySessionsCompleted,
        isVisible,
        isMinimized,
        position,
        settings,
        start,
        pause,
        resume,
        stop,
        skip,
        reset,
        setMode,
        toggleVisibility,
        toggleMinimize,
        updatePosition,
        updateSettings,
        linkedPageId,
        linkToPage,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  )
}

export function usePomodoro() {
  const context = useContext(PomodoroContext)
  if (!context) {
    throw new Error("usePomodoro must be used within a PomodoroProvider")
  }
  return context
}

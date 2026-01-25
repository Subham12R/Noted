"use client"

import { useState, useRef, useEffect } from "react"
import { usePomodoro } from "@/context/PomodoroContext"
import {
  Play,
  Pause,
  Square,
  SkipForward,
  Minimize2,
  Maximize2,
  X,
  Settings,
  Coffee,
  Target,
  RotateCcw,
} from "lucide-react"

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

export function FloatingPomodoro() {
  const {
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
  } = usePomodoro()

  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showSettings, setShowSettings] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragOffset.x))
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y))
      updatePosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, dragOffset, updatePosition])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDragging(true)
    }
  }

  if (!isVisible) return null

  const modeColors = {
    focus: "bg-red-500",
    "short-break": "bg-blue-500",
    "long-break": "bg-amber-500",
  }

  const modeLabels = {
    focus: "Focus Time",
    "short-break": "Short Break",
    "long-break": "Long Break",
  }

  const modeIcons = {
    focus: <Target size={16} />,
    "short-break": <Coffee size={16} />,
    "long-break": <Coffee size={16} />,
  }

  // Micro mode (icon only)
  if (isMinimized) {
    return (
      <div
        ref={containerRef}
        style={{ left: position.x, top: position.y }}
        className="fixed z-50 cursor-move"
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={toggleMinimize}
          className={`w-12 h-12 rounded-full ${modeColors[mode]} flex items-center justify-center shadow-lg hover:scale-105 transition-transform`}
        >
          <span className="text-white text-xs font-bold">
            {Math.floor(timeRemaining / 60)}
          </span>
        </button>
      </div>
    )
  }

  // Settings panel
  if (showSettings) {
    return (
      <div
        ref={containerRef}
        style={{ left: position.x, top: position.y }}
        className="fixed z-50 w-72 bg-zinc-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-zinc-800 overflow-hidden"
      >
        <div
          className="px-4 py-3 bg-zinc-800/50 flex items-center justify-between cursor-move"
          onMouseDown={handleMouseDown}
        >
          <span className="text-sm font-medium text-white">Timer Settings</span>
          <button
            onClick={() => setShowSettings(false)}
            className="p-1 hover:bg-zinc-700 rounded-md text-zinc-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Focus Duration */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Focus Duration (min)</label>
            <input
              type="number"
              value={settings.focusDuration / 60}
              onChange={e => updateSettings({ focusDuration: parseInt(e.target.value) * 60 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              min={1}
              max={120}
            />
          </div>

          {/* Short Break */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Short Break (min)</label>
            <input
              type="number"
              value={settings.shortBreakDuration / 60}
              onChange={e => updateSettings({ shortBreakDuration: parseInt(e.target.value) * 60 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              min={1}
              max={30}
            />
          </div>

          {/* Long Break */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Long Break (min)</label>
            <input
              type="number"
              value={settings.longBreakDuration / 60}
              onChange={e => updateSettings({ longBreakDuration: parseInt(e.target.value) * 60 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              min={1}
              max={60}
            />
          </div>

          {/* Sessions until long break */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Sessions until long break</label>
            <input
              type="number"
              value={settings.sessionsUntilLongBreak}
              onChange={e => updateSettings({ sessionsUntilLongBreak: parseInt(e.target.value) })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              min={1}
              max={10}
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoStartBreaks}
                onChange={e => updateSettings({ autoStartBreaks: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-800 text-indigo-500"
              />
              <span className="text-sm text-zinc-300">Auto-start breaks</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoStartFocus}
                onChange={e => updateSettings({ autoStartFocus: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-800 text-indigo-500"
              />
              <span className="text-sm text-zinc-300">Auto-start focus</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={e => updateSettings({ soundEnabled: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-800 text-indigo-500"
              />
              <span className="text-sm text-zinc-300">Sound notifications</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={e => updateSettings({ notificationsEnabled: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-800 text-indigo-500"
              />
              <span className="text-sm text-zinc-300">Browser notifications</span>
            </label>
          </div>

          {/* Daily Goal */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Daily Goal (sessions)</label>
            <input
              type="number"
              value={settings.dailyGoal}
              onChange={e => updateSettings({ dailyGoal: parseInt(e.target.value) })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              min={1}
              max={20}
            />
          </div>
        </div>
      </div>
    )
  }

  // Full expanded mode
  return (
    <div
      ref={containerRef}
      style={{ left: position.x, top: position.y }}
      className="fixed z-50 w-64 bg-zinc-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-zinc-800 overflow-hidden"
    >
      {/* Header - Draggable */}
      <div
        className={`px-4 py-3 bg-gradient-to-r ${modeColors[mode]} flex items-center justify-between cursor-move`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 text-white">
          {modeIcons[mode]}
          <span className="text-sm font-medium">{modeLabels[mode]}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(true)}
            className="p-1 hover:bg-white/20 rounded-md transition-colors"
            title="Settings"
          >
            <Settings size={14} />
          </button>
          <button
            onClick={toggleMinimize}
            className="p-1 hover:bg-white/20 rounded-md transition-colors"
            title="Minimize"
          >
            <Minimize2 size={14} />
          </button>
          <button
            onClick={toggleVisibility}
            className="p-1 hover:bg-white/20 rounded-md transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Timer Display */}
      <div className="px-4 py-6 text-center">
        <div className="text-5xl font-bold text-white font-mono tracking-wider">
          {formatTime(timeRemaining)}
        </div>

        {/* Mode Selector */}
        <div className="flex justify-center gap-2 mt-4">
          {(["focus", "short-break", "long-break"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                mode === m
                  ? "bg-white/20 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {m === "focus" ? "Focus" : m === "short-break" ? "Short" : "Long"}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 pb-4 flex justify-center gap-2">
        {!isRunning ? (
          <button
            onClick={() => start()}
            className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            <Play size={18} />
            Start
          </button>
        ) : isPaused ? (
          <button
            onClick={resume}
            className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            <Play size={18} />
            Resume
          </button>
        ) : (
          <button
            onClick={pause}
            className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            <Pause size={18} />
            Pause
          </button>
        )}

        <button
          onClick={reset}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          title="Reset"
        >
          <RotateCcw size={18} />
        </button>

        {isRunning && (
          <button
            onClick={skip}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title="Skip"
          >
            <SkipForward size={18} />
          </button>
        )}

        {isRunning && (
          <button
            onClick={stop}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title="Stop"
          >
            <Square size={18} />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 pb-4 flex justify-between text-xs text-zinc-400">
        <span>Session: {sessionsCompleted % settings.sessionsUntilLongBreak + 1}/{settings.sessionsUntilLongBreak}</span>
        <span>Today: {dailySessionsCompleted}/{settings.dailyGoal}</span>
      </div>

      {/* Progress bar for daily goal */}
      <div className="px-4 pb-4">
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${modeColors[mode]} transition-all duration-300`}
            style={{ width: `${Math.min(100, (dailySessionsCompleted / settings.dailyGoal) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

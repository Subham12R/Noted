"use client"

interface SaveStatusProps {
  status: "idle" | "pending" | "saving" | "saved" | "error"
  lastSavedAt?: string | null
}

export function SaveStatus({ status, lastSavedAt }: SaveStatusProps) {
  const statusConfig = {
    idle: {
      icon: null,
      text: "",
      color: "text-gray-400",
    },
    pending: {
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32" className="animate-[dash_1.5s_ease-in-out_infinite]" />
        </svg>
      ),
      text: "Unsaved changes",
      color: "text-yellow-600",
    },
    saving: {
      icon: (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      ),
      text: "Saving...",
      color: "text-blue-600",
    },
    saved: {
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ),
      text: "Saved",
      color: "text-green-600",
    },
    error: {
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      text: "Save failed",
      color: "text-red-600",
    },
  }

  const config = statusConfig[status]

  // Format last saved time
  const formattedTime = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null

  if (status === "idle" && !lastSavedAt) {
    return null
  }

  return (
    <div className={`flex items-center gap-1.5 text-sm ${config.color}`}>
      {config.icon}
      <span className="hidden sm:inline">
        {status === "saved" && formattedTime ? `Saved at ${formattedTime}` : config.text}
      </span>
    </div>
  )
}

// Add the keyframe animation for the pending state
const styles = `
@keyframes dash {
  0% {
    stroke-dashoffset: 32;
  }
  50% {
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dashoffset: -32;
  }
}
`

// Inject styles
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style")
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}

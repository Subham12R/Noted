"use client"

import { useTheme } from "@/context/ThemeContext"

// Sun icon
function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

// Moon icon
function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

export function DashboardThemeToggle() {
  const { resolvedTheme, toggleTheme, isDark } = useTheme()
  const isDarkMode = resolvedTheme === "dark"

  const handleToggle = () => {
    console.log("Theme toggle clicked, current:", resolvedTheme, "isDark:", isDark)
    toggleTheme()
    console.log("After toggle, html classList:", document.documentElement.classList.toString())
  }

  return (
    <button
      onClick={handleToggle}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-400 transition-colors"
    >
      {isDarkMode ? (
        <SunIcon className="w-5 h-5" />
      ) : (
        <MoonIcon className="w-5 h-5" />
      )}
    </button>
  )
}

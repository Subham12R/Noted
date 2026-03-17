"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextType {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark")
  const [mounted, setMounted] = useState(false)

  // Get system preference
  const getSystemTheme = useCallback((): "light" | "dark" => {
    if (typeof window === "undefined") return "dark"
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }, [])

  // Resolve the actual theme based on setting
  const resolveTheme = useCallback((themeSetting: Theme): "light" | "dark" => {
    if (themeSetting === "system") {
      return getSystemTheme()
    }
    return themeSetting
  }, [getSystemTheme])

  // Apply theme to document
  const applyTheme = useCallback((resolved: "light" | "dark") => {
    const root = document.documentElement
    
    if (resolved === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    
    // Set color-scheme for native elements
    root.style.colorScheme = resolved
  }, [])

  // Initialize theme from localStorage
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem("theme") as Theme | null
    const initialTheme = stored || "system"
    setThemeState(initialTheme)

    const resolved = resolveTheme(initialTheme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [resolveTheme, applyTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = () => {
      if (theme === "system") {
        const resolved = getSystemTheme()
        setResolvedTheme(resolved)
        applyTheme(resolved)
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [mounted, theme, getSystemTheme, applyTheme])

  // Update theme
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem("theme", newTheme)

    const resolved = resolveTheme(newTheme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [resolveTheme, applyTheme])

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(newTheme)
  }, [resolvedTheme, setTheme])

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{
          theme: "system",
          resolvedTheme: "dark",
          setTheme: () => {},
          toggleTheme: () => {},
          isDark: false,
        }}
      >
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        isDark: resolvedTheme === "dark",
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

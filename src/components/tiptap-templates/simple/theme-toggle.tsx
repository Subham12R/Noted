"use client"

import { Button } from "@/components/tiptap-ui-primitive/button"
import { MoonStarIcon } from "@/components/tiptap-icons/moon-star-icon"
import { SunIcon } from "@/components/tiptap-icons/sun-icon"
import { useTheme } from "@/context/ThemeContext"

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDarkMode = resolvedTheme === "dark"

  return (
    <Button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      data-style="ghost"
    >
      {isDarkMode ? (
        <SunIcon className="tiptap-button-icon" />
      ) : (
        <MoonStarIcon className="tiptap-button-icon" />
      )}
    </Button>
  )
}

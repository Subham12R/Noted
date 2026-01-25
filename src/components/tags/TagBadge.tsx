"use client"

import { X } from "lucide-react"
import type { Tag } from "@/context/TagContext"

interface TagBadgeProps {
  tag: Tag | { id: string; name: string; color: string }
  size?: "sm" | "md" | "lg"
  onRemove?: () => void
  onClick?: () => void
}

export function TagBadge({ tag, size = "md", onRemove, onClick }: TagBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
    md: "text-xs px-2 py-1 gap-1",
    lg: "text-sm px-3 py-1.5 gap-1.5",
  }

  const iconSize = {
    sm: 10,
    md: 12,
    lg: 14,
  }

  // Calculate text color based on background color brightness
  const getTextColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 150 ? "#1f2937" : "#ffffff"
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium transition-opacity ${sizeClasses[size]} ${
        onClick ? "cursor-pointer hover:opacity-80" : ""
      }`}
      style={{
        backgroundColor: tag.color,
        color: getTextColor(tag.color),
      }}
      onClick={onClick}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="hover:opacity-70"
        >
          <X size={iconSize[size]} />
        </button>
      )}
    </span>
  )
}

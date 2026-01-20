"use client"

import { useEffect, useRef, useState } from 'react'
import { Point } from './types'

interface TextInputProps {
  position: Point
  initialValue?: string
  placeholder?: string
  fontSize?: number
  onSubmit: (text: string) => void
  onCancel: () => void
}

export function TextInput({
  position,
  initialValue = '',
  placeholder = 'Type here...',
  fontSize = 16,
  onSubmit,
  onCancel,
}: TextInputProps) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault()
      onSubmit(value.trim())
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div
      className="absolute z-50"
      style={{ left: position.x, top: position.y }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (value.trim()) {
            onSubmit(value.trim())
          } else {
            onCancel()
          }
        }}
        placeholder={placeholder}
        className="px-2 py-1 border border-blue-400 rounded-md shadow-lg bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        style={{ fontSize }}
      />
    </div>
  )
}

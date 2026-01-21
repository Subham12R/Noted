"use client"

import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Tool } from './types'
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cursor01Icon,
  Move01Icon,
  Square01Icon,
  CircleIcon,
  LineIcon,
  ArrowUpRight01Icon,
  TextFontIcon,
  PencilEdit01Icon,
  Eraser01Icon,
  Delete01Icon,
} from "@hugeicons/core-free-icons"

interface WhiteboardToolbarProps {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
  strokeColor: string
  fillColor: string
  strokeWidth: number
  eraserSize: number
  onStrokeColorChange: (color: string) => void
  onFillColorChange: (color: string) => void
  onStrokeWidthChange: (width: number) => void
  onEraserSizeChange: (size: number) => void
  onDelete: () => void
  hasSelection: boolean
}

const tools: { id: Tool; icon: typeof Cursor01Icon; label: string }[] = [
  { id: 'select', icon: Cursor01Icon, label: 'Select' },
  { id: 'pan', icon: Move01Icon, label: 'Pan' },
  { id: 'rectangle', icon: Square01Icon, label: 'Rectangle' },
  { id: 'circle', icon: CircleIcon, label: 'Circle' },
  { id: 'line', icon: LineIcon, label: 'Line' },
  { id: 'arrow', icon: ArrowUpRight01Icon, label: 'Arrow' },
  { id: 'text', icon: TextFontIcon, label: 'Text' },
  { id: 'freehand', icon: PencilEdit01Icon, label: 'Draw' },
  { id: 'eraser', icon: Eraser01Icon, label: 'Eraser' },
]

// Color Picker Component using react-colorful
function ColorPicker({
  color,
  onChange,
  label,
  allowTransparent = false,
}: {
  color: string
  onChange: (color: string) => void
  label: string
  allowTransparent?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  const isTransparent = color === 'transparent'

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="flex items-center gap-1.5 w-full px-1 py-1 rounded hover:bg-zinc-100 transition-colors"
        title={label}
      >
        <div
          className={`w-4 h-4 rounded border border-zinc-300 shrink-0 ${isTransparent ? 'bg-white relative overflow-hidden' : ''}`}
          style={{ backgroundColor: isTransparent ? undefined : color }}
        >
          {isTransparent && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-px bg-red-400 rotate-45" />
            </div>
          )}
        </div>
        <span className="text-[8px] text-zinc-500 uppercase leading-none">{label}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-full mr-1 top-0 bg-white border border-zinc-200 rounded-lg shadow-lg p-2 z-100"
          onClick={(e) => e.stopPropagation()}
        >
          <HexColorPicker
            color={isTransparent ? '#ffffff' : color}
            onChange={onChange}
            style={{ width: '120px', height: '120px' }}
          />
          {allowTransparent && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onChange('transparent')
                setIsOpen(false)
              }}
              className={`mt-2 w-full py-1 text-[10px] rounded border flex items-center justify-center gap-1 ${
                isTransparent ? 'border-zinc-900 bg-zinc-100 text-zinc-900' : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <div className="w-3 h-px bg-red-400 rotate-45" />
              No fill
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function WhiteboardToolbar({
  activeTool,
  onToolChange,
  strokeColor,
  fillColor,
  strokeWidth,
  eraserSize,
  onStrokeColorChange,
  onFillColorChange,
  onStrokeWidthChange,
  onEraserSizeChange,
  onDelete,
  hasSelection,
}: WhiteboardToolbarProps) {
  return (
    <div
      className="absolute top-2 right-2 z-40 flex flex-col p-1.5 bg-white/95 backdrop-blur-sm border border-zinc-200 shadow-md rounded-lg"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Tool buttons - 3x3 grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={(e) => {
              e.stopPropagation()
              onToolChange(tool.id)
            }}
            className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
              activeTool === tool.id
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
            }`}
            title={tool.label}
          >
            <HugeiconsIcon icon={tool.icon} size={14} />
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-200 my-1.5" />

      {/* Stroke Width - horizontal */}
      <div className="flex items-center justify-center gap-0.5">
        {[1, 2, 4].map((width) => (
          <button
            key={width}
            onClick={(e) => {
              e.stopPropagation()
              onStrokeWidthChange(width)
            }}
            className={`w-7 h-5 flex items-center justify-center rounded transition-all ${
              strokeWidth === width
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-400 hover:bg-zinc-100'
            }`}
            title={`${width}px`}
          >
            <div
              className="bg-current rounded-full"
              style={{ width: width * 2, height: width * 2 }}
            />
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-200 my-1.5" />

      {/* Colors - side by side */}
      <div className="flex flex-col gap-0.5">
        <ColorPicker
          color={strokeColor}
          onChange={onStrokeColorChange}
          label="Stroke"
        />
        <ColorPicker
          color={fillColor}
          onChange={onFillColorChange}
          label="Fill"
          allowTransparent
        />
      </div>

      {/* Eraser Size - only show when eraser is active */}
      {activeTool === 'eraser' && (
        <>
          <div className="h-px bg-zinc-200 my-1.5" />
          <div className="px-1">
            <input
              type="range"
              min="10"
              max="100"
              value={eraserSize}
              onChange={(e) => {
                e.stopPropagation()
                onEraserSizeChange(Number(e.target.value))
              }}
              className="w-full h-1 bg-zinc-200 rounded appearance-none cursor-pointer accent-zinc-900"
              title={`${eraserSize}px`}
            />
          </div>
        </>
      )}

      {/* Divider */}
      <div className="h-px bg-zinc-200 my-1.5" />

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        disabled={!hasSelection}
        className={`w-full h-6 flex items-center justify-center rounded transition-all ${
          hasSelection
            ? 'text-red-500 hover:bg-red-50 hover:text-red-600'
            : 'text-zinc-300 cursor-not-allowed'
        }`}
        title="Delete"
      >
        <HugeiconsIcon icon={Delete01Icon} size={14} />
      </button>
    </div>
  )
}

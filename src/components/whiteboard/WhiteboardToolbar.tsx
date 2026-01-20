"use client"

import { Tool } from './types'

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

const tools: { id: Tool; icon: string; label: string }[] = [
  { id: 'select', icon: '↖', label: 'Select' },
  { id: 'pan', icon: '✋', label: 'Pan' },
  { id: 'rectangle', icon: '▭', label: 'Rectangle' },
  { id: 'circle', icon: '○', label: 'Circle' },
  { id: 'line', icon: '╱', label: 'Line' },
  { id: 'arrow', icon: '→', label: 'Arrow' },
  { id: 'text', icon: 'T', label: 'Text' },
  { id: 'freehand', icon: '✎', label: 'Draw' },
  { id: 'eraser', icon: '🐻‍❄️', label: 'Eraser' },
]

const strokeColors = [
  '#000000', '#374151', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'
]

const fillColors = [
  'transparent', '#000000', '#374151', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'
]

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
      className="absolute top-0 right-22 flex gap-3 p-3 bg-white/95 backdrop-blur-sm  border border-zinc-200 shadow-lg z-5"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Left Column - Tools */}
      <div className="flex flex-col gap-2">
        {/* Tool buttons */}
        <div className="flex flex-col gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={(e) => {
                e.stopPropagation()
                onToolChange(tool.id)
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                activeTool === tool.id
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
              }`}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        {/* Stroke Width */}
        <div className="flex flex-col gap-1 pt-2 border-t border-zinc-200">
          <span className="text-[9px] text-zinc-400 uppercase text-center">Size</span>
          <div className="flex flex-col gap-1">
            {[1, 2, 4].map((width) => (
              <button
                key={width}
                onClick={(e) => {
                  e.stopPropagation()
                  onStrokeWidthChange(width)
                }}
                className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${
                  strokeWidth === width
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-400 hover:bg-zinc-100'
                }`}
                title={`${width}px`}
              >
                <div
                  className="bg-current rounded-full"
                  style={{ width: width * 2 + 2, height: width * 2 + 2 }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Eraser Size - only show when eraser is active */}
        {activeTool === 'eraser' && (
          <div className="flex flex-col gap-1 pt-2 border-t border-zinc-200">
            <span className="text-[9px] text-zinc-400 uppercase text-center">Eraser</span>
            {/* <input
              type="range"
              min="10"
              max="100"
              value={eraserSize}
              onChange={(e) => {
                e.stopPropagation()
                onEraserSizeChange(Number(e.target.value))
              }}
              className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
              title={`${eraserSize}px`}
            /> */}
            <span className="text-[9px] text-zinc-500 text-center">{eraserSize}px</span>
          </div>
        )}

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          disabled={!hasSelection}
          className={`w-full h-8 flex items-center justify-center rounded-lg text-sm transition-all mt-1 ${
            hasSelection
              ? 'text-red-500 hover:bg-red-50 hover:text-red-600'
              : 'text-zinc-300 cursor-not-allowed'
          }`}
          title="Delete"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>

      {/* Divider */}
      <div className="w-px bg-zinc-200" />

      {/* Right Column - Colors */}
      <div className="flex flex-col gap-3">
        {/* Stroke Color */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] text-zinc-400 uppercase text-center">Stroke</span>
          <div className="grid grid-cols-2 gap-1">
            {strokeColors.map((color) => (
              <button
                key={`stroke-${color}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onStrokeColorChange(color)
                }}
                className={`w-7 h-7 rounded-md border-2 transition-all ${
                  strokeColor === color ? 'border-zinc-900 scale-110 shadow-sm' : 'border-zinc-300 hover:border-zinc-400'
                } ${color === '#ffffff' ? 'bg-white' : ''}`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Fill Color */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-200">
          <span className="text-[9px] text-zinc-400 uppercase text-center">Fill</span>
          <div className="grid grid-cols-2 gap-1">
            {fillColors.map((color) => (
              <button
                key={`fill-${color}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onFillColorChange(color)
                }}
                className={`w-7 h-7 rounded-md border-2 transition-all ${
                  fillColor === color ? 'border-zinc-900 scale-110 shadow-sm' : 'border-zinc-300 hover:border-zinc-400'
                } ${color === 'transparent' ? 'bg-white relative overflow-hidden' : ''}`}
                style={{ backgroundColor: color === 'transparent' ? undefined : color }}
                title={color === 'transparent' ? 'No fill' : color}
              >
                {color === 'transparent' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-red-400 rotate-45" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

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
  { id: 'eraser', icon: '◦', label: 'Eraser' },
]

const colors = [
  '#000000', '#374151', '#ef4444', '#f97316', '#eab308',
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
      className="absolute top-3 right-3 flex flex-col gap-2 p-2 bg-white/95 backdrop-blur-sm rounded-xl border border-zinc-200 shadow-lg z-10"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Tools */}
      <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={(e) => {
              e.stopPropagation()
              onToolChange(tool.id)
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
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

      {/* Stroke Color */}
      <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200">
        <span className="text-[9px] text-zinc-400 uppercase text-center">Stroke</span>
        <div className="grid grid-cols-3 gap-1">
          {colors.slice(0, 6).map((color) => (
            <button
              key={`stroke-${color}`}
              onClick={(e) => {
                e.stopPropagation()
                onStrokeColorChange(color)
              }}
              className={`w-6 h-6 rounded-md border-2 transition-all ${
                strokeColor === color ? 'border-zinc-900 scale-110 shadow-sm' : 'border-zinc-200 hover:border-zinc-300'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Fill Color */}
      <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200">
        <span className="text-[9px] text-zinc-400 uppercase text-center">Fill</span>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onFillColorChange('transparent')
            }}
            className={`w-6 h-6 rounded-md border-2 transition-all bg-white relative overflow-hidden ${
              fillColor === 'transparent' ? 'border-zinc-900 scale-110 shadow-sm' : 'border-zinc-200 hover:border-zinc-300'
            }`}
            title="No fill"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-0.5 bg-red-400 rotate-45" />
            </div>
          </button>
          {colors.slice(0, 5).map((color) => (
            <button
              key={`fill-${color}`}
              onClick={(e) => {
                e.stopPropagation()
                onFillColorChange(color)
              }}
              className={`w-6 h-6 rounded-md border-2 transition-all ${
                fillColor === color ? 'border-zinc-900 scale-110 shadow-sm' : 'border-zinc-200 hover:border-zinc-300'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200">
        <span className="text-[9px] text-zinc-400 uppercase text-center">Size</span>
        <div className="flex flex-col gap-1">
          {[1, 2, 4].map((width) => (
            <button
              key={width}
              onClick={(e) => {
                e.stopPropagation()
                onStrokeWidthChange(width)
              }}
              className={`w-8 h-6 flex items-center justify-center rounded-md transition-all ${
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
        <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200">
          <span className="text-[9px] text-zinc-400 uppercase text-center">Eraser</span>
          <div className="flex flex-col gap-1 px-1">
            <input
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
            />
            <div className="flex items-center justify-center">
              <div
                className="rounded-full border-2 border-zinc-400 bg-white"
                style={{ width: Math.min(eraserSize / 2, 24), height: Math.min(eraserSize / 2, 24) }}
              />
            </div>
            <span className="text-[9px] text-zinc-500 text-center">{eraserSize}px</span>
          </div>
        </div>
      )}

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        disabled={!hasSelection}
        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all ${
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
  )
}

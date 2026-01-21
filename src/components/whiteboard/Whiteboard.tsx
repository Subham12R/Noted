"use client"

import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Shape, Point, WhiteboardState, Tool } from './types'
import { WhiteboardToolbar } from './WhiteboardToolbar'
import { TextInput } from './TextInput'

export interface WhiteboardRef {
  getToolbarProps: () => {
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
}

interface WhiteboardProps {
  initialShapes?: Shape[]
  onChange?: (shapes: Shape[]) => void
  width?: number
  height?: number
  className?: string
  hideToolbar?: boolean
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// Helper to wrap text for notes and stickies
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

export const Whiteboard = forwardRef<WhiteboardRef, WhiteboardProps>(function Whiteboard({
  initialShapes = [],
  onChange,
  width = 500,
  height = 500,
  className = '' ,
  hideToolbar = true,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<WhiteboardState>({
    shapes: initialShapes,
    selectedShapeId: null,
    tool: 'select',
    strokeColor: '#000000',
    fillColor: 'transparent',
    strokeWidth: 2,
  })

  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null)
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point | null>(null)
  const [freehandPoints, setFreehandPoints] = useState<Point[]>([])
  const [editingTextId] = useState<string | null>(null)

  // Eraser state
  const [eraserSize, setEraserSize] = useState(30)
  const [eraserPosition, setEraserPosition] = useState<Point | null>(null)

  // Text input state
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInputPosition, setTextInputPosition] = useState<Point>({ x: 0, y: 0 })
  const [pendingTextInsertPoint, setPendingTextInsertPoint] = useState<Point | null>(null)

  // Get shape bounds for selection (defined before draw so it can be used in the callback)
  const getShapeBounds = useCallback((shape: Shape): { x: number; y: number; width: number; height: number } => {
    switch (shape.type) {
      case 'rectangle':
      case 'note':
      case 'sticky':
        return { x: shape.x, y: shape.y, width: shape.width, height: shape.height }
      case 'circle':
        return {
          x: shape.x - shape.radius,
          y: shape.y - shape.radius,
          width: shape.radius * 2,
          height: shape.radius * 2,
        }
      case 'line':
      case 'arrow':
        return {
          x: Math.min(shape.x, shape.endX),
          y: Math.min(shape.y, shape.endY),
          width: Math.abs(shape.endX - shape.x),
          height: Math.abs(shape.endY - shape.y),
        }
      case 'text':
        return { x: shape.x, y: shape.y - shape.fontSize, width: shape.text.length * shape.fontSize * 0.6, height: shape.fontSize }
      case 'heading':
        const headingSizes = { 1: 32, 2: 24, 3: 18 }
        const hFontSize = headingSizes[shape.level] || 24
        return { x: shape.x, y: shape.y - hFontSize, width: shape.text.length * hFontSize * 0.6, height: hFontSize }
      case 'freehand':
        if (shape.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
        const xs = shape.points.map(p => p.x)
        const ys = shape.points.map(p => p.y)
        const minX = Math.min(...xs)
        const minY = Math.min(...ys)
        return {
          x: minX,
          y: minY,
          width: Math.max(...xs) - minX,
          height: Math.max(...ys) - minY,
        }
      default:
        return { x: 0, y: 0, width: 0, height: 0 }
    }
  }, [])

  // Draw all shapes
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas with subtle background
    ctx.fillStyle = '#fafafa'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Apply pan offset
    ctx.save()
    ctx.translate(panOffset.x, panOffset.y)



    // Draw shapes
    state.shapes.forEach((shape) => {
      ctx.strokeStyle = shape.strokeColor
      ctx.lineWidth = shape.strokeWidth
      ctx.fillStyle = shape.fillColor === 'transparent' ? 'transparent' : shape.fillColor

      switch (shape.type) {
        case 'rectangle':
          if (shape.fillColor !== 'transparent') {
            ctx.fillRect(shape.x, shape.y, shape.width, shape.height)
          }
          ctx.strokeRect(shape.x, shape.y, shape.width, shape.height)
          break

        case 'circle':
          ctx.beginPath()
          ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2)
          if (shape.fillColor !== 'transparent') {
            ctx.fill()
          }
          ctx.stroke()
          break

        case 'line':
          ctx.beginPath()
          ctx.moveTo(shape.x, shape.y)
          ctx.lineTo(shape.endX, shape.endY)
          ctx.stroke()
          break

        case 'arrow':
          ctx.beginPath()
          ctx.moveTo(shape.x, shape.y)
          ctx.lineTo(shape.endX, shape.endY)
          ctx.stroke()

          // Draw arrowhead
          const angle = Math.atan2(shape.endY - shape.y, shape.endX - shape.x)
          const headLength = 15
          ctx.beginPath()
          ctx.moveTo(shape.endX, shape.endY)
          ctx.lineTo(
            shape.endX - headLength * Math.cos(angle - Math.PI / 6),
            shape.endY - headLength * Math.sin(angle - Math.PI / 6)
          )
          ctx.moveTo(shape.endX, shape.endY)
          ctx.lineTo(
            shape.endX - headLength * Math.cos(angle + Math.PI / 6),
            shape.endY - headLength * Math.sin(angle + Math.PI / 6)
          )
          ctx.stroke()
          break

        case 'text':
          ctx.font = `${shape.fontSize}px Inter, sans-serif`
          ctx.fillStyle = shape.strokeColor
          ctx.fillText(shape.text, shape.x, shape.y)
          break

        case 'freehand':
          if (shape.points.length > 1) {
            ctx.beginPath()
            ctx.moveTo(shape.points[0].x, shape.points[0].y)
            for (let i = 1; i < shape.points.length; i++) {
              ctx.lineTo(shape.points[i].x, shape.points[i].y)
            }
            ctx.stroke()
          }
          break

        case 'heading':
          const headingSizes = { 1: 32, 2: 24, 3: 18 }
          const fontSize = headingSizes[shape.level] || 24
          ctx.font = `bold ${fontSize}px Inter, sans-serif`
          ctx.fillStyle = shape.strokeColor
          ctx.fillText(shape.text, shape.x, shape.y)
          break

        case 'note':
          // Draw note card background
          ctx.fillStyle = '#ffffff'
          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
          ctx.shadowBlur = 8
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 2
          ctx.fillRect(shape.x, shape.y, shape.width, shape.height)
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.strokeStyle = '#e5e7eb'
          ctx.lineWidth = 1
          ctx.strokeRect(shape.x, shape.y, shape.width, shape.height)
          // Draw note text
          ctx.fillStyle = '#374151'
          ctx.font = '14px Inter, sans-serif'
          const noteLines = wrapText(ctx, shape.text, shape.width - 16)
          noteLines.forEach((line, i) => {
            ctx.fillText(line, shape.x + 8, shape.y + 20 + i * 18)
          })
          break

        case 'sticky':
          // Draw sticky note background
          ctx.fillStyle = shape.color || '#fef3c7'
          ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
          ctx.shadowBlur = 6
          ctx.shadowOffsetX = 2
          ctx.shadowOffsetY = 2
          ctx.fillRect(shape.x, shape.y, shape.width, shape.height)
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          // Draw sticky text
          ctx.fillStyle = '#1f2937'
          ctx.font = '14px Inter, sans-serif'
          const stickyLines = wrapText(ctx, shape.text, shape.width - 16)
          stickyLines.forEach((line, i) => {
            ctx.fillText(line, shape.x + 8, shape.y + 24 + i * 18)
          })
          break
      }

      // Draw selection box
      if (state.selectedShapeId === shape.id) {
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])

        const bounds = getShapeBounds(shape)
        ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10)

        ctx.setLineDash([])
      }
    })

    // Draw preview shape while drawing
    if (isDrawing && startPoint && currentPoint && state.tool !== 'select' && state.tool !== 'pan') {
      ctx.strokeStyle = state.strokeColor
      ctx.lineWidth = state.strokeWidth
      ctx.fillStyle = state.fillColor === 'transparent' ? 'transparent' : state.fillColor
      ctx.globalAlpha = 0.5

      switch (state.tool) {
        case 'rectangle':
          const rectW = currentPoint.x - startPoint.x
          const rectH = currentPoint.y - startPoint.y
          if (state.fillColor !== 'transparent') {
            ctx.fillRect(startPoint.x, startPoint.y, rectW, rectH)
          }
          ctx.strokeRect(startPoint.x, startPoint.y, rectW, rectH)
          break

        case 'circle':
          const radius = Math.sqrt(
            Math.pow(currentPoint.x - startPoint.x, 2) +
            Math.pow(currentPoint.y - startPoint.y, 2)
          )
          ctx.beginPath()
          ctx.arc(startPoint.x, startPoint.y, radius, 0, Math.PI * 2)
          if (state.fillColor !== 'transparent') {
            ctx.fill()
          }
          ctx.stroke()
          break

        case 'line':
          ctx.beginPath()
          ctx.moveTo(startPoint.x, startPoint.y)
          ctx.lineTo(currentPoint.x, currentPoint.y)
          ctx.stroke()
          break

        case 'arrow':
          ctx.beginPath()
          ctx.moveTo(startPoint.x, startPoint.y)
          ctx.lineTo(currentPoint.x, currentPoint.y)
          ctx.stroke()

          const arrowAngle = Math.atan2(currentPoint.y - startPoint.y, currentPoint.x - startPoint.x)
          const arrowHeadLength = 15
          ctx.beginPath()
          ctx.moveTo(currentPoint.x, currentPoint.y)
          ctx.lineTo(
            currentPoint.x - arrowHeadLength * Math.cos(arrowAngle - Math.PI / 6),
            currentPoint.y - arrowHeadLength * Math.sin(arrowAngle - Math.PI / 6)
          )
          ctx.moveTo(currentPoint.x, currentPoint.y)
          ctx.lineTo(
            currentPoint.x - arrowHeadLength * Math.cos(arrowAngle + Math.PI / 6),
            currentPoint.y - arrowHeadLength * Math.sin(arrowAngle + Math.PI / 6)
          )
          ctx.stroke()
          break

        case 'freehand':
          if (freehandPoints.length > 1) {
            ctx.beginPath()
            ctx.moveTo(freehandPoints[0].x, freehandPoints[0].y)
            for (let i = 1; i < freehandPoints.length; i++) {
              ctx.lineTo(freehandPoints[i].x, freehandPoints[i].y)
            }
            ctx.stroke()
          }
          break
      }

      ctx.globalAlpha = 1
    }

    // Draw eraser cursor
    if (state.tool === 'eraser' && eraserPosition) {
      ctx.strokeStyle = '#666666'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(eraserPosition.x, eraserPosition.y, eraserSize / 2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.restore()
  }, [state, isDrawing, startPoint, currentPoint, panOffset, freehandPoints, getShapeBounds, eraserPosition, eraserSize])

  // Find shape at point
  function findShapeAtPoint(x: number, y: number): Shape | null {
    const adjustedX = x - panOffset.x
    const adjustedY = y - panOffset.y

    for (let i = state.shapes.length - 1; i >= 0; i--) {
      const shape = state.shapes[i]
      const bounds = getShapeBounds(shape)

      if (
        adjustedX >= bounds.x - 5 &&
        adjustedX <= bounds.x + bounds.width + 5 &&
        adjustedY >= bounds.y - 5 &&
        adjustedY <= bounds.y + bounds.height + 5
      ) {
        return shape
      }
    }
    return null
  }

  // Erase shapes at position
  const eraseAtPosition = useCallback((x: number, y: number) => {
    const adjustedX = x - panOffset.x
    const adjustedY = y - panOffset.y
    const radius = eraserSize / 2

    setState(prev => {
      const shapesToKeep = prev.shapes.filter(shape => {
        const bounds = getShapeBounds(shape)
        // Check if eraser circle intersects with shape bounds
        const closestX = Math.max(bounds.x, Math.min(adjustedX, bounds.x + bounds.width))
        const closestY = Math.max(bounds.y, Math.min(adjustedY, bounds.y + bounds.height))
        const distanceX = adjustedX - closestX
        const distanceY = adjustedY - closestY
        const distanceSquared = distanceX * distanceX + distanceY * distanceY

        // Keep shape if NOT intersecting with eraser
        return distanceSquared > radius * radius
      })

      if (shapesToKeep.length !== prev.shapes.length) {
        // Shapes were erased, trigger onChange
        setTimeout(() => onChange?.(shapesToKeep), 0)
        return { ...prev, shapes: shapesToKeep }
      }
      return prev
    })
  }, [eraserSize, panOffset, getShapeBounds, onChange])

  // Handle text input submission
  const handleTextSubmit = useCallback((text: string) => {
    if (!pendingTextInsertPoint || !text.trim()) {
      setShowTextInput(false)
      setPendingTextInsertPoint(null)
      return
    }

    let newShape: Shape | null = null
    const baseProps = {
      id: generateId(),
      x: pendingTextInsertPoint.x,
      y: pendingTextInsertPoint.y,
      strokeColor: state.strokeColor,
      strokeWidth: state.strokeWidth,
      fillColor: state.fillColor,
      rotation: 0,
    }

    newShape = {
      ...baseProps,
      type: 'text',
      text,
      fontSize: 16,
    } as Shape

    if (newShape) {
      const newShapes = [...state.shapes, newShape]
      setState(prev => ({ ...prev, shapes: newShapes }))
      onChange?.(newShapes)
    }

    setShowTextInput(false)
    setPendingTextInsertPoint(null)
  }, [pendingTextInsertPoint, state.strokeColor, state.strokeWidth, state.fillColor, state.shapes, onChange])

  // Handle text input cancel
  const handleTextCancel = useCallback(() => {
    setShowTextInput(false)
    setPendingTextInsertPoint(null)
  }, [])

  // Get mouse position relative to canvas
  function getCanvasPoint(e: React.MouseEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const point = getCanvasPoint(e)
    const adjustedPoint = { x: point.x - panOffset.x, y: point.y - panOffset.y }

    if (state.tool === 'pan') {
      setIsPanning(true)
      setPanStart(point)
      return
    }

    if (state.tool === 'select') {
      const shape = findShapeAtPoint(point.x, point.y)
      setState(prev => ({ ...prev, selectedShapeId: shape?.id || null }))
      if (shape) {
        setIsDrawing(true)
        setStartPoint(adjustedPoint)
      }
      return
    }

    if (state.tool === 'text') {
      // Show inline text input
      setPendingTextInsertPoint(adjustedPoint)
      setTextInputPosition(point)
      setShowTextInput(true)
      return
    }

    if (state.tool === 'eraser') {
      setIsDrawing(true)
      eraseAtPosition(point.x, point.y)
      return
    }

    setIsDrawing(true)
    setStartPoint(adjustedPoint)
    setCurrentPoint(adjustedPoint)

    if (state.tool === 'freehand') {
      setFreehandPoints([adjustedPoint])
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()

    const point = getCanvasPoint(e)
    const adjustedPoint = { x: point.x - panOffset.x, y: point.y - panOffset.y }

    // Update eraser position for cursor display
    if (state.tool === 'eraser') {
      setEraserPosition(adjustedPoint)
      if (isDrawing) {
        eraseAtPosition(point.x, point.y)
      }
    }

    if (isPanning && panStart) {
      setPanOffset(prev => ({
        x: prev.x + (point.x - panStart.x),
        y: prev.y + (point.y - panStart.y),
      }))
      setPanStart(point)
      return
    }

    if (!isDrawing || !startPoint) return

    if (state.tool === 'select' && state.selectedShapeId) {
      // Move selected shape
      const deltaX = adjustedPoint.x - startPoint.x
      const deltaY = adjustedPoint.y - startPoint.y

      setState(prev => ({
        ...prev,
        shapes: prev.shapes.map(shape => {
          if (shape.id !== state.selectedShapeId) return shape

          const updatedShape = { ...shape, x: shape.x + deltaX, y: shape.y + deltaY }
          if ('endX' in shape && 'endY' in shape) {
            (updatedShape as any).endX = shape.endX + deltaX;
            (updatedShape as any).endY = shape.endY + deltaY
          }
          if ('points' in shape) {
            (updatedShape as any).points = shape.points.map(p => ({
              x: p.x + deltaX,
              y: p.y + deltaY,
            }))
          }
          return updatedShape
        }),
      }))
      setStartPoint(adjustedPoint)
      return
    }

    setCurrentPoint(adjustedPoint)

    if (state.tool === 'freehand') {
      setFreehandPoints(prev => [...prev, adjustedPoint])
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (isPanning) {
      setIsPanning(false)
      setPanStart(null)
      return
    }

    // Handle eraser release
    if (state.tool === 'eraser') {
      setIsDrawing(false)
      return
    }

    if (!isDrawing || !startPoint) {
      setIsDrawing(false)
      return
    }

    // Use currentPoint or startPoint if no movement occurred
    const endPoint = currentPoint || startPoint

    if (state.tool === 'select') {
      setIsDrawing(false)
      // Use a callback to get the latest shapes after state updates
      setState(prev => {
        onChange?.(prev.shapes)
        return prev
      })
      return
    }

    let newShape: Shape | null = null
    const adjustedStart = startPoint
    const adjustedEnd = endPoint

    // Only create shape if there was actual movement
    const hasMovement = Math.abs(adjustedEnd.x - adjustedStart.x) > 2 || Math.abs(adjustedEnd.y - adjustedStart.y) > 2

    if (hasMovement || state.tool === 'freehand') {
      switch (state.tool) {
        case 'rectangle':
          newShape = {
            id: generateId(),
            type: 'rectangle',
            x: Math.min(adjustedStart.x, adjustedEnd.x),
            y: Math.min(adjustedStart.y, adjustedEnd.y),
            width: Math.abs(adjustedEnd.x - adjustedStart.x),
            height: Math.abs(adjustedEnd.y - adjustedStart.y),
            strokeColor: state.strokeColor,
            strokeWidth: state.strokeWidth,
            fillColor: state.fillColor,
            rotation: 0,
          }
          break

        case 'circle':
          newShape = {
            id: generateId(),
            type: 'circle',
            x: adjustedStart.x,
            y: adjustedStart.y,
            radius: Math.sqrt(
              Math.pow(adjustedEnd.x - adjustedStart.x, 2) +
              Math.pow(adjustedEnd.y - adjustedStart.y, 2)
            ),
            strokeColor: state.strokeColor,
            strokeWidth: state.strokeWidth,
            fillColor: state.fillColor,
            rotation: 0,
          }
          break

        case 'line':
          newShape = {
            id: generateId(),
            type: 'line',
            x: adjustedStart.x,
            y: adjustedStart.y,
            endX: adjustedEnd.x,
            endY: adjustedEnd.y,
            strokeColor: state.strokeColor,
            strokeWidth: state.strokeWidth,
            fillColor: state.fillColor,
            rotation: 0,
          }
          break

        case 'arrow':
          newShape = {
            id: generateId(),
            type: 'arrow',
            x: adjustedStart.x,
            y: adjustedStart.y,
            endX: adjustedEnd.x,
            endY: adjustedEnd.y,
            strokeColor: state.strokeColor,
            strokeWidth: state.strokeWidth,
            fillColor: state.fillColor,
            rotation: 0,
          }
          break

        case 'freehand':
          if (freehandPoints.length > 1) {
            newShape = {
              id: generateId(),
              type: 'freehand',
              x: freehandPoints[0].x,
              y: freehandPoints[0].y,
              points: freehandPoints,
              strokeColor: state.strokeColor,
              strokeWidth: state.strokeWidth,
              fillColor: state.fillColor,
              rotation: 0,
            }
          }
          break
      }
    }

    if (newShape) {
      const newShapes = [...state.shapes, newShape]
      setState(prev => ({ ...prev, shapes: newShapes }))
      onChange?.(newShapes)
    }

    setIsDrawing(false)
    setStartPoint(null)
    setCurrentPoint(null)
    setFreehandPoints([])
  }

  // Delete selected shape
  const handleDelete = useCallback(() => {
    if (!state.selectedShapeId) return

    const newShapes = state.shapes.filter(s => s.id !== state.selectedShapeId)
    setState(prev => ({ ...prev, shapes: newShapes, selectedShapeId: null }))
    onChange?.(newShapes)
  }, [state.selectedShapeId, state.shapes, onChange])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editingTextId) return
        handleDelete()
      }
      if (e.key === 'Escape') {
        setState(prev => ({ ...prev, selectedShapeId: null }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleDelete, editingTextId])

  // Redraw on state change
  useEffect(() => {
    draw()
  }, [draw])

  // Expose toolbar props via ref for external toolbar rendering
  useImperativeHandle(ref, () => ({
    getToolbarProps: () => ({
      activeTool: state.tool,
      onToolChange: (tool: Tool) => {
        setState(prev => ({ ...prev, tool, selectedShapeId: null }))
        if (tool !== 'eraser') setEraserPosition(null)
      },
      strokeColor: state.strokeColor,
      fillColor: state.fillColor,
      strokeWidth: state.strokeWidth,
      eraserSize,
      onStrokeColorChange: (color: string) => setState(prev => ({ ...prev, strokeColor: color })),
      onFillColorChange: (color: string) => setState(prev => ({ ...prev, fillColor: color })),
      onStrokeWidthChange: (width: number) => setState(prev => ({ ...prev, strokeWidth: width })),
      onEraserSizeChange: setEraserSize,
      onDelete: handleDelete,
      hasSelection: !!state.selectedShapeId,
    }),
  }), [state.tool, state.strokeColor, state.fillColor, state.strokeWidth, state.selectedShapeId, eraserSize, handleDelete])

  return (
    <div
      className={`relative bg-white overflow-hidden ${className}`}
      style={{ width, height }}
      onDragStart={(e) => e.preventDefault()}
    >
      {!hideToolbar && (
        <WhiteboardToolbar
          activeTool={state.tool}
          onToolChange={(tool) => {
            setState(prev => ({ ...prev, tool, selectedShapeId: null }))
            if (tool !== 'eraser') setEraserPosition(null)
          }}
          strokeColor={state.strokeColor}
          fillColor={state.fillColor}
          strokeWidth={state.strokeWidth}
          eraserSize={eraserSize}
          onStrokeColorChange={(color) => setState(prev => ({ ...prev, strokeColor: color }))}
          onFillColorChange={(color) => setState(prev => ({ ...prev, fillColor: color }))}
          onStrokeWidthChange={(width) => setState(prev => ({ ...prev, strokeWidth: width }))}
          onEraserSizeChange={setEraserSize}
          onDelete={handleDelete}
          hasSelection={!!state.selectedShapeId}
          
        />
      )}

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={(e) => {
          handleMouseUp(e)
          if (state.tool === 'eraser') setEraserPosition(null)
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        draggable={false}
        className="cursor-crosshair touch-none select-none"
        style={{
          cursor: state.tool === 'select' ? 'default' :
                 state.tool === 'pan' ? 'grab' :
                 state.tool === 'eraser' ? 'none' : 'crosshair',
        }}
      />

      {/* Inline Text Input */}
      {showTextInput && (
        <TextInput
          position={textInputPosition}
          placeholder="Enter text..."
          fontSize={14}
          onSubmit={handleTextSubmit}
          onCancel={handleTextCancel}
        />
      )}
    </div>
  )
})

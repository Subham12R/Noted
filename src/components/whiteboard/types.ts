export type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'freehand' | 'heading' | 'note' | 'sticky'

export type Tool = ShapeType | 'select' | 'pan' | 'eraser'

export interface Point {
  x: number
  y: number
}

export interface BaseShape {
  id: string
  type: ShapeType
  x: number
  y: number
  strokeColor: string
  strokeWidth: number
  fillColor: string
  rotation: number
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle'
  width: number
  height: number
}

export interface CircleShape extends BaseShape {
  type: 'circle'
  radius: number
}

export interface LineShape extends BaseShape {
  type: 'line'
  endX: number
  endY: number
}

export interface ArrowShape extends BaseShape {
  type: 'arrow'
  endX: number
  endY: number
}

export interface TextShape extends BaseShape {
  type: 'text'
  text: string
  fontSize: number
}

export interface FreehandShape extends BaseShape {
  type: 'freehand'
  points: Point[]
}

export interface HeadingShape extends BaseShape {
  type: 'heading'
  text: string
  level: 1 | 2 | 3
}

export interface NoteShape extends BaseShape {
  type: 'note'
  text: string
  width: number
  height: number
}

export interface StickyShape extends BaseShape {
  type: 'sticky'
  text: string
  width: number
  height: number
  color: string // background color of the sticky
}

export type Shape = RectangleShape | CircleShape | LineShape | ArrowShape | TextShape | FreehandShape | HeadingShape | NoteShape | StickyShape

export interface WhiteboardState {
  shapes: Shape[]
  selectedShapeId: string | null
  tool: Tool
  strokeColor: string
  fillColor: string
  strokeWidth: number
}

// AI Actions API Endpoint
// POST /api/ai/actions - Execute AI-requested actions on folders/pages/todos

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-utils'
import { rateLimitMemory, RATE_LIMITS } from '@/lib/rate-limit'
import { db, folders, pages, todos } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Action types the AI can request
const ActionSchema = z.discriminatedUnion('type', [
  // Folder actions
  z.object({
    type: z.literal('create_folder'),
    name: z.string().min(1).max(100),
    parentId: z.string().nullable().optional(),
  }),
  z.object({
    type: z.literal('rename_folder'),
    folderId: z.string(),
    newName: z.string().min(1).max(100),
  }),
  z.object({
    type: z.literal('delete_folder'),
    folderId: z.string(),
  }),
  z.object({
    type: z.literal('move_folder'),
    folderId: z.string(),
    newParentId: z.string().nullable(),
  }),

  // Page actions
  z.object({
    type: z.literal('create_page'),
    name: z.string().min(1).max(200),
    folderId: z.string(),
    content: z.string().optional(),
  }),
  z.object({
    type: z.literal('rename_page'),
    pageId: z.string(),
    newName: z.string().min(1).max(200),
  }),
  z.object({
    type: z.literal('delete_page'),
    pageId: z.string(),
  }),
  z.object({
    type: z.literal('move_page'),
    pageId: z.string(),
    newFolderId: z.string(),
  }),
  z.object({
    type: z.literal('update_page_content'),
    pageId: z.string(),
    content: z.string(),
  }),

  // Todo actions
  z.object({
    type: z.literal('create_todo'),
    text: z.string().min(1).max(500),
  }),
  z.object({
    type: z.literal('update_todo'),
    todoId: z.string(),
    text: z.string().min(1).max(500).optional(),
    completed: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('delete_todo'),
    todoId: z.string(),
  }),
  z.object({
    type: z.literal('complete_todo'),
    todoId: z.string(),
  }),
])

const ActionsRequestSchema = z.object({
  actions: z.array(ActionSchema),
})

type Action = z.infer<typeof ActionSchema>

// Random color for new folders
const folderColors = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6"
]
const getRandomColor = () => folderColors[Math.floor(Math.random() * folderColors.length)]

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const rl = rateLimitMemory({ identifier: userId, endpoint: "ai-actions", ...RATE_LIMITS.API_GENERAL })
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limit exceeded', retryAfter: rl.retryAfter }, { status: 429 })
    }

    const body = await request.json()

    // Validate request
    const { actions } = ActionsRequestSchema.parse(body)

    const results: { action: Action; success: boolean; error?: string; result?: unknown }[] = []

    // Execute each action
    for (const action of actions) {
      try {
        const result = await executeAction(action, userId)
        results.push({ action, success: true, result })
      } catch (error) {
        results.push({
          action,
          success: false,
          error: error instanceof Error ? error.message : 'Action failed',
        })
      }
    }

    return NextResponse.json({
      success: results.every(r => r.success),
      results,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid action format', details: error.issues },
        { status: 400 }
      )
    }
    console.error('AI actions error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function executeAction(action: Action, userId: string): Promise<unknown> {
  switch (action.type) {
    case 'create_folder': {
      // Verify parent folder if specified
      if (action.parentId) {
        const [parentFolder] = await db
          .select()
          .from(folders)
          .where(and(eq(folders.id, action.parentId), eq(folders.ownerId, userId)))
        if (!parentFolder) {
          throw new Error('Parent folder not found')
        }
      }

      const [newFolder] = await db
        .insert(folders)
        .values({
          name: action.name,
          ownerId: userId,
          parentId: action.parentId || null,
          color: getRandomColor(),
          sortOrder: 0,
        })
        .returning()

      return { folder: newFolder }
    }

    case 'rename_folder': {
      const [folder] = await db
        .select()
        .from(folders)
        .where(and(eq(folders.id, action.folderId), eq(folders.ownerId, userId)))

      if (!folder) {
        throw new Error('Folder not found')
      }

      const [updated] = await db
        .update(folders)
        .set({ name: action.newName, updatedAt: new Date() })
        .where(eq(folders.id, action.folderId))
        .returning()

      return { folder: updated }
    }

    case 'delete_folder': {
      const [folder] = await db
        .select()
        .from(folders)
        .where(and(eq(folders.id, action.folderId), eq(folders.ownerId, userId)))

      if (!folder) {
        throw new Error('Folder not found')
      }

      // Delete all pages in folder first
      await db.delete(pages).where(eq(pages.folderId, action.folderId))

      // Delete the folder
      await db.delete(folders).where(eq(folders.id, action.folderId))

      return { deleted: true }
    }

    case 'move_folder': {
      const [folder] = await db
        .select()
        .from(folders)
        .where(and(eq(folders.id, action.folderId), eq(folders.ownerId, userId)))

      if (!folder) {
        throw new Error('Folder not found')
      }

      // Verify new parent if specified
      if (action.newParentId) {
        const [parentFolder] = await db
          .select()
          .from(folders)
          .where(and(eq(folders.id, action.newParentId), eq(folders.ownerId, userId)))
        if (!parentFolder) {
          throw new Error('Target parent folder not found')
        }
        // Prevent moving folder into itself or its children
        if (action.newParentId === action.folderId) {
          throw new Error('Cannot move folder into itself')
        }
      }

      const [updated] = await db
        .update(folders)
        .set({ parentId: action.newParentId, updatedAt: new Date() })
        .where(eq(folders.id, action.folderId))
        .returning()

      return { folder: updated }
    }

    case 'create_page': {
      // Verify folder exists and belongs to user
      const [folder] = await db
        .select()
        .from(folders)
        .where(and(eq(folders.id, action.folderId), eq(folders.ownerId, userId)))

      if (!folder) {
        throw new Error('Folder not found')
      }

      const [newPage] = await db
        .insert(pages)
        .values({
          name: action.name,
          folderId: action.folderId,
          ownerId: userId,
          content: action.content || '',
          sortOrder: 0,
        })
        .returning()

      return { page: newPage }
    }

    case 'rename_page': {
      const [page] = await db
        .select()
        .from(pages)
        .where(and(eq(pages.id, action.pageId), eq(pages.ownerId, userId)))

      if (!page) {
        throw new Error('Page not found')
      }

      const [updated] = await db
        .update(pages)
        .set({ name: action.newName, updatedAt: new Date() })
        .where(eq(pages.id, action.pageId))
        .returning()

      return { page: updated }
    }

    case 'delete_page': {
      const [page] = await db
        .select()
        .from(pages)
        .where(and(eq(pages.id, action.pageId), eq(pages.ownerId, userId)))

      if (!page) {
        throw new Error('Page not found')
      }

      await db.delete(pages).where(eq(pages.id, action.pageId))

      return { deleted: true }
    }

    case 'move_page': {
      const [page] = await db
        .select()
        .from(pages)
        .where(and(eq(pages.id, action.pageId), eq(pages.ownerId, userId)))

      if (!page) {
        throw new Error('Page not found')
      }

      // Verify target folder
      const [targetFolder] = await db
        .select()
        .from(folders)
        .where(and(eq(folders.id, action.newFolderId), eq(folders.ownerId, userId)))

      if (!targetFolder) {
        throw new Error('Target folder not found')
      }

      const [updated] = await db
        .update(pages)
        .set({ folderId: action.newFolderId, updatedAt: new Date() })
        .where(eq(pages.id, action.pageId))
        .returning()

      return { page: updated }
    }

    case 'update_page_content': {
      const [page] = await db
        .select()
        .from(pages)
        .where(and(eq(pages.id, action.pageId), eq(pages.ownerId, userId)))

      if (!page) {
        throw new Error('Page not found')
      }

      const [updated] = await db
        .update(pages)
        .set({ content: action.content, updatedAt: new Date() })
        .where(eq(pages.id, action.pageId))
        .returning()

      return { page: updated }
    }

    case 'create_todo': {
      const [newTodo] = await db
        .insert(todos)
        .values({
          userId,
          text: action.text,
          completed: false,
        })
        .returning()

      return { todo: newTodo }
    }

    case 'update_todo': {
      const [todo] = await db
        .select()
        .from(todos)
        .where(and(eq(todos.id, action.todoId), eq(todos.userId, userId)))

      if (!todo) {
        throw new Error('Todo not found')
      }

      const updates: { text?: string; completed?: boolean; updatedAt: Date } = {
        updatedAt: new Date(),
      }
      if (action.text !== undefined) updates.text = action.text
      if (action.completed !== undefined) updates.completed = action.completed

      const [updated] = await db
        .update(todos)
        .set(updates)
        .where(eq(todos.id, action.todoId))
        .returning()

      return { todo: updated }
    }

    case 'delete_todo': {
      const [todo] = await db
        .select()
        .from(todos)
        .where(and(eq(todos.id, action.todoId), eq(todos.userId, userId)))

      if (!todo) {
        throw new Error('Todo not found')
      }

      await db.delete(todos).where(eq(todos.id, action.todoId))

      return { deleted: true }
    }

    case 'complete_todo': {
      const [todo] = await db
        .select()
        .from(todos)
        .where(and(eq(todos.id, action.todoId), eq(todos.userId, userId)))

      if (!todo) {
        throw new Error('Todo not found')
      }

      const [updated] = await db
        .update(todos)
        .set({ completed: true, updatedAt: new Date() })
        .where(eq(todos.id, action.todoId))
        .returning()

      return { todo: updated }
    }

    default:
      throw new Error('Unknown action type')
  }
}

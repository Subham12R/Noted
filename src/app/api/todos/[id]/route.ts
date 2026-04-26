// Individual Todo API Endpoint
// PATCH /api/todos/[id] - Update a todo
// DELETE /api/todos/[id] - Delete a todo

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-utils'
import { db, todos } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// PATCH - Update a todo (toggle completed, update text)
const UpdateTodoSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const updates = UpdateTodoSchema.parse(body)

    // Verify ownership
    const [existingTodo] = await db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, session.user.id)))

    if (!existingTodo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
    }

    const [updatedTodo] = await db
      .update(todos)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(todos.id, id), eq(todos.userId, session.user.id)))
      .returning()

    return NextResponse.json({ todo: updatedTodo })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Update todo error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a todo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const [existingTodo] = await db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, session.user.id)))

    if (!existingTodo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
    }

    await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, session.user.id)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete todo error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

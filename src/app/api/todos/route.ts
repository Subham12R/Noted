// Todos API Endpoint
// GET /api/todos - Get all todos for the current user
// POST /api/todos - Create a new todo

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-utils'
import { db, todos } from '@/db'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET - Fetch all todos for current user
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userTodos = await db
      .select()
      .from(todos)
      .where(eq(todos.userId, session.user.id))
      .orderBy(desc(todos.createdAt))

    return NextResponse.json({ todos: userTodos })
  } catch (error) {
    console.error('Get todos error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new todo
const CreateTodoSchema = z.object({
  text: z.string().min(1).max(500),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { text } = CreateTodoSchema.parse(body)

    const [newTodo] = await db
      .insert(todos)
      .values({
        userId: session.user.id,
        text,
        completed: false,
      })
      .returning()

    return NextResponse.json({ todo: newTodo }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Create todo error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

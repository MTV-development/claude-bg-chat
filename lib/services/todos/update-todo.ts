import { db } from '@/db';
import { todos, activityLog } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export type UpdateTodoInput = {
  completed?: boolean;
  status?: 'inbox' | 'active' | 'someday' | 'done';
  dueDate?: string | null;
  nextAction?: string;
  title?: string;
  canDoAnytime?: boolean;
  projectId?: string | null;
};

export type UpdatedTodo = {
  id: string;
  title: string;
  nextAction: string | null;
  status: 'inbox' | 'active' | 'someday' | 'done';
  completed: boolean;
  projectId: string | null;
  dueDate: string | null;
  canDoAnytime: boolean;
  createdAt: string;
  completedAt: string | null;
  postponeCount: number;
};

/**
 * Update a todo, verifying it belongs to the user
 */
export async function updateTodo(
  userId: string,
  todoId: string,
  input: UpdateTodoInput
): Promise<UpdatedTodo | null> {
  // First verify the todo belongs to this user
  const existing = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, todoId), eq(todos.userId, userId)));

  if (existing.length === 0) {
    return null;
  }

  const todo = existing[0];
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  // Handle completion toggle
  if (typeof input.completed === 'boolean') {
    updates.status = input.completed ? 'done' : 'active';
    updates.completedAt = input.completed ? new Date() : null;

    // Log activity
    await db.insert(activityLog).values({
      userId,
      todoId,
      action: input.completed ? 'completed' : 'uncompleted',
      details: {},
    });
  }

  // Handle status change
  if (input.status) {
    updates.status = input.status;
    if (input.status === 'done' && !todo.completedAt) {
      updates.completedAt = new Date();
    } else if (input.status !== 'done') {
      updates.completedAt = null;
    }
  }

  // Handle other field updates
  if (input.dueDate !== undefined) {
    updates.dueDate = input.dueDate;
  }
  if (input.nextAction !== undefined) {
    updates.nextAction = input.nextAction;
  }
  if (input.title !== undefined) {
    updates.title = input.title;
  }
  if (input.canDoAnytime !== undefined) {
    updates.canDoAnytime = input.canDoAnytime;
  }
  if (input.projectId !== undefined) {
    updates.projectId = input.projectId;
  }

  const [updated] = await db
    .update(todos)
    .set(updates)
    .where(eq(todos.id, todoId))
    .returning();

  return {
    id: updated.id,
    title: updated.title,
    nextAction: updated.nextAction,
    status: updated.status ?? 'active',
    completed: updated.status === 'done',
    projectId: updated.projectId,
    dueDate: updated.dueDate,
    canDoAnytime: updated.canDoAnytime ?? false,
    createdAt: updated.createdAt?.toISOString() ?? new Date().toISOString(),
    completedAt: updated.completedAt?.toISOString() ?? null,
    postponeCount: updated.postponeCount ?? 0,
  };
}

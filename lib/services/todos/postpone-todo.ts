import { db } from '@/db';
import { todos, activityLog } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export type PostponedTodo = {
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
 * Get local date string N days from now
 */
function getDatePlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Postpone a todo by N days
 */
export async function postponeTodo(
  userId: string,
  todoId: string,
  days: number
): Promise<{ todo: PostponedTodo; needsConfirmation: boolean } | null> {
  // First verify the todo belongs to this user
  const existing = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, todoId), eq(todos.userId, userId)));

  if (existing.length === 0) {
    return null;
  }

  const todo = existing[0];
  const oldDate = todo.dueDate;
  const newDate = getDatePlusDays(days);
  const newPostponeCount = (todo.postponeCount ?? 0) + 1;

  // Update the todo
  const [updated] = await db
    .update(todos)
    .set({
      dueDate: newDate,
      postponeCount: newPostponeCount,
      updatedAt: new Date(),
    })
    .where(eq(todos.id, todoId))
    .returning();

  // Log activity
  await db.insert(activityLog).values({
    userId,
    todoId,
    action: 'postponed',
    details: {
      fromDate: oldDate ?? 'none',
      toDate: newDate,
    },
  });

  return {
    todo: {
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
    },
    needsConfirmation: newPostponeCount >= 3,
  };
}

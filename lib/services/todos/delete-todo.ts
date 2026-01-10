import { db } from '@/db';
import { todos } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Delete a todo, verifying it belongs to the user.
 * Activity log entries are automatically deleted via CASCADE.
 */
export async function deleteTodo(
  userId: string,
  todoId: string
): Promise<boolean> {
  // Delete the todo (CASCADE will handle activity_log)
  const result = await db
    .delete(todos)
    .where(and(eq(todos.id, todoId), eq(todos.userId, userId)))
    .returning({ id: todos.id });

  return result.length > 0;
}

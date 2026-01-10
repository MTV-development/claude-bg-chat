import { db } from '@/db';
import { todos, activityLog } from '@/db/schema';

export type CreateTodoInput = {
  title: string;
  dueDate?: string | null;
  canDoAnytime?: boolean;
  projectId?: string | null;
  status?: 'inbox' | 'active';
};

export type CreatedTodo = {
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
 * Create a new todo for a user
 */
export async function createTodo(
  userId: string,
  input: CreateTodoInput
): Promise<CreatedTodo> {
  const [newTodo] = await db
    .insert(todos)
    .values({
      userId,
      title: input.title.trim(),
      nextAction: input.title.trim(), // Set nextAction same as title by default
      status: input.status ?? 'active',
      dueDate: input.dueDate ?? null,
      canDoAnytime: input.canDoAnytime ?? false,
      projectId: input.projectId ?? null,
      postponeCount: 0,
    })
    .returning();

  // Log activity
  await db.insert(activityLog).values({
    userId,
    todoId: newTodo.id,
    action: 'created',
    details: {},
  });

  return {
    id: newTodo.id,
    title: newTodo.title,
    nextAction: newTodo.nextAction,
    status: newTodo.status ?? 'active',
    completed: newTodo.status === 'done',
    projectId: newTodo.projectId,
    dueDate: newTodo.dueDate,
    canDoAnytime: newTodo.canDoAnytime ?? false,
    createdAt: newTodo.createdAt?.toISOString() ?? new Date().toISOString(),
    completedAt: newTodo.completedAt?.toISOString() ?? null,
    postponeCount: newTodo.postponeCount ?? 0,
  };
}

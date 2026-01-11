import { db } from '@/db';
import { projects, todos } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export type DeletedTodo = {
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
 * Delete all todos in a project by project name
 * Returns the deleted todos, or null if project not found
 */
export async function deleteProjectTodos(
  userId: string,
  projectName: string
): Promise<{ todos: DeletedTodo[]; count: number } | null> {
  // Find the project by name
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.name, projectName)));

  if (!project) {
    return null;
  }

  // Get todos in the project before deleting
  const projectTodos = await db
    .select()
    .from(todos)
    .where(and(eq(todos.userId, userId), eq(todos.projectId, project.id)));

  if (projectTodos.length === 0) {
    return { todos: [], count: 0 };
  }

  // Delete all todos in the project
  await db
    .delete(todos)
    .where(and(eq(todos.userId, userId), eq(todos.projectId, project.id)));

  // Format deleted todos for return
  const deletedTodos: DeletedTodo[] = projectTodos.map((t) => ({
    id: t.id,
    title: t.title,
    nextAction: t.nextAction,
    status: t.status ?? 'active',
    completed: t.status === 'done',
    projectId: t.projectId,
    dueDate: t.dueDate,
    canDoAnytime: t.canDoAnytime ?? false,
    createdAt: t.createdAt?.toISOString() ?? new Date().toISOString(),
    completedAt: t.completedAt?.toISOString() ?? null,
    postponeCount: t.postponeCount ?? 0,
  }));

  return { todos: deletedTodos, count: deletedTodos.length };
}

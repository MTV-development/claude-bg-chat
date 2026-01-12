import { db } from '@/db';
import { todos, projects } from '@/db/schema';
import { eq, and, ilike, or } from 'drizzle-orm';

export type FoundTodo = {
  id: string;
  title: string;
  nextAction: string | null;
  status: 'inbox' | 'active' | 'someday' | 'done';
  completed: boolean;
  project: string | null;
  projectId: string | null;
  dueDate: string | null;
  canDoAnytime: boolean;
  createdAt: string;
  completedAt: string | null;
  postponeCount: number;
};

/**
 * Find a todo by ID, title, or nextAction (flexible matching)
 *
 * Matching priority:
 * 1. Exact ID match
 * 2. Exact title match (case-insensitive)
 * 3. Exact nextAction match (case-insensitive)
 * 4. Partial title match (case-insensitive)
 * 5. Partial nextAction match (case-insensitive)
 */
export async function findTodo(
  userId: string,
  query: string
): Promise<FoundTodo | null> {
  // Get all todos for user (we need flexible matching, so fetch and filter in-memory)
  const userTodos = await db
    .select({
      id: todos.id,
      title: todos.title,
      nextAction: todos.nextAction,
      status: todos.status,
      projectId: todos.projectId,
      projectName: projects.name,
      dueDate: todos.dueDate,
      canDoAnytime: todos.canDoAnytime,
      createdAt: todos.createdAt,
      completedAt: todos.completedAt,
      postponeCount: todos.postponeCount,
    })
    .from(todos)
    .leftJoin(projects, eq(todos.projectId, projects.id))
    .where(eq(todos.userId, userId));

  const lowerQuery = query.toLowerCase();

  // Try exact ID match first
  let found = userTodos.find((t) => t.id === query);

  // Try exact title match (case-insensitive)
  if (!found) {
    found = userTodos.find((t) => t.title.toLowerCase() === lowerQuery);
  }

  // Try exact nextAction match (case-insensitive)
  if (!found) {
    found = userTodos.find(
      (t) => t.nextAction && t.nextAction.toLowerCase() === lowerQuery
    );
  }

  // Try partial title match (case-insensitive)
  if (!found) {
    found = userTodos.find((t) => t.title.toLowerCase().includes(lowerQuery));
  }

  // Try partial nextAction match (case-insensitive)
  if (!found) {
    found = userTodos.find(
      (t) => t.nextAction && t.nextAction.toLowerCase().includes(lowerQuery)
    );
  }

  if (!found) {
    return null;
  }

  return {
    id: found.id,
    title: found.title,
    nextAction: found.nextAction,
    status: found.status ?? 'inbox',
    completed: found.status === 'done',
    project: found.projectName,
    projectId: found.projectId,
    dueDate: found.dueDate,
    canDoAnytime: found.canDoAnytime ?? false,
    createdAt: found.createdAt?.toISOString() ?? new Date().toISOString(),
    completedAt: found.completedAt?.toISOString() ?? null,
    postponeCount: found.postponeCount ?? 0,
  };
}

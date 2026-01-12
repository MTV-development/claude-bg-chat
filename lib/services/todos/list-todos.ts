import { db } from '@/db';
import { todos, projects } from '@/db/schema';
import { eq, and, lte, gt, isNull, isNotNull, or, sql } from 'drizzle-orm';
import type { TabType } from '@/lib/stores/types';

export type TodoWithProject = {
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
 * Get today's date as YYYY-MM-DD string in local timezone
 */
function getLocalDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Determine which tab a todo belongs to based on its properties
 */
export function getItemTab(item: {
  status: string;
  nextAction: string | null;
  canDoAnytime: boolean;
  dueDate: string | null;
}): TabType {
  const today = getLocalDateString();

  if (item.status === 'done') {
    return 'done';
  }

  if (!item.nextAction) {
    return 'inbox';
  }

  if (item.canDoAnytime) {
    return 'optional';
  }

  if (item.dueDate && item.dueDate <= today) {
    return 'focus';
  }

  if (item.dueDate && item.dueDate > today) {
    return 'later';
  }

  return 'inbox';
}

/**
 * List todos for a user, optionally filtered by tab
 */
export async function listTodos(
  userId: string,
  tab?: TabType
): Promise<TodoWithProject[]> {
  const today = getLocalDateString();

  // Build base query with project join
  let query = db
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

  const results = await query;

  // Map to TodoWithProject format
  let items: TodoWithProject[] = results.map((r) => ({
    id: r.id,
    title: r.title,
    nextAction: r.nextAction,
    status: r.status ?? 'inbox',
    completed: r.status === 'done',
    project: r.projectName,
    projectId: r.projectId,
    dueDate: r.dueDate,
    canDoAnytime: r.canDoAnytime ?? false,
    createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
    postponeCount: r.postponeCount ?? 0,
  }));

  // Filter by tab if specified
  if (tab) {
    items = items.filter((item) => getItemTab(item) === tab);
  }

  // Sort: done items last, then by due date
  items.sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;

    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }

    return 0;
  });

  return items;
}

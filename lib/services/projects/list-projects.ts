import { db } from '@/db';
import { projects, todos } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export type ProjectWithCounts = {
  id: string;
  name: string;
  taskCount: number;
  completedCount: number;
};

/**
 * List all projects for a user with task counts
 */
export async function listProjects(userId: string): Promise<ProjectWithCounts[]> {
  // Get all projects for user
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId));

  // Get task counts for each project
  const result: ProjectWithCounts[] = [];

  for (const project of userProjects) {
    const projectTodos = await db
      .select()
      .from(todos)
      .where(
        and(eq(todos.userId, userId), eq(todos.projectId, project.id))
      );

    const taskCount = projectTodos.length;
    const completedCount = projectTodos.filter((t) => t.status === 'done').length;

    result.push({
      id: project.id,
      name: project.name,
      taskCount,
      completedCount,
    });
  }

  // Sort by name
  result.sort((a, b) => a.name.localeCompare(b.name));

  return result;
}

/**
 * Get todos for a specific project
 */
export async function getProjectTodos(userId: string, projectId: string) {
  const projectTodos = await db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.userId, userId),
        eq(todos.projectId, projectId),
        sql`${todos.status} != 'done'`
      )
    );

  // Sort by due date
  projectTodos.sort((a, b) => {
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    return 0;
  });

  return projectTodos.map((t) => ({
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
}

import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Get a project by name, or create it if it doesn't exist
 */
export async function getOrCreateProject(
  userId: string,
  projectName: string
): Promise<string> {
  // Check if project exists
  const existing = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.name, projectName)));

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new project
  const [newProject] = await db
    .insert(projects)
    .values({
      userId,
      name: projectName,
    })
    .returning();

  return newProject.id;
}

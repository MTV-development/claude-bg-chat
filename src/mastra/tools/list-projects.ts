import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { listProjects } from '@/lib/services/projects/list-projects';

/**
 * Create the listProjects tool for a specific user
 */
export function createListProjectsTool(userId: string) {
  return createTool({
    id: 'listProjects',
    description:
      'List all projects with their task counts. ' +
      'Use to show the user their projects or get an overview of project organization.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      projects: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          taskCount: z.number(),
          completedCount: z.number(),
        })
      ),
      count: z.number(),
    }),
    execute: async () => {
      try {
        const projects = await listProjects(userId);

        return {
          projects: projects.map((p) => ({
            id: p.id,
            name: p.name,
            taskCount: p.taskCount,
            completedCount: p.completedCount,
          })),
          count: projects.length,
        };
      } catch (error) {
        // Return empty list on error
        return {
          projects: [],
          count: 0,
        };
      }
    },
  });
}

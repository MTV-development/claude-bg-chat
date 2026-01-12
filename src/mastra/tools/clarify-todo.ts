import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { findTodo } from '@/lib/services/todos/find-todo';
import { updateTodo } from '@/lib/services/todos/update-todo';
import { getOrCreateProject } from '@/lib/services/projects/get-or-create-project';

/**
 * Create the clarifyTodo tool for a specific user
 */
export function createClarifyTodoTool(userId: string) {
  return createTool({
    id: 'clarifyTodo',
    description:
      'Clarify an inbox item by setting its concrete next action. ' +
      'This moves the task from inbox to active. Optionally assign to a project.',
    inputSchema: z.object({
      identifier: z
        .string()
        .describe('Task identifier - can be ID, title, or partial title match'),
      nextAction: z
        .string()
        .describe('The concrete next physical action to take on this task'),
      project: z.string().optional().describe('Project name to assign the task to'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      todo: z
        .object({
          id: z.string(),
          title: z.string(),
          nextAction: z.string(),
          status: z.string(),
          project: z.string().nullable(),
        })
        .optional(),
      error: z.string().optional(),
    }),
    execute: async ({ context }) => {
      try {
        // Find the todo
        const todo = await findTodo(userId, context.identifier);
        if (!todo) {
          return {
            success: false,
            error: `Could not find a task matching "${context.identifier}"`,
          };
        }

        // Get or create project if specified
        let projectId: string | null = todo.projectId;
        if (context.project) {
          projectId = await getOrCreateProject(userId, context.project);
        }

        // Update with nextAction and set to active
        const updated = await updateTodo(userId, todo.id, {
          nextAction: context.nextAction,
          status: 'active',
          projectId,
        });

        if (!updated) {
          return {
            success: false,
            error: 'Failed to update task',
          };
        }

        return {
          success: true,
          todo: {
            id: updated.id,
            title: updated.title,
            nextAction: context.nextAction,
            status: updated.status,
            project: context.project ?? todo.project,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to clarify todo',
        };
      }
    },
  });
}

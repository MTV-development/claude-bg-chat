import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { findTodo } from '@/lib/services/todos/find-todo';
import { deleteTodo } from '@/lib/services/todos/delete-todo';
import { deleteProjectTodos } from '@/lib/services/projects/delete-project-todos';

/**
 * Create the removeTodo tool for a specific user
 */
export function createRemoveTodoTool(userId: string) {
  return createTool({
    id: 'removeTodo',
    description:
      'Remove/delete a task or all tasks in a project. ' +
      'Either specify an identifier for a single task, or a project name to remove all tasks in that project.',
    inputSchema: z.object({
      identifier: z
        .string()
        .optional()
        .describe('Task identifier - can be ID, title, or partial title match'),
      project: z
        .string()
        .optional()
        .describe('Project name - removes all tasks in this project'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      count: z.number().optional(),
      removedTask: z.string().optional(),
      error: z.string().optional(),
    }),
    execute: async ({ context }) => {
      try {
        // Must have either identifier or project
        if (!context.identifier && !context.project) {
          return {
            success: false,
            error: 'Please specify either an identifier for a single task or a project name',
          };
        }

        // If project specified, remove all tasks in project
        if (context.project) {
          const result = await deleteProjectTodos(userId, context.project);
          if (!result) {
            return {
              success: false,
              error: `Could not find project "${context.project}"`,
            };
          }
          return {
            success: true,
            count: result.count,
          };
        }

        // Otherwise, find and remove single task
        if (context.identifier) {
          const todo = await findTodo(userId, context.identifier);
          if (!todo) {
            return {
              success: false,
              error: `Could not find a task matching "${context.identifier}"`,
            };
          }

          const deleted = await deleteTodo(userId, todo.id);
          if (!deleted) {
            return {
              success: false,
              error: 'Failed to delete task',
            };
          }

          return {
            success: true,
            count: 1,
            removedTask: todo.title,
          };
        }

        return {
          success: false,
          error: 'No identifier or project specified',
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to remove todo',
        };
      }
    },
  });
}

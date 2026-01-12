import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { findTodo } from '@/lib/services/todos/find-todo';
import { updateTodo } from '@/lib/services/todos/update-todo';

/**
 * Create the uncompleteTodo tool for a specific user
 */
export function createUncompleteTodoTool(userId: string) {
  return createTool({
    id: 'uncompleteTodo',
    description:
      'Undo completion - mark a completed task as active again. ' +
      'Use when user wants to "undo" a completion or reopen a task.',
    inputSchema: z.object({
      identifier: z
        .string()
        .describe('Task identifier - can be ID, title, or partial title match'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      todo: z
        .object({
          id: z.string(),
          title: z.string(),
          status: z.string(),
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

        // Mark as active (uncomplete)
        const updated = await updateTodo(userId, todo.id, {
          completed: false,
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
            status: updated.status,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to uncomplete todo',
        };
      }
    },
  });
}

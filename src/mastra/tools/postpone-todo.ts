import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { findTodo } from '@/lib/services/todos/find-todo';
import { postponeTodo } from '@/lib/services/todos/postpone-todo';

/**
 * Create the postponeTodo tool for a specific user
 */
export function createPostponeTodoTool(userId: string) {
  return createTool({
    id: 'postponeTodo',
    description:
      'Postpone a task by a number of days. ' +
      'Returns needsConfirmation=true if the task has been postponed 3 or more times ' +
      '(agent should ask user to confirm or reconsider the task).',
    inputSchema: z.object({
      identifier: z
        .string()
        .describe('Task identifier - can be ID, title, or partial title match'),
      days: z.number().int().positive().describe('Number of days to postpone'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      todo: z
        .object({
          id: z.string(),
          title: z.string(),
          dueDate: z.string().nullable(),
          postponeCount: z.number(),
        })
        .optional(),
      needsConfirmation: z.boolean().optional(),
      postponeCount: z.number().optional(),
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

        // Postpone the task
        const result = await postponeTodo(userId, todo.id, context.days);
        if (!result) {
          return {
            success: false,
            error: 'Failed to postpone task',
          };
        }

        return {
          success: true,
          todo: {
            id: result.todo.id,
            title: result.todo.title,
            dueDate: result.todo.dueDate,
            postponeCount: result.todo.postponeCount,
          },
          needsConfirmation: result.needsConfirmation,
          postponeCount: result.todo.postponeCount,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to postpone todo',
        };
      }
    },
  });
}

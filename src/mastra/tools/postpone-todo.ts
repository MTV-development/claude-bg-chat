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
      todo: z.object({
        id: z.string(),
        title: z.string(),
        dueDate: z.string().nullable(),
        postponeCount: z.number(),
      }),
      needsConfirmation: z.boolean(),
      postponeCount: z.number(),
    }),
    execute: async (inputData) => {
      // Find the todo
      const todo = await findTodo(userId, inputData.identifier);
      if (!todo) {
        throw new Error(`Could not find a task matching "${inputData.identifier}"`);
      }

      // Postpone the task
      const result = await postponeTodo(userId, todo.id, inputData.days);
      if (!result) {
        throw new Error('Failed to postpone task');
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
    },
  });
}

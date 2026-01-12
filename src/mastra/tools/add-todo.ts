import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createTodo } from '@/lib/services/todos/create-todo';
import { parseDate } from '@/lib/utils/date-parser';

/**
 * Create the addTodo tool for a specific user
 */
export function createAddTodoTool(userId: string) {
  return createTool({
    id: 'addTodo',
    description:
      'Add a new todo/task. Use for adding tasks, reminders, or to-do items. ' +
      'Supports flexible date formats like "today", "tomorrow", "+3 days", or "YYYY-MM-DD".',
    inputSchema: z.object({
      title: z.string().describe('The task title or description'),
      dueDate: z
        .string()
        .optional()
        .describe(
          'Due date. Use "today" for Focus/Today tab tasks. Use "tomorrow" or "+N days" for Later tab. Omit for Inbox or Optional tabs.'
        ),
      canDoAnytime: z
        .boolean()
        .optional()
        .describe(
          'Set to true for Optional tab tasks (can be done anytime, no deadline). Omit or set false otherwise.'
        ),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      todo: z
        .object({
          id: z.string(),
          title: z.string(),
          status: z.string(),
          dueDate: z.string().nullable(),
          project: z.string().nullable(),
        })
        .optional(),
      error: z.string().optional(),
    }),
    execute: async ({ context }) => {
      console.log('[addTodo] Received context:', JSON.stringify(context, null, 2));
      try {
        // Parse the due date if provided
        let parsedDueDate: string | null = null;
        if (context.dueDate) {
          parsedDueDate = parseDate(context.dueDate);
          if (!parsedDueDate) {
            return {
              success: false,
              error: `Invalid date format: "${context.dueDate}". Use "today", "tomorrow", "+N days", or "YYYY-MM-DD".`,
            };
          }
        }

        // Create the todo (no project, always active status)
        const todo = await createTodo(userId, {
          title: context.title,
          dueDate: parsedDueDate,
          projectId: null,
          status: 'active',
          canDoAnytime: context.canDoAnytime ?? false,
        });

        console.log('[addTodo] Created todo:', todo.id, 'dueDate:', todo.dueDate, 'canDoAnytime:', todo.canDoAnytime);

        return {
          success: true,
          todo: {
            id: todo.id,
            title: todo.title,
            status: todo.status,
            dueDate: todo.dueDate,
            project: null,
          },
        };
      } catch (error) {
        console.error('[addTodo] Error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create todo',
        };
      }
    },
  });
}

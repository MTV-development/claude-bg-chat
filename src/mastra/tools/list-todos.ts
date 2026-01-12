import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { listTodos, getItemTab } from '@/lib/services/todos/list-todos';
import type { TabType } from '@/lib/stores/types';

/**
 * Create the listTodos tool for a specific user
 */
export function createListTodosTool(userId: string) {
  return createTool({
    id: 'listTodos',
    description:
      'List todos/tasks. Can filter by tab (focus, optional, later, inbox, done) or project. ' +
      'Use this to show the user their current tasks or answer questions about what they have to do.',
    inputSchema: z.object({
      tab: z
        .enum(['focus', 'optional', 'later', 'inbox', 'done'])
        .optional()
        .describe(
          'Filter by tab: "focus" for due today/overdue, "optional" for anytime tasks, ' +
            '"later" for future due dates, "inbox" for items needing clarification, "done" for completed'
        ),
      project: z.string().optional().describe('Filter by project name'),
    }),
    outputSchema: z.object({
      todos: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          nextAction: z.string().nullable(),
          dueDate: z.string().nullable(),
          status: z.string(),
          project: z.string().nullable(),
          tab: z.string(),
          canDoAnytime: z.boolean(),
        })
      ),
      count: z.number(),
    }),
    execute: async ({ context }) => {
      try {
        // Get todos, optionally filtered by tab
        let todos = await listTodos(userId, context.tab as TabType | undefined);

        // Filter by project if specified
        if (context.project) {
          const projectLower = context.project.toLowerCase();
          todos = todos.filter(
            (t) => t.project && t.project.toLowerCase() === projectLower
          );
        }

        // Map to output format with tab info
        const result = todos.map((t) => ({
          id: t.id,
          title: t.title,
          nextAction: t.nextAction,
          dueDate: t.dueDate,
          status: t.status,
          project: t.project,
          tab: getItemTab(t),
          canDoAnytime: t.canDoAnytime,
        }));

        return {
          todos: result,
          count: result.length,
        };
      } catch (error) {
        // Return empty list on error (don't want to break the agent)
        return {
          todos: [],
          count: 0,
        };
      }
    },
  });
}

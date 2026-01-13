import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { findTodo } from '@/lib/services/todos/find-todo';
import { updateTodo } from '@/lib/services/todos/update-todo';
import { getOrCreateProject } from '@/lib/services/projects/get-or-create-project';
import { parseDate } from '@/lib/utils/date-parser';

/**
 * Create the updateTodo tool for a specific user
 */
export function createUpdateTodoTool(userId: string) {
  return createTool({
    id: 'updateTodo',
    description:
      'Update any properties of an existing task. ' +
      'Can update title, next action, due date, project, status, or canDoAnytime. ' +
      'Use null to clear optional fields like dueDate or project.',
    inputSchema: z.object({
      identifier: z
        .string()
        .describe('Task identifier - can be ID, title, or partial title match'),
      title: z.string().optional().describe('New title for the task'),
      nextAction: z.string().optional().describe('New concrete next action'),
      dueDate: z
        .string()
        .nullable()
        .optional()
        .describe(
          'New due date - supports "today", "tomorrow", "+N days", "YYYY-MM-DD", or null to clear'
        ),
      project: z
        .string()
        .nullable()
        .optional()
        .describe('New project name, or null to remove from project'),
      status: z
        .enum(['inbox', 'active', 'someday', 'done'])
        .optional()
        .describe('New status'),
      canDoAnytime: z
        .boolean()
        .optional()
        .describe('If true, task can be done anytime (no deadline pressure)'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      todo: z.object({
        id: z.string(),
        title: z.string(),
        nextAction: z.string().nullable(),
        status: z.string(),
        dueDate: z.string().nullable(),
        project: z.string().nullable(),
        canDoAnytime: z.boolean(),
      }),
    }),
    execute: async (inputData) => {
      // Find the todo
      const todo = await findTodo(userId, inputData.identifier);
      if (!todo) {
        throw new Error(`Could not find a task matching "${inputData.identifier}"`);
      }

      // Build update payload
      const updates: Parameters<typeof updateTodo>[2] = {};

      if (inputData.title !== undefined) {
        updates.title = inputData.title;
      }

      if (inputData.nextAction !== undefined) {
        updates.nextAction = inputData.nextAction;
      }

      if (inputData.dueDate !== undefined) {
        if (inputData.dueDate === null) {
          updates.dueDate = null;
        } else {
          const parsed = parseDate(inputData.dueDate);
          if (!parsed) {
            throw new Error(
              `Invalid date format: "${inputData.dueDate}". Use "today", "tomorrow", "+N days", or "YYYY-MM-DD".`
            );
          }
          updates.dueDate = parsed;
        }
      }

      if (inputData.project !== undefined) {
        if (inputData.project === null) {
          updates.projectId = null;
        } else {
          updates.projectId = await getOrCreateProject(userId, inputData.project);
        }
      }

      if (inputData.status !== undefined) {
        updates.status = inputData.status;
      }

      if (inputData.canDoAnytime !== undefined) {
        updates.canDoAnytime = inputData.canDoAnytime;
      }

      // Perform the update
      const updated = await updateTodo(userId, todo.id, updates);
      if (!updated) {
        throw new Error('Failed to update task');
      }

      return {
        success: true,
        todo: {
          id: updated.id,
          title: updated.title,
          nextAction: updated.nextAction,
          status: updated.status,
          dueDate: updated.dueDate,
          project: inputData.project !== undefined ? inputData.project : todo.project,
          canDoAnytime: updated.canDoAnytime,
        },
      };
    },
  });
}

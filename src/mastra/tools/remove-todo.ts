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
      count: z.number(),
      removedTask: z.string().optional(),
    }),
    execute: async (inputData) => {
      // Must have either identifier or project
      if (!inputData.identifier && !inputData.project) {
        throw new Error('Please specify either an identifier for a single task or a project name');
      }

      // If project specified, remove all tasks in project
      if (inputData.project) {
        const result = await deleteProjectTodos(userId, inputData.project);
        if (!result) {
          throw new Error(`Could not find project "${inputData.project}"`);
        }
        return {
          success: true,
          count: result.count,
        };
      }

      // Otherwise, find and remove single task
      if (inputData.identifier) {
        const todo = await findTodo(userId, inputData.identifier);
        if (!todo) {
          throw new Error(`Could not find a task matching "${inputData.identifier}"`);
        }

        const deleted = await deleteTodo(userId, todo.id);
        if (!deleted) {
          throw new Error('Failed to delete task');
        }

        return {
          success: true,
          count: 1,
          removedTask: todo.title,
        };
      }

      throw new Error('No identifier or project specified');
    },
  });
}

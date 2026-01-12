/**
 * Remove Command
 *
 * Removes a todo item or all items in a project
 *
 * Usage:
 *   remove <id|title>
 *   remove --project "Project Name"
 */

import { findTodo, deleteTodo, deleteProjectTodosCmd, parseArgs } from '../lib/store';
import { CommandResult } from '../lib/types';

export async function remove(args: string[]): Promise<CommandResult> {
  const { positional, flags } = parseArgs(args);
  const query = positional.join(' ').trim();
  const projectName = flags.project;

  try {
    // Remove all tasks in a project
    if (projectName) {
      const result = await deleteProjectTodosCmd(projectName);

      if (!result) {
        return {
          success: false,
          error: `No project found: "${projectName}"`,
        };
      }

      if (result.count === 0) {
        return {
          success: true,
          items: [],
          count: 0,
        };
      }

      return {
        success: true,
        items: result.items,
        count: result.count,
      };
    }

    // Remove single item
    if (!query) {
      return {
        success: false,
        error: 'Please specify an item ID or title to remove',
      };
    }

    // Find the item first
    const found = await findTodo(query);
    if (!found) {
      return {
        success: false,
        error: `Item not found: "${query}"`,
      };
    }

    // Delete it using its ID
    const deleted = await deleteTodo(found.id);
    if (!deleted) {
      return {
        success: false,
        error: `Failed to remove item: "${query}"`,
      };
    }

    return {
      success: true,
      removed: found,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove todo',
    };
  }
}

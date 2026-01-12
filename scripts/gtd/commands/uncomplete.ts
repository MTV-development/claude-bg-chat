/**
 * Uncomplete Command
 *
 * Marks a completed todo item as pending again
 *
 * Usage:
 *   uncomplete <id|title>
 */

import { findTodo, uncompleteTodo, parseArgs, getItemTab } from '../lib/store';
import { CommandResult } from '../lib/types';

export async function uncomplete(args: string[]): Promise<CommandResult> {
  const { positional } = parseArgs(args);
  const query = positional.join(' ').trim();

  if (!query) {
    return {
      success: false,
      error: 'Please specify an item ID or title to uncomplete',
    };
  }

  try {
    // Find the item first
    const found = await findTodo(query);
    if (!found) {
      return {
        success: false,
        error: `Item not found: "${query}"`,
      };
    }

    // Uncomplete it using its ID
    const item = await uncompleteTodo(found.id);
    if (!item) {
      return {
        success: false,
        error: `Failed to uncomplete item: "${query}"`,
      };
    }

    return {
      success: true,
      item,
      tab: getItemTab(item),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to uncomplete todo',
    };
  }
}

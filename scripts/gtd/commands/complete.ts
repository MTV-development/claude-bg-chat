/**
 * Complete Command
 *
 * Marks a todo item as complete
 *
 * Usage:
 *   complete <id|title>
 */

import { findTodo, completeTodo, parseArgs, getItemTab } from '../lib/store';
import { CommandResult } from '../lib/types';

export async function complete(args: string[]): Promise<CommandResult> {
  const { positional } = parseArgs(args);
  const query = positional.join(' ').trim();

  if (!query) {
    return {
      success: false,
      error: 'Please specify an item ID or title to complete',
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

    // Complete it using its ID
    const item = await completeTodo(found.id);
    if (!item) {
      return {
        success: false,
        error: `Failed to complete item: "${query}"`,
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
      error: error instanceof Error ? error.message : 'Failed to complete todo',
    };
  }
}

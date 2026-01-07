/**
 * Uncomplete Command
 *
 * Marks a todo item as not complete
 *
 * Usage:
 *   uncomplete <id|title>
 */

import { loadTodos, saveTodos, findItem, parseArgs } from '../lib/store';
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

  const data = await loadTodos();
  const item = findItem(data.items, query);

  if (!item) {
    return {
      success: false,
      error: `Item not found: "${query}"`,
    };
  }

  // Mark as not complete
  item.completed = false;
  item.completedAt = null;

  await saveTodos(data);

  return {
    success: true,
    item,
  };
}

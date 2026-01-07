/**
 * Remove Command
 *
 * Removes a todo item
 *
 * Usage:
 *   remove <id|title>
 */

import { loadTodos, saveTodos, findItem, parseArgs } from '../lib/store';
import { CommandResult } from '../lib/types';

export async function remove(args: string[]): Promise<CommandResult> {
  const { positional } = parseArgs(args);
  const query = positional.join(' ').trim();

  if (!query) {
    return {
      success: false,
      error: 'Please specify an item ID or title to remove',
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

  // Remove from array
  const index = data.items.findIndex(i => i.id === item.id);
  data.items.splice(index, 1);

  await saveTodos(data);

  return {
    success: true,
    removed: item,
  };
}

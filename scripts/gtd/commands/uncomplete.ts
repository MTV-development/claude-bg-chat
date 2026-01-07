/**
 * Uncomplete Command
 *
 * Marks a completed todo item as pending again
 *
 * Usage:
 *   uncomplete <id|title>
 */

import { loadTodos, saveTodos, findItem, parseArgs, logActivity, getItemTab } from '../lib/store';
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

  // Update status and completed fields
  item.completed = false;
  item.status = 'active';
  item.completedAt = null;

  logActivity(data, item.id, 'uncompleted');
  await saveTodos(data);

  return {
    success: true,
    item,
    tab: getItemTab(item),
  };
}

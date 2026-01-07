/**
 * Complete Command
 *
 * Marks a todo item as complete
 *
 * Usage:
 *   complete <id|title>
 */

import { loadTodos, saveTodos, findItem, parseArgs, logActivity, getItemTab } from '../lib/store';
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

  const data = await loadTodos();
  const item = findItem(data.items, query);

  if (!item) {
    return {
      success: false,
      error: `Item not found: "${query}"`,
    };
  }

  // Update status and completed fields
  item.completed = true;
  item.status = 'done';
  item.completedAt = new Date().toISOString();

  logActivity(data, item.id, 'completed');
  await saveTodos(data);

  return {
    success: true,
    item,
    tab: getItemTab(item),
  };
}

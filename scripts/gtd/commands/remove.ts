/**
 * Remove Command
 *
 * Removes a todo item or all items in a project
 *
 * Usage:
 *   remove <id|title>
 *   remove --project "Project Name"
 */

import { loadTodos, saveTodos, findItem, parseArgs, logActivity } from '../lib/store';
import { CommandResult, TodoItem } from '../lib/types';

export async function remove(args: string[]): Promise<CommandResult> {
  const { positional, flags } = parseArgs(args);
  const query = positional.join(' ').trim();
  const projectName = flags.project;

  // Remove all tasks in a project
  if (projectName) {
    const data = await loadTodos();
    const projectItems = data.items.filter(i => i.project === projectName);

    if (projectItems.length === 0) {
      return {
        success: false,
        error: `No project found: "${projectName}"`,
      };
    }

    // Remove all items in the project
    const removedItems: TodoItem[] = [];
    for (const item of projectItems) {
      const index = data.items.findIndex(i => i.id === item.id);
      if (index !== -1) {
        data.items.splice(index, 1);
        logActivity(data, item.id, 'deleted');
        removedItems.push(item);
      }
    }

    await saveTodos(data);

    return {
      success: true,
      items: removedItems,
      count: removedItems.length,
    };
  }

  // Remove single item
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

  logActivity(data, item.id, 'deleted');
  await saveTodos(data);

  return {
    success: true,
    removed: item,
  };
}

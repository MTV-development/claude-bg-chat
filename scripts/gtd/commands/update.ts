/**
 * Update Command
 *
 * Updates a todo item's properties
 *
 * Usage:
 *   update <id> [--title "..."] [--priority high|medium|low] [--due YYYY-MM-DD|today|tomorrow]
 */

import { loadTodos, saveTodos, findItem, parseDate, parseArgs } from '../lib/store';
import { CommandResult } from '../lib/types';

export async function update(args: string[]): Promise<CommandResult> {
  const { flags, positional } = parseArgs(args);
  const query = positional.join(' ').trim();

  if (!query) {
    return {
      success: false,
      error: 'Please specify an item ID to update',
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

  // Update title if provided
  if (flags.title) {
    item.title = flags.title;
  }

  // Update priority if provided
  if (flags.priority) {
    if (!['high', 'medium', 'low'].includes(flags.priority)) {
      return {
        success: false,
        error: 'Priority must be high, medium, or low',
      };
    }
    item.priority = flags.priority as 'high' | 'medium' | 'low';
  }

  // Update due date if provided
  if (flags.due) {
    const dueDate = parseDate(flags.due);
    if (!dueDate) {
      return {
        success: false,
        error: 'Invalid due date. Use YYYY-MM-DD, "today", or "tomorrow"',
      };
    }
    item.dueDate = dueDate;
  }

  // Clear due date if --due is explicitly set to empty or "none"
  if (flags.due === 'none' || flags.due === 'clear') {
    item.dueDate = null;
  }

  await saveTodos(data);

  return {
    success: true,
    item,
  };
}

/**
 * Update Command
 *
 * Updates a todo item's properties
 *
 * Usage:
 *   update <id> [--title "..."] [--priority high|medium|low] [--due YYYY-MM-DD|today|tomorrow]
 *               [--project "..."] [--status inbox|active|someday] [--next-action "..."]
 */

import { loadTodos, saveTodos, findItem, parseDate, parseArgs, getItemTab } from '../lib/store';
import { CommandResult, ItemStatus } from '../lib/types';

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

  // Update nextAction if provided
  if (flags['next-action']) {
    item.nextAction = flags['next-action'];
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
    if (flags.due === 'none' || flags.due === 'clear') {
      item.dueDate = null;
    } else {
      const dueDate = parseDate(flags.due);
      if (!dueDate) {
        return {
          success: false,
          error: 'Invalid due date. Use YYYY-MM-DD, "today", or "tomorrow"',
        };
      }
      item.dueDate = dueDate;
    }
  }

  // Update project if provided
  if (flags.project !== undefined) {
    item.project = flags.project === 'none' || flags.project === 'clear' ? null : flags.project;
  }

  // Update status if provided
  if (flags.status) {
    if (!['inbox', 'active', 'someday', 'done'].includes(flags.status)) {
      return {
        success: false,
        error: 'Status must be inbox, active, someday, or done',
      };
    }
    item.status = flags.status as ItemStatus;
    // Keep completed in sync
    item.completed = flags.status === 'done';
    if (flags.status === 'done' && !item.completedAt) {
      item.completedAt = new Date().toISOString();
    } else if (flags.status !== 'done') {
      item.completedAt = null;
    }
  }

  await saveTodos(data);

  return {
    success: true,
    item,
    tab: getItemTab(item),
  };
}

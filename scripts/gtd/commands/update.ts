/**
 * Update Command
 *
 * Updates a todo item's properties
 *
 * Usage:
 *   update <id> [--title "..."] [--due YYYY-MM-DD|today|tomorrow]
 *               [--project "..."] [--status inbox|active|someday] [--next-action "..."]
 *               [--can-do-anytime true|false]
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

  // Update canDoAnytime if provided
  if (flags['can-do-anytime'] !== undefined) {
    item.canDoAnytime = flags['can-do-anytime'] === 'true';
  }

  await saveTodos(data);

  return {
    success: true,
    item,
    tab: getItemTab(item),
  };
}

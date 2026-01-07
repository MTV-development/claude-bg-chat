/**
 * Postpone Command
 *
 * Postpones a task by moving its due date forward
 *
 * Usage:
 *   postpone <id|title> --days N
 *   postpone <id|title> --days 1    # Tomorrow
 *   postpone <id|title> --days 7    # Next week
 */

import { loadTodos, saveTodos, findItem, parseArgs, logActivity, getLocalDateString, getItemTab } from '../lib/store';
import { CommandResult } from '../lib/types';

export async function postpone(args: string[]): Promise<CommandResult> {
  const { flags, positional } = parseArgs(args);
  const query = positional.join(' ').trim();

  if (!query) {
    return {
      success: false,
      error: 'Please specify an item ID or title to postpone',
    };
  }

  const daysStr = flags.days;
  if (!daysStr) {
    return {
      success: false,
      error: 'Please specify --days N (e.g., --days 1 for tomorrow)',
    };
  }

  const days = parseInt(daysStr, 10);
  if (isNaN(days) || days < 1) {
    return {
      success: false,
      error: 'Days must be a positive number',
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

  // Calculate new due date
  const oldDate = item.dueDate;
  const newDate = new Date();
  newDate.setDate(newDate.getDate() + days);
  item.dueDate = getLocalDateString(newDate);

  // Increment postpone count
  item.postponeCount++;

  logActivity(data, item.id, 'postponed', {
    fromDate: oldDate || 'none',
    toDate: item.dueDate,
  });

  await saveTodos(data);

  // Build response with warning if postponed too many times
  const result: CommandResult = {
    success: true,
    item,
    tab: getItemTab(item),
  };

  if (item.postponeCount >= 3) {
    result.warning = `This task has been postponed ${item.postponeCount} times. Consider removing it or breaking it down.`;
  }

  return result;
}

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

import { findTodo, postponeTodo, parseArgs, getItemTab } from '../lib/store';
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

  try {
    // Find the item first
    const found = await findTodo(query);
    if (!found) {
      return {
        success: false,
        error: `Item not found: "${query}"`,
      };
    }

    // Postpone it using its ID
    const result = await postponeTodo(found.id, days);
    if (!result) {
      return {
        success: false,
        error: `Failed to postpone item: "${query}"`,
      };
    }

    return {
      success: true,
      item: result.item,
      tab: getItemTab(result.item),
      warning: result.warning,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to postpone todo',
    };
  }
}

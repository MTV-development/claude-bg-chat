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

import { findTodo, updateTodo, parseDate, parseArgs, getItemTab } from '../lib/store';
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

  try {
    // Find the item first
    const found = await findTodo(query);
    if (!found) {
      return {
        success: false,
        error: `Item not found: "${query}"`,
      };
    }

    // Build update input
    const updateInput: {
      title?: string;
      nextAction?: string;
      dueDate?: string | null;
      project?: string | null;
      status?: 'inbox' | 'active' | 'someday' | 'done';
      canDoAnytime?: boolean;
    } = {};

    // Update title if provided
    if (flags.title) {
      updateInput.title = flags.title;
    }

    // Update nextAction if provided
    if (flags['next-action']) {
      updateInput.nextAction = flags['next-action'];
    }

    // Update due date if provided
    if (flags.due) {
      if (flags.due === 'none' || flags.due === 'clear') {
        updateInput.dueDate = null;
      } else {
        const dueDate = parseDate(flags.due);
        if (!dueDate) {
          return {
            success: false,
            error: 'Invalid due date. Use YYYY-MM-DD, "today", or "tomorrow"',
          };
        }
        updateInput.dueDate = dueDate;
      }
    }

    // Update project if provided
    if (flags.project !== undefined) {
      updateInput.project = flags.project === 'none' || flags.project === 'clear' ? null : flags.project;
    }

    // Update status if provided
    if (flags.status) {
      if (!['inbox', 'active', 'someday', 'done'].includes(flags.status)) {
        return {
          success: false,
          error: 'Status must be inbox, active, someday, or done',
        };
      }
      updateInput.status = flags.status as ItemStatus;
    }

    // Update canDoAnytime if provided
    if (flags['can-do-anytime'] !== undefined) {
      updateInput.canDoAnytime = flags['can-do-anytime'] === 'true';
    }

    const item = await updateTodo(found.id, updateInput);
    if (!item) {
      return {
        success: false,
        error: `Failed to update item: "${query}"`,
      };
    }

    return {
      success: true,
      item,
      tab: getItemTab(item),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update todo',
    };
  }
}

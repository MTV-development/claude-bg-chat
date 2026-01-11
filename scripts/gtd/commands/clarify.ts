/**
 * Clarify Command
 *
 * Sets the next action for an inbox item, moving it to active status
 *
 * Usage:
 *   clarify <id|title> --next-action "Concrete next step"
 *   clarify <id|title> --next-action "..." [--project "Project Name"]
 */

import { findTodo, updateTodo, parseArgs, getItemTab } from '../lib/store';
import { CommandResult } from '../lib/types';

export async function clarify(args: string[]): Promise<CommandResult> {
  const { flags, positional } = parseArgs(args);
  const query = positional.join(' ').trim();

  if (!query) {
    return {
      success: false,
      error: 'Please specify an item ID or title to clarify',
    };
  }

  const nextAction = flags['next-action'];
  if (!nextAction) {
    return {
      success: false,
      error: 'Please specify --next-action "Concrete next step"',
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
      nextAction: string;
      status: 'active';
      project?: string;
    } = {
      nextAction,
      status: 'active',
    };

    // Optionally set project
    if (flags.project) {
      updateInput.project = flags.project;
    }

    const item = await updateTodo(found.id, updateInput);
    if (!item) {
      return {
        success: false,
        error: `Failed to clarify item: "${query}"`,
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
      error: error instanceof Error ? error.message : 'Failed to clarify todo',
    };
  }
}

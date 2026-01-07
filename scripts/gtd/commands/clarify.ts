/**
 * Clarify Command
 *
 * Sets the next action for an inbox item, moving it to active status
 *
 * Usage:
 *   clarify <id|title> --next-action "Concrete next step"
 *   clarify <id|title> --next-action "..." [--project "Project Name"]
 */

import { loadTodos, saveTodos, findItem, parseArgs, logActivity, getItemTab } from '../lib/store';
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

  const data = await loadTodos();
  const item = findItem(data.items, query);

  if (!item) {
    return {
      success: false,
      error: `Item not found: "${query}"`,
    };
  }

  // Set the next action and move to active
  const oldStatus = item.status;
  item.nextAction = nextAction;
  item.status = 'active';

  // Optionally set project
  if (flags.project) {
    item.project = flags.project;
  }

  logActivity(data, item.id, 'clarified', {
    oldValue: oldStatus,
    newValue: 'active',
  });

  await saveTodos(data);

  return {
    success: true,
    item,
    tab: getItemTab(item),
  };
}

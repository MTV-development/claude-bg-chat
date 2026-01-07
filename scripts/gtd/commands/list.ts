/**
 * List Command
 *
 * Lists todo items with optional filters
 *
 * Usage:
 *   list [--completed] [--pending] [--priority high|medium|low]
 */

import { loadTodos, parseArgs } from '../lib/store';
import { CommandResult, TodoItem } from '../lib/types';

export async function list(args: string[]): Promise<CommandResult> {
  const { flags } = parseArgs(args);

  const data = await loadTodos();
  let items: TodoItem[] = data.items;

  // Filter by completion status
  if (flags.completed === 'true') {
    items = items.filter(item => item.completed);
  } else if (flags.pending === 'true') {
    items = items.filter(item => !item.completed);
  }

  // Filter by priority
  if (flags.priority) {
    items = items.filter(item => item.priority === flags.priority);
  }

  return {
    success: true,
    items,
    count: items.length,
  };
}

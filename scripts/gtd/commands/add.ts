/**
 * Add Command
 *
 * Adds a new todo item
 *
 * Usage:
 *   add <title> [--due YYYY-MM-DD|today|tomorrow] [--project "Project Name"]
 *               [--status inbox|active] [--can-do-anytime]
 */

import { loadTodos, saveTodos, generateId, parseDate, parseArgs, logActivity, getItemTab } from '../lib/store';
import { CommandResult, TodoItem, ItemStatus } from '../lib/types';

export async function add(args: string[]): Promise<CommandResult> {
  const { flags, positional } = parseArgs(args);

  // Title is required
  const title = positional.join(' ').trim();
  if (!title) {
    return {
      success: false,
      error: 'Title is required. Usage: add "Task title" [--due tomorrow]',
    };
  }

  // Parse due date
  const dueDate = flags.due ? parseDate(flags.due) : null;
  if (flags.due && !dueDate) {
    return {
      success: false,
      error: 'Invalid due date. Use YYYY-MM-DD, "today", or "tomorrow"',
    };
  }

  // Parse project
  const project = flags.project || null;

  // Parse canDoAnytime flag
  const canDoAnytime = flags['can-do-anytime'] === 'true';

  // Parse status (default: active if clear action, inbox if vague)
  let status: ItemStatus = 'active';
  if (flags.status) {
    if (!['inbox', 'active', 'someday'].includes(flags.status)) {
      return {
        success: false,
        error: 'Status must be inbox, active, or someday',
      };
    }
    status = flags.status as ItemStatus;
  }

  // Create new item
  const item: TodoItem = {
    id: generateId(),
    title,
    nextAction: status === 'inbox' ? null : title,
    status,
    completed: false,
    project,
    dueDate,
    canDoAnytime,
    createdAt: new Date().toISOString(),
    completedAt: null,
    postponeCount: 0,
  };

  // Load, add, save
  const data = await loadTodos();
  data.items.push(item);
  logActivity(data, item.id, 'created');
  await saveTodos(data);

  return {
    success: true,
    item,
    tab: getItemTab(item),
  };
}

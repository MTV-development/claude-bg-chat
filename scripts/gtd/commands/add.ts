/**
 * Add Command
 *
 * Adds a new todo item
 *
 * Usage:
 *   add <title> [--priority high|medium|low] [--due YYYY-MM-DD|today|tomorrow] [--tags tag1,tag2]
 *               [--project "Project Name"] [--status inbox|active]
 *               [--has-deadline] [--can-do-anytime]
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
      error: 'Title is required. Usage: add "Task title" [--priority high] [--due tomorrow]',
    };
  }

  // Parse priority
  const priority = (flags.priority as 'high' | 'medium' | 'low') || 'medium';
  if (!['high', 'medium', 'low'].includes(priority)) {
    return {
      success: false,
      error: 'Priority must be high, medium, or low',
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

  // Parse tags
  const tags = flags.tags ? flags.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  // Parse project
  const project = flags.project || null;

  // Parse hasDeadline flag (defaults to true if dueDate is provided)
  const hasDeadline = flags['has-deadline'] === 'true' || (dueDate !== null && flags['has-deadline'] !== 'false');

  // Parse canDoAnytime flag
  const canDoAnytime = flags['can-do-anytime'] === 'true';

  // Parse status (default: active if clear action, inbox if vague)
  // For now, default to 'active' since the item has a clear title
  // Inbox should be used explicitly or via smart routing in the skill
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

  // Create new item with v3 fields
  const item: TodoItem = {
    id: generateId(),
    title,
    nextAction: status === 'inbox' ? null : title,  // Clear items get title as nextAction
    status,
    completed: false,
    priority,
    project,
    dueDate,
    hasDeadline,
    canDoAnytime,
    createdAt: new Date().toISOString(),
    completedAt: null,
    postponeCount: 0,
    tags,
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

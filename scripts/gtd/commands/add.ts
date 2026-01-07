/**
 * Add Command
 *
 * Adds a new todo item
 *
 * Usage:
 *   add <title> [--priority high|medium|low] [--due YYYY-MM-DD|today|tomorrow] [--tags tag1,tag2]
 */

import { loadTodos, saveTodos, generateId, parseDate, parseArgs } from '../lib/store';
import { CommandResult, TodoItem } from '../lib/types';

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

  // Create new item
  const item: TodoItem = {
    id: generateId(),
    title,
    completed: false,
    priority,
    dueDate,
    createdAt: new Date().toISOString(),
    completedAt: null,
    tags,
  };

  // Load, add, save
  const data = await loadTodos();
  data.items.push(item);
  await saveTodos(data);

  return {
    success: true,
    item,
  };
}

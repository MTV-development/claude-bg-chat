/**
 * GTD Store Module
 *
 * Single source of truth for reading/writing todos.json
 * Handles migration from v1 to v2 automatically
 */

import { promises as fs } from 'fs';
import path from 'path';
import { TodoData, TodoItem, ActivityLogEntry, TabType, createEmptyTodoData } from './types';
import { ensureV2 } from './migrate';

const DATA_FILE = path.join(process.cwd(), 'data', 'todos.json');

/**
 * Load todos from data file (auto-migrates to v2)
 */
export async function loadTodos(filePath: string = DATA_FILE): Promise<TodoData> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const rawData = JSON.parse(content);
    // Auto-migrate to v2 if needed
    return ensureV2(rawData);
  } catch (error: unknown) {
    // Check for file not found error
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      // File doesn't exist, return empty v2 structure
      return createEmptyTodoData();
    }
    throw error;
  }
}

/**
 * Save todos to data file
 */
export async function saveTodos(data: TodoData, filePath: string = DATA_FILE): Promise<void> {
  const updated: TodoData = {
    ...data,
    version: '2.0',
    lastModified: new Date().toISOString(),
  };
  await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
}

/**
 * Generate a unique 8-character hex ID
 */
export function generateId(): string {
  return Math.random().toString(16).substring(2, 10);
}

/**
 * Find an item by ID or title (partial match)
 */
export function findItem(items: TodoItem[], query: string): TodoItem | undefined {
  // Try exact ID match first
  const byId = items.find(item => item.id === query);
  if (byId) return byId;

  // Try exact title match
  const byExactTitle = items.find(item => item.title.toLowerCase() === query.toLowerCase());
  if (byExactTitle) return byExactTitle;

  // Try exact nextAction match
  const byExactNextAction = items.find(item =>
    item.nextAction && item.nextAction.toLowerCase() === query.toLowerCase()
  );
  if (byExactNextAction) return byExactNextAction;

  // Try partial title match
  const byPartialTitle = items.find(item =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );
  if (byPartialTitle) return byPartialTitle;

  // Try partial nextAction match
  const byPartialNextAction = items.find(item =>
    item.nextAction && item.nextAction.toLowerCase().includes(query.toLowerCase())
  );
  return byPartialNextAction;
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string (supports YYYY-MM-DD, "today", "tomorrow", "+N days")
 */
export function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const lower = dateStr.toLowerCase().trim();

  if (lower === 'today') {
    return getLocalDateString();
  }

  if (lower === 'tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getLocalDateString(tomorrow);
  }

  // Support "+N" or "+N days" format
  const daysMatch = lower.match(/^\+(\d+)(?:\s*days?)?$/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    const future = new Date();
    future.setDate(future.getDate() + days);
    return getLocalDateString(future);
  }

  // Check if it's a valid YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  return null;
}

/**
 * Parse command-line arguments into flags and positional args
 */
export function parseArgs(args: string[]): { flags: Record<string, string>; positional: string[] } {
  const flags: Record<string, string> = {};
  const positional: string[] = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        flags[key] = nextArg;
        i += 2;
      } else {
        flags[key] = 'true';
        i += 1;
      }
    } else {
      positional.push(arg);
      i += 1;
    }
  }

  return { flags, positional };
}

/**
 * Log an activity
 */
export function logActivity(
  data: TodoData,
  itemId: string,
  action: ActivityLogEntry['action'],
  details: ActivityLogEntry['details'] = {}
): void {
  const entry: ActivityLogEntry = {
    id: generateId(),
    itemId,
    action,
    timestamp: new Date().toISOString(),
    details,
  };
  data.activityLog.push(entry);

  // Keep last 1000 entries
  if (data.activityLog.length > 1000) {
    data.activityLog = data.activityLog.slice(-1000);
  }
}

/**
 * Determine which tab an item belongs to
 */
export function getItemTab(item: TodoItem): TabType {
  const today = getLocalDateString();

  if (item.status === 'done') {
    return 'done';
  }

  if (item.status === 'inbox' || !item.nextAction) {
    return 'inbox';
  }

  if (item.status === 'someday') {
    return 'optional';
  }

  // Active items: check due date for focus vs optional
  if (item.dueDate && item.dueDate <= today) {
    return 'focus';
  }

  return 'optional';
}

/**
 * Filter items by tab
 */
export function filterByTab(items: TodoItem[], tab: TabType): TodoItem[] {
  const today = getLocalDateString();

  switch (tab) {
    case 'focus':
      // Due today or overdue, has nextAction, active
      return items.filter(i =>
        i.status === 'active' &&
        i.nextAction &&
        i.dueDate &&
        i.dueDate <= today
      );

    case 'optional':
      // Has nextAction, future or no deadline, or someday
      return items.filter(i =>
        (i.status === 'active' || i.status === 'someday') &&
        i.nextAction &&
        (!i.dueDate || i.dueDate > today)
      );

    case 'inbox':
      // Needs clarification (no nextAction or inbox status)
      return items.filter(i => i.status === 'inbox' || !i.nextAction);

    case 'done':
      return items.filter(i => i.status === 'done');

    case 'projects':
      // Return active items grouped by project (handled separately)
      return items.filter(i => i.status === 'active' && i.project);

    default:
      // Default: all non-done items
      return items.filter(i => i.status !== 'done');
  }
}

/**
 * Get unique projects from items
 */
export function getProjects(items: TodoItem[]): Array<{
  name: string;
  taskCount: number;
  completedCount: number;
  hasNextAction: boolean;
}> {
  const projectMap = new Map<string, {
    total: number;
    completed: number;
    hasNextAction: boolean;
  }>();

  for (const item of items) {
    if (item.project) {
      const existing = projectMap.get(item.project) || {
        total: 0,
        completed: 0,
        hasNextAction: false,
      };
      existing.total++;
      if (item.status === 'done') {
        existing.completed++;
      }
      if (item.nextAction && item.status === 'active') {
        existing.hasNextAction = true;
      }
      projectMap.set(item.project, existing);
    }
  }

  return Array.from(projectMap.entries()).map(([name, stats]) => ({
    name,
    taskCount: stats.total,
    completedCount: stats.completed,
    hasNextAction: stats.hasNextAction,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

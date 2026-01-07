/**
 * GTD Store Module
 *
 * Single source of truth for reading/writing todos.json
 */

import { promises as fs } from 'fs';
import path from 'path';
import { TodoData, TodoItem } from './types';

const DATA_FILE = path.join(process.cwd(), 'data', 'todos.json');

const EMPTY_DATA: TodoData = {
  version: '1.0',
  lastModified: new Date().toISOString(),
  items: [],
};

/**
 * Load todos from data file
 */
export async function loadTodos(filePath: string = DATA_FILE): Promise<TodoData> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as TodoData;
    return data;
  } catch (error: unknown) {
    // Check for file not found error
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      // File doesn't exist, return empty structure
      return { ...EMPTY_DATA, lastModified: new Date().toISOString() };
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

  // Try partial title match
  const byPartialTitle = items.find(item =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );
  return byPartialTitle;
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
 * Parse a date string (supports YYYY-MM-DD, "today", "tomorrow")
 */
export function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const lower = dateStr.toLowerCase();

  if (lower === 'today') {
    return getLocalDateString();
  }

  if (lower === 'tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getLocalDateString(tomorrow);
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

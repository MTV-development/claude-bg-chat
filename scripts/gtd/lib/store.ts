/**
 * GTD Store Module
 *
 * This module provides the interface for GTD CLI commands.
 * It uses Supabase services for data persistence.
 *
 * Requires GTD_USER_ID environment variable to be set.
 */

import { createTodo as createTodoService, type CreateTodoInput } from '@/lib/services/todos/create-todo';
import { listTodos as listTodosService, getItemTab as getItemTabService } from '@/lib/services/todos/list-todos';
import { updateTodo as updateTodoService, type UpdateTodoInput } from '@/lib/services/todos/update-todo';
import { deleteTodo as deleteTodoService } from '@/lib/services/todos/delete-todo';
import { postponeTodo as postponeTodoService } from '@/lib/services/todos/postpone-todo';
import { findTodo as findTodoService, type FoundTodo } from '@/lib/services/todos/find-todo';
import { getOrCreateProject } from '@/lib/services/projects/get-or-create-project';
import { listProjects as listProjectsService } from '@/lib/services/projects/list-projects';
import { deleteProjectTodos } from '@/lib/services/projects/delete-project-todos';
import { TodoItem, TabType, CommandResult } from './types';

/**
 * Get the current user ID from environment variable
 */
export function getUserId(): string {
  const userId = process.env.GTD_USER_ID;
  if (!userId) {
    throw new Error('GTD_USER_ID environment variable is required');
  }
  return userId;
}

/**
 * Convert a service todo to CLI TodoItem format
 */
function toTodoItem(todo: FoundTodo | Awaited<ReturnType<typeof listTodosService>>[number]): TodoItem {
  return {
    id: todo.id,
    title: todo.title,
    nextAction: todo.nextAction,
    status: todo.status,
    completed: todo.completed,
    project: todo.project ?? null,
    dueDate: todo.dueDate,
    canDoAnytime: todo.canDoAnytime,
    createdAt: todo.createdAt,
    completedAt: todo.completedAt,
    postponeCount: todo.postponeCount,
  };
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
 * Determine which tab an item belongs to
 */
export function getItemTab(item: TodoItem): TabType {
  return getItemTabService(item);
}

/**
 * Filter items by tab
 */
export function filterByTab(items: TodoItem[], tab: TabType): TodoItem[] {
  return items.filter((item) => getItemTab(item) === tab);
}

/**
 * Add a new todo
 */
export async function addTodo(input: {
  title: string;
  dueDate?: string | null;
  canDoAnytime?: boolean;
  project?: string | null;
  status?: 'inbox' | 'active';
}): Promise<TodoItem> {
  const userId = getUserId();

  // If project name is provided, get or create the project
  let projectId: string | null = null;
  if (input.project) {
    projectId = await getOrCreateProject(userId, input.project);
  }

  const created = await createTodoService(userId, {
    title: input.title,
    dueDate: input.dueDate,
    canDoAnytime: input.canDoAnytime,
    projectId,
    status: input.status,
  });

  // Fetch the todo with project name
  const found = await findTodoService(userId, created.id);
  return found ? toTodoItem(found) : toTodoItem({
    ...created,
    project: input.project ?? null,
    completed: created.status === 'done',
  });
}

/**
 * List todos, optionally filtered by tab
 */
export async function listTodos(tab?: TabType): Promise<TodoItem[]> {
  const userId = getUserId();
  const todos = await listTodosService(userId, tab);
  return todos.map(toTodoItem);
}

/**
 * Find a todo by ID, title, or nextAction
 */
export async function findTodo(query: string): Promise<TodoItem | null> {
  const userId = getUserId();
  const found = await findTodoService(userId, query);
  return found ? toTodoItem(found) : null;
}

/**
 * Update a todo by ID
 */
export async function updateTodo(
  todoId: string,
  input: {
    title?: string;
    nextAction?: string;
    dueDate?: string | null;
    project?: string | null;
    status?: 'inbox' | 'active' | 'someday' | 'done';
    canDoAnytime?: boolean;
    completed?: boolean;
  }
): Promise<TodoItem | null> {
  const userId = getUserId();

  // Handle project name to ID conversion
  let projectId: string | null | undefined = undefined;
  if (input.project !== undefined) {
    if (input.project === null) {
      projectId = null;
    } else {
      projectId = await getOrCreateProject(userId, input.project);
    }
  }

  const updateInput: UpdateTodoInput = {
    title: input.title,
    nextAction: input.nextAction,
    dueDate: input.dueDate,
    projectId,
    status: input.status,
    canDoAnytime: input.canDoAnytime,
    completed: input.completed,
  };

  const updated = await updateTodoService(userId, todoId, updateInput);
  if (!updated) return null;

  // Fetch with project name
  const found = await findTodoService(userId, updated.id);
  return found ? toTodoItem(found) : null;
}

/**
 * Complete a todo by ID
 */
export async function completeTodo(todoId: string): Promise<TodoItem | null> {
  return updateTodo(todoId, { completed: true });
}

/**
 * Uncomplete a todo by ID
 */
export async function uncompleteTodo(todoId: string): Promise<TodoItem | null> {
  return updateTodo(todoId, { completed: false });
}

/**
 * Postpone a todo by ID
 */
export async function postponeTodo(
  todoId: string,
  days: number
): Promise<{ item: TodoItem; warning?: string } | null> {
  const userId = getUserId();
  const result = await postponeTodoService(userId, todoId, days);

  if (!result) return null;

  // Fetch with project name
  const found = await findTodoService(userId, result.todo.id);
  const item = found ? toTodoItem(found) : toTodoItem({
    ...result.todo,
    project: null,
    completed: result.todo.status === 'done',
  });

  const warning = result.needsConfirmation
    ? `This task has been postponed ${item.postponeCount} times. Consider removing it or breaking it down.`
    : undefined;

  return { item, warning };
}

/**
 * Delete a todo by ID
 */
export async function deleteTodo(todoId: string): Promise<boolean> {
  const userId = getUserId();
  return deleteTodoService(userId, todoId);
}

/**
 * Delete all todos in a project
 */
export async function deleteProjectTodosCmd(projectName: string): Promise<{ items: TodoItem[]; count: number } | null> {
  const userId = getUserId();
  const result = await deleteProjectTodos(userId, projectName);

  if (!result) return null;

  return {
    items: result.todos.map((t) => ({
      ...t,
      project: projectName,
    })),
    count: result.count,
  };
}

/**
 * List all projects with counts
 */
export async function listProjects(): Promise<Array<{
  name: string;
  taskCount: number;
  completedCount: number;
  hasNextAction: boolean;
}>> {
  const userId = getUserId();
  const projects = await listProjectsService(userId);

  return projects.map((p) => ({
    name: p.name,
    taskCount: p.taskCount,
    completedCount: p.completedCount,
    hasNextAction: p.taskCount > p.completedCount, // At least one non-done task
  }));
}

// Re-export generateId for legacy compatibility (still used in some places)
export function generateId(): string {
  return Math.random().toString(16).substring(2, 10);
}

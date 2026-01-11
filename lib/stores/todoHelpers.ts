/**
 * Todo Helper Utilities
 *
 * Ported from lib/services/todos/list-todos.ts for use with Zustand selectors.
 */

import type { Todo, TabType } from './types';

/**
 * Get today's date as YYYY-MM-DD string in local timezone
 */
function getLocalDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Determine which tab a todo belongs to based on its properties
 */
export function getTabForTodo(todo: Todo): TabType {
  const today = getLocalDateString();

  if (todo.status === 'done') {
    return 'done';
  }

  if (!todo.nextAction) {
    return 'inbox';
  }

  if (todo.canDoAnytime) {
    return 'optional';
  }

  if (todo.dueDate && todo.dueDate <= today) {
    return 'focus';
  }

  if (todo.dueDate && todo.dueDate > today) {
    return 'later';
  }

  return 'inbox';
}

/**
 * Sort comparator for todos
 * - Done items go last
 * - Items with due dates come before items without
 * - Earlier due dates come first
 */
export function sortTodos(a: Todo, b: Todo): number {
  // Done items last
  if (a.status === 'done' && b.status !== 'done') return 1;
  if (a.status !== 'done' && b.status === 'done') return -1;

  // Items with due dates first
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;

  // Sort by due date
  if (a.dueDate && b.dueDate) {
    return a.dueDate.localeCompare(b.dueDate);
  }

  return 0;
}

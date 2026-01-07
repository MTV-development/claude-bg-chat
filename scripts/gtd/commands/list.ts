/**
 * List Command
 *
 * Lists todo items with optional filters
 *
 * Usage:
 *   list [--completed] [--pending] [--priority high|medium|low]
 *   list [--tab focus|optional|inbox|done|projects]
 *   list [--project "Project Name"]
 */

import { loadTodos, parseArgs, filterByTab, getProjects } from '../lib/store';
import { CommandResult, TodoItem, TabType } from '../lib/types';

export async function list(args: string[]): Promise<CommandResult> {
  const { flags } = parseArgs(args);

  const data = await loadTodos();
  let items: TodoItem[] = data.items;

  // Filter by tab (GTD tabs)
  if (flags.tab) {
    const validTabs: TabType[] = ['focus', 'optional', 'inbox', 'done', 'projects'];
    if (!validTabs.includes(flags.tab as TabType)) {
      return {
        success: false,
        error: `Invalid tab. Use: ${validTabs.join(', ')}`,
      };
    }
    items = filterByTab(items, flags.tab as TabType);
  }

  // Filter by project
  if (flags.project) {
    items = items.filter(item =>
      item.project && item.project.toLowerCase() === flags.project.toLowerCase()
    );
  }

  // Legacy filters (still supported)
  if (flags.completed === 'true') {
    items = items.filter(item => item.completed || item.status === 'done');
  } else if (flags.pending === 'true') {
    items = items.filter(item => !item.completed && item.status !== 'done');
  }

  // Filter by priority
  if (flags.priority) {
    items = items.filter(item => item.priority === flags.priority);
  }

  // Filter by status
  if (flags.status) {
    items = items.filter(item => item.status === flags.status);
  }

  // Sort: overdue first, then by due date, then by priority
  items.sort((a, b) => {
    // Done items last
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;

    // Due date sorting
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && b.dueDate) {
      const cmp = a.dueDate.localeCompare(b.dueDate);
      if (cmp !== 0) return cmp;
    }

    // Priority sorting
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return {
    success: true,
    items,
    count: items.length,
  };
}

/**
 * List projects (separate function for project tab)
 */
export async function listProjects(): Promise<CommandResult & { projects?: ReturnType<typeof getProjects> }> {
  const data = await loadTodos();
  const projects = getProjects(data.items);

  return {
    success: true,
    count: projects.length,
    projects,
  };
}

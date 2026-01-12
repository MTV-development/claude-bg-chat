/**
 * List Command
 *
 * Lists todo items with optional filters
 *
 * Usage:
 *   list [--completed] [--pending]
 *   list [--tab focus|optional|later|inbox|done|projects]
 *   list [--project "Project Name"]
 */

import { listTodos, listProjects as getProjects, parseArgs, filterByTab } from '../lib/store';
import { CommandResult, TodoItem, TabType } from '../lib/types';

export async function list(args: string[]): Promise<CommandResult> {
  const { flags } = parseArgs(args);

  try {
    // Get tab filter
    let tab: TabType | undefined;
    if (flags.tab) {
      // Support legacy tab names as aliases
      let tabName = flags.tab as string;
      if (tabName === 'cando' || tabName === 'mightdo') {
        tabName = 'optional';
      }
      const validTabs: TabType[] = ['focus', 'optional', 'later', 'inbox', 'done', 'projects'];
      if (!validTabs.includes(tabName as TabType)) {
        return {
          success: false,
          error: `Invalid tab. Use: ${validTabs.join(', ')}`,
        };
      }
      tab = tabName as TabType;
    }

    let items = await listTodos(tab);

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

    // Filter by status
    if (flags.status) {
      items = items.filter(item => item.status === flags.status);
    }

    // Sort: overdue first, then by due date
    items.sort((a, b) => {
      // Done items last
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;

      // Due date sorting
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      if (a.dueDate && b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }

      return 0;
    });

    return {
      success: true,
      items,
      count: items.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list todos',
    };
  }
}

/**
 * List projects (separate function for project tab)
 */
export async function listProjects(): Promise<CommandResult & { projects?: ReturnType<typeof getProjects> extends Promise<infer T> ? T : never }> {
  try {
    const projects = await getProjects();

    return {
      success: true,
      count: projects.length,
      projects,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list projects',
    };
  }
}

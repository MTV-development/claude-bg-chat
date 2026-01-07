/**
 * Todos API Route
 *
 * Returns the current todo list for display in the UI.
 * Used by the TodoList component for auto-refresh.
 *
 * Uses shared store module for data access.
 *
 * GET /api/todos - List all items
 * GET /api/todos?tab=focus|optional|inbox|done - Filter by tab
 * PATCH /api/todos - Update item (complete/uncomplete)
 */

import { loadTodos, saveTodos, filterByTab, logActivity } from '../../../scripts/gtd/lib/store';
import { TabType } from '../../../scripts/gtd/lib/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') as TabType | null;

    const data = await loadTodos();
    let items = data.items;

    // Filter by tab if specified
    if (tab) {
      const validTabs: TabType[] = ['focus', 'optional', 'inbox', 'projects', 'done'];
      if (validTabs.includes(tab)) {
        items = filterByTab(items, tab);
      }
    }

    // Sort items: overdue first, then by due date, then by priority
    items.sort((a, b) => {
      // Done items last (unless on done tab)
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

    return Response.json({
      items,
      lastModified: data.lastModified,
      count: items.length,
    });
  } catch (error) {
    // If file doesn't exist or is invalid, return empty list
    return Response.json({
      items: [],
      lastModified: new Date().toISOString(),
      count: 0,
    });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, completed, status } = body;

    if (!id) {
      return Response.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const data = await loadTodos();

    const todoIndex = data.items.findIndex((t) => t.id === id);
    if (todoIndex === -1) {
      return Response.json({ error: 'Todo not found' }, { status: 404 });
    }

    const item = data.items[todoIndex];

    // Handle completion toggle
    if (typeof completed === 'boolean') {
      item.completed = completed;
      item.status = completed ? 'done' : 'active';
      item.completedAt = completed ? new Date().toISOString() : null;
      logActivity(data, item.id, completed ? 'completed' : 'uncompleted');
    }

    // Handle status change
    if (status && ['inbox', 'active', 'someday', 'done'].includes(status)) {
      item.status = status;
      item.completed = status === 'done';
      if (status === 'done' && !item.completedAt) {
        item.completedAt = new Date().toISOString();
      } else if (status !== 'done') {
        item.completedAt = null;
      }
    }

    await saveTodos(data);

    return Response.json({ success: true, item });
  } catch (error) {
    return Response.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

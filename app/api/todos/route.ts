/**
 * Todos API Route
 *
 * Returns the current todo list for display in the UI.
 * Used by the TodoList component for auto-refresh.
 *
 * Uses shared store module for data access.
 *
 * GET /api/todos - List all items
 * GET /api/todos?tab=focus|later|cando|inbox|done - Filter by tab
 * PATCH /api/todos - Update item (complete/uncomplete)
 * DELETE /api/todos - Remove item
 */

import { loadTodos, saveTodos, filterByTab, logActivity, getItemTab } from '../../../scripts/gtd/lib/store';
import { TabType } from '../../../scripts/gtd/lib/types';

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().slice(11, 23);
  if (data !== undefined) {
    console.log(`[${timestamp}] [todos] ${message}`, data);
  } else {
    console.log(`[${timestamp}] [todos] ${message}`);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') as TabType | null;

    log(`GET request - tab: ${tab || 'all'}`);

    const data = await loadTodos();
    let items = data.items;

    log(`Loaded ${data.items.length} total items from store`);

    // Filter by tab if specified
    if (tab) {
      // Support legacy tab names as aliases
      let tabName = tab as string;
      if (tabName === 'optional' || tabName === 'mightdo') {
        log(`Legacy tab name '${tabName}' -> 'cando'`);
        tabName = 'cando';
      }
      const validTabs: TabType[] = ['focus', 'later', 'cando', 'inbox', 'projects', 'done'];
      if (validTabs.includes(tabName as TabType)) {
        items = filterByTab(items, tabName as TabType);
        log(`Filtered to ${items.length} items for tab '${tabName}'`);
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

    log(`Returning ${items.length} items`);

    return Response.json({
      items,
      lastModified: data.lastModified,
      count: items.length,
    });
  } catch (error) {
    log(`ERROR in GET:`, error);
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
    const { id, completed, status, dueDate } = body;

    log(`PATCH request - id: ${id}, completed: ${completed}, status: ${status}, dueDate: ${dueDate}`);

    if (!id) {
      log(`PATCH failed: no ID provided`);
      return Response.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const data = await loadTodos();

    const todoIndex = data.items.findIndex((t) => t.id === id);
    if (todoIndex === -1) {
      log(`PATCH failed: item ${id} not found`);
      return Response.json({ error: 'Todo not found' }, { status: 404 });
    }

    const item = data.items[todoIndex];
    const oldTab = getItemTab(item);
    log(`Found item: "${item.nextAction || item.title}" (current tab: ${oldTab})`);

    // Handle completion toggle
    if (typeof completed === 'boolean') {
      log(`Toggling completion: ${item.completed} -> ${completed}`);
      item.completed = completed;
      item.status = completed ? 'done' : 'active';
      item.completedAt = completed ? new Date().toISOString() : null;
      logActivity(data, item.id, completed ? 'completed' : 'uncompleted');
    }

    // Handle status change
    if (status && ['inbox', 'active', 'someday', 'done'].includes(status)) {
      log(`Changing status: ${item.status} -> ${status}`);
      item.status = status;
      item.completed = status === 'done';
      if (status === 'done' && !item.completedAt) {
        item.completedAt = new Date().toISOString();
      } else if (status !== 'done') {
        item.completedAt = null;
      }
    }

    // Handle due date change
    if (dueDate !== undefined) {
      log(`Changing due date: ${item.dueDate} -> ${dueDate}`);
      item.dueDate = dueDate;
      // When setting a due date, also set hasDeadline to true
      if (dueDate) {
        item.hasDeadline = true;
      }
    }

    const newTab = getItemTab(item);
    if (oldTab !== newTab) {
      log(`Item moved: ${oldTab} -> ${newTab}`);
    }

    await saveTodos(data);
    log(`Item updated and saved successfully`);

    return Response.json({ success: true, item });
  } catch (error) {
    log(`ERROR in PATCH:`, error);
    return Response.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    log(`DELETE request - id: ${id}`);

    if (!id) {
      log(`DELETE failed: no ID provided`);
      return Response.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const data = await loadTodos();

    const todoIndex = data.items.findIndex((t) => t.id === id);
    if (todoIndex === -1) {
      log(`DELETE failed: item ${id} not found`);
      return Response.json({ error: 'Todo not found' }, { status: 404 });
    }

    const item = data.items[todoIndex];
    log(`Deleting item: "${item.nextAction || item.title}"`);
    data.items.splice(todoIndex, 1);

    logActivity(data, item.id, 'deleted');

    await saveTodos(data);
    log(`Item deleted successfully. ${data.items.length} items remaining`);

    return Response.json({ success: true });
  } catch (error) {
    log(`ERROR in DELETE:`, error);
    return Response.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}

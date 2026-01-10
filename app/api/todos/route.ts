/**
 * Todos API Route
 *
 * Returns the current todo list for display in the UI.
 * Uses Supabase database via Drizzle ORM.
 *
 * GET /api/todos - List all items
 * GET /api/todos?tab=focus|optional|later|inbox|done - Filter by tab
 * PATCH /api/todos - Update item (complete/uncomplete)
 * DELETE /api/todos - Remove item
 */

import { getCurrentUser } from '@/lib/services/auth/get-current-user';
import { listTodos } from '@/lib/services/todos/list-todos';
import { updateTodo } from '@/lib/services/todos/update-todo';
import { deleteTodo } from '@/lib/services/todos/delete-todo';
import { TabType } from '@/scripts/gtd/lib/types';

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().slice(11, 23);
  if (data !== undefined) {
    console.log('[' + timestamp + '] [todos] ' + message, data);
  } else {
    console.log('[' + timestamp + '] [todos] ' + message);
  }
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') as TabType | null;

    log('GET request - user: ' + user.email + ', tab: ' + (tab || 'all'));

    // Support legacy tab names as aliases
    let tabName = tab as string | null;
    if (tabName === 'cando' || tabName === 'mightdo') {
      log('Legacy tab name "' + tabName + '" -> "optional"');
      tabName = 'optional';
    }

    const validTabs: TabType[] = ['focus', 'optional', 'later', 'inbox', 'projects', 'done'];
    const filterTab = tabName && validTabs.includes(tabName as TabType) ? (tabName as TabType) : undefined;

    const items = await listTodos(user.userId, filterTab);

    log('Returning ' + items.length + ' items');

    // Map to frontend-compatible format
    const mappedItems = items.map((item) => ({
      id: item.id,
      title: item.title,
      nextAction: item.nextAction,
      status: item.status,
      completed: item.completed,
      project: item.project,
      dueDate: item.dueDate,
      canDoAnytime: item.canDoAnytime,
      createdAt: item.createdAt,
      completedAt: item.completedAt,
      postponeCount: item.postponeCount,
    }));

    return Response.json({
      items: mappedItems,
      lastModified: new Date().toISOString(),
      count: mappedItems.length,
    });
  } catch (error) {
    log('ERROR in GET:', error);
    return Response.json({
      items: [],
      lastModified: new Date().toISOString(),
      count: 0,
    });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, completed, status, dueDate } = body;

    log('PATCH request - id: ' + id + ', completed: ' + completed + ', status: ' + status + ', dueDate: ' + dueDate);

    if (!id) {
      log('PATCH failed: no ID provided');
      return Response.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const updated = await updateTodo(user.userId, id, {
      completed,
      status,
      dueDate,
    });

    if (!updated) {
      log('PATCH failed: item ' + id + ' not found');
      return Response.json({ error: 'Todo not found' }, { status: 404 });
    }

    log('Item updated successfully');

    // Map to frontend-compatible format
    const item = {
      id: updated.id,
      title: updated.title,
      nextAction: updated.nextAction,
      status: updated.status,
      completed: updated.completed,
      project: null,
      dueDate: updated.dueDate,
      canDoAnytime: updated.canDoAnytime,
      createdAt: updated.createdAt,
      completedAt: updated.completedAt,
      postponeCount: updated.postponeCount,
    };

    return Response.json({ success: true, item });
  } catch (error) {
    log('ERROR in PATCH:', error);
    return Response.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body;

    log('DELETE request - id: ' + id);

    if (!id) {
      log('DELETE failed: no ID provided');
      return Response.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const deleted = await deleteTodo(user.userId, id);

    if (!deleted) {
      log('DELETE failed: item ' + id + ' not found');
      return Response.json({ error: 'Todo not found' }, { status: 404 });
    }

    log('Item deleted successfully');

    return Response.json({ success: true });
  } catch (error) {
    log('ERROR in DELETE:', error);
    return Response.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}

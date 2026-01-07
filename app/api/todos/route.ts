/**
 * Todos API Route
 *
 * Returns the current todo list for display in the UI.
 * Used by the TodoList component for auto-refresh.
 *
 * Uses shared store module for data access.
 */

import { loadTodos, saveTodos } from '../../../scripts/gtd/lib/store';

export async function GET() {
  try {
    const data = await loadTodos();

    return Response.json({
      items: data.items,
      lastModified: data.lastModified,
    });
  } catch (error) {
    // If file doesn't exist or is invalid, return empty list
    return Response.json({
      items: [],
      lastModified: new Date().toISOString(),
    });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, completed } = await req.json();

    if (!id || typeof completed !== 'boolean') {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const data = await loadTodos();

    const todoIndex = data.items.findIndex((t) => t.id === id);
    if (todoIndex === -1) {
      return Response.json({ error: 'Todo not found' }, { status: 404 });
    }

    data.items[todoIndex].completed = completed;
    data.items[todoIndex].completedAt = completed ? new Date().toISOString() : null;

    await saveTodos(data);

    return Response.json({ success: true, item: data.items[todoIndex] });
  } catch (error) {
    return Response.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

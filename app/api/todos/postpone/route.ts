/**
 * Postpone API Route
 *
 * POST /api/todos/postpone
 * Body: { id: string, days: number }
 *
 * Postpones a task by moving its due date forward.
 */

import { loadTodos, saveTodos, findItem, logActivity, getLocalDateString } from '../../../../scripts/gtd/lib/store';

export async function POST(req: Request) {
  try {
    const { id, days } = await req.json();

    if (!id) {
      return Response.json({ error: 'Item ID is required' }, { status: 400 });
    }

    if (!days || typeof days !== 'number' || days < 1) {
      return Response.json({ error: 'Days must be a positive number' }, { status: 400 });
    }

    const data = await loadTodos();
    const item = findItem(data.items, id);

    if (!item) {
      return Response.json({ error: 'Item not found' }, { status: 404 });
    }

    // Calculate new due date
    const oldDate = item.dueDate;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    item.dueDate = getLocalDateString(newDate);

    // Increment postpone count
    item.postponeCount++;

    // Log activity
    logActivity(data, item.id, 'postponed', {
      fromDate: oldDate || 'none',
      toDate: item.dueDate,
    });

    await saveTodos(data);

    return Response.json({
      success: true,
      item,
      postponeCount: item.postponeCount,
      needsConfirmation: item.postponeCount >= 3,
    });
  } catch (error) {
    console.error('Postpone error:', error);
    return Response.json({ error: 'Failed to postpone task' }, { status: 500 });
  }
}

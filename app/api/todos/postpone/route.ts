/**
 * Postpone API Route
 *
 * POST /api/todos/postpone
 * Body: { id: string, days: number }
 *
 * Postpones a task by moving its due date forward.
 */

import { loadTodos, saveTodos, findItem, logActivity, getLocalDateString, getItemTab } from '../../../../scripts/gtd/lib/store';

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().slice(11, 23);
  if (data !== undefined) {
    console.log(`[${timestamp}] [postpone] ${message}`, data);
  } else {
    console.log(`[${timestamp}] [postpone] ${message}`);
  }
}

export async function POST(req: Request) {
  try {
    const { id, days } = await req.json();

    log(`POST request - id: ${id}, days: ${days}`);

    if (!id) {
      log(`Failed: no ID provided`);
      return Response.json({ error: 'Item ID is required' }, { status: 400 });
    }

    if (!days || typeof days !== 'number' || days < 1) {
      log(`Failed: invalid days value: ${days}`);
      return Response.json({ error: 'Days must be a positive number' }, { status: 400 });
    }

    const data = await loadTodos();
    const item = findItem(data.items, id);

    if (!item) {
      log(`Failed: item ${id} not found`);
      return Response.json({ error: 'Item not found' }, { status: 404 });
    }

    log(`Found item: "${item.nextAction || item.title}"`);

    // Calculate new due date
    const oldDate = item.dueDate;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    item.dueDate = getLocalDateString(newDate);

    // Increment postpone count
    item.postponeCount++;

    const oldTab = getItemTab({ ...item, dueDate: oldDate });
    const newTab = getItemTab(item);
    log(`Postponed: ${oldDate} -> ${item.dueDate} (${days} days), count: ${item.postponeCount}, tab: ${oldTab} -> ${newTab}`);

    if (item.postponeCount >= 3) {
      log(`Item has been postponed ${item.postponeCount} times - suggesting removal`);
    }

    // Log activity
    logActivity(data, item.id, 'postponed', {
      fromDate: oldDate || 'none',
      toDate: item.dueDate,
    });

    await saveTodos(data);
    log(`Item saved successfully`);

    return Response.json({
      success: true,
      item,
      postponeCount: item.postponeCount,
      needsConfirmation: item.postponeCount >= 3,
    });
  } catch (error) {
    log(`ERROR:`, error);
    return Response.json({ error: 'Failed to postpone task' }, { status: 500 });
  }
}

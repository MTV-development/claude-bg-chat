/**
 * Postpone API Route
 *
 * POST /api/todos/postpone
 * Body: { id: string, days: number }
 *
 * Postpones a task by moving its due date forward.
 */

import { getCurrentUser } from '@/lib/services/auth/get-current-user';
import { postponeTodo } from '@/lib/services/todos/postpone-todo';

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().slice(11, 23);
  if (data !== undefined) {
    console.log('[' + timestamp + '] [postpone] ' + message, data);
  } else {
    console.log('[' + timestamp + '] [postpone] ' + message);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, days } = await req.json();

    log('POST request - id: ' + id + ', days: ' + days);

    if (!id) {
      log('Failed: no ID provided');
      return Response.json({ error: 'Item ID is required' }, { status: 400 });
    }

    if (!days || typeof days !== 'number' || days < 1) {
      log('Failed: invalid days value: ' + days);
      return Response.json({ error: 'Days must be a positive number' }, { status: 400 });
    }

    const result = await postponeTodo(user.userId, id, days);

    if (!result) {
      log('Failed: item ' + id + ' not found');
      return Response.json({ error: 'Item not found' }, { status: 404 });
    }

    const { todo, needsConfirmation } = result;

    log('Postponed to ' + todo.dueDate + ', count: ' + todo.postponeCount);

    if (needsConfirmation) {
      log('Item has been postponed ' + todo.postponeCount + ' times - suggesting removal');
    }

    // Map to frontend-compatible format
    const item = {
      id: todo.id,
      title: todo.title,
      nextAction: todo.nextAction,
      status: todo.status,
      completed: todo.completed,
      project: null,
      dueDate: todo.dueDate,
      canDoAnytime: todo.canDoAnytime,
      createdAt: todo.createdAt,
      completedAt: todo.completedAt,
      postponeCount: todo.postponeCount,
    };

    return Response.json({
      success: true,
      item,
      postponeCount: todo.postponeCount,
      needsConfirmation,
    });
  } catch (error) {
    log('ERROR:', error);
    return Response.json({ error: 'Failed to postpone task' }, { status: 500 });
  }
}

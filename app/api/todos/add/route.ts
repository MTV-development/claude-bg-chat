/**
 * Add Task API Route
 *
 * POST /api/todos/add - Add a new task
 */

import { getCurrentUser } from '@/lib/services/auth/get-current-user';
import { createTodo } from '@/lib/services/todos/create-todo';
import { getOrCreateProject } from '@/lib/services/projects/get-or-create-project';
import { getItemTab } from '@/lib/services/todos/list-todos';

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().slice(11, 23);
  if (data !== undefined) {
    console.log('[' + timestamp + '] [add] ' + message, data);
  } else {
    console.log('[' + timestamp + '] [add] ' + message);
  }
}

function getLocalDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      dueDate,
      hasDeadline,
      canDoAnytime,
      project,
      status = 'active'
    } = body;

    log('POST request - title: "' + title + '", hasDeadline: ' + hasDeadline + ', canDoAnytime: ' + canDoAnytime + ', dueDate: ' + dueDate);

    if (!title) {
      log('Failed: no title provided');
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }

    const today = getLocalDateString();

    // Resolve due date
    let resolvedDueDate: string | null = null;
    if (dueDate === 'today') {
      resolvedDueDate = today;
      log('Resolved dueDate "today" -> ' + today);
    } else if (dueDate) {
      resolvedDueDate = dueDate;
    }

    // If hasDeadline is true but no dueDate, that's an error
    if (hasDeadline && !resolvedDueDate) {
      log('Failed: hasDeadline=true but no dueDate provided');
      return Response.json(
        { error: 'Due date is required when hasDeadline is true' },
        { status: 400 }
      );
    }

    // Handle project - create if needed
    let projectId: string | null = null;
    if (project) {
      projectId = await getOrCreateProject(user.userId, project);
    }

    const newItem = await createTodo(user.userId, {
      title: title.trim(),
      dueDate: resolvedDueDate,
      canDoAnytime: canDoAnytime === true,
      projectId,
      status: status === 'inbox' ? 'inbox' : 'active',
    });

    const tab = getItemTab(newItem);
    log('Created item "' + newItem.title + '" (id: ' + newItem.id + ') -> tab: ' + tab);

    // Map to frontend-compatible format
    const item = {
      id: newItem.id,
      title: newItem.title,
      nextAction: newItem.nextAction,
      status: newItem.status,
      completed: newItem.completed,
      project: project || null,
      dueDate: newItem.dueDate,
      canDoAnytime: newItem.canDoAnytime,
      createdAt: newItem.createdAt,
      completedAt: newItem.completedAt,
      postponeCount: newItem.postponeCount,
    };

    return Response.json({ success: true, item });
  } catch (error) {
    log('ERROR:', error);
    return Response.json({ error: 'Failed to add task' }, { status: 500 });
  }
}

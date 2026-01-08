/**
 * Add Task API Route
 *
 * POST /api/todos/add - Add a new task
 */

import { loadTodos, saveTodos, generateId, logActivity, getLocalDateString, getItemTab } from '../../../../scripts/gtd/lib/store';
import { TodoItem } from '../../../../scripts/gtd/lib/types';

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().slice(11, 23);
  if (data !== undefined) {
    console.log(`[${timestamp}] [add] ${message}`, data);
  } else {
    console.log(`[${timestamp}] [add] ${message}`);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      priority = 'medium',
      dueDate,
      hasDeadline,
      canDoAnytime,
      project,
      status = 'active'
    } = body;

    log(`POST request - title: "${title}", hasDeadline: ${hasDeadline}, canDoAnytime: ${canDoAnytime}, dueDate: ${dueDate}`);

    if (!title) {
      log(`Failed: no title provided`);
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }

    const data = await loadTodos();
    const today = getLocalDateString();

    // Resolve due date - only default to today if explicitly set to 'today'
    let resolvedDueDate: string | null = null;
    if (dueDate === 'today') {
      resolvedDueDate = today;
      log(`Resolved dueDate 'today' -> ${today}`);
    } else if (dueDate) {
      resolvedDueDate = dueDate;
    }

    // Validate: if hasDeadline is true, dueDate should be provided
    const resolvedHasDeadline = hasDeadline === true;
    if (resolvedHasDeadline && !resolvedDueDate) {
      log(`Failed: hasDeadline=true but no dueDate provided`);
      return Response.json(
        { error: 'Due date is required when hasDeadline is true' },
        { status: 400 }
      );
    }

    const resolvedCanDoAnytime = canDoAnytime === true;

    const newItem: TodoItem = {
      id: generateId(),
      title: title.trim(),
      nextAction: title.trim(), // For simple tasks, nextAction = title
      status: status === 'inbox' ? 'inbox' : 'active',
      completed: false,
      priority: priority || 'medium',
      project: project || null,
      dueDate: resolvedDueDate,
      hasDeadline: resolvedHasDeadline,
      canDoAnytime: resolvedCanDoAnytime,
      createdAt: new Date().toISOString(),
      completedAt: null,
      postponeCount: 0,
      tags: [],
    };

    const tab = getItemTab(newItem);
    log(`Created item "${newItem.title}" (id: ${newItem.id}) -> tab: ${tab}`);

    data.items.push(newItem);
    logActivity(data, newItem.id, 'created');

    await saveTodos(data);
    log(`Item saved. Total items: ${data.items.length}`);

    return Response.json({ success: true, item: newItem });
  } catch (error) {
    log(`ERROR:`, error);
    return Response.json({ error: 'Failed to add task' }, { status: 500 });
  }
}

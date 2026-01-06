/**
 * Todos API Route
 *
 * Returns the current todo list for display in the UI.
 * Used by the TodoList component for auto-refresh.
 */

import { promises as fs } from 'fs';
import path from 'path';

const TODOS_FILE = path.join(process.cwd(), 'data', 'todos.json');

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  tags: string[];
}

interface TodoData {
  version: string;
  lastModified: string;
  items: TodoItem[];
}

export async function GET() {
  try {
    const data = await fs.readFile(TODOS_FILE, 'utf-8');
    const todos: TodoData = JSON.parse(data);

    return Response.json({
      items: todos.items,
      lastModified: todos.lastModified,
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

    const data = await fs.readFile(TODOS_FILE, 'utf-8');
    const todos: TodoData = JSON.parse(data);

    const todoIndex = todos.items.findIndex((t) => t.id === id);
    if (todoIndex === -1) {
      return Response.json({ error: 'Todo not found' }, { status: 404 });
    }

    todos.items[todoIndex].completed = completed;
    todos.items[todoIndex].completedAt = completed ? new Date().toISOString() : null;
    todos.lastModified = new Date().toISOString();

    await fs.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2));

    return Response.json({ success: true, item: todos.items[todoIndex] });
  } catch (error) {
    return Response.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

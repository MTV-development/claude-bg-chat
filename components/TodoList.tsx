'use client';

import { useState, useEffect, useCallback } from 'react';

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
  items: TodoItem[];
  lastModified: string;
}

const POLL_INTERVAL = 2000; // Check for updates every 2 seconds

const priorityColors = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

const priorityIcons = {
  high: '!!!',
  medium: '!!',
  low: '!',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export default function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [lastModified, setLastModified] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodos = useCallback(async () => {
    try {
      const response = await fetch('/api/todos');
      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }
      const data: TodoData = await response.json();
      setTodos(data.items);
      setLastModified(data.lastModified);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(fetchTodos, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTodos]);

  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      const response = await fetch('/api/todos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed }),
      });
      if (response.ok) {
        fetchTodos(); // Refresh immediately
      }
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  };

  const incompleteTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <svg className="animate-spin h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading todos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p className="font-medium">Error loading todos</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Todo List</h2>
          <span className="text-xs text-gray-400">
            {incompleteTodos.length} pending
          </span>
        </div>
      </div>

      {/* Todo List */}
      <div className="flex-1 overflow-y-auto p-4">
        {todos.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg mb-2">No todos yet</p>
            <p className="text-sm">Use the chat to add tasks!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Incomplete Todos */}
            {incompleteTodos.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  To Do ({incompleteTodos.length})
                </h3>
                <ul className="space-y-2">
                  {incompleteTodos.map((todo) => (
                    <li
                      key={todo.id}
                      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTodo(todo.id, true)}
                          className="mt-0.5 w-5 h-5 border-2 border-gray-300 rounded-full hover:border-green-500 hover:bg-green-50 transition-colors cursor-pointer"
                          title="Mark as complete"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 font-medium">{todo.title}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[todo.priority]}`}
                            >
                              {priorityIcons[todo.priority]} {todo.priority}
                            </span>
                            {todo.dueDate && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  isOverdue(todo.dueDate)
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {isOverdue(todo.dueDate) && 'Overdue: '}
                                {formatDate(todo.dueDate)}
                              </span>
                            )}
                            {todo.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Completed Todos */}
            {completedTodos.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Completed ({completedTodos.length})
                </h3>
                <ul className="space-y-2">
                  {completedTodos.map((todo) => (
                    <li
                      key={todo.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 opacity-70"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTodo(todo.id, false)}
                          className="mt-0.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors cursor-pointer"
                          title="Mark as incomplete"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-500 line-through">{todo.title}</p>
                          {todo.completedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              Completed {new Date(todo.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-400 text-center">
          Auto-refreshing every {POLL_INTERVAL / 1000}s
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import PostponeDropdown from './PostponeDropdown';
import ConfirmationModal from './ConfirmationModal';

type TabType = 'focus' | 'optional' | 'inbox' | 'done';

interface TodoItem {
  id: string;
  title: string;
  nextAction: string | null;
  status: 'inbox' | 'active' | 'done' | 'someday';
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  project: string | null;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  postponeCount: number;
  tags: string[];
}

interface TodoData {
  items: TodoItem[];
  lastModified: string;
  count: number;
}

const POLL_INTERVAL = 2000;

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

const tabs: { id: TabType; label: string; description: string }[] = [
  { id: 'focus', label: 'Focus', description: 'Due today or overdue' },
  { id: 'optional', label: 'Optional', description: 'Future or no deadline' },
  { id: 'inbox', label: 'Inbox', description: 'Needs clarification' },
  { id: 'done', label: 'Done', description: 'Completed tasks' },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00'); // Parse as local date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  }
  if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export default function TodoList() {
  const [activeTab, setActiveTab] = useState<TabType>('focus');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<TabType, number>>({
    focus: 0,
    optional: 0,
    inbox: 0,
    done: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmationItem, setConfirmationItem] = useState<TodoItem | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  const fetchTodos = useCallback(async () => {
    try {
      const response = await fetch(`/api/todos?tab=${activeTab}`);
      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }
      const data: TodoData = await response.json();
      setTodos(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  // Fetch counts for all tabs
  const fetchCounts = useCallback(async () => {
    try {
      const counts: Record<TabType, number> = {
        focus: 0,
        optional: 0,
        inbox: 0,
        done: 0,
      };

      // Fetch all tabs in parallel
      await Promise.all(
        tabs.map(async (tab) => {
          const response = await fetch(`/api/todos?tab=${tab.id}`);
          if (response.ok) {
            const data: TodoData = await response.json();
            counts[tab.id] = data.count;
          }
        })
      );

      setTabCounts(counts);
    } catch (err) {
      console.error('Failed to fetch tab counts:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTodos();
    fetchCounts();
  }, [fetchTodos, fetchCounts]);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTodos();
      fetchCounts();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTodos, fetchCounts]);

  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      const response = await fetch('/api/todos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed }),
      });
      if (response.ok) {
        fetchTodos();
        fetchCounts();
      }
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  };

  const handlePostpone = async (itemId: string, days: number): Promise<{ needsConfirmation?: boolean }> => {
    try {
      const response = await fetch('/api/todos/postpone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, days }),
      });
      if (response.ok) {
        const result = await response.json();
        fetchTodos();
        fetchCounts();
        return { needsConfirmation: result.needsConfirmation };
      }
    } catch (err) {
      console.error('Failed to postpone todo:', err);
    }
    return {};
  };

  const handleRequestConfirmation = (itemId: string) => {
    const item = todos.find(t => t.id === itemId);
    if (item) {
      setConfirmationItem(item);
      setIsConfirmationOpen(true);
    }
  };

  const handleRemoveTask = async () => {
    if (!confirmationItem) return;
    try {
      const response = await fetch('/api/todos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmationItem.id }),
      });
      if (response.ok) {
        fetchTodos();
        fetchCounts();
      }
    } catch (err) {
      console.error('Failed to remove todo:', err);
    } finally {
      setIsConfirmationOpen(false);
      setConfirmationItem(null);
    }
  };

  const handleKeepTask = () => {
    setIsConfirmationOpen(false);
    setConfirmationItem(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <svg className="animate-spin h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading...
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
      {/* Header with Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-4 py-2">
          <h2 className="text-lg font-semibold text-gray-800">Todo List</h2>
        </div>
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              title={tab.description}
            >
              {tab.label}
              {tabCounts[tab.id] > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tabCounts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Todo List */}
      <div className="flex-1 overflow-y-auto p-4">
        {todos.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg mb-2">
              {activeTab === 'focus' && 'All caught up!'}
              {activeTab === 'optional' && 'No optional tasks'}
              {activeTab === 'inbox' && 'Inbox is clear'}
              {activeTab === 'done' && 'No completed tasks'}
            </p>
            <p className="text-sm">
              {activeTab === 'focus' && 'No tasks due today'}
              {activeTab === 'optional' && 'Tasks without deadlines appear here'}
              {activeTab === 'inbox' && 'Tasks needing clarification appear here'}
              {activeTab === 'done' && 'Completed tasks will appear here'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className={`border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow ${
                  todo.status === 'done'
                    ? 'bg-gray-50 border-gray-200 opacity-70'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTodo(todo.id, !todo.completed)}
                    className={`mt-0.5 w-5 h-5 rounded-full transition-colors cursor-pointer ${
                      todo.completed
                        ? 'bg-green-500 flex items-center justify-center hover:bg-green-600'
                        : 'border-2 border-gray-300 hover:border-green-500 hover:bg-green-50'
                    }`}
                    title={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {todo.completed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    {/* Show nextAction for active items, title for inbox */}
                    <p className={`font-medium ${todo.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                      {todo.status === 'inbox' || !todo.nextAction ? todo.title : todo.nextAction}
                    </p>
                    {/* Show original title if different from nextAction */}
                    {todo.nextAction && todo.nextAction !== todo.title && todo.status !== 'inbox' && (
                      <p className="text-xs text-gray-400 mt-0.5">{todo.title}</p>
                    )}
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
                              ? 'bg-red-50 text-red-600 font-medium'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {isOverdue(todo.dueDate) && 'Overdue: '}
                          {formatDate(todo.dueDate)}
                        </span>
                      )}
                      {todo.project && (
                        <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                          {todo.project}
                        </span>
                      )}
                      {todo.postponeCount > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          todo.postponeCount >= 3
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          Postponed {todo.postponeCount}x
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
                      {todo.completedAt && (
                        <span className="text-xs text-gray-400">
                          Completed {new Date(todo.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Postpone button for non-done items */}
                  {todo.status !== 'done' && (
                    <div className="ml-2 flex-shrink-0">
                      <PostponeDropdown
                        itemId={todo.id}
                        postponeCount={todo.postponeCount}
                        onPostpone={handlePostpone}
                        onRequestConfirmation={handleRequestConfirmation}
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-400 text-center">
          Auto-refreshing every {POLL_INTERVAL / 1000}s
        </p>
      </div>

      {/* Confirmation Modal for frequently postponed tasks */}
      <ConfirmationModal
        isOpen={isConfirmationOpen}
        title="Task Postponed Multiple Times"
        message={confirmationItem
          ? `"${confirmationItem.nextAction || confirmationItem.title}" has been postponed ${confirmationItem.postponeCount} times. Would you like to remove it from your list?`
          : ''
        }
        confirmLabel="Remove Task"
        cancelLabel="Keep It"
        confirmVariant="danger"
        onConfirm={handleRemoveTask}
        onCancel={handleKeepTask}
      />
    </div>
  );
}

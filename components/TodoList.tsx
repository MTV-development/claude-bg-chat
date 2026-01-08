'use client';

import { useState, useEffect, useCallback } from 'react';
import PostponeDropdown from './PostponeDropdown';
import ConfirmationModal from './ConfirmationModal';
import AddItemModal from './AddItemModal';

type TabType = 'focus' | 'optional' | 'later' | 'inbox' | 'projects' | 'done' | 'howto';

interface TodoItem {
  id: string;
  title: string;
  nextAction: string | null;
  status: 'inbox' | 'active' | 'done' | 'someday';
  completed: boolean;
  project: string | null;
  dueDate: string | null;
  canDoAnytime: boolean;
  createdAt: string;
  completedAt: string | null;
  postponeCount: number;
}

interface TodoData {
  items: TodoItem[];
  lastModified: string;
  count: number;
}

interface Project {
  name: string;
  taskCount: number;
  completedCount: number;
  hasNextAction: boolean;
}

const POLL_INTERVAL = 2000;

const tabs: { id: TabType; label: string; description: string }[] = [
  { id: 'focus', label: 'Focus', description: 'Tasks on or past deadline' },
  { id: 'optional', label: 'Optional', description: 'Tasks you can do anytime' },
  { id: 'later', label: 'Later', description: 'Tasks with future deadlines' },
  { id: 'inbox', label: 'Inbox', description: 'Tasks needing clarification' },
  { id: 'projects', label: 'Projects', description: 'Tasks by project' },
  { id: 'done', label: 'Done', description: 'Completed tasks' },
  { id: 'howto', label: 'How To', description: 'Beginner guide' },
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
    later: 0,
    cando: 0,
    inbox: 0,
    projects: 0,
    done: 0,
    howto: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmationItem, setConfirmationItem] = useState<TodoItem | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'task' | 'project'>('task');

  const fetchTodos = useCallback(async () => {
    // Skip fetching for howto tab
    if (activeTab === 'howto') {
      setTodos([]);
      setProjects([]);
      setIsLoading(false);
      return;
    }

    // Handle projects tab
    if (activeTab === 'projects') {
      try {
        if (selectedProject) {
          // Fetch tasks for specific project
          const response = await fetch(`/api/todos/projects?name=${encodeURIComponent(selectedProject)}`);
          if (!response.ok) throw new Error('Failed to fetch project tasks');
          const data = await response.json();
          setTodos(data.items);
        } else {
          // Fetch projects list
          const response = await fetch('/api/todos/projects');
          if (!response.ok) throw new Error('Failed to fetch projects');
          const data = await response.json();
          setProjects(data.projects);
          setTodos([]);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
      return;
    }

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
  }, [activeTab, selectedProject]);

  // Fetch counts for all tabs
  const fetchCounts = useCallback(async () => {
    try {
      const counts: Record<TabType, number> = {
        focus: 0,
        later: 0,
        cando: 0,
        inbox: 0,
        projects: 0,
        done: 0,
        howto: 0,
      };

      // Fetch all tabs in parallel (skip howto and projects)
      await Promise.all(
        tabs.filter(tab => tab.id !== 'howto' && tab.id !== 'projects').map(async (tab) => {
          const response = await fetch(`/api/todos?tab=${tab.id}`);
          if (response.ok) {
            const data: TodoData = await response.json();
            counts[tab.id] = data.count;
          }
        })
      );

      // Fetch projects count separately
      const projectsResponse = await fetch('/api/todos/projects');
      if (projectsResponse.ok) {
        const data = await projectsResponse.json();
        counts.projects = data.count;
      }

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

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkAction = async () => {
    if (selectedIds.size === 0) return;
    const newCompletedState = activeTab !== 'done';
    try {
      // Send requests sequentially to avoid race conditions
      for (const id of Array.from(selectedIds)) {
        await fetch('/api/todos', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, completed: newCompletedState }),
        });
      }
      setSelectedIds(new Set());
      fetchTodos();
      fetchCounts();
    } catch (err) {
      console.error('Failed to update todos:', err);
    }
  };

  // Clear selections and selected project when tab changes
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectedProject(null);
  }, [activeTab]);

  // Clean up stale selections when todos change
  useEffect(() => {
    const currentIds = new Set(todos.map(t => t.id));
    setSelectedIds(prev => {
      const filtered = new Set(Array.from(prev).filter(id => currentIds.has(id)));
      return filtered.size !== prev.size ? filtered : prev;
    });
  }, [todos]);

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

  const handleDoToday = async (itemId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch('/api/todos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, dueDate: today }),
      });
      if (response.ok) {
        fetchTodos();
        fetchCounts();
      }
    } catch (err) {
      console.error('Failed to set task to today:', err);
    }
  };

  const handleOpenAddModal = (mode: 'task' | 'project') => {
    setAddMode(mode);
    setIsAddModalOpen(true);
  };

  const handleAddComplete = () => {
    fetchTodos();
    fetchCounts();
  };

  // Determine if we should show the floating add button
  const showAddButton = activeTab === 'focus' || activeTab === 'later' || activeTab === 'optional' ||
    (activeTab === 'projects' && !selectedProject) ||
    (activeTab === 'projects' && selectedProject);

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
    <div className="h-full flex flex-col relative">
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
      <div className="flex-1 overflow-y-auto p-4 relative">
        {/* Floating action button for selected items */}
        {selectedIds.size > 0 && activeTab !== 'howto' && !(activeTab === 'projects' && !selectedProject) && (
          <div className="sticky top-0 z-10 mb-3">
            <button
              onClick={handleBulkAction}
              className={`w-full py-2 px-4 rounded-lg font-medium shadow-md transition-colors ${
                activeTab === 'done'
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {activeTab === 'done' ? 'Undo' : 'Complete'} ({selectedIds.size} selected)
            </button>
          </div>
        )}
        {activeTab === 'howto' ? (
          <div className="prose prose-sm max-w-none">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Getting Started</h3>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Adding Tasks</h4>
                <p className="text-blue-700 text-sm">
                  Just type in the chat! Say things like:
                </p>
                <ul className="text-blue-700 text-sm mt-2 space-y-1">
                  <li>&quot;buy groceries by Friday&quot; - Goes to Focus when deadline is due</li>
                  <li>&quot;think about vacation&quot; - Goes to Inbox (needs clarifying)</li>
                  <li>&quot;read that book sometime&quot; - Goes to Optional (anytime task)</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">The Five Tabs</h4>
                <ul className="text-green-700 text-sm space-y-2">
                  <li><strong>Focus</strong> - Tasks with deadlines due today. Use Postpone to push them out.</li>
                  <li><strong>Later</strong> - Tasks with future deadlines. They move to Focus when due.</li>
                  <li><strong>Optional</strong> - Tasks you can do anytime. Click &quot;Do Today&quot; to add a deadline.</li>
                  <li><strong>Inbox</strong> - Needs clarification. Chat to clarify what the next action is.</li>
                  <li><strong>Done</strong> - Completed tasks for reference.</li>
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-800 mb-2">Completing Tasks</h4>
                <p className="text-purple-700 text-sm">
                  Select tasks using the checkboxes, then click the &quot;Complete&quot; button that appears.
                  On the Done tab, use &quot;Undo&quot; to restore completed tasks.
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-800 mb-2">Postponing</h4>
                <p className="text-orange-700 text-sm">
                  On the Focus tab, click &quot;Postpone&quot; to push a task to a future date.
                  If you postpone something 3+ times, we&apos;ll ask if you want to remove it.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">Tips</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>Keep Focus tab small - only what you&apos;ll actually do today</li>
                  <li>Clear your Inbox regularly by clarifying vague tasks</li>
                  <li>Use &quot;Do Today&quot; to pull Optional tasks when ready</li>
                </ul>
              </div>
            </div>
          </div>
        ) : activeTab === 'projects' && !selectedProject ? (
          // Projects list view
          projects.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <p className="text-lg mb-2">No projects yet</p>
              <p className="text-sm">Assign tasks to projects to see them here</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {projects.map((project) => (
                <li
                  key={project.name}
                  onClick={() => setSelectedProject(project.name)}
                  className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow bg-white border-gray-200 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{project.name}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {project.taskCount - project.completedCount} active
                        {project.completedCount > 0 && `, ${project.completedCount} done`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {project.hasNextAction && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                          Has next action
                        </span>
                      )}
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : activeTab === 'projects' && selectedProject ? (
          // Project tasks view
          <div>
            <button
              onClick={() => setSelectedProject(null)}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 mb-4 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Projects
            </button>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">{selectedProject}</h3>
            {todos.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <p className="text-lg mb-2">No active tasks</p>
                <p className="text-sm">All tasks in this project are complete</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {todos.map((todo) => (
                  <li
                    key={todo.id}
                    className="border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow bg-white border-gray-200"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleSelection(todo.id)}
                        className={`mt-0.5 w-5 h-5 rounded transition-colors cursor-pointer flex items-center justify-center ${
                          selectedIds.has(todo.id)
                            ? 'bg-blue-500 hover:bg-blue-600'
                            : 'border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                        title="Select"
                      >
                        {selectedIds.has(todo.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800">
                          {todo.nextAction || todo.title}
                        </p>
                        {todo.nextAction && todo.nextAction !== todo.title && (
                          <p className="text-xs text-gray-400 mt-0.5">{todo.title}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {todo.dueDate && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              isOverdue(todo.dueDate)
                                ? 'bg-red-50 text-red-600 font-medium'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {isOverdue(todo.dueDate) && 'Overdue: '}
                              {formatDate(todo.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Do Today button for project tasks */}
                      <div className="ml-2 flex-shrink-0">
                        <button
                          onClick={() => handleDoToday(todo.id)}
                          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                          title="Move to Today"
                        >
                          Do Today
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : todos.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg mb-2">
              {activeTab === 'focus' && 'All caught up for today!'}
              {activeTab === 'later' && 'No upcoming deadlines'}
              {activeTab === 'optional' && 'No optional tasks'}
              {activeTab === 'inbox' && 'Inbox is clear'}
              {activeTab === 'done' && 'No completed tasks'}
            </p>
            <p className="text-sm">
              {activeTab === 'focus' && 'No tasks with deadlines due today'}
              {activeTab === 'later' && 'Tasks with future deadlines appear here'}
              {activeTab === 'optional' && 'Tasks you can do anytime appear here'}
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
                    onClick={() => toggleSelection(todo.id)}
                    className={`mt-0.5 w-5 h-5 rounded transition-colors cursor-pointer flex items-center justify-center ${
                      selectedIds.has(todo.id)
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : 'border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                    }`}
                    title="Select"
                  >
                    {selectedIds.has(todo.id) && (
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
                      {todo.completedAt && (
                        <span className="text-xs text-gray-400">
                          Completed {new Date(todo.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Action buttons based on tab */}
                  {todo.status !== 'done' && (
                    <div className="ml-2 flex-shrink-0 flex gap-1">
                      {/* Do Today button - on Later and Can Do tabs */}
                      {(activeTab === 'later' || activeTab === 'optional') && (
                        <button
                          onClick={() => handleDoToday(todo.id)}
                          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                          title="Move to Focus"
                        >
                          Do Today
                        </button>
                      )}
                      {/* Postpone button - only on Focus tab */}
                      {activeTab === 'focus' && (
                        <PostponeDropdown
                          itemId={todo.id}
                          postponeCount={todo.postponeCount}
                          onPostpone={handlePostpone}
                          onRequestConfirmation={handleRequestConfirmation}
                        />
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Floating Add Button */}
      {showAddButton && (
        <button
          onClick={() => handleOpenAddModal(
            activeTab === 'projects' && !selectedProject ? 'project' : 'task'
          )}
          className="absolute bottom-16 right-4 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          title={activeTab === 'projects' && !selectedProject ? 'Add Project' : 'Add Task'}
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

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

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        mode={addMode}
        defaultProject={activeTab === 'projects' && selectedProject ? selectedProject : null}
        defaultToToday={activeTab === 'focus'}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddComplete}
      />
    </div>
  );
}

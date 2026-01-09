"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import PostponeDropdown from "./PostponeDropdown";
import ConfirmationModal from "./ConfirmationModal";
import AddItemModal from "./AddItemModal";

type TabType =
  | "focus"
  | "optional"
  | "later"
  | "inbox"
  | "projects"
  | "done"
  | "howto";

interface TodoItem {
  id: string;
  title: string;
  nextAction: string | null;
  status: "inbox" | "active" | "done" | "someday";
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

interface TodoListProps {
  onClarifyRequest?: (text: string) => void;
  onChatAddRequest?: (prompt: string) => void;
}

// Tab-specific prompts for the "+ Chat" button
// These prompts explicitly reference "todo list" to trigger the todo-manager skill
const CHAT_ADD_PROMPTS: Record<string, string> = {
  focus: "Add to my todo list: I need to do something today. Ask me what.",
  optional: "Add to my todo list: something I can do anytime. Ask me what.",
  later:
    "Add to my todo list: something I can't do until a future date. Ask me what and when.",
  inbox:
    "Add to my todo list: I have a vague idea I want to capture. Ask me what.",
};

const tabs: { id: TabType; label: string; tooltip: string }[] = [
  {
    id: "focus",
    label: "Today",
    tooltip: "Tasks you need to do today or are overdue",
  },
  {
    id: "optional",
    label: "Optional",
    tooltip: "Tasks you can do whenever you have time",
  },
  {
    id: "later",
    label: "Later",
    tooltip: "Tasks you can't start until a future date",
  },
  {
    id: "inbox",
    label: "Inbox",
    tooltip: "Vague ideas that need to be turned into clear tasks",
  },
  {
    id: "projects",
    label: "Projects",
    tooltip: "See your tasks that are part of a project",
  },
  { id: "done", label: "Done", tooltip: "Tasks you have completed" },
  { id: "howto", label: "How To", tooltip: "Learn how to use this todo list" },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00"); // Parse as local date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) {
    return "Today";
  }
  if (date.getTime() === tomorrow.getTime()) {
    return "Tomorrow";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

const postponeOptions = [
  { days: 1, label: "+1 day" },
  { days: 2, label: "+2 days" },
  { days: 3, label: "+3 days" },
  { days: 7, label: "+1 week" },
  { days: 14, label: "+2 weeks" },
  { days: 30, label: "+1 month" },
];

function BulkPostponeDropdown({
  selectedIds,
  onPostpone,
  onClearSelection,
}: {
  selectedIds: Set<string>;
  onPostpone: (
    itemId: string,
    days: number
  ) => Promise<{ needsConfirmation?: boolean }>;
  onClearSelection: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDisabled = selectedIds.size === 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBulkPostpone = async (days: number) => {
    setIsLoading(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await onPostpone(id, days);
      }
      onClearSelection();
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled || isLoading}
        className={`text-xs py-1 px-3 rounded font-medium transition-colors bg-theme-bg-tertiary text-theme-text-secondary ${
          isDisabled || isLoading
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-theme-bg-hover cursor-pointer"
        }`}
      >
        {isLoading ? (
          <span className="flex items-center gap-1">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Postponing...
          </span>
        ) : (
          <>Postpone{selectedIds.size > 0 && ` (${selectedIds.size})`}</>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-32 bg-theme-bg-primary border border-theme-border-primary rounded-lg shadow-theme-lg z-20">
          {postponeOptions.map((option) => (
            <button
              key={option.days}
              onClick={() => handleBulkPostpone(option.days)}
              className="w-full px-3 py-2 text-left text-sm text-theme-text-primary hover:bg-theme-bg-hover first:rounded-t-lg last:rounded-b-lg"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TodoList({
  onClarifyRequest,
  onChatAddRequest,
}: TodoListProps) {
  const [activeTab, setActiveTab] = useState<TabType>("focus");
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<TabType, number>>({
    focus: 0,
    later: 0,
    optional: 0,
    inbox: 0,
    projects: 0,
    done: 0,
    howto: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmationItem, setConfirmationItem] = useState<TodoItem | null>(
    null
  );
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"task" | "project">("task");

  const fetchTodos = useCallback(async () => {
    // Skip fetching for howto tab
    if (activeTab === "howto") {
      setTodos([]);
      setProjects([]);
      setIsLoading(false);
      return;
    }

    // Handle projects tab
    if (activeTab === "projects") {
      try {
        if (selectedProject) {
          // Fetch tasks for specific project
          const response = await fetch(
            `/api/todos/projects?name=${encodeURIComponent(selectedProject)}`
          );
          if (!response.ok) throw new Error("Failed to fetch project tasks");
          const data = await response.json();
          setTodos(data.items);
        } else {
          // Fetch projects list
          const response = await fetch("/api/todos/projects");
          if (!response.ok) throw new Error("Failed to fetch projects");
          const data = await response.json();
          setProjects(data.projects);
          setTodos([]);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const response = await fetch(`/api/todos?tab=${activeTab}`);
      if (!response.ok) {
        throw new Error("Failed to fetch todos");
      }
      const data: TodoData = await response.json();
      setTodos(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
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
        optional: 0,
        inbox: 0,
        projects: 0,
        done: 0,
        howto: 0,
      };

      // Fetch all tabs in parallel (skip howto and projects)
      await Promise.all(
        tabs
          .filter((tab) => tab.id !== "howto" && tab.id !== "projects")
          .map(async (tab) => {
            const response = await fetch(`/api/todos?tab=${tab.id}`);
            if (response.ok) {
              const data: TodoData = await response.json();
              counts[tab.id] = data.count;
            }
          })
      );

      // Fetch projects count separately
      const projectsResponse = await fetch("/api/todos/projects");
      if (projectsResponse.ok) {
        const data = await projectsResponse.json();
        counts.projects = data.count;
      }

      setTabCounts(counts);
    } catch (err) {
      console.error("Failed to fetch tab counts:", err);
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
      const response = await fetch("/api/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed }),
      });
      if (response.ok) {
        fetchTodos();
        fetchCounts();
      }
    } catch (err) {
      console.error("Failed to toggle todo:", err);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
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
    const newCompletedState = activeTab !== "done";
    try {
      // Send requests sequentially to avoid race conditions
      for (const id of Array.from(selectedIds)) {
        await fetch("/api/todos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, completed: newCompletedState }),
        });
      }
      setSelectedIds(new Set());
      fetchTodos();
      fetchCounts();
    } catch (err) {
      console.error("Failed to update todos:", err);
    }
  };

  const handleBulkClarify = () => {
    if (selectedIds.size === 0 || !onClarifyRequest) return;

    const selectedTasks = todos.filter((t) => selectedIds.has(t.id));

    if (selectedTasks.length === 1) {
      onClarifyRequest(
        `I want to clarify the task "${selectedTasks[0].title}"`
      );
    } else {
      const taskList = selectedTasks.map((t) => `- ${t.title}`).join("\n");
      onClarifyRequest(`I want to clarify these tasks:\n${taskList}`);
    }

    setSelectedIds(new Set()); // Clear selection after triggering
  };

  // Clear selections and selected project when tab changes
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectedProject(null);
  }, [activeTab]);

  // Clean up stale selections when todos change
  useEffect(() => {
    const currentIds = new Set(todos.map((t) => t.id));
    setSelectedIds((prev) => {
      const filtered = new Set(
        Array.from(prev).filter((id) => currentIds.has(id))
      );
      return filtered.size !== prev.size ? filtered : prev;
    });
  }, [todos]);

  const handlePostpone = async (
    itemId: string,
    days: number
  ): Promise<{ needsConfirmation?: boolean }> => {
    try {
      const response = await fetch("/api/todos/postpone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, days }),
      });
      if (response.ok) {
        const result = await response.json();
        fetchTodos();
        fetchCounts();
        return { needsConfirmation: result.needsConfirmation };
      }
    } catch (err) {
      console.error("Failed to postpone todo:", err);
    }
    return {};
  };

  const handleRequestConfirmation = (itemId: string) => {
    const item = todos.find((t) => t.id === itemId);
    if (item) {
      setConfirmationItem(item);
      setIsConfirmationOpen(true);
    }
  };

  const handleRemoveTask = async () => {
    if (!confirmationItem) return;
    try {
      const response = await fetch("/api/todos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: confirmationItem.id }),
      });
      if (response.ok) {
        fetchTodos();
        fetchCounts();
      }
    } catch (err) {
      console.error("Failed to remove todo:", err);
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
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch("/api/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, dueDate: today }),
      });
      if (response.ok) {
        fetchTodos();
        fetchCounts();
      }
    } catch (err) {
      console.error("Failed to set task to today:", err);
    }
  };

  const handleOpenAddModal = (mode: "task" | "project") => {
    setAddMode(mode);
    setIsAddModalOpen(true);
  };

  const handleAddComplete = () => {
    fetchTodos();
    fetchCounts();
  };

  // Determine if we should show the floating add button
  const showAddButton =
    activeTab === "focus" ||
    activeTab === "later" ||
    activeTab === "optional" ||
    (activeTab === "projects" && !selectedProject) ||
    (activeTab === "projects" && selectedProject);

  // Determine if we should show the "+ Chat" button (only on tabs with prompts, not projects)
  const showChatAddButton =
    ["focus", "optional", "later", "inbox"].includes(activeTab) &&
    onChatAddRequest;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-theme-text-secondary">
        <svg
          className="animate-spin h-6 w-6 mr-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-theme-error">
        <p className="font-medium">Error loading todos</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Header with Tabs */}
      <div className="border-b border-theme-border-primary bg-theme-bg-primary">
        <div className="px-4 py-2">
          <h2 className="text-lg font-semibold text-theme-text-primary">
            Todo List
          </h2>
        </div>
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-theme-accent-primary text-theme-accent-primary bg-theme-info-bg"
                  : "border-transparent text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover"
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                {tab.label}
                <span
                  className="inline-flex items-center justify-center w-3.5 h-3.5 text-[10px] rounded-full bg-theme-bg-tertiary text-theme-text-tertiary cursor-help"
                  title={tab.tooltip}
                >
                  ?
                </span>
                {tabCounts[tab.id] > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id
                        ? "bg-theme-accent-primary/20 text-theme-accent-primary"
                        : "bg-theme-bg-tertiary text-theme-text-secondary"
                    }`}
                  >
                    {tabCounts[tab.id]}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Todo List */}
      <div className="flex-1 overflow-y-auto p-4 relative">
        {/* Always-visible action button bar */}
        {activeTab !== "howto" &&
          !(activeTab === "projects" && !selectedProject) && (
            <div className="sticky top-0 z-10 mb-3 flex gap-2">
              {(() => {
                const isDisabled = selectedIds.size === 0;
                let buttonLabel: string;
                let buttonColorClasses: string;

                if (activeTab === "inbox") {
                  buttonLabel = isDisabled
                    ? "Clarify"
                    : `Clarify (${selectedIds.size})`;
                  buttonColorClasses = "bg-theme-accent-primary";
                } else if (activeTab === "done") {
                  buttonLabel = isDisabled
                    ? "Undo"
                    : `Undo (${selectedIds.size})`;
                  buttonColorClasses = "bg-theme-warning";
                } else {
                  buttonLabel = isDisabled
                    ? "Complete"
                    : `Complete (${selectedIds.size})`;
                  buttonColorClasses = "bg-theme-success";
                }

                return (
                  <>
                    <button
                      onClick={
                        activeTab === "inbox"
                          ? handleBulkClarify
                          : handleBulkAction
                      }
                      disabled={isDisabled}
                      className={`text-xs py-1 px-3 rounded font-medium transition-colors text-theme-text-inverse ${buttonColorClasses} ${
                        isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:opacity-90"
                      }`}
                    >
                      {buttonLabel}
                    </button>
                    {activeTab === "focus" && (
                      <BulkPostponeDropdown
                        selectedIds={selectedIds}
                        onPostpone={handlePostpone}
                        onClearSelection={() => setSelectedIds(new Set())}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          )}
        {activeTab === "howto" ? (
          <div className="prose prose-sm max-w-none">
            <h3 className="text-lg font-semibold text-theme-text-primary mb-4">
              Getting Started
            </h3>

            <div className="space-y-4">
              <div className="bg-theme-info-bg border border-theme-info rounded-lg p-4">
                <h4 className="font-medium text-theme-info mb-2">
                  Adding Tasks
                </h4>
                <p className="text-theme-text-secondary text-sm">
                  Just type in the chat! Say things like:
                </p>
                <ul className="text-theme-text-secondary text-sm mt-2 space-y-1">
                  <li>
                    &quot;buy groceries&quot; - Goes to Today (do it now)
                  </li>
                  <li>
                    &quot;file taxes after March 1st&quot; - Goes to Later
                    (can&apos;t do it yet)
                  </li>
                  <li>
                    &quot;read that book sometime&quot; - Goes to Optional (whenever)
                  </li>
                  <li>
                    &quot;think about vacation&quot; - Goes to Inbox (needs clarifying)
                  </li>
                </ul>
              </div>

              <div className="bg-theme-success-bg border border-theme-success rounded-lg p-4">
                <h4 className="font-medium text-theme-success mb-2">
                  The Tabs
                </h4>
                <ul className="text-theme-text-secondary text-sm space-y-2">
                  <li>
                    <strong>Today</strong> - Tasks you need to do today or are
                    overdue. Use Postpone if you can&apos;t get to them.
                  </li>
                  <li>
                    <strong>Optional</strong> - Tasks you can do whenever you
                    have time. Click &quot;Do Today&quot; when you&apos;re ready.
                  </li>
                  <li>
                    <strong>Later</strong> - Tasks you can&apos;t start until a
                    future date. They move to Today when the time comes.
                  </li>
                  <li>
                    <strong>Inbox</strong> - Vague ideas that need to become
                    clear tasks. Chat to clarify them.
                  </li>
                  <li>
                    <strong>Done</strong> - Completed tasks for reference.
                  </li>
                </ul>
              </div>

              <div className="bg-theme-info-bg border border-theme-info rounded-lg p-4">
                <h4 className="font-medium text-theme-info mb-2">
                  Completing Tasks
                </h4>
                <p className="text-theme-text-secondary text-sm">
                  Select tasks using the checkboxes, then click the
                  &quot;Complete&quot; button. On the Done tab, use
                  &quot;Undo&quot; to restore tasks.
                </p>
              </div>

              <div className="bg-theme-warning-bg border border-theme-warning rounded-lg p-4">
                <h4 className="font-medium text-theme-warning mb-2">
                  Postponing
                </h4>
                <p className="text-theme-text-secondary text-sm">
                  On the Today tab, click &quot;Postpone&quot; to push a task
                  out. If you postpone something 3+ times, we&apos;ll ask if
                  you want to remove it.
                </p>
              </div>

              <div className="bg-theme-bg-tertiary border border-theme-border-primary rounded-lg p-4">
                <h4 className="font-medium text-theme-text-primary mb-2">
                  Tips
                </h4>
                <ul className="text-theme-text-secondary text-sm space-y-1">
                  <li>
                    Keep Today small - only what you&apos;ll actually do today
                  </li>
                  <li>
                    Clear your Inbox regularly by turning vague ideas into
                    clear tasks
                  </li>
                  <li>
                    Use &quot;Do Today&quot; to pull Optional or Later tasks
                    when ready
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : activeTab === "projects" && !selectedProject ? (
          // Projects list view
          projects.length === 0 ? (
            <div className="text-center text-theme-text-tertiary mt-8">
              <p className="text-lg mb-2">No projects yet</p>
              <p className="text-sm">
                Assign tasks to projects to see them here
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {projects.map((project) => (
                <li
                  key={project.name}
                  onClick={() => setSelectedProject(project.name)}
                  className="border rounded-lg p-4 shadow-theme hover:shadow-theme-md transition-shadow bg-theme-bg-primary border-theme-border-primary cursor-pointer hover:bg-theme-bg-hover"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-theme-text-primary">
                        {project.name}
                      </p>
                      <p className="text-sm text-theme-text-secondary mt-1">
                        {project.taskCount - project.completedCount} active
                        {project.completedCount > 0 &&
                          `, ${project.completedCount} done`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {project.hasNextAction && (
                        <span className="text-xs px-2 py-1 bg-theme-success-bg text-theme-success rounded-full">
                          Has next action
                        </span>
                      )}
                      <svg
                        className="w-5 h-5 text-theme-text-tertiary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : activeTab === "projects" && selectedProject ? (
          // Project tasks view
          <div>
            <button
              onClick={() => setSelectedProject(null)}
              className="flex items-center gap-1 text-theme-accent-primary hover:text-theme-accent-primary-hover mb-4 text-sm font-medium"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Projects
            </button>
            <h3 className="text-lg font-semibold text-theme-text-primary mb-3">
              {selectedProject}
            </h3>
            {todos.length === 0 ? (
              <div className="text-center text-theme-text-tertiary mt-8">
                <p className="text-lg mb-2">No active tasks</p>
                <p className="text-sm">
                  All tasks in this project are complete
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {todos.map((todo) => (
                  <li
                    key={todo.id}
                    className="border rounded-lg p-3 shadow-theme hover:shadow-theme-md transition-shadow bg-theme-bg-primary border-theme-border-primary"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleSelection(todo.id)}
                        className={`mt-0.5 w-5 h-5 rounded transition-colors cursor-pointer flex items-center justify-center ${
                          selectedIds.has(todo.id)
                            ? "bg-theme-accent-primary hover:bg-theme-accent-primary-hover"
                            : "border-2 border-theme-border-secondary hover:border-theme-accent-primary hover:bg-theme-info-bg"
                        }`}
                        title="Select"
                      >
                        {selectedIds.has(todo.id) && (
                          <svg
                            className="w-3 h-3 text-theme-text-inverse"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-theme-text-primary">
                          {todo.nextAction || todo.title}
                        </p>
                        {todo.nextAction && todo.nextAction !== todo.title && (
                          <p className="text-xs text-theme-text-tertiary mt-0.5">
                            {todo.title}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {todo.dueDate && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                isOverdue(todo.dueDate)
                                  ? "bg-theme-error-bg text-theme-error font-medium"
                                  : "bg-theme-bg-tertiary text-theme-text-secondary"
                              }`}
                            >
                              {isOverdue(todo.dueDate) && "Overdue: "}
                              {formatDate(todo.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Do Today button for project tasks */}
                      <div className="ml-2 flex-shrink-0">
                        <button
                          onClick={() => handleDoToday(todo.id)}
                          className="text-xs px-2 py-1 rounded bg-theme-info-bg text-theme-accent-primary hover:opacity-80 transition-colors"
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
          <div className="text-center text-theme-text-tertiary mt-8">
            <p className="text-lg mb-2">
              {activeTab === "focus" && "All caught up for today!"}
              {activeTab === "later" && "No upcoming deadlines"}
              {activeTab === "optional" && "No optional tasks"}
              {activeTab === "inbox" && "Inbox is clear"}
              {activeTab === "done" && "No completed tasks"}
            </p>
            <p className="text-sm">
              {activeTab === "focus" && "No tasks with deadlines due today"}
              {activeTab === "later" &&
                "Tasks with future deadlines appear here"}
              {activeTab === "optional" &&
                "Tasks you can do anytime appear here"}
              {activeTab === "inbox" &&
                "Tasks needing clarification appear here"}
              {activeTab === "done" && "Completed tasks will appear here"}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className={`border rounded-lg p-3 shadow-theme hover:shadow-theme-md transition-shadow ${
                  todo.status === "done"
                    ? "bg-theme-bg-tertiary border-theme-border-primary opacity-70"
                    : "bg-theme-bg-primary border-theme-border-primary"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleSelection(todo.id)}
                    className={`mt-0.5 w-5 h-5 rounded transition-colors cursor-pointer flex items-center justify-center ${
                      selectedIds.has(todo.id)
                        ? "bg-theme-accent-primary hover:bg-theme-accent-primary-hover"
                        : "border-2 border-theme-border-secondary hover:border-theme-accent-primary hover:bg-theme-info-bg"
                    }`}
                    title="Select"
                  >
                    {selectedIds.has(todo.id) && (
                      <svg
                        className="w-3 h-3 text-theme-text-inverse"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    {/* Show nextAction for active items, title for inbox */}
                    <p
                      className={`font-medium ${
                        todo.completed
                          ? "text-theme-text-secondary line-through"
                          : "text-theme-text-primary"
                      }`}
                    >
                      {todo.status === "inbox" || !todo.nextAction
                        ? todo.title
                        : todo.nextAction}
                    </p>
                    {/* Show original title if different from nextAction */}
                    {todo.nextAction &&
                      todo.nextAction !== todo.title &&
                      todo.status !== "inbox" && (
                        <p className="text-xs text-theme-text-tertiary mt-0.5">
                          {todo.title}
                        </p>
                      )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {todo.dueDate && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            isOverdue(todo.dueDate)
                              ? "bg-theme-error-bg text-theme-error font-medium"
                              : "bg-theme-bg-tertiary text-theme-text-secondary"
                          }`}
                        >
                          {isOverdue(todo.dueDate) && "Overdue: "}
                          {formatDate(todo.dueDate)}
                        </span>
                      )}
                      {todo.project && (
                        <span className="text-xs px-2 py-0.5 bg-theme-info-bg text-theme-info rounded-full">
                          {todo.project}
                        </span>
                      )}
                      {todo.postponeCount > 0 && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            todo.postponeCount >= 3
                              ? "bg-theme-warning-bg text-theme-warning"
                              : "bg-theme-bg-tertiary text-theme-text-secondary"
                          }`}
                        >
                          Postponed {todo.postponeCount}x
                        </span>
                      )}
                      {todo.completedAt && (
                        <span className="text-xs text-theme-text-tertiary">
                          Completed{" "}
                          {new Date(todo.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Action buttons based on tab */}
                  {todo.status !== "done" && (
                    <div className="ml-2 flex-shrink-0 flex gap-1">
                      {/* Clarify button - on Inbox tab */}
                      {activeTab === "inbox" && onClarifyRequest && (
                        <button
                          onClick={() =>
                            onClarifyRequest(
                              `I want to clarify the task "${todo.title}"`
                            )
                          }
                          className="text-xs px-2 py-1 rounded bg-theme-info-bg text-theme-accent-primary hover:opacity-80 transition-colors"
                          title="Clarify this task"
                        >
                          Clarify
                        </button>
                      )}
                      {/* Do Today button - on Later and Can Do tabs */}
                      {(activeTab === "later" || activeTab === "optional") && (
                        <button
                          onClick={() => handleDoToday(todo.id)}
                          className="text-xs px-2 py-1 rounded bg-theme-info-bg text-theme-accent-primary hover:opacity-80 transition-colors"
                          title="Move to Focus"
                        >
                          Do Today
                        </button>
                      )}
                      {/* Postpone button - only on Focus tab */}
                      {activeTab === "focus" && (
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

      {/* Floating Add Buttons Container */}
      {(showAddButton || showChatAddButton) && (
        <div className="absolute bottom-16 right-4 flex items-center gap-2">
          {/* "+ Chat" button - auto-submits to chat */}
          {showChatAddButton && (
            <button
              onClick={() => onChatAddRequest!(CHAT_ADD_PROMPTS[activeTab])}
              className="w-10 h-10 rounded-full bg-theme-bg-tertiary hover:bg-theme-accent-primary hover:text-theme-text-inverse text-theme-text-primary shadow-theme-md hover:shadow-theme-lg transition-all flex items-center justify-center"
              title="Add via Chat"
            >
              {/* Chat bubble with plus icon */}
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </button>
          )}
          {/* "+" button - opens modal */}
          {showAddButton && (
            <button
              onClick={() =>
                handleOpenAddModal(
                  activeTab === "projects" && !selectedProject
                    ? "project"
                    : "task"
                )
              }
              className="w-14 h-14 rounded-full bg-theme-accent-primary hover:bg-theme-accent-primary-hover text-theme-text-inverse shadow-theme-lg hover:shadow-theme-lg transition-all flex items-center justify-center"
              title={
                activeTab === "projects" && !selectedProject
                  ? "Add Project"
                  : "Add Task"
              }
            >
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 border-t border-theme-border-primary bg-theme-bg-secondary">
        <p className="text-xs text-theme-text-tertiary text-center">
          Auto-refreshing every {POLL_INTERVAL / 1000}s
        </p>
      </div>

      {/* Confirmation Modal for frequently postponed tasks */}
      <ConfirmationModal
        isOpen={isConfirmationOpen}
        title="Task Postponed Multiple Times"
        message={
          confirmationItem
            ? `"${
                confirmationItem.nextAction || confirmationItem.title
              }" has been postponed ${
                confirmationItem.postponeCount
              } times. Would you like to remove it from your list?`
            : ""
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
        defaultProject={
          activeTab === "projects" && selectedProject ? selectedProject : null
        }
        defaultToToday={activeTab === "focus"}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddComplete}
      />
    </div>
  );
}

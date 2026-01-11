/**
 * Zustand Selector Hooks
 *
 * These are the public API for accessing store data.
 * Components use these hooks exclusively - they never import the raw store.
 *
 * Each selector is designed for minimal re-renders:
 * - Single entity selectors only re-render when that specific entity changes
 * - List selectors use useShallow to prevent re-renders when array identity changes
 */

import { useShallow } from 'zustand/react/shallow';
import { useTodoStore } from './todoStore';
import { getTabForTodo, sortTodos } from './todoHelpers';
import type { Todo, Project, TabType } from './types';

/**
 * Select a single todo by ID
 * Only re-renders when this specific todo changes
 */
export function useTodo(id: string): Todo | undefined {
  return useTodoStore((state) => state.entities.todos[id]);
}

/**
 * Select a single project by ID
 * Only re-renders when this specific project changes
 */
export function useProject(id: string): Project | undefined {
  return useTodoStore((state) => state.entities.projects[id]);
}

/**
 * Select all todos for a specific tab
 * Uses useShallow to prevent re-renders when array reference changes but content is same
 */
export function useTodosForTab(tab: TabType): Todo[] {
  return useTodoStore(
    useShallow((state) => {
      return Object.values(state.entities.todos)
        .filter((todo) => getTabForTodo(todo) === tab)
        .sort(sortTodos);
    })
  );
}

/**
 * Select all projects
 * Uses useShallow to prevent unnecessary re-renders
 */
export function useAllProjects(): Project[] {
  return useTodoStore(
    useShallow((state) => {
      return Object.values(state.entities.projects).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    })
  );
}

/**
 * Select tab counts for all tabs
 * Uses useShallow since we're returning an object
 */
export function useTabCounts(): Record<Exclude<TabType, 'projects'>, number> {
  return useTodoStore(
    useShallow((state) => {
      const todos = Object.values(state.entities.todos);
      return {
        focus: todos.filter((t) => getTabForTodo(t) === 'focus').length,
        optional: todos.filter((t) => getTabForTodo(t) === 'optional').length,
        later: todos.filter((t) => getTabForTodo(t) === 'later').length,
        inbox: todos.filter((t) => getTabForTodo(t) === 'inbox').length,
        done: todos.filter((t) => getTabForTodo(t) === 'done').length,
      };
    })
  );
}

/**
 * Select connection status
 * Returns true when Realtime subscription is active
 */
export function useIsConnected(): boolean {
  return useTodoStore((state) => state.isConnected);
}

/**
 * Select last synced timestamp
 */
export function useLastSyncedAt(): number | null {
  return useTodoStore((state) => state.lastSyncedAt);
}

/**
 * Select a project name by ID
 * Useful for displaying project names on todo items
 */
export function useProjectName(projectId: string | null): string | null {
  return useTodoStore((state) =>
    projectId ? state.entities.projects[projectId]?.name ?? null : null
  );
}

/**
 * Project stats for the projects tab display
 */
export interface ProjectStats {
  name: string;
  id: string;
  taskCount: number;
  completedCount: number;
  hasNextAction: boolean;
}

/**
 * Select all projects with computed stats
 * Used for the projects tab list view
 */
export function useProjectStats(): ProjectStats[] {
  return useTodoStore(
    useShallow((state) => {
      const projects = Object.values(state.entities.projects);
      const todos = Object.values(state.entities.todos);

      return projects
        .map((project) => {
          const projectTodos = todos.filter((t) => t.projectId === project.id);
          const completedTodos = projectTodos.filter(
            (t) => t.status === 'done'
          );
          const hasNextAction = projectTodos.some(
            (t) => t.nextAction && t.status !== 'done'
          );

          return {
            id: project.id,
            name: project.name,
            taskCount: projectTodos.length,
            completedCount: completedTodos.length,
            hasNextAction,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    })
  );
}

/**
 * Select todos for a specific project
 * Used when viewing tasks within a project
 */
export function useTodosForProject(projectId: string | null): Todo[] {
  return useTodoStore(
    useShallow((state) => {
      if (!projectId) return [];
      return Object.values(state.entities.todos)
        .filter((todo) => todo.projectId === projectId && todo.status !== 'done')
        .sort(sortTodos);
    })
  );
}

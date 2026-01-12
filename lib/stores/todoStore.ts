/**
 * Zustand Todo Store
 *
 * A normalized store that mirrors database state and receives updates via Supabase Realtime.
 * Components access data via selector hooks, never directly.
 */

import { create } from 'zustand';
import type { TodoStore, Todo, Project, RealtimePayload } from './types';

export const useTodoStore = create<TodoStore>()((set) => ({
  // === Initial State ===
  entities: {
    todos: {},
    projects: {},
  },
  isConnected: false,
  lastSyncedAt: null,

  // === Internal Actions ===

  /**
   * Replace all todos with a new set (used for initial load and reconnection)
   */
  _setTodos: (todos: Todo[]) => {
    const todosRecord: Record<string, Todo> = {};
    for (const todo of todos) {
      todosRecord[todo.id] = todo;
    }
    set((state) => ({
      entities: { ...state.entities, todos: todosRecord },
    }));
  },

  /**
   * Replace all projects with a new set (used for initial load and reconnection)
   */
  _setProjects: (projects: Project[]) => {
    const projectsRecord: Record<string, Project> = {};
    for (const project of projects) {
      projectsRecord[project.id] = project;
    }
    set((state) => ({
      entities: { ...state.entities, projects: projectsRecord },
    }));
  },

  /**
   * Apply a realtime change to a todo (INSERT, UPDATE, or DELETE)
   */
  _applyTodoChange: (payload: RealtimePayload) => {
    const { eventType, new: newRow, old: oldRow } = payload;

    set((state) => {
      const todos = { ...state.entities.todos };

      if (eventType === 'INSERT' && newRow.id) {
        todos[newRow.id as string] = newRow as unknown as Todo;
      } else if (eventType === 'UPDATE' && newRow.id) {
        todos[newRow.id as string] = newRow as unknown as Todo;
      } else if (eventType === 'DELETE' && oldRow.id) {
        delete todos[oldRow.id as string];
      }

      return { entities: { ...state.entities, todos } };
    });
  },

  /**
   * Apply a realtime change to a project (INSERT, UPDATE, or DELETE)
   */
  _applyProjectChange: (payload: RealtimePayload) => {
    const { eventType, new: newRow, old: oldRow } = payload;

    set((state) => {
      const projects = { ...state.entities.projects };

      if (eventType === 'INSERT' && newRow.id) {
        projects[newRow.id as string] = newRow as unknown as Project;
      } else if (eventType === 'UPDATE' && newRow.id) {
        projects[newRow.id as string] = newRow as unknown as Project;
      } else if (eventType === 'DELETE' && oldRow.id) {
        delete projects[oldRow.id as string];
      }

      return { entities: { ...state.entities, projects } };
    });
  },

  /**
   * Update connection status
   */
  _setConnected: (connected: boolean) => {
    set({ isConnected: connected });
  },

  /**
   * Update last synced timestamp
   */
  _setLastSynced: (timestamp: number) => {
    set({ lastSyncedAt: timestamp });
  },
}));

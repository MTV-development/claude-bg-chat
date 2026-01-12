/**
 * Zustand Store Type Definitions
 *
 * These types define the normalized store structure for reactive state management.
 * The store mirrors database state and receives updates via Supabase Realtime.
 */

// Tab type for filtering todos
export type TabType = 'focus' | 'optional' | 'later' | 'inbox' | 'projects' | 'done';

// Todo status enum matching database
export type TodoStatus = 'inbox' | 'active' | 'someday' | 'done';

// Todo entity matching database schema
export interface Todo {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  nextAction: string | null;
  status: TodoStatus | null;
  dueDate: string | null;
  canDoAnytime: boolean | null;
  postponeCount: number | null;
  createdAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date | null;
}

// Project entity matching database schema
export interface Project {
  id: string;
  userId: string;
  name: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// Payload type for Supabase Realtime events
// Using a simpler type that matches what Supabase actually sends
export interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

// Normalized entity storage
export interface EntityState {
  todos: Record<string, Todo>;
  projects: Record<string, Project>;
}

// Full store interface
export interface TodoStore {
  // === Normalized Entity Storage ===
  entities: EntityState;

  // === Connection State ===
  isConnected: boolean;
  lastSyncedAt: number | null;

  // === Internal Actions (called by sync layer) ===
  _setTodos: (todos: Todo[]) => void;
  _setProjects: (projects: Project[]) => void;
  _applyTodoChange: (payload: RealtimePayload) => void;
  _applyProjectChange: (payload: RealtimePayload) => void;
  _setConnected: (connected: boolean) => void;
  _setLastSynced: (timestamp: number) => void;
}

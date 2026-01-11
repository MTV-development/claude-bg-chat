/**
 * Initial Data Load
 *
 * Fetches todos and projects from Supabase and populates the Zustand store.
 * Called on initial connection and reconnection.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { useTodoStore } from '@/lib/stores/todoStore';
import type { Todo, Project } from '@/lib/stores/types';

// Debug logging
const DEBUG = true;
function log(...args: unknown[]) {
  if (DEBUG) console.log('[InitialLoad]', ...args);
}

/**
 * Load all todos and projects for a user from Supabase
 * and populate the Zustand store.
 */
export async function initialLoad(
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  log('Fetching todos and projects for userId:', userId);

  const [todosResult, projectsResult] = await Promise.all([
    supabase.from('todos').select('*').eq('user_id', userId),
    supabase.from('projects').select('*').eq('user_id', userId),
  ]);

  log('Todos result:', {
    error: todosResult.error,
    count: todosResult.data?.length ?? 0,
    data: todosResult.data
  });
  log('Projects result:', {
    error: projectsResult.error,
    count: projectsResult.data?.length ?? 0,
    data: projectsResult.data
  });

  const store = useTodoStore.getState();

  if (todosResult.data) {
    // Transform database column names to camelCase
    const todos: Todo[] = todosResult.data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      title: row.title,
      nextAction: row.next_action,
      status: row.status,
      dueDate: row.due_date,
      canDoAnytime: row.can_do_anytime,
      postponeCount: row.postpone_count,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    }));
    store._setTodos(todos);
  }

  if (projectsResult.data) {
    // Transform database column names to camelCase
    const projects: Project[] = projectsResult.data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    }));
    store._setProjects(projects);
  }

  store._setLastSynced(Date.now());
}

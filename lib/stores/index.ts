/**
 * Store Module Public API
 *
 * Export only the selector hooks - not the raw store.
 * This maintains encapsulation and ensures components use the proper API.
 */

// Re-export selector hooks
export {
  useTodo,
  useProject,
  useTodosForTab,
  useAllProjects,
  useTabCounts,
  useIsConnected,
  useLastSyncedAt,
  useProjectName,
  useProjectStats,
  useTodosForProject,
} from './selectors';

// Re-export types as needed by consumers
export type { Todo, Project, TabType } from './types';
export type { ProjectStats } from './selectors';

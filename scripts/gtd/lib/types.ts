/**
 * GTD CLI Type Definitions
 *
 * Version 2.0 - Extended for GTD workflow
 */

export type ItemStatus = 'inbox' | 'active' | 'done' | 'someday';
export type Priority = 'high' | 'medium' | 'low';
export type ActivityAction = 'created' | 'postponed' | 'completed' | 'clarified' | 'deleted' | 'uncompleted';

export interface TodoItem {
  id: string;
  title: string;                    // Raw capture / original text
  nextAction: string | null;        // Clarified action (null = needs clarification)
  status: ItemStatus;               // GTD status
  completed: boolean;               // Legacy compat, derived from status === 'done'
  priority: Priority;
  project: string | null;           // Project grouping
  dueDate: string | null;           // ISO date string (tickler)
  createdAt: string;
  completedAt: string | null;
  postponeCount: number;            // Track postponements
  tags: string[];
}

export interface ActivityLogEntry {
  id: string;
  itemId: string;
  action: ActivityAction;
  timestamp: string;
  details: {
    fromDate?: string;
    toDate?: string;
    reason?: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
  };
}

export interface TodoData {
  version: string;
  lastModified: string;
  lastAutoReview: string | null;    // Timestamp of last auto-review
  items: TodoItem[];
  activityLog: ActivityLogEntry[];
}

export type TabType = 'focus' | 'optional' | 'inbox' | 'projects' | 'done';

export interface CommandResult {
  success: boolean;
  error?: string;
  item?: TodoItem;
  items?: TodoItem[];
  removed?: TodoItem;
  count?: number;
  warning?: string;                 // For soft warnings (e.g., postpone count)
  tab?: TabType;                    // Which tab the item belongs to
}

/**
 * Helper to create a new item with GTD defaults
 */
export function createDefaultItem(partial: Partial<TodoItem> & { id: string; title: string; createdAt: string }): TodoItem {
  return {
    nextAction: null,
    status: 'inbox',
    completed: false,
    priority: 'medium',
    project: null,
    dueDate: null,
    completedAt: null,
    postponeCount: 0,
    tags: [],
    ...partial,
  };
}

/**
 * Helper to create empty TodoData structure
 */
export function createEmptyTodoData(): TodoData {
  return {
    version: '2.0',
    lastModified: new Date().toISOString(),
    lastAutoReview: null,
    items: [],
    activityLog: [],
  };
}

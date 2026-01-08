/**
 * GTD CLI Type Definitions
 *
 * Version 3.0 - New task model with explicit hasDeadline/canDoAnytime
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
  hasDeadline: boolean;             // Whether this task has a deadline
  canDoAnytime: boolean;            // Whether this task can be done anytime (Might Do)
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

export type TabType = 'focus' | 'mightdo' | 'inbox' | 'projects' | 'done';

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
    hasDeadline: false,
    canDoAnytime: false,
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
    version: '3.0',
    lastModified: new Date().toISOString(),
    lastAutoReview: null,
    items: [],
    activityLog: [],
  };
}

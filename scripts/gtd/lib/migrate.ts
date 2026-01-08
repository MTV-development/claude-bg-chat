/**
 * Migration utilities for GTD data schema
 *
 * Handles migration from v1.0 to v2.0 to v3.0 to v4.0 schema
 * v4.0: Removed priority, tags, hasDeadline (deadline implicit from dueDate)
 */

import { TodoData, TodoItem, createEmptyTodoData } from './types';

interface V1Item {
  id: string;
  title: string;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  tags?: string[];
}

interface V1Data {
  version: string;
  lastModified: string;
  items: V1Item[];
}

/**
 * Migrate a v1 item to v4 format
 */
export function migrateItem(v1Item: V1Item): TodoItem {
  const canDoAnytime = v1Item.dueDate === null && !v1Item.completed;

  return {
    id: v1Item.id,
    title: v1Item.title,
    nextAction: v1Item.title,  // Copy title as initial nextAction
    status: v1Item.completed ? 'done' : 'active',
    completed: v1Item.completed,
    project: null,
    dueDate: v1Item.dueDate,
    canDoAnytime,
    createdAt: v1Item.createdAt,
    completedAt: v1Item.completedAt,
    postponeCount: 0,
  };
}

/**
 * Migrate v1 data to v4 format
 */
export function migrateV1ToV4(v1Data: V1Data): TodoData {
  return {
    version: '4.0',
    lastModified: v1Data.lastModified || new Date().toISOString(),
    lastAutoReview: null,
    items: v1Data.items.map(migrateItem),
    activityLog: [],
  };
}

/**
 * Check if data needs migration to v4
 */
export function needsMigrationToV4(data: { version?: string }): boolean {
  if (!data.version) return true;
  const major = parseInt(data.version.split('.')[0], 10);
  return major < 4;
}

/**
 * Migrate data to v4 format (main entry point)
 */
export function ensureV4(data: unknown): TodoData {
  // Handle null/undefined
  if (!data || typeof data !== 'object') {
    return createEmptyTodoData();
  }

  const d = data as Record<string, unknown>;

  // Check if already v4
  if (!needsMigrationToV4(d as { version?: string })) {
    const v4Data = d as unknown as TodoData;
    return {
      version: v4Data.version || '4.0',
      lastModified: v4Data.lastModified || new Date().toISOString(),
      lastAutoReview: v4Data.lastAutoReview ?? null,
      items: (v4Data.items || []).map(ensureItemV4),
      activityLog: v4Data.activityLog || [],
    };
  }

  // Migrate older data to v4
  console.log('[migrate] Migrating data to v4...');
  const oldData = d as unknown as { items?: unknown[]; lastModified?: string; lastAutoReview?: string | null; activityLog?: unknown[] };

  return {
    version: '4.0',
    lastModified: oldData.lastModified || new Date().toISOString(),
    lastAutoReview: oldData.lastAutoReview ?? null,
    items: (oldData.items || []).map((item) => migrateOldItemToV4(item as Record<string, unknown>)),
    activityLog: (oldData.activityLog || []) as TodoData['activityLog'],
  };
}

/**
 * Migrate an old item (v1-v3) to v4 format
 */
function migrateOldItemToV4(item: Record<string, unknown>): TodoItem {
  const id = item.id as string;
  const title = item.title as string;
  const nextAction = (item.nextAction as string | null) ?? title;
  const completed = item.completed as boolean ?? false;
  const status = (item.status as TodoItem['status']) ?? (completed ? 'done' : 'active');
  const dueDate = item.dueDate as string | null ?? null;

  // Determine canDoAnytime from old hasDeadline/canDoAnytime or infer from data
  let canDoAnytime = item.canDoAnytime as boolean ?? false;
  if (!canDoAnytime && item.hasDeadline === false && dueDate === null && status !== 'inbox') {
    // Old v3 items without deadline that were active should be canDoAnytime
    canDoAnytime = true;
  }

  return {
    id,
    title,
    nextAction,
    status,
    completed,
    project: item.project as string | null ?? null,
    dueDate,
    canDoAnytime,
    createdAt: item.createdAt as string ?? new Date().toISOString(),
    completedAt: item.completedAt as string | null ?? null,
    postponeCount: item.postponeCount as number ?? 0,
  };
}

/**
 * Ensure an item has all v4 fields
 */
export function ensureItemV4(item: Partial<TodoItem> & { id: string; title: string }): TodoItem {
  return {
    id: item.id,
    title: item.title,
    nextAction: item.nextAction ?? item.title,
    status: item.status ?? (item.completed ? 'done' : 'active'),
    completed: item.completed ?? false,
    project: item.project ?? null,
    dueDate: item.dueDate ?? null,
    canDoAnytime: item.canDoAnytime ?? false,
    createdAt: item.createdAt ?? new Date().toISOString(),
    completedAt: item.completedAt ?? null,
    postponeCount: item.postponeCount ?? 0,
  };
}

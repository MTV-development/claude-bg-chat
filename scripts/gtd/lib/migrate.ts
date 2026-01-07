/**
 * Migration utilities for GTD data schema
 *
 * Handles migration from v1.0 to v2.0 schema
 */

import { TodoData, TodoItem, createEmptyTodoData } from './types';

interface V1Item {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  tags: string[];
}

interface V1Data {
  version: string;
  lastModified: string;
  items: V1Item[];
}

/**
 * Migrate a v1 item to v2 format
 */
export function migrateItem(v1Item: V1Item): TodoItem {
  return {
    id: v1Item.id,
    title: v1Item.title,
    nextAction: v1Item.title,  // Copy title as initial nextAction
    status: v1Item.completed ? 'done' : 'active',  // Completed → done, else active
    completed: v1Item.completed,
    priority: v1Item.priority,
    project: null,
    dueDate: v1Item.dueDate,
    createdAt: v1Item.createdAt,
    completedAt: v1Item.completedAt,
    postponeCount: 0,
    tags: v1Item.tags || [],
  };
}

/**
 * Migrate v1 data to v2 format
 */
export function migrateV1ToV2(v1Data: V1Data): TodoData {
  return {
    version: '2.0',
    lastModified: v1Data.lastModified || new Date().toISOString(),
    lastAutoReview: null,
    items: v1Data.items.map(migrateItem),
    activityLog: [],
  };
}

/**
 * Check if data needs migration
 */
export function needsMigration(data: { version?: string }): boolean {
  if (!data.version) return true;
  const major = parseInt(data.version.split('.')[0], 10);
  return major < 2;
}

/**
 * Migrate data if needed, return v2 format
 */
export function ensureV2(data: unknown): TodoData {
  // Handle null/undefined
  if (!data || typeof data !== 'object') {
    return createEmptyTodoData();
  }

  const d = data as Record<string, unknown>;

  // Check version
  if (needsMigration(d as { version?: string })) {
    return migrateV1ToV2(d as unknown as V1Data);
  }

  // Already v2, ensure all fields exist
  const v2Data = d as unknown as TodoData;
  return {
    version: v2Data.version || '2.0',
    lastModified: v2Data.lastModified || new Date().toISOString(),
    lastAutoReview: v2Data.lastAutoReview ?? null,
    items: (v2Data.items || []).map(ensureItemV2),
    activityLog: v2Data.activityLog || [],
  };
}

/**
 * Ensure an item has all v2 fields
 */
export function ensureItemV2(item: Partial<TodoItem> & { id: string; title: string }): TodoItem {
  return {
    id: item.id,
    title: item.title,
    nextAction: item.nextAction ?? item.title,
    status: item.status ?? (item.completed ? 'done' : 'active'),
    completed: item.completed ?? false,
    priority: item.priority ?? 'medium',
    project: item.project ?? null,
    dueDate: item.dueDate ?? null,
    createdAt: item.createdAt ?? new Date().toISOString(),
    completedAt: item.completedAt ?? null,
    postponeCount: item.postponeCount ?? 0,
    tags: item.tags ?? [],
  };
}

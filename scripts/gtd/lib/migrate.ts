/**
 * Migration utilities for GTD data schema
 *
 * Handles migration from v1.0 to v2.0 to v3.0 schema
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
 * Migrate a v1 item to v2/v3 format
 */
export function migrateItem(v1Item: V1Item): TodoItem {
  const hasDeadline = v1Item.dueDate !== null;
  const canDoAnytime = !hasDeadline && !v1Item.completed;

  return {
    id: v1Item.id,
    title: v1Item.title,
    nextAction: v1Item.title,  // Copy title as initial nextAction
    status: v1Item.completed ? 'done' : 'active',  // Completed → done, else active
    completed: v1Item.completed,
    priority: v1Item.priority,
    project: null,
    dueDate: v1Item.dueDate,
    hasDeadline,
    canDoAnytime,
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
 * Check if data needs migration to v2
 */
export function needsMigrationToV2(data: { version?: string }): boolean {
  if (!data.version) return true;
  const major = parseInt(data.version.split('.')[0], 10);
  return major < 2;
}

/**
 * Check if data needs migration to v3
 */
export function needsMigrationToV3(data: { version?: string }): boolean {
  if (!data.version) return true;
  const major = parseInt(data.version.split('.')[0], 10);
  return major < 3;
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
  if (needsMigrationToV2(d as { version?: string })) {
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
 * Migrate data to v3 format
 */
export function ensureV3(data: unknown): TodoData {
  // First ensure v2 format
  const v2Data = ensureV2(data);

  // Check if already v3
  if (!needsMigrationToV3({ version: v2Data.version })) {
    // Already v3, just ensure all v3 fields exist
    return {
      ...v2Data,
      items: v2Data.items.map(ensureItemV3),
    };
  }

  // Migrate v2 to v3
  console.log('[migrate] Migrating data from v2 to v3...');
  return {
    version: '3.0',
    lastModified: v2Data.lastModified,
    lastAutoReview: v2Data.lastAutoReview,
    items: v2Data.items.map(migrateItemV2ToV3),
    activityLog: v2Data.activityLog,
  };
}

/**
 * Migrate a v2 item to v3 format
 *
 * Migration rules:
 * - hasDeadline = dueDate !== null
 * - canDoAnytime = status === 'someday' || (!dueDate && status !== 'inbox')
 */
function migrateItemV2ToV3(item: Partial<TodoItem> & { id: string; title: string }): TodoItem {
  const base = ensureItemV2(item);

  // Determine hasDeadline: true if there's a dueDate
  const hasDeadline = base.dueDate !== null;

  // Determine canDoAnytime:
  // - status === 'someday' (previously Optional/Someday items)
  // - OR no dueDate and status is 'active' (was in Optional tab)
  const canDoAnytime = base.status === 'someday' ||
    (base.dueDate === null && base.status === 'active');

  return {
    ...base,
    hasDeadline,
    canDoAnytime,
  };
}

/**
 * Ensure an item has all v3 fields
 */
export function ensureItemV3(item: Partial<TodoItem> & { id: string; title: string }): TodoItem {
  const base = ensureItemV2(item);
  return {
    ...base,
    hasDeadline: item.hasDeadline ?? (base.dueDate !== null),
    canDoAnytime: item.canDoAnytime ?? false,
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
    hasDeadline: item.hasDeadline ?? false,
    canDoAnytime: item.canDoAnytime ?? false,
    createdAt: item.createdAt ?? new Date().toISOString(),
    completedAt: item.completedAt ?? null,
    postponeCount: item.postponeCount ?? 0,
    tags: item.tags ?? [],
  };
}

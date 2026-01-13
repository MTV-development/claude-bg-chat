/**
 * Realtime Sync Layer
 *
 * Subscribes to Supabase Realtime for live database updates.
 * Changes are automatically applied to the Zustand store.
 */

import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { useTodoStore } from '@/lib/stores/todoStore';
import type { Todo, Project } from '@/lib/stores/types';
import { initialLoad } from './initialLoad';

// Reconnection delay in milliseconds
const RECONNECT_DELAY = 2000;

// Debug logging
const DEBUG = true;
function log(...args: unknown[]) {
  if (DEBUG) console.log('[RealtimeSync]', ...args);
}

/**
 * Transform a database row (snake_case) to a Todo object (camelCase)
 */
function transformTodoRow(row: Record<string, unknown>): Todo {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    projectId: row.project_id as string | null,
    title: row.title as string,
    nextAction: row.next_action as string | null,
    status: row.status as Todo['status'],
    dueDate: row.due_date as string | null,
    canDoAnytime: row.can_do_anytime as boolean | null,
    postponeCount: row.postpone_count as number | null,
    createdAt: row.created_at ? new Date(row.created_at as string) : null,
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
  };
}

/**
 * Transform a database row (snake_case) to a Project object (camelCase)
 */
function transformProjectRow(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    createdAt: row.created_at ? new Date(row.created_at as string) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
  };
}

/**
 * Set up Supabase Realtime subscription for todos and projects.
 * Returns the channel for cleanup.
 */
export function setupTodoSync(
  userId: string,
  supabase: SupabaseClient
): RealtimeChannel {
  log('setupTodoSync called with userId:', userId);
  const store = useTodoStore.getState();
  const channel = supabase.channel(`todos:${userId}`);

  // Subscribe to todos table changes
  log('Setting up postgres_changes listener for todos table');
  const todoFilter = `user_id=eq.${userId}`;
  log('Todo subscription filter:', todoFilter);
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'todos',
      filter: todoFilter,
    },
    (payload) => {
      const payloadUserId = (payload.new as Record<string, unknown>)?.user_id || (payload.old as Record<string, unknown>)?.user_id;
      log('Received todo change:', payload.eventType, 'for user_id:', payloadUserId, 'expected:', userId, payload);

      // SAFETY CHECK: Verify this event is for the correct user
      // Supabase filter should handle this, but we double-check client-side
      if (payloadUserId && payloadUserId !== userId) {
        log('WARNING: Received todo change for WRONG USER! Ignoring. Got:', payloadUserId, 'Expected:', userId);
        return;
      }

      const { eventType, new: newRow, old: oldRow } = payload;

      // Transform and apply the change
      const transformedPayload = {
        eventType: eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        new: newRow ? transformTodoRow(newRow as Record<string, unknown>) : {},
        old: oldRow ? { id: (oldRow as Record<string, unknown>).id } : {},
      };

      log('Applying transformed todo change:', transformedPayload);
      store._applyTodoChange(transformedPayload);
    }
  );

  // Subscribe to projects table changes
  log('Setting up postgres_changes listener for projects table');
  const projectFilter = `user_id=eq.${userId}`;
  log('Project subscription filter:', projectFilter);
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'projects',
      filter: projectFilter,
    },
    (payload) => {
      const payloadUserId = (payload.new as Record<string, unknown>)?.user_id || (payload.old as Record<string, unknown>)?.user_id;
      log('Received project change:', payload.eventType, 'for user_id:', payloadUserId, 'expected:', userId, payload);

      // SAFETY CHECK: Verify this event is for the correct user
      if (payloadUserId && payloadUserId !== userId) {
        log('WARNING: Received project change for WRONG USER! Ignoring. Got:', payloadUserId, 'Expected:', userId);
        return;
      }

      const { eventType, new: newRow, old: oldRow } = payload;

      // Transform and apply the change
      const transformedPayload = {
        eventType: eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        new: newRow ? transformProjectRow(newRow as Record<string, unknown>) : {},
        old: oldRow ? { id: (oldRow as Record<string, unknown>).id } : {},
      };

      log('Applying transformed project change:', transformedPayload);
      store._applyProjectChange(transformedPayload);
    }
  );

  // Handle subscription status changes
  log('Subscribing to channel...');
  channel.subscribe(async (status) => {
    log('Channel status changed:', status);
    if (status === 'SUBSCRIBED') {
      log('Channel SUBSCRIBED, calling initialLoad...');
      // Initial load after subscription is ready
      await initialLoad(userId, supabase);
      log('initialLoad complete, setting connected=true');
      store._setConnected(true);
    } else if (
      status === 'CHANNEL_ERROR' ||
      status === 'TIMED_OUT' ||
      status === 'CLOSED'
    ) {
      log('Channel error/timeout/closed, will retry in', RECONNECT_DELAY, 'ms');
      store._setConnected(false);
      supabase.removeChannel(channel);

      // Retry with backoff
      setTimeout(() => {
        setupTodoSync(userId, supabase);
      }, RECONNECT_DELAY);
    }
  });

  return channel;
}

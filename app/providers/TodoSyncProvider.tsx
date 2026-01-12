'use client';

/**
 * TodoSyncProvider
 *
 * Sets up Supabase Realtime synchronization when user is authenticated.
 * Cleans up subscriptions on unmount or when user changes.
 */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useUser } from '@/lib/hooks/useUser';
import { setupTodoSync } from '@/lib/sync';
import { useTodoStore } from '@/lib/stores/todoStore';
import { createClient } from '@/lib/supabase/client';

// Debug logging
const DEBUG = true;
function log(...args: unknown[]) {
  if (DEBUG) console.log('[TodoSyncProvider]', ...args);
}

interface TodoSyncProviderProps {
  children: ReactNode;
}

export function TodoSyncProvider({ children }: TodoSyncProviderProps) {
  const { user, isLoading } = useUser();
  const channelRef = useRef<RealtimeChannel | null>(null);

  log('Render - user:', user?.id, 'isLoading:', isLoading);

  useEffect(() => {
    log('useEffect triggered - user:', user?.id, 'isLoading:', isLoading);

    // Don't set up sync until we know the auth state
    if (isLoading) {
      log('Still loading auth state, skipping...');
      return;
    }

    // If no user, clean up and clear store
    if (!user?.id) {
      log('No user, cleaning up...');
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Clear store on logout
      const store = useTodoStore.getState();
      store._setTodos([]);
      store._setProjects([]);
      store._setConnected(false);
      return;
    }

    log('User authenticated, setting up sync for:', user.id);
    // Set up sync for authenticated user
    const supabase = createClient();
    channelRef.current = setupTodoSync(user.id, supabase);
    log('setupTodoSync called, channel:', channelRef.current);

    return () => {
      log('Cleanup - removing channel');
      // Cleanup on unmount or user change
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, isLoading]);

  return <>{children}</>;
}

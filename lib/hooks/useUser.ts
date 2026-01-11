'use client';

/**
 * useUser Hook
 *
 * Provides the current authenticated user from Supabase.
 * Subscribes to auth state changes for automatic updates.
 *
 * Supports E2E test mode with NEXT_PUBLIC_E2E_TEST_USER_ID env var.
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// E2E test mode - uses a mock user ID for testing
const E2E_TEST_USER_ID = process.env.NEXT_PUBLIC_E2E_TEST_USER_ID;

interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // E2E test mode - return mock user immediately
    if (E2E_TEST_USER_ID) {
      console.log('[useUser] E2E test mode - using mock user:', E2E_TEST_USER_ID);
      setUser({
        id: E2E_TEST_USER_ID,
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User);
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}

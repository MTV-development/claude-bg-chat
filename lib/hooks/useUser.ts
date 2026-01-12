'use client';

/**
 * useUser Hook
 *
 * Provides the current authenticated user with their APP user ID.
 * This is important because:
 * - Supabase auth returns auth.users.id
 * - Our database uses users.id (app user ID)
 * - Realtime filters need the app user ID to work correctly
 *
 * Supports E2E test mode with NEXT_PUBLIC_E2E_TEST_USER_ID env var.
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// E2E test mode - uses a mock user ID for testing
const E2E_TEST_USER_ID = process.env.NEXT_PUBLIC_E2E_TEST_USER_ID;

interface AppUser {
  id: string;        // App user ID (users.id) - USE THIS for database queries
  authId: string;    // Supabase auth ID (auth.users.id)
  email: string | null;
}

interface UseUserReturn {
  user: AppUser | null;
  isLoading: boolean;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch app user ID from our API
  const fetchAppUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        console.log('[useUser] Got app user:', data.userId);
        setUser({
          id: data.userId,
          authId: data.authId,
          email: data.email,
        });
      } else {
        console.log('[useUser] Not authenticated');
        setUser(null);
      }
    } catch (error) {
      console.error('[useUser] Error fetching app user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // E2E test mode - return mock user immediately
    if (E2E_TEST_USER_ID) {
      console.log('[useUser] E2E test mode - using mock user:', E2E_TEST_USER_ID);
      setUser({
        id: E2E_TEST_USER_ID,
        authId: E2E_TEST_USER_ID,
        email: 'test@example.com',
      });
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    // Initial fetch of app user
    fetchAppUser();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useUser] Auth state change:', event, session?.user?.id);
      if (session?.user) {
        // User logged in - fetch their app user ID
        fetchAppUser();
      } else {
        // User logged out
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAppUser]);

  return { user, isLoading };
}

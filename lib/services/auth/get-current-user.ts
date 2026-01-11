import { createClient } from '@/lib/supabase/server';
import { syncUserFromAuth } from './sync-user';
import { db } from '@/db';
import { users, type User } from '@/db/schema';
import { eq } from 'drizzle-orm';

// E2E test mode - bypass auth when test user ID is set
const E2E_TEST_USER_ID = process.env.NEXT_PUBLIC_E2E_TEST_USER_ID;
const isE2ETestMode = process.env.NODE_ENV === 'development' && E2E_TEST_USER_ID;

export type CurrentUser = {
  /** Supabase auth.users id */
  authId: string;
  /** App users table id (UUID) */
  userId: string;
  /** User email from Supabase auth */
  email: string | null;
  /** Full user record from app database */
  user: User;
};

/**
 * Get the current authenticated user with app user data.
 * Automatically syncs the auth user to the app users table.
 *
 * @returns The current user data, or null if not authenticated
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // E2E test mode - return mock user
  if (isE2ETestMode && E2E_TEST_USER_ID) {
    console.log('[getCurrentUser] E2E test mode - using mock user:', E2E_TEST_USER_ID);
    const [user] = await db.select().from(users).where(eq(users.id, E2E_TEST_USER_ID));
    if (user) {
      return {
        authId: E2E_TEST_USER_ID,
        userId: E2E_TEST_USER_ID,
        email: 'test@example.com',
        user,
      };
    }
    // If user not found in DB, return null (need valid user for E2E)
    console.log('[getCurrentUser] E2E test mode - user not found in database');
    return null;
  }

  const supabase = await createClient();

  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) {
    return null;
  }

  // Sync auth user to app users table and get the app user ID
  const userId = await syncUserFromAuth(authUser);

  // Fetch the full user record
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  return {
    authId: authUser.id,
    userId,
    email: authUser.email ?? null,
    user,
  };
}

/**
 * Get current user or throw an error.
 * Use this in protected routes/API handlers where authentication is required.
 *
 * @throws Error if user is not authenticated
 * @returns The current user data
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error('Authentication required');
  }

  return currentUser;
}

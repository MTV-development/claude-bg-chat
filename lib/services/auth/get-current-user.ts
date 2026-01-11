import { createClient } from '@/lib/supabase/server';
import { syncUserFromAuth } from './sync-user';
import { db } from '@/db';
import { users, type User } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

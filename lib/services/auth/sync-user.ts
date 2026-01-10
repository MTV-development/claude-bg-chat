import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Sync a Supabase auth user to the app users table.
 * Creates a new user if not exists, updates email if changed.
 *
 * @param authUser - The Supabase auth user object
 * @returns The app user ID (UUID from users table, not the auth ID)
 */
export async function syncUserFromAuth(authUser: SupabaseUser): Promise<string> {
  // Check if user exists by authId
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.authId, authUser.id));

  if (existingUsers.length > 0) {
    const existingUser = existingUsers[0];

    // Update email if it has changed
    if (existingUser.email !== authUser.email) {
      await db
        .update(users)
        .set({
          email: authUser.email,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));
    }

    return existingUser.id;
  }

  // Create new user
  const [newUser] = await db
    .insert(users)
    .values({
      authId: authUser.id,
      email: authUser.email,
    })
    .returning();

  return newUser.id;
}

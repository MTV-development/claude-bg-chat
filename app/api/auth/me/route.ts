/**
 * Current User API Route
 *
 * GET /api/auth/me - Returns the current authenticated user's app user ID
 *
 * This bridges the gap between Supabase auth (auth.users.id) and the app
 * user table (users.id). The realtime sync needs the app user ID to filter
 * todos correctly.
 */

import { getCurrentUser } from '@/lib/services/auth/get-current-user';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return Response.json({
      userId: user.userId,      // App user ID (users.id)
      authId: user.authId,      // Supabase auth ID (auth.users.id)
      email: user.email,
    });
  } catch (error) {
    console.error('[/api/auth/me] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

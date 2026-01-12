import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that don't require authentication
const publicRoutes = ['/login', '/auth', '/api/auth/me'];

// Routes that should redirect to main app if already authenticated
const authRoutes = ['/login'];

// E2E test bypass - only in development
// Uses NEXT_PUBLIC_ prefix so it's available on both server and client
const E2E_TEST_USER_ID = process.env.NEXT_PUBLIC_E2E_TEST_USER_ID;
const isE2ETestMode = process.env.NODE_ENV === 'development' && E2E_TEST_USER_ID;

export async function middleware(request: NextRequest) {
  // E2E test bypass - skip auth check when test user ID is set
  if (isE2ETestMode) {
    console.log('[Middleware] E2E test mode - bypassing auth');
    return NextResponse.next();
  }

  const { user, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Check if the route is public
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users to login (except for public routes)
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages to main app
  if (user && isAuthRoute) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public assets (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

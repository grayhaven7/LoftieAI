import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'loftie2024';
const SETTINGS_PASSWORD = process.env.SETTINGS_PASSWORD || 'loftie2024';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- User auth: /api/transform requires a logged-in user ----
  if (pathname === '/api/transform') {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // ---- Admin auth (existing) ----

  // Allow public endpoints:
  // - /api/transformations/mine (browser-based photo history)
  // - /api/transformations/[id] (individual result lookups for shared links)
  if (pathname === '/api/transformations/mine' || pathname.match(/^\/api\/transformations\/[0-9a-f-]{36}$/)) {
    return NextResponse.next();
  }

  // Check for admin auth cookie
  const authCookie = request.cookies.get('loftie-admin-auth');
  if (authCookie?.value === ADMIN_PASSWORD) {
    return NextResponse.next();
  }

  // Check for settings auth cookie (allows access to /settings page)
  if (pathname.startsWith('/settings')) {
    const settingsCookie = request.cookies.get('loftie-settings-auth');
    if (settingsCookie?.value === SETTINGS_PASSWORD) {
      return NextResponse.next();
    }
  }

  // Check for Authorization header (for API routes)
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${ADMIN_PASSWORD}`) {
    return NextResponse.next();
  }

  // API routes return 401
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Page routes redirect to login
  const loginUrl = new URL('/admin-login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/settings/:path*', '/api/transformations/:path*', '/api/debug/:path*', '/api/transform', '/api/users/:path*'],
};

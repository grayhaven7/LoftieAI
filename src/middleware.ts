import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'loftie-admin-2026';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow individual transformation lookups (public results pages need these)
  // Only protect the list endpoint /api/transformations (no trailing ID)
  if (pathname.match(/^\/api\/transformations\/[^/]+$/)) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('loftie-admin-auth');
  if (authCookie?.value === ADMIN_PASSWORD) {
    return NextResponse.next();
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
  matcher: ['/admin/:path*', '/settings/:path*', '/api/transformations/:path*', '/api/debug/:path*'],
};

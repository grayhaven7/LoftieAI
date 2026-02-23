import { NextRequest, NextResponse } from 'next/server';
import { getMagicLinkToken, markMagicLinkTokenUsed, getUserByEmail, saveUser } from '@/lib/storage';
import { createSessionToken, getSessionCookieName } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const tokenId = request.nextUrl.searchParams.get('token');

  if (!tokenId) {
    return redirectWithError(request, 'Missing token');
  }

  // Look up the token
  const tokenData = await getMagicLinkToken(tokenId);

  if (!tokenData) {
    return redirectWithError(request, 'Invalid link');
  }

  // Check if already used
  if (tokenData.used) {
    return redirectWithError(request, 'This link has already been used');
  }

  // Check if expired (15 minutes)
  if (new Date(tokenData.expiresAt) < new Date()) {
    return redirectWithError(request, 'This link has expired');
  }

  // Mark token as used
  await markMagicLinkTokenUsed(tokenId);

  // Find the user by email
  const user = await getUserByEmail(tokenData.email);
  if (!user) {
    return redirectWithError(request, 'User not found');
  }

  // Update lastLoginAt
  user.lastLoginAt = new Date().toISOString();
  await saveUser(user);

  // Create session JWT and set cookie
  const sessionToken = await createSessionToken(user.id);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const redirectUrl = new URL('/', baseUrl);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });

  return response;
}

function redirectWithError(request: NextRequest, message: string): NextResponse {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const url = new URL('/', baseUrl);
  url.searchParams.set('auth_error', message);
  return NextResponse.redirect(url);
}

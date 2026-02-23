import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth';
import { getUser } from '@/lib/storage';

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const user = await getUser(session.userId);
  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
  });
}

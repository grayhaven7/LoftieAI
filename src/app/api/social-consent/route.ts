import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, saveUser } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const { email, consent } = await request.json();

    if (!email || typeof consent !== 'boolean') {
      return NextResponse.json(
        { error: 'Email and consent (boolean) are required' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.socialMediaConsent = consent;
    await saveUser(user);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Social consent error:', error);
    return NextResponse.json(
      { error: 'Failed to save consent' },
      { status: 500 }
    );
  }
}

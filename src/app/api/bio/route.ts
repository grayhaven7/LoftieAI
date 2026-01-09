import { NextResponse } from 'next/server';
import { getSettingsAsync } from '@/lib/settings';

export async function GET() {
  try {
    const settings = await getSettingsAsync();

    return NextResponse.json({
      bio: settings.bio,
    });
  } catch (error) {
    console.error('Error fetching bio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bio' },
      { status: 500 }
    );
  }
}

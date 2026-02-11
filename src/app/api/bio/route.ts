import { NextResponse } from 'next/server';
import { getSettingsAsync } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getSettingsAsync(true);

    return NextResponse.json(
      { bio: settings.bio },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching bio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bio' },
      { status: 500 }
    );
  }
}

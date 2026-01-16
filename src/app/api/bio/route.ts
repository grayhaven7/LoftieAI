import { NextResponse } from 'next/server';
import { getSettingsAsync } from '@/lib/settings';

// Cache bio data for 1 hour (rarely changes)
export const revalidate = 3600;

export async function GET() {
  try {
    const settings = await getSettingsAsync();

    return NextResponse.json(
      { bio: settings.bio },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
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

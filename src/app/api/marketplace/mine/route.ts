import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth';
import { getAllListings } from '@/lib/marketplace-storage';

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const all = await getAllListings();
    const mine = all.filter((l) => l.sellerId === session.userId);
    return NextResponse.json({ listings: mine });
  } catch (error) {
    console.error('[Marketplace API] GET mine error:', error);
    return NextResponse.json({ error: 'Failed to fetch your listings' }, { status: 500 });
  }
}

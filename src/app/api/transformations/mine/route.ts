import { NextRequest, NextResponse } from 'next/server';
import { getTransformations } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const browserId = searchParams.get('browserId');

    if (!browserId) {
      return NextResponse.json(
        { error: 'browserId is required' },
        { status: 400 }
      );
    }

    // Fetch all transformations and filter by browserId
    // Note: For scale, this should use a database index. For now, filter in memory.
    const { transformations } = await getTransformations(200);
    const mine = transformations
      .filter(t => t.browserId === browserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    return NextResponse.json({ transformations: mine });
  } catch (error) {
    console.error('Error fetching user transformations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transformations' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth';
import { getListing, saveListing, deleteListing } from '@/lib/marketplace-storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listing = await getListing(id);
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    return NextResponse.json({ listing });
  } catch (error) {
    console.error('[Marketplace API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const listing = await getListing(id);
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.sellerId !== session.userId) {
      return NextResponse.json({ error: 'Not your listing' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (status && ['active', 'sold', 'removed'].includes(status)) {
      listing.status = status;
      listing.updatedAt = new Date().toISOString();
      await saveListing(listing);
    }

    return NextResponse.json({ listing });
  } catch (error) {
    console.error('[Marketplace API] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const listing = await getListing(id);
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.sellerId !== session.userId) {
      return NextResponse.json({ error: 'Not your listing' }, { status: 403 });
    }

    await deleteListing(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Marketplace API] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 });
  }
}

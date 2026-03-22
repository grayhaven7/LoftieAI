import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSessionFromCookies } from '@/lib/auth';
import { getUser } from '@/lib/storage';
import { getAllListings, saveListing, saveListingImage } from '@/lib/marketplace-storage';
import { MarketplaceListing, MarketplaceCategory } from '@/lib/marketplace-types';

export async function GET() {
  try {
    const listings = await getAllListings();
    // Only return active listings for public view
    const active = listings.filter((l) => l.status === 'active');
    return NextResponse.json({ listings: active });
  } catch (error) {
    console.error('[Marketplace API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Please sign in to post a listing' }, { status: 401 });
    }

    const user = await getUser(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, price, category, location, imageBase64 } = body;

    if (!title || !description || !category || !location || !imageBase64) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = uuidv4();
    const imageFilename = `${id}.jpg`;
    const imageUrl = await saveListingImage(imageBase64, imageFilename);

    const listing: MarketplaceListing = {
      id,
      title: title.trim(),
      description: description.trim(),
      price: price === null || price === '' || price === 'free' ? null : parseFloat(price),
      category: category as MarketplaceCategory,
      location: location.trim(),
      imageUrl,
      status: 'active',
      sellerId: user.id,
      sellerFirstName: user.firstName,
      sellerEmail: user.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveListing(listing);

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error('[Marketplace API] POST error:', error);
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
  }
}

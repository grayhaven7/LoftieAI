import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { saveListing, saveListingImage } from '@/lib/marketplace-storage';
import { MarketplaceListing, MarketplaceCategory } from '@/lib/marketplace-types';

const SEED_SECRET = 'loftie-seed-2026';

interface SeedItem {
  title: string;
  description: string;
  price: number | null;
  category: MarketplaceCategory;
  location: string;
  imageUrl: string;
  sellerFirstName: string;
}

const SAMPLE_ITEMS: SeedItem[] = [
  {
    title: 'Green Velvet Sofa',
    description: 'Beautiful green velvet sofa in great condition. About 7 feet wide. Super comfortable, just redecorating and it no longer fits the new color scheme. Pick up only.',
    price: 180,
    category: 'furniture',
    location: 'San Jose, CA',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
    sellerFirstName: 'Sejal',
  },
  {
    title: 'Book Collection - Design & Architecture',
    description: '15 books on interior design, architecture, and home styling. Includes titles from Martha Stewart, Kelly Wearstler, and Architectural Digest. All in good condition.',
    price: 25,
    category: 'books',
    location: 'Fremont, CA',
    imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80',
    sellerFirstName: 'Priya',
  },
  {
    title: 'Vintage Film Camera - Canon AE-1',
    description: 'Classic Canon AE-1 35mm film camera. Works perfectly, just cleaned and tested. Comes with 50mm f/1.8 lens and original leather case.',
    price: 95,
    category: 'electronics',
    location: 'Palo Alto, CA',
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80',
    sellerFirstName: 'Marcus',
  },
  {
    title: 'Handmade Ceramic Bowl Set',
    description: 'Set of 4 handmade ceramic bowls from a local potter. Beautiful earthy glazes, each one slightly unique. Perfect for soup, salads, or display.',
    price: null,
    category: 'kitchen',
    location: 'Mountain View, CA',
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80',
    sellerFirstName: 'Elena',
  },
  {
    title: 'Monstera in Ceramic Pot',
    description: 'Healthy monstera plant, about 3 feet tall with several fenestrated leaves. Comes with the white ceramic pot. Moving to a smaller place.',
    price: 35,
    category: 'decor',
    location: 'Sunnyvale, CA',
    imageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80',
    sellerFirstName: 'Cassandra',
  },
  {
    title: 'Leather Jacket - Men\'s Medium',
    description: 'Dark brown genuine leather jacket, men\'s medium. Barely worn, got it as a gift. No scratches or marks. Fits true to size.',
    price: 60,
    category: 'clothes',
    location: 'Santa Clara, CA',
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
    sellerFirstName: 'David',
  },
];

export async function POST(request: NextRequest) {
  const { secret } = await request.json();
  if (secret !== SEED_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
  }

  const created: string[] = [];

  for (const item of SAMPLE_ITEMS) {
    try {
      const id = uuidv4();

      // Download image and upload to blob
      const imgRes = await fetch(item.imageUrl);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const base64 = imgBuffer.toString('base64');
      const imageUrl = await saveListingImage(base64, `${id}.jpg`);

      const daysAgo = Math.floor(Math.random() * 7);
      const listing: MarketplaceListing = {
        id,
        title: item.title,
        description: item.description,
        price: item.price,
        category: item.category,
        location: item.location,
        imageUrl,
        status: 'active',
        sellerId: `sample-${item.sellerFirstName.toLowerCase()}`,
        sellerFirstName: item.sellerFirstName,
        sellerEmail: `${item.sellerFirstName.toLowerCase()}@example.com`,
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveListing(listing);
      created.push(item.title);
    } catch (err) {
      console.error(`Failed to create: ${item.title}`, err);
    }
  }

  return NextResponse.json({ created, count: created.length });
}

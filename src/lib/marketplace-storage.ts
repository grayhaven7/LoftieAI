import { put, list, del } from '@vercel/blob';
import { MarketplaceListing } from './marketplace-types';

function getBlobToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN || null;
}

export async function getAllListings(): Promise<MarketplaceListing[]> {
  const token = getBlobToken();
  if (!token) return [];

  try {
    const allBlobs: Awaited<ReturnType<typeof list>>['blobs'] = [];
    let cursor: string | undefined;
    do {
      const result = await list({ prefix: 'marketplace/', limit: 1000, cursor, token });
      allBlobs.push(...result.blobs);
      cursor = result.cursor;
    } while (cursor);

    const listings = await Promise.all(
      allBlobs.map(async (blob) => {
        try {
          const res = await fetch(blob.url, { cache: 'no-store' });
          if (!res.ok) return null;
          return (await res.json()) as MarketplaceListing;
        } catch {
          return null;
        }
      })
    );

    return listings
      .filter((l): l is MarketplaceListing => l !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('[Marketplace] Error fetching listings:', error);
    return [];
  }
}

export async function getListing(id: string): Promise<MarketplaceListing | null> {
  const token = getBlobToken();
  if (!token) return null;

  try {
    const { blobs } = await list({ prefix: `marketplace/${id}.json`, limit: 1, token });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as MarketplaceListing;
  } catch (error) {
    console.error(`[Marketplace] Error fetching listing ${id}:`, error);
    return null;
  }
}

export async function saveListing(listing: MarketplaceListing): Promise<void> {
  const token = getBlobToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not configured');

  await put(`marketplace/${listing.id}.json`, JSON.stringify(listing, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    token,
    cacheControlMaxAge: 0,
  });
}

export async function deleteListing(id: string): Promise<void> {
  const token = getBlobToken();
  if (!token) return;

  try {
    const { blobs } = await list({ prefix: `marketplace/${id}.json`, token });
    for (const blob of blobs) {
      await del(blob.url, { token });
    }
  } catch (error) {
    console.error(`[Marketplace] Error deleting listing ${id}:`, error);
  }
}

export async function saveListingImage(base64Data: string, filename: string): Promise<string> {
  const token = getBlobToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not configured');

  let base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  base64 = base64.replace(/[\s\r\n]+/g, '');
  while (base64.length % 4 !== 0) base64 += '=';

  const buffer = Buffer.from(base64, 'base64');
  const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const blob = await put(`marketplace-images/${filename}`, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    token,
    cacheControlMaxAge: 31536000,
  });

  return blob.url;
}

import { NextResponse } from 'next/server';
import { getTransformations } from '@/lib/storage';
import { list } from '@vercel/blob';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const isVercel = process.env.VERCEL === '1';
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const hasBlobToken = !!blobToken;
  const blobTokenPreview = blobToken 
    ? `${blobToken.substring(0, 15)}...` 
    : 'NOT SET';

  try {
    const transformations = await getTransformations();
    
    // Also list raw blobs to see what's actually in there
    let rawBlobs: any[] = [];
    if (hasBlobToken) {
      const { blobs } = await list({ limit: 20, token: blobToken });
      rawBlobs = blobs.map(b => ({
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
        urlPreview: `${b.url.substring(0, 40)}...`
      }));
    }
    
    return NextResponse.json({
      environment: {
        isVercel,
        hasBlobToken,
        blobTokenPreview,
        useLocalStorage: !hasBlobToken && !isVercel,
        now: new Date().toISOString(),
      },
      storage: {
        transformationCount: transformations.length,
        recentTransformations: transformations.slice(0, 5).map(t => ({
          id: t.id,
          status: t.status,
          createdAt: t.createdAt,
          hasOriginalBase64: !!t.originalImageBase64,
        })),
        recentRawBlobs: rawBlobs,
      },
    });
  } catch (error) {
    // ... rest of the error handling
    return NextResponse.json({
      environment: {
        isVercel,
        hasBlobToken,
        blobTokenPreview,
        useLocalStorage: !hasBlobToken && !isVercel,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}


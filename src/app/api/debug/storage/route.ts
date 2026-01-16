import { NextResponse } from 'next/server';
import { getTransformations } from '@/lib/storage';
import { list, put, del } from '@vercel/blob';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const isVercel = process.env.VERCEL === '1';
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const hasBlobToken = !!blobToken;
  const blobTokenPreview = blobToken
    ? `${blobToken.substring(0, 15)}...${blobToken.slice(-10)}`
    : 'NOT SET';

  // Test blob connectivity
  let blobConnectivity = { status: 'unknown', error: null as string | null, testUrl: null as string | null };
  if (hasBlobToken) {
    try {
      // Try to write a small test file
      const testId = `health-check-${Date.now()}`;
      const testBlob = await put(`_health/${testId}.json`, JSON.stringify({ timestamp: Date.now() }), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        token: blobToken,
      });
      blobConnectivity.testUrl = testBlob.url;

      // Try to read it back
      const readResponse = await fetch(testBlob.url, { cache: 'no-store' });
      if (readResponse.ok) {
        blobConnectivity.status = 'connected';
        // Clean up the test file
        await del(testBlob.url, { token: blobToken }).catch(() => {});
      } else {
        blobConnectivity.status = 'read-failed';
        blobConnectivity.error = `Read returned ${readResponse.status}`;
      }
    } catch (err) {
      blobConnectivity.status = 'error';
      blobConnectivity.error = err instanceof Error ? err.message : String(err);
    }
  } else {
    blobConnectivity.status = 'no-token';
  }

  try {
    const { transformations } = await getTransformations(20);

    // Also list raw blobs to see what's actually in there
    let rawBlobs: { pathname: string; size: number; uploadedAt: Date; url: string }[] = [];
    if (hasBlobToken) {
      const { blobs } = await list({ limit: 20, token: blobToken });
      rawBlobs = blobs.map(b => ({
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
        url: b.url.substring(0, 60) + '...'
      }));
    }

    return NextResponse.json({
      environment: {
        isVercel,
        hasBlobToken,
        blobTokenPreview,
        useLocalStorage: !hasBlobToken && !isVercel,
        now: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
      },
      blobConnectivity,
      storage: {
        transformationCount: transformations.length,
        recentTransformations: transformations.slice(0, 5).map(t => ({
          id: t.id,
          status: t.status,
          createdAt: t.createdAt,
          hasOriginalBase64: !!t.originalImageBase64,
          hasBlobUrl: !!t.blobUrl,
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


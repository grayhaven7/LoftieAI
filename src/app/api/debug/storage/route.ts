import { NextResponse } from 'next/server';
import { getTransformations } from '@/lib/storage';

export async function GET() {
  const isVercel = process.env.VERCEL === '1';
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const hasBlobToken = !!blobToken;
  const blobTokenPreview = blobToken 
    ? `${blobToken.substring(0, 20)}...` 
    : 'NOT SET';

  try {
    const transformations = await getTransformations();
    
    return NextResponse.json({
      environment: {
        isVercel,
        hasBlobToken,
        blobTokenPreview,
        useLocalStorage: !hasBlobToken && !isVercel,
      },
      storage: {
        transformationCount: transformations.length,
        sampleIds: transformations.slice(0, 3).map(t => ({
          id: t.id,
          status: t.status,
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error) {
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


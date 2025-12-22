import { NextRequest, NextResponse } from 'next/server';
import { getTransformation, saveTransformation } from '@/lib/storage';

// Time in ms after which a "processing" transformation is considered stale and marked as failed
const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transformation = await getTransformation(id);

    if (!transformation) {
      return NextResponse.json(
        { error: 'Transformation not found' },
        { status: 404 }
      );
    }

    // Auto-mark stale processing transformations as failed
    if (transformation.status === 'processing') {
      const createdTime = new Date(transformation.createdAt).getTime();
      const now = Date.now();
      if (now - createdTime > PROCESSING_TIMEOUT_MS) {
        console.log(`Marking stale transformation ${id} as failed (created ${transformation.createdAt})`);
        transformation.status = 'failed';
        await saveTransformation(transformation);
      }
    }

    return NextResponse.json(transformation, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error fetching transformation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transformation' },
      { status: 500 }
    );
  }
}





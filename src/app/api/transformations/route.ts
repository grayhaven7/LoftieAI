import { NextResponse } from 'next/server';
import { getTransformations, saveTransformation } from '@/lib/storage';

// Time in ms after which a "processing" transformation is considered stale and marked as failed
const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const transformations = await getTransformations();
    const now = Date.now();
    
    // Auto-mark stale processing transformations as failed
    for (const t of transformations) {
      if (t.status === 'processing') {
        const createdTime = new Date(t.createdAt).getTime();
        if (now - createdTime > PROCESSING_TIMEOUT_MS) {
          console.log(`Marking stale transformation ${t.id} as failed (created ${t.createdAt})`);
          t.status = 'failed';
          await saveTransformation(t);
        }
      }
    }
    
    // Sort by createdAt descending (newest first)
    const sorted = transformations.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(sorted);
  } catch (error) {
    console.error('Error fetching transformations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transformations' },
      { status: 500 }
    );
  }
}





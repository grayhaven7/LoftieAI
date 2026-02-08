import { NextRequest, NextResponse } from 'next/server';
import { getTransformation, saveTransformation } from '@/lib/storage';

/**
 * Email open tracking endpoint
 * Returns a 1x1 transparent pixel and records the email open event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    // Get blobUrl from query params for direct fetch
    const { searchParams } = new URL(request.url);
    const blobUrl = searchParams.get('blobUrl') || undefined;

    // Fetch the transformation
    const transformation = await getTransformation(id, blobUrl);
    
    if (transformation) {
      const now = new Date().toISOString();
      const openCount = (transformation.emailOpenCount || 0) + 1;
      
      // Update tracking fields
      if (!transformation.emailOpenedAt) {
        transformation.emailOpenedAt = now; // First open
      }
      transformation.emailOpenCount = openCount;
      
      // Save the updated transformation
      await saveTransformation(transformation);
      
      console.log(`Email opened for transformation ${id} (open #${openCount})`);
    }
  } catch (error) {
    // Silent fail - don't let tracking errors break the email
    console.error('Email tracking error:', error);
  }

  // Return a 1x1 transparent PNG pixel
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  );

  return new NextResponse(pixel, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

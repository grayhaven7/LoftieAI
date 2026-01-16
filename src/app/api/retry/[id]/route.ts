import { NextRequest, NextResponse } from 'next/server';
import { getTransformation, saveTransformation } from '@/lib/storage';

export const maxDuration = 10;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const transformation = await getTransformation(id);

    if (!transformation) {
      return NextResponse.json(
        { error: 'Transformation not found' },
        { status: 404 }
      );
    }

    // Check if we can retry (need the original image)
    if (!transformation.beforeImageUrl) {
      return NextResponse.json(
        { error: 'Cannot retry - original image not available' },
        { status: 400 }
      );
    }

    // Fetch the original image and convert back to base64
    try {
      const imageResponse = await fetch(transformation.beforeImageUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch original image');
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(imageBuffer).toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
      transformation.originalImageBase64 = `data:${mimeType};base64,${base64}`;
    } catch (fetchError) {
      console.error('Failed to fetch original image for retry:', fetchError);
      return NextResponse.json(
        { error: 'Cannot retry - failed to retrieve original image' },
        { status: 400 }
      );
    }

    // Reset the transformation status
    transformation.status = 'processing';
    transformation.processingStartedAt = undefined;
    transformation.afterImageUrl = '';
    transformation.declutteringPlan = '';
    transformation.audioUrl = '';

    await saveTransformation(transformation);

    console.log(`Transformation ${id} reset for retry`);

    return NextResponse.json({
      id,
      status: 'processing',
      message: 'Transformation queued for retry',
    });
  } catch (error) {
    console.error('Retry error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retry transformation' },
      { status: 500 }
    );
  }
}

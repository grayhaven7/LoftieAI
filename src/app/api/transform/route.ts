import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { saveImage, saveTransformation } from '@/lib/storage';
import { RoomTransformation } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, userEmail } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    const timestamp = Date.now();
    
    console.log(`Creating transformation ${id}`);

    // Save the before image
    const beforeImageUrl = await saveImage(
      imageBase64,
      `before-${id}-${timestamp}.jpg`
    );
    console.log(`Saved before image: ${beforeImageUrl}`);

    // Create initial transformation record with processing status
    const transformation: RoomTransformation = {
      id,
      beforeImageUrl,
      afterImageUrl: '',
      declutteringPlan: '',
      userEmail,
      createdAt: new Date().toISOString(),
      status: 'processing',
      // Store the original base64 so the process endpoint can use it
      originalImageBase64: imageBase64,
    };
    await saveTransformation(transformation);
    console.log(`Created transformation record with status: processing`);

    // Return immediately - processing will happen when the results page loads
    return NextResponse.json({
      id,
      status: 'processing',
    });
  } catch (error) {
    console.error('Transform error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create transformation' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { saveImage, saveTransformation } from '@/lib/storage';
import { RoomTransformation } from '@/lib/types';
import { analyzeImageWithGemini } from '@/lib/gemini';
import { getSettings } from '@/lib/settings';

export const maxDuration = 60; // Increase timeout for image upload and room check

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, userEmail } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Check if the image is a room
    console.log('Detecting if image is a room...');
    const settings = getSettings();
    const roomCheckPrompt = settings.prompts.roomDetection;
    const isRoom = await analyzeImageWithGemini(imageBase64, roomCheckPrompt);
    console.log(`Room detection result: ${isRoom}`);

    // Robust check for 'no' - only if it's clearly 'no' and not 'yes'
    const normalizedResult = isRoom.toLowerCase().trim();
    if (normalizedResult.startsWith('no') || (normalizedResult.includes('no') && !normalizedResult.includes('yes'))) {
      return NextResponse.json(
        { error: "We'd love to help, but that doesn't look like a room! Please upload a photo of a room you'd like to declutter." },
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
    console.log(`[API] Successfully created transformation ${id}. URL should be /results/${id}`);

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

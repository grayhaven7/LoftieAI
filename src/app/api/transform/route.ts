import { NextRequest, NextResponse, after } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { saveImage, saveTransformation, getTransformation } from '@/lib/storage';
import { RoomTransformation } from '@/lib/types';
import { analyzeImageWithGemini, buildPlanPrompt, generateDeclutteringPlan } from '@/lib/gemini';
import { getSettings, getSettingsAsync } from '@/lib/settings';

export const maxDuration = 60; // Increase timeout for image upload and room check

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, userEmail, firstName, lastName, creativityLevel, keepItems, browserId } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    const timestamp = Date.now();
    
    console.log(`Creating transformation ${id}`);

    // Run room detection and image save in PARALLEL (they're independent)
    console.log('Starting room detection and image save in parallel...');
    const settings = getSettings();
    const roomCheckPrompt = settings.prompts.roomDetection;

    const [isRoom, beforeImageUrl] = await Promise.all([
      analyzeImageWithGemini(imageBase64, roomCheckPrompt),
      saveImage(imageBase64, `before-${id}-${timestamp}.jpg`),
    ]);

    console.log(`Room detection result: ${isRoom}`);
    console.log(`Saved before image: ${beforeImageUrl}`);

    // Robust check for 'no' - only if it's clearly 'no' and not 'yes'
    const normalizedResult = isRoom.toLowerCase().trim();
    if (normalizedResult.startsWith('no') || (normalizedResult.includes('no') && !normalizedResult.includes('yes'))) {
      return NextResponse.json(
        { error: "We'd love to help, but that doesn't look like a room! Please upload a photo of a room you'd like to declutter." },
        { status: 400 }
      );
    }

    // Create initial transformation record with processing status
    const transformation: RoomTransformation = {
      id,
      beforeImageUrl,
      afterImageUrl: '',
      declutteringPlan: '',
      userEmail,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      createdAt: new Date().toISOString(),
      status: 'processing',
      // Store the original base64 so the process endpoint can use it
      originalImageBase64: imageBase64,
      // User controls
      creativityLevel: creativityLevel || 'strict',
      keepItems: keepItems || undefined,
      browserId: browserId || undefined,
    };
    await saveTransformation(transformation);
    console.log(`[API] Successfully created transformation ${id}. blobUrl: ${transformation.blobUrl}`);

    // Pre-generate decluttering plan in the background while client navigates to results page.
    // This saves 10-20s because the plan will be ready before /api/process/[id] is called.
    const savedBlobUrl = transformation.blobUrl;
    after(async () => {
      try {
        console.log(`[Transform] Starting background plan generation for ${id}...`);
        const freshSettings = await getSettingsAsync(true);
        const planPrompt = buildPlanPrompt(freshSettings.prompts.declutteringPlan, {
          firstName: firstName || undefined,
          creativityLevel: creativityLevel || 'strict',
          keepItems: keepItems || undefined,
        });

        const imageUrl = imageBase64.startsWith('data:')
          ? imageBase64
          : `data:image/jpeg;base64,${imageBase64}`;

        const declutteringPlan = await generateDeclutteringPlan(imageUrl, planPrompt);

        // Re-fetch transformation (may have been updated) and save the plan
        const current = await getTransformation(id, savedBlobUrl);
        if (current && current.status === 'processing') {
          current.declutteringPlan = declutteringPlan;
          await saveTransformation(current);
          console.log(`[Transform] Pre-generated plan for ${id} (${declutteringPlan.length} chars)`);
        }
      } catch (err) {
        // Not fatal — /api/process/[id] will generate the plan as fallback
        console.error(`[Transform] Background plan generation failed for ${id}:`, err);
      }
    });

    return NextResponse.json({
      id,
      status: 'processing',
      blobUrl: transformation.blobUrl, // Return for direct access
    });
  } catch (error) {
    console.error('Transform error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create transformation' },
      { status: 500 }
    );
  }
}

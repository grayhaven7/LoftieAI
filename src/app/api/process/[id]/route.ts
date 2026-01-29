import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getTransformation, saveImage, saveTransformation, saveAudio } from '@/lib/storage';
import { declutterImageWithGemini, analyzeImageWithGemini } from '@/lib/gemini';
import { getSettingsAsync } from '@/lib/settings';

// Increase timeout for Vercel serverless functions
// This route makes multiple API calls which can take 30-60+ seconds
export const maxDuration = 60; // seconds (requires Vercel Pro for >10s)

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Get blobUrl from query params for direct fetch (faster, avoids list() consistency issues)
  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get('blobUrl') || undefined;

  try {
    console.log(`Processing transformation ${id}`);

    // Get the transformation record
    const transformation = await getTransformation(id, blobUrl);
    
    if (!transformation) {
      return NextResponse.json(
        { error: 'Transformation not found' },
        { status: 404 }
      );
    }

    // If already completed or failed, don't reprocess
    if (transformation.status === 'completed') {
      return NextResponse.json({
        id,
        status: 'completed',
        message: 'Already processed',
      });
    }

    if (transformation.status === 'failed') {
      return NextResponse.json({
        id,
        status: 'failed',
        message: 'Processing previously failed',
      });
    }

    // CLAIM LOGIC: Prevent concurrent processing runs
    const now = Date.now();
    const CLAIM_TIMEOUT = 5 * 60 * 1000; // Increase to 5 minutes
    if (
      transformation.processingStartedAt && 
      (now - transformation.processingStartedAt < CLAIM_TIMEOUT) &&
      transformation.status === 'processing'
    ) {
      console.log(`Transformation ${id} is already being processed (started ${now - transformation.processingStartedAt}ms ago). Returning current status.`);
      return NextResponse.json({
        id,
        status: 'processing',
        message: 'Processing is already in progress',
      });
    }

    // Mark as started processing to lock other requests
    transformation.processingStartedAt = now;
    await saveTransformation(transformation);
    console.log(`Claimed transformation ${id} for processing. Image size: ${transformation.originalImageBase64?.length || 0} chars`);

    // Check if we have the original image to process
    if (!transformation.originalImageBase64) {
      // Try to use the beforeImageUrl if no base64 stored
      console.log('No originalImageBase64 found, transformation may already be processing');
      return NextResponse.json({
        id,
        status: 'processing',
        message: 'Transformation is being processed',
      });
    }

    const openai = getOpenAIClient();
    const timestamp = Date.now();

    // Get current settings for prompts and models (force refresh to get latest prompts)
    const settings = await getSettingsAsync(true);
    
    // Ensure proper base64 data URL format
    const imageUrl = transformation.originalImageBase64.startsWith('data:') 
      ? transformation.originalImageBase64 
      : `data:image/jpeg;base64,${transformation.originalImageBase64}`;

    // STEP 1: Generate the decluttering plan FIRST
    console.log(`Generating decluttering plan...`);
    let planPrompt = settings.prompts.declutteringPlan;

    // Personalize prompt with user's name if available
    const userName = transformation.firstName || '';
    if (userName) {
      planPrompt = `The user's name is ${userName}. Address them by name warmly, e.g. "Hi ${userName}! Let's transform your space together."\n\n` + planPrompt;
    }

    // Adjust prompt based on creativity level
    const creativityLevel = transformation.creativityLevel || 'strict';
    if (creativityLevel === 'strict') {
      planPrompt += `\n\nIMPORTANT: Be VERY conservative. Only suggest removing the most obvious clutter. Preserve as much as possible.`;
    } else if (creativityLevel === 'creative') {
      planPrompt += `\n\nYou have more flexibility to suggest tidying, reorganizing items on surfaces, and light styling while still keeping all furniture and major elements in place.`;
    }

    // Add keep items instruction if specified
    if (transformation.keepItems) {
      planPrompt += `\n\nUSER REQUEST - MUST PRESERVE: The user specifically wants to keep these items: "${transformation.keepItems}". Do NOT suggest removing or moving these items.`;
    }

    let declutteringPlan = await analyzeImageWithGemini(imageUrl, planPrompt);
    
    // Clean up any potential HTML tags just in case
    declutteringPlan = declutteringPlan.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, "");
    
    console.log(`Generated decluttering plan (${declutteringPlan.length} chars)`);

    // STEP 2: Generate the organized room image based on the decluttering plan
    console.log(`Calling Gemini to generate organized room based on plan...`);
    const declutteredImageBase64 = await declutterImageWithGemini(imageUrl, declutteringPlan, {
      creativityLevel,
      keepItems: transformation.keepItems,
      settings, // Pass fresh settings to ensure latest prompts are used
    });
    console.log(`Gemini returned organized room image`);
    
    // Run image save and TTS generation in PARALLEL for speed
    console.log(`Starting parallel save operations...`);

    const saveImagePromise = saveImage(
      declutteredImageBase64,
      `after-${id}-${timestamp}.png`
    );

    // Generate TTS audio in parallel with image save
    const ttsPromise = (async () => {
      if (!declutteringPlan) return '';
      try {
        console.log(`Generating TTS audio...`);
        // Personalize TTS with user's name
        const ttsInput = userName
          ? `Hi ${userName}! Here's your personalized decluttering plan. ${declutteringPlan}`
          : declutteringPlan;
        const ttsResponse = await openai.audio.speech.create({
          model: settings.models.ttsModel as 'tts-1' | 'tts-1-hd',
          voice: settings.models.ttsVoice as 'nova' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer',
          input: ttsInput,
          speed: 0.95,
        });

        const audioBuffer = await ttsResponse.arrayBuffer();
        const url = await saveAudio(audioBuffer, `audio-${id}-${timestamp}.mp3`);
        console.log(`Saved audio: ${url}`);
        return url;
      } catch (ttsError) {
        console.error('TTS generation failed:', ttsError);
        return '';
      }
    })();

    // Wait for both to complete
    const [afterImageUrl, audioUrl] = await Promise.all([saveImagePromise, ttsPromise]);
    console.log(`Parallel save completed. Image: ${afterImageUrl}, Audio: ${audioUrl || 'none'}`);

    if (!afterImageUrl) {
      throw new Error('Failed to save organized image');
    }

    // Update the transformation with results
    transformation.afterImageUrl = afterImageUrl;
    transformation.declutteringPlan = declutteringPlan;
    transformation.audioUrl = audioUrl;
    transformation.status = 'completed';
    // Clear the original base64 to save space
    delete transformation.originalImageBase64;
    await saveTransformation(transformation);
    console.log(`Transformation ${id} completed successfully`);

    // Send email if provided
    if (transformation.userEmail) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        
        console.log(`Sending email for transformation ${id} to ${transformation.userEmail} via ${baseUrl}/api/send-email`);
        
        const emailResponse = await fetch(`${baseUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transformationId: id,
            email: transformation.userEmail,
          }),
        });
        
        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.error('Email API responded with error:', errorData);
        } else {
          console.log(`Email sent successfully for transformation ${id}`);
        }
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }

    return NextResponse.json({
      id,
      status: 'completed',
      afterImageUrl,
      declutteringPlan,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error(`Process error for ${id}:`, errorMessage);
    console.error('Full error:', error);
    console.error('Stack trace:', errorStack);

    // Mark transformation as failed with error details
    try {
      const transformation = await getTransformation(id, blobUrl);
      if (transformation) {
        transformation.status = 'failed';
        delete transformation.originalImageBase64;
        await saveTransformation(transformation);
        console.log(`Marked transformation ${id} as failed: ${errorMessage}`);
      }
    } catch (saveError) {
      console.error('Failed to save failed status:', saveError);
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}





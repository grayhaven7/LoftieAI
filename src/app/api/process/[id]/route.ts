import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Resend } from 'resend';
import { getTransformation, saveImage, saveTransformation, saveAudio } from '@/lib/storage';
import { declutterImageWithGemini, buildPlanPrompt, generateDeclutteringPlan } from '@/lib/gemini';
import { getSettingsAsync } from '@/lib/settings';
import { resizeImageForAPI } from '@/lib/image-utils';

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

    // Fetch transformation and settings in parallel (both are async I/O)
    const [transformation, settings] = await Promise.all([
      getTransformation(id, blobUrl),
      getSettingsAsync(true),
    ]);
    
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

    // Mark as started processing to lock other requests (in-memory only to avoid
    // re-uploading the full base64 payload just for the claim timestamp)
    transformation.processingStartedAt = now;
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

    const timestamp = Date.now();

    // Resize image for faster API processing (1024px max)
    const { base64: resizedBase64, mimeType: resizedMime } = await resizeImageForAPI(transformation.originalImageBase64);
    const imageUrl = `data:${resizedMime};base64,${resizedBase64}`;

    // STEP 1: Get or generate the decluttering plan
    const userName = transformation.firstName || '';
    const creativityLevel = transformation.creativityLevel || 'strict';
    let declutteringPlan = transformation.declutteringPlan || '';

    if (declutteringPlan) {
      // Plan was pre-generated during /api/transform — skip the 10-20s wait
      console.log(`Using pre-generated decluttering plan (${declutteringPlan.length} chars)`);
    } else {
      // Plan not ready yet — wait briefly in case background generation is still running
      console.log(`Plan not pre-generated, waiting briefly...`);
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const fresh = await getTransformation(id, blobUrl);
        if (fresh?.declutteringPlan) {
          declutteringPlan = fresh.declutteringPlan;
          console.log(`Plan arrived after ${i + 1}s wait (${declutteringPlan.length} chars)`);
          break;
        }
      }

      if (!declutteringPlan) {
        // Fallback: generate the plan now
        console.log(`Generating decluttering plan (fallback)...`);
        const planPrompt = buildPlanPrompt(settings.prompts.declutteringPlan, {
          firstName: userName || undefined,
          creativityLevel,
          keepItems: transformation.keepItems,
        });
        declutteringPlan = await generateDeclutteringPlan(imageUrl, planPrompt);
        console.log(`Generated decluttering plan (${declutteringPlan.length} chars)`);
      }
    }

    // Save plan immediately so client can display it while image generates (progressive results)
    transformation.declutteringPlan = declutteringPlan;
    await saveTransformation(transformation);
    console.log(`Saved plan for ${id}, proceeding to image generation...`);

    // STEP 2: Generate image + TTS in PARALLEL
    console.log(`Starting image generation and TTS in parallel...`);

    const ttsPromise = (async () => {
      if (!declutteringPlan) return '';
      try {
        console.log(`Generating TTS audio...`);
        const openai = getOpenAIClient();
        const settings_data = await getSettingsAsync();
        const ttsInput = userName
          ? `Hi ${userName}! Here's your personalized decluttering plan. ${declutteringPlan}`
          : declutteringPlan;
        const ttsResponse = await openai.audio.speech.create({
          model: (settings_data.models?.ttsModel as 'tts-1' | 'tts-1-hd') || 'tts-1',
          voice: (settings_data.models?.ttsVoice as 'nova' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer') || 'nova',
          input: ttsInput.substring(0, 4096),
          speed: 0.95,
        });
        const audioBuffer = await ttsResponse.arrayBuffer();
        const url = await saveAudio(audioBuffer, `audio-${id}-${timestamp}.mp3`);
        console.log(`TTS audio saved: ${url}`);
        return url;
      } catch (ttsError) {
        console.error('TTS generation failed:', ttsError);
        return '';
      }
    })();

    const imagePromise = (async () => {
      console.log(`Calling Gemini to generate organized room based on plan...`);
      const declutteredImageBase64 = await declutterImageWithGemini(imageUrl, declutteringPlan, {
        creativityLevel,
        keepItems: transformation.keepItems,
        settings,
      });
      console.log(`Gemini returned organized room image`);
      const url = await saveImage(declutteredImageBase64, `after-${id}-${timestamp}.png`);
      console.log(`Image saved: ${url}`);
      return url;
    })();

    const [audioUrl, afterImageUrl] = await Promise.all([ttsPromise, imagePromise]);

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

    // Email is sent only when user explicitly requests it from the results page
    // (via /api/send-email) to avoid double-sending

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





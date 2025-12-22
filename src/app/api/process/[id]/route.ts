import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getTransformation, saveImage, saveTransformation, saveAudio } from '@/lib/storage';
import { declutterImageWithGemini, analyzeImageWithGemini } from '@/lib/gemini';

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
  
  try {
    console.log(`Processing transformation ${id}`);
    
    // Get the transformation record
    const transformation = await getTransformation(id);
    
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
    
    // Ensure proper base64 data URL format
    const imageUrl = transformation.originalImageBase64.startsWith('data:') 
      ? transformation.originalImageBase64 
      : `data:image/jpeg;base64,${transformation.originalImageBase64}`;

    // STEP 1: Generate the decluttering plan FIRST
    console.log(`Generating decluttering plan...`);
    const planPrompt = `You are a warm, friendly, and encouraging home organization expert. Your name is Loftie. You help people transform their spaces with compassion and positivity.

Create a personalized decluttering plan based on this room image. Your tone should be:
- Warm and supportive (like a helpful friend)
- Encouraging without being condescending
- Practical and actionable
- Celebratory of small wins

IMPORTANT: Focus on ORGANIZING items, not removing them. Every item in the room should stay - just be tidied up and put in its proper place.

Format your response as a numbered list of 5-8 specific, actionable steps. Each step should:
1. Start with an encouraging phrase
2. Give a specific action about WHERE to put or HOW to organize specific items you see
3. Explain the benefit

Be VERY SPECIFIC about what items you see and exactly where they should go when organized. For example:
- "Fold the blue blanket on the floor and drape it over the armchair"
- "Gather the scattered books and stack them neatly on the nightstand"
- "Pick up the clothes near the bed and fold them into the dresser drawer"

End with a motivational closing message.`;

    const declutteringPlan = await analyzeImageWithGemini(imageUrl, planPrompt);
    console.log(`Generated decluttering plan (${declutteringPlan.length} chars)`);

    // STEP 2: Generate the organized room image based on the decluttering plan
    console.log(`Calling Gemini to generate organized room based on plan...`);
    const declutteredImageBase64 = await declutterImageWithGemini(imageUrl, declutteringPlan);
    console.log(`Gemini returned organized room image`);
    
    // Save the organized image
    const afterImageUrl = await saveImage(
      declutteredImageBase64,
      `after-${id}-${timestamp}.png`
    );
    console.log(`Saved after image: ${afterImageUrl}`);

    if (!afterImageUrl) {
      throw new Error('Failed to save organized image');
    }

    // Generate TTS audio for the decluttering plan
    let audioUrl = '';
    if (declutteringPlan) {
      try {
        console.log(`Generating TTS audio...`);
        const ttsResponse = await openai.audio.speech.create({
          model: 'tts-1',
          voice: 'nova',
          input: declutteringPlan,
          speed: 0.95,
        });

        const audioBuffer = await ttsResponse.arrayBuffer();
        audioUrl = await saveAudio(audioBuffer, `audio-${id}-${timestamp}.mp3`);
        console.log(`Saved audio: ${audioUrl}`);
      } catch (ttsError) {
        console.error('TTS generation failed:', ttsError);
        // Don't fail the whole request if TTS fails
      }
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
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transformationId: id,
            email: transformation.userEmail,
          }),
        });
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
    console.error('Process error:', error);
    
    // Mark transformation as failed
    try {
      const transformation = await getTransformation(id);
      if (transformation) {
        transformation.status = 'failed';
        delete transformation.originalImageBase64;
        await saveTransformation(transformation);
        console.log(`Marked transformation ${id} as failed`);
      }
    } catch (saveError) {
      console.error('Failed to save failed status:', saveError);
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process transformation' },
      { status: 500 }
    );
  }
}



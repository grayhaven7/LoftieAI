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
    
    // Ensure proper base64 data URL format
    const imageUrl = transformation.originalImageBase64.startsWith('data:') 
      ? transformation.originalImageBase64 
      : `data:image/jpeg;base64,${transformation.originalImageBase64}`;

    // STEP 1: Generate the decluttering plan FIRST
    console.log(`Generating decluttering plan...`);
    const planPrompt = `You are Loftie, a professional space organizer with a "Marie Kondo" mindset. 
Task: Create a 5-8 step universal professional organization plan for this space.

CORE DIRECTIVES:
1. TOTAL FURNITURE PRESERVATION: Every piece of furniture (lamps, tables, chairs, shelving, plants, art) MUST remain exactly where it is. Do not delete furniture.
2. 100% FLOOR CLEARANCE: Every single loose item currently on the floor (shoes, bags, toys, books, clutter) must be moved to an appropriate shelf, table, or seating surface. The floor must be perfectly clear except for rugs and furniture legs.
3. MANDATORY FABRIC FOLDING: Every single piece of fabric (blankets, throws, clothes, pajamas) must be neatly folded into a crisp, rectangular stack and placed on a flat surface. No draped or messy fabrics.
4. TRASH ELIMINATION: Identify and remove items that are clearly garbage (crumpled paper, empty cans, debris, small meaningless scraps).
5. FIXTURE TIDYING: Remove any items hanging off lamps, radiators, or handles. The fixtures themselves must stay.
6. UNIVERSAL ALIGNMENT: Align all items on surfaces in neat, parallel rows. Group similar items together.

Step Format: 
- Start with a warm, encouraging phrase.
- Give a specific action based ONLY on what you see in the image. Be explicit about what item and where to move it.
- Briefly explain the benefit.
- IMPORTANT: Put a DOUBLE LINE BREAK between each step. Each step should be a numbered item (e.g. 1. Step content).

Use only plain text. No HTML tags. Close with a motivational message.`;

    let declutteringPlan = await analyzeImageWithGemini(imageUrl, planPrompt);
    
    // Clean up any potential HTML tags just in case
    declutteringPlan = declutteringPlan.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, "");
    
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





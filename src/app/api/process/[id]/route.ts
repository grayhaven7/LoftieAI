import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Resend } from 'resend';
import { getTransformation, saveImage, saveTransformation, saveAudio } from '@/lib/storage';
import { declutterImageWithGemini, buildPlanPrompt, generateDeclutteringPlan } from '@/lib/gemini';
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

    const openai = getOpenAIClient();
    const timestamp = Date.now();

    // Ensure proper base64 data URL format
    const imageUrl = transformation.originalImageBase64.startsWith('data:') 
      ? transformation.originalImageBase64 
      : `data:image/jpeg;base64,${transformation.originalImageBase64}`;

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

    // STEP 2: Generate image + TTS in PARALLEL (TTS only needs the plan, not the image)
    console.log(`Starting image generation and TTS in parallel...`);

    const ttsPromise = (async () => {
      if (!declutteringPlan) return '';
      try {
        console.log(`Generating TTS audio...`);
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

    console.log(`Calling Gemini to generate organized room based on plan...`);
    const declutteredImageBase64 = await declutterImageWithGemini(imageUrl, declutteringPlan, {
      creativityLevel,
      keepItems: transformation.keepItems,
      settings,
    });
    console.log(`Gemini returned organized room image`);

    // Save image and wait for TTS to complete
    const saveImagePromise = saveImage(
      declutteredImageBase64,
      `after-${id}-${timestamp}.png`
    );

    const [afterImageUrl, audioUrl] = await Promise.all([saveImagePromise, ttsPromise]);
    console.log(`Parallel operations completed. Image: ${afterImageUrl}, Audio: ${audioUrl || 'none'}`);

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

    // Send email if provided — call Resend directly instead of internal fetch
    if (transformation.userEmail && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.loftie.ai');
        
        const fromAddress = process.env.EMAIL_FROM || 'Loftie AI <hello@loftie.ai>';
        
        const formattedPlan = declutteringPlan
          ? declutteringPlan.split('\n').filter((line: string) => line.trim()).map((line: string) => `<p style="margin-bottom: 8px;">${line}</p>`).join('')
          : '';

        console.log(`Sending email directly via Resend to ${transformation.userEmail}`);
        
        const result = await resend.emails.send({
          from: fromAddress,
          to: transformation.userEmail,
          subject: '✨ Your Room Transformation is Ready!',
          html: `
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FDF8F3;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="font-size: 28px; color: #3A3A3A; margin: 0; font-weight: 500;">Your Space, Transformed ✨</h1>
                </div>
                <div style="background: #FEFCFA; border-radius: 24px; padding: 32px; box-shadow: 0 4px 24px rgba(58, 58, 58, 0.06);">
                  <p style="color: #8A8A8A; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                    Great news! Your room transformation is complete. Take a look at what your space could become.
                  </p>
                  <div style="margin-bottom: 32px;">
                    <div style="margin-bottom: 20px;">
                      <p style="color: #3A3A3A; font-weight: 600; margin-bottom: 12px; font-size: 14px;">BEFORE:</p>
                      <img src="${transformation.beforeImageUrl}" alt="Before" style="width: 100%; border-radius: 16px;">
                    </div>
                    <div>
                      <p style="color: #3A3A3A; font-weight: 600; margin-bottom: 12px; font-size: 14px;">AFTER:</p>
                      <img src="${afterImageUrl}" alt="After" style="width: 100%; border-radius: 16px;">
                    </div>
                  </div>
                  ${formattedPlan ? `
                  <div style="background-color: #F9F9F9; border-radius: 16px; padding: 24px; margin-bottom: 32px; border-left: 4px solid #9CAF88;">
                    <h2 style="font-size: 18px; color: #3A3A3A; margin-top: 0; margin-bottom: 16px;">Your Decluttering Plan:</h2>
                    <div style="color: #555555; font-size: 15px; line-height: 1.6;">${formattedPlan}</div>
                  </div>
                  ` : ''}
                  <div style="text-align: center;">
                    <a href="${baseUrl}/results/${id}" style="display: inline-block; background: linear-gradient(135deg, #9CAF88 0%, #7A9166 100%); color: white; text-decoration: none; padding: 18px 36px; border-radius: 50px; font-weight: 600; font-size: 16px;">
                      View Full Transformation →
                    </a>
                  </div>
                </div>
                <div style="text-align: center; margin-top: 32px; color: #8A8A8A; font-size: 14px;">
                  <p>Made with 💚 by Loftie AI</p>
                </div>
              </div>
              <!-- Tracking Pixel -->
              <img src="${baseUrl}/api/track-email/${id}${transformation.blobUrl ? `?blobUrl=${encodeURIComponent(transformation.blobUrl)}` : ''}" width="1" height="1" alt="" style="display: block; width: 1px; height: 1px;" />
            </body>
            </html>
          `,
        });

        if (result.error) {
          console.error('Resend error:', result.error);
        } else {
          console.log(`Email sent successfully for transformation ${id}: ${result.data?.id}`);
          // Update transformation with email sent timestamp
          transformation.emailSentAt = new Date().toISOString();
          await saveTransformation(transformation);
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





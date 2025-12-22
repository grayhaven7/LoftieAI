import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { saveImage, saveTransformation, saveAudio } from '@/lib/storage';
import { RoomTransformation } from '@/lib/types';
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

    // Save the before image
    const beforeImageUrl = await saveImage(
      imageBase64,
      `before-${id}-${timestamp}.jpg`
    );

    // Create initial transformation record
    const transformation: RoomTransformation = {
      id,
      beforeImageUrl,
      afterImageUrl: '',
      declutteringPlan: '',
      userEmail,
      createdAt: new Date().toISOString(),
      status: 'processing',
    };
    await saveTransformation(transformation);

    const openai = getOpenAIClient();
    
    // Ensure proper base64 data URL format
    const imageUrl = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    // Use Gemini NanoBanana to declutter the image while keeping it looking the same
    const declutteredImageBase64 = await declutterImageWithGemini(imageUrl);
    
    // Save the decluttered image
    const afterImageUrl = await saveImage(
      declutteredImageBase64,
      `after-${id}-${timestamp}.png`
    );

    if (!afterImageUrl) {
      throw new Error('Failed to generate image');
    }

    // Generate the decluttering plan using Gemini
    const planPrompt = `You are a warm, friendly, and encouraging home organization expert. Your name is Loftie. You help people transform their spaces with compassion and positivity.

Create a personalized decluttering plan based on this room image. Your tone should be:
- Warm and supportive (like a helpful friend)
- Encouraging without being condescending
- Practical and actionable
- Celebratory of small wins

Format your response as a numbered list of 5-8 specific, actionable steps. Each step should:
1. Start with an encouraging phrase
2. Give a specific action
3. Explain the benefit

End with a motivational closing message.

Be specific about what you see in this room and what should be done.`;

    const declutteringPlan = await analyzeImageWithGemini(imageUrl, planPrompt);

    // Generate TTS audio for the decluttering plan
    let audioUrl = '';
    if (declutteringPlan) {
      try {
        const ttsResponse = await openai.audio.speech.create({
          model: 'tts-1',
          voice: 'nova',
          input: declutteringPlan,
          speed: 0.95,
        });

        const audioBuffer = await ttsResponse.arrayBuffer();
        audioUrl = await saveAudio(audioBuffer, `audio-${id}-${timestamp}.mp3`);
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
    await saveTransformation(transformation);

    // Send email if provided
    if (userEmail) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transformationId: id,
            email: userEmail,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Don't fail the whole request if email fails
      }
    }

    return NextResponse.json({
      id,
      afterImageUrl,
      declutteringPlan,
    });
  } catch (error) {
    console.error('Transform error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transform image' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { saveImage, saveTransformation, saveImageFromUrl } from '@/lib/storage';
import { RoomTransformation } from '@/lib/types';

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
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

    // Generate the decluttered/styled image using DALL-E
    // First, we need to analyze the image and create a detailed prompt
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert interior designer and home stager. Analyze the room image and create a detailed prompt for generating a decluttered, styled version of the same room.

IMPORTANT: The prompt should describe:
1. The same room from the exact same angle/perspective
2. All major furniture pieces should remain (sofas, beds, tables, etc.)
3. All clutter, mess, and excessive items should be removed
4. Minimal, tasteful decor additions (artwork, plants, lamps, throw pillows)
5. Clean, organized surfaces
6. Natural lighting enhanced
7. Cohesive color palette

Return ONLY the image generation prompt, nothing else. Make it detailed and specific.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Analyze this room and create a prompt for generating a decluttered, professionally styled version.',
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const imagePrompt = analysisResponse.choices[0]?.message?.content || '';

    // Generate the styled image using DALL-E 3
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Photorealistic interior photography of: ${imagePrompt}

Style: Professional real estate photography, natural lighting, high quality, magazine-worthy home staging. The image should look like a real photograph, not a render or AI-generated. Clean, inviting, and aspirational.`,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
      style: 'natural',
    });

    const generatedImageUrl = imageResponse.data?.[0]?.url;
    if (!generatedImageUrl) {
      throw new Error('Failed to generate image');
    }

    // Save the generated image locally
    const afterImageUrl = await saveImageFromUrl(
      generatedImageUrl,
      `after-${id}-${timestamp}.jpg`
    );

    // Generate the decluttering plan
    const planResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a warm, friendly, and encouraging home organization expert. Your name is Loftie. You help people transform their spaces with compassion and positivity.

Create a personalized decluttering plan based on the before image. Your tone should be:
- Warm and supportive (like a helpful friend)
- Encouraging without being condescending
- Practical and actionable
- Celebratory of small wins

Format your response as a numbered list of 5-8 specific, actionable steps. Each step should:
1. Start with an encouraging phrase
2. Give a specific action
3. Explain the benefit

End with a motivational closing message.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Create a personalized decluttering plan for this room. Be specific about what you see and what should be done.',
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const declutteringPlan = planResponse.choices[0]?.message?.content || '';

    // Update the transformation with results
    transformation.afterImageUrl = afterImageUrl;
    transformation.declutteringPlan = declutteringPlan;
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


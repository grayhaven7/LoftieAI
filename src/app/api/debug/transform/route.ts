import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateImageWithOpenRouter } from '@/lib/openrouter';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, model, provider, prompt } = await request.json();

    if (!imageBase64 || !model || !provider || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let resultImage: string;

    if (provider === 'openrouter') {
      if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });
      }
      resultImage = await generateImageWithOpenRouter(model, prompt, imageBase64);
    } else {
      // Gemini direct
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const geminiModel = genAI.getGenerativeModel({
        model,
        generationConfig: {
          // @ts-expect-error - responseModalities is valid but not in types yet
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      let mimeType = 'image/jpeg';
      const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
      if (mimeMatch) mimeType = mimeMatch[1];

      const result = await geminiModel.generateContent([
        { inlineData: { mimeType, data: base64Data } },
        { text: prompt },
      ]);

      const imagePart = result.response.candidates?.[0]?.content?.parts?.find(
        (part: { inlineData?: { mimeType: string; data: string } }) =>
          part.inlineData?.mimeType?.startsWith('image/')
      );

      if (!imagePart?.inlineData?.data) {
        throw new Error('No image returned from Gemini');
      }

      const outputMimeType = imagePart.inlineData.mimeType || 'image/png';
      resultImage = `data:${outputMimeType};base64,${imagePart.inlineData.data}`;
    }

    return NextResponse.json({ image: resultImage });
  } catch (error) {
    console.error('Debug transform error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transform failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Increase timeout for TTS generation
export const maxDuration = 30;

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
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Check if ElevenLabs API key is available for premium voice
    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL', {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        });

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          return new NextResponse(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
            },
          });
        }
      } catch (elevenLabsError) {
        console.error('ElevenLabs error, falling back to OpenAI:', elevenLabsError);
      }
    }

    // Fallback to OpenAI TTS
    const openai = getOpenAIClient();
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova', // Warm, friendly female voice
      input: text,
      speed: 0.95, // Slightly slower for clarity
    });

    const audioBuffer = await mp3.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    );
  }
}


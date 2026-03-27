import { NextRequest, NextResponse } from 'next/server';
import { generateImageWithOpenRouter } from '@/lib/openrouter';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function generateStylingCueCards(roomDescription: string): Promise<string[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const systemPrompt = `You are Loftie, a home staging and interior design expert created by Sejal Parekh — a certified staging specialist who has staged over $350M in Bay Area properties. Generate practical, specific styling tips to make a decluttered room look staged and beautiful.`;

  const userPrompt = `The room has been decluttered. Now generate exactly 5 concise styling cue cards to help stage and beautify this space.

Room context: ${roomDescription}

Format your response as exactly 5 items, one per line, each starting with an emoji and being 1-2 sentences max. Focus on:
- Adding key decor accents (throw pillows, plants, art)
- Lighting improvements
- Furniture arrangement
- Textiles and soft furnishings
- The "model home" finishing touches Sejal recommends

Example format:
🖼️ Hang a large piece of art on the main wall at eye level to create a focal point.
🌿 Add a potted plant (like a fiddle leaf fig or snake plant) to bring life to the corner.`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://loftie.ai',
      'X-Title': 'Loftie AI',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 400,
    }),
  });

  if (!response.ok) throw new Error('Failed to generate cue cards');

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  
  // Parse lines that start with an emoji
  const lines = text.split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 10);
  
  return lines.slice(0, 5);
}

export async function POST(request: NextRequest) {
  try {
    const { afterImageUrl, roomType } = await request.json();

    if (!afterImageUrl) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const roomContext = roomType || 'living room or bedroom';

    // Fetch the image and convert to base64 — Gemini requires base64, not URLs
    let imageBase64: string;
    if (afterImageUrl.startsWith('data:')) {
      // Already base64
      imageBase64 = afterImageUrl;
    } else {
      const imgRes = await fetch(afterImageUrl);
      if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`);
      const buffer = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get('content-type') || 'image/png';
      imageBase64 = `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
    }

    // Generate styled image and cue cards in parallel
    const stylePrompt = `Transform this already-decluttered room into a beautifully staged, model-home quality space. 
Keep the exact same room layout, walls, and furniture positions.
Add: tasteful decor accents (throw pillows, art, plants, candles), warm inviting lighting, 
coordinated color-scheme textiles, and the polished finishing touches of a $1M staged home.
Style: clean, modern, elegant — like a Pottery Barn or West Elm showroom. 
Make it feel aspirational but achievable. Do not remove furniture.`;

    const [styledImageUrl, cueCards] = await Promise.all([
      generateImageWithOpenRouter(
        'google/gemini-2.5-flash-image',
        stylePrompt,
        imageBase64
      ),
      generateStylingCueCards(roomContext),
    ]);

    return NextResponse.json({
      styledImageUrl,
      cueCards,
    });
  } catch (error) {
    console.error('Style room error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to style room' },
      { status: 500 }
    );
  }
}

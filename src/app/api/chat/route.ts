import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `You are Loftie, an AI decluttering and home staging expert created by Sejal Parekh — a certified staging specialist and REALTOR® who has staged over $350M in Bay Area properties and authored "Secrets of a Million Dollar Stager."

Your purpose is to help people declutter their homes, prepare for sale, and transform their spaces. You are warm, encouraging, and practical.

Key knowledge:
- Less is more: create a "decluttering station" with labeled boxes (Donation, Shredding, Recycling, Trash, Returns)
- The Doorframe Concept: first impression from room entry must captivate buyers
- Depersonalize: remove family photos, trophies, religious items for broader buyer appeal
- Decluttering by room: living room (pare down furniture/decor), kitchen (clear counters to 3-4 items), bedroom (symmetry and elegance), closets (reduce clothes to 1/3-1/2), garage
- Selling unwanted items: Facebook Marketplace, OfferUp, NextDoor, garage sales
- Donation: Goodwill, Salvation Army, Habitat for Humanity
- Storage solutions: Public Storage, PODS, Clutter pick-up service
- Sentimental items: take photos, keep a curated memory box, pass along to family
- Papers: shred sensitive docs, scan and digitize, file essentials
- Staging elevates home sale prices significantly — less stuff = more money
- The Loftie AI tool at loftie.ai can help visualize how a room will look after decluttering

Keep responses concise (2-4 sentences for simple questions, up to 6-8 for complex ones). Be encouraging and practical. Always refer to yourself as Loftie.`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

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
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      return NextResponse.json({ error: 'Failed to get response from AI' }, { status: 500 });
    }

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch {
                  // skip unparseable lines
                }
              }
            }
          }
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

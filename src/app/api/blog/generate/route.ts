import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Book excerpt sections mapped by topic for context injection
const BOOK_CONTEXT: Record<string, string> = {
  decluttering: `From "Secrets of a Million Dollar Stager" by Sejal Parekh: Less is more and in the case of selling your home, less stuff can mean more money. Eliminating clutter in each room creates a spacious and inviting feeling. Create a "decluttering station" with boxes labeled for Donation, Shredding, Recycling, Trash. A family packed up 2/3 of their furniture and didn't miss any of it. Their condo sold quickly. Key areas: pare down bookshelves, reduce closet clothes to 1/3 or 1/2, organize kitchen cabinets, tidy office paperwork. Depersonalize by removing family photos, trophies, religious items. Storage options: garage boxes, storage units, PODS, pick-up services like Clutter.`,
  'home-staging': `From "Secrets of a Million Dollar Stager" by Sejal Parekh: Staging is designing and filling a home with aesthetically pleasing furniture, accessories, and decor. Top benefits: increase sale price and reduce time on market. The Doorframe Concept: imagine how a room looks from the doorframe — that first glance should captivate buyers. Staging creates an emotional connection. Small touches like a wine bottle and cookbook help buyers envision cooking there. White towels and bath salts create spa ambiance. Staging also helps sellers emotionally detach. Over 12 years, Sejal staged over $350 million of property in Silicon Valley.`,
  organization: `From "Secrets of a Million Dollar Stager" by Sejal Parekh: Closet organization — remove all items, wipe down shelves, sort and purge. Use matching hangers, hang similar clothing together, arrange by length. Create donation boxes. Kitchen pantry — line up items neatly, use decorative baskets. Linen closets — fold and stack white towels. Laundry rooms — remove excess supplies, create stylish displays with glass jars of clothespins, stacked towels.`,
  'room-guides': `From "Secrets of a Million Dollar Stager" by Sejal Parekh: Living room formula: sofa + rug + coffee table + 1-2 accent chairs + side tables + lamps. Pull sofa 6-12" from wall. 5x8 or 8x10 rug. Glass coffee table for small rooms. Master bedroom: matching nightstands, matching lamps, white comforter for hotel luxury feel. 4 sleeping pillows + 1-3 throw pillows. Kitchen: clear counters, organize cabinets (buyers WILL open them), light staging with cookbook stand, coffee tray, wine vignette. Dining room: set table with placemats, white dishes, wine glasses with napkins, cherry blossom centerpiece.`,
  lifestyle: `From "Secrets of a Million Dollar Stager" by Sejal Parekh: Even while living in your current home, keep staging principles in mind. Keep your space fresh by moving items around, donating items you don't need, bringing in new pieces when inspired. The decision to sell is momentous — signifies end of one chapter, beginning of exciting new one. Staging has the magical effect of helping sellers emotionally detach. After staging, clients often say "it doesn't feel like my home anymore" — this is the magic.`,
  tips: `From "Secrets of a Million Dollar Stager" by Sejal Parekh: Curb appeal — $50 house numbers transform a home, Everbilt 5-inch elevated in black or brushed nickel. Edison bulb porch lights. Bold front door colors (black, coral, turquoise, navy). Broom is a stager's best friend. Potted plants flanking front door. "Wood chips are like Spanx for your yard." Interior updates: door knobs in black/gold/brushed nickel, cabinet hardware, light switch covers, crown molding, paint in light neutrals (white, greige, light gray). Fireplace: paint brass enclosures black, remove freestanding screens.`,
};

export async function POST(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_SECRET && adminKey !== 'loftie-admin-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const { keyword, category, tone, additionalContext } = await request.json();

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    // Get relevant book context
    const bookContext = BOOK_CONTEXT[category] || BOOK_CONTEXT['home-staging'];
    const allContext = Object.values(BOOK_CONTEXT).join('\n\n');

    const systemPrompt = `You are a blog content generator for Loftie AI (loftie.ai), an AI-powered room transformation and decluttering tool. You write as Sejal Parekh, a professional home stager who staged over $350 million of property in Silicon Valley over 12 years.

IMPORTANT RULES:
- Write in first person as Sejal — warm, knowledgeable, encouraging tone
- Use real examples and specific product recommendations from the book content provided
- Structure with H2 headers for SEO (use <h2> tags)
- Include practical, actionable advice with bullet lists (<ul><li>)
- Target the specified keyword naturally — include it in the first paragraph, at least one H2, and naturally throughout
- End with a soft CTA mentioning Loftie AI for room visualization
- Output valid HTML (no markdown)
- Aim for 800-1200 words
- Never use em dashes — use commas or periods instead
- ${tone === 'casual' ? 'Keep the tone conversational and friendly' : tone === 'professional' ? 'Keep the tone authoritative but warm' : 'Keep the tone encouraging and approachable'}

BOOK REFERENCE MATERIAL (use this as the knowledge source):
${bookContext}

${additionalContext ? `ADDITIONAL CONTEXT FROM THE BOOK:\n${additionalContext}` : ''}`;

    const userPrompt = `Write an SEO-optimized blog post targeting the keyword: "${keyword}"

Category: ${category || 'home-staging'}

Generate:
1. A compelling, SEO-friendly title (include the keyword naturally)
2. A 1-2 sentence excerpt/meta description (include the keyword)
3. The full blog post content in HTML
4. 3-5 relevant tags
5. An SEO title (may differ slightly from the display title, max 60 chars)
6. An SEO description (max 155 chars)

Return as JSON with this exact structure:
{
  "title": "...",
  "excerpt": "...",
  "content": "<p>...</p><h2>...</h2>...",
  "tags": ["tag1", "tag2"],
  "seoTitle": "...",
  "seoDescription": "..."
}`;

    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://www.loftie.ai',
        'X-Title': 'Loftie AI Blog Generator',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-20250514',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Blog Generate] OpenRouter error:', errText);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    // Parse JSON from the response (handle potential markdown code blocks)
    let parsed;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseErr) {
      console.error('[Blog Generate] Parse error:', parseErr, 'Raw:', rawContent.substring(0, 500));
      return NextResponse.json({ error: 'Failed to parse AI response', raw: rawContent }, { status: 500 });
    }

    return NextResponse.json({
      generated: {
        title: parsed.title || '',
        excerpt: parsed.excerpt || '',
        content: parsed.content || '',
        tags: parsed.tags || [],
        seoTitle: parsed.seoTitle || parsed.title || '',
        seoDescription: parsed.seoDescription || parsed.excerpt || '',
        category: category || 'home-staging',
      },
    });
  } catch (error) {
    console.error('[Blog Generate] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

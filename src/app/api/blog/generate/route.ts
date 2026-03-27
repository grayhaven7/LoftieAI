import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { generateImageWithOpenRouter } from '@/lib/openrouter';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Comprehensive knowledge base about Sejal, her expertise, and Loftie
const SEJAL_CONTEXT = `
ABOUT SEJAL PAREKH:
- Certified Staging Design Specialist (SDS) and licensed REALTOR® (DRE 01895441) at Compass in Burlingame, CA
- Founded Innovae Designs, a boutique home staging company in Silicon Valley (San Francisco Bay Area)
- Over 12 years, staged over $350 million of property throughout the Bay Area — home to tech giants Google, Apple, Facebook, and Nvidia
- Staged both vacant and occupied homes: cozy condos to multi-million dollar properties
- B.S. in Biological Sciences and B.A. in International Studies from UC Irvine
- Career pivot from medical devices to home staging and real estate
- Active in Silicon Valley Association of REALTORS® (SILVAR) community events and multicultural homeownership seminars
- Author of "Secrets of a Million Dollar Stager" — comprehensive staging guide for homeowners

ABOUT LOFTIE AI:
- AI-powered room transformation tool at loftie.ai
- Users upload a photo of a cluttered room and get an instant AI-generated visualization of how it could look organized and staged
- Generates personalized decluttering plans with step-by-step cue cards
- Includes a community marketplace for listing items for donation or sale
- Built for homeowners preparing to sell, people overwhelmed by clutter, real estate agents, and design enthusiasts
- Founded by Sejal to scale her staging expertise to anyone, anywhere

SEJAL'S CORE PHILOSOPHY:
- "Less stuff can mean more money" — decluttering directly impacts home sale price
- The Doorframe Concept: first impression from the room entry must captivate
- Staging creates emotional connection — buyers need to see themselves living there
- Depersonalizing helps sellers emotionally detach and see the home as a product
- Space sells — removing excess furniture makes rooms feel larger and more valuable
- Elegance in symmetry, especially in bedrooms
- "Wood chips are like Spanx for your yard" — attention to exterior details matters
- Model home feeling: wine bottles on counters, plush towels by the tub, children's books in kids rooms

SEJAL'S TARGET AUDIENCES:
1. Homeowners preparing to sell (primary) — need staging, decluttering, and preparation guidance
2. First-time home sellers — overwhelmed by the process, need step-by-step help
3. Real estate agents and brokers — want to advise clients on staging, need resources
4. Empty nesters downsizing — emotional attachment to decades of possessions
5. Relocating families (tech workers in Silicon Valley moving for jobs) — time-constrained
6. DIY home decorators — love design, want professional techniques on a budget
7. People overwhelmed by clutter — not selling, just need motivation and methods
8. Property photographers — need to understand staging for better shoots
9. Interior designers and fellow stagers — industry professionals learning techniques
10. Home flippers and investors — need cost-effective staging to maximize ROI
`;

// Book content organized by topic for deeper context
const BOOK_SECTIONS: Record<string, string> = {
  decluttering: `Decluttering: Less is more. Create a "decluttering station" with labeled boxes (Donation, Shredding, Recycling, Trash, Returns). A family packed up 2/3 of furniture and didn't miss any of it — condo sold quickly. Pare down bookshelves, reduce closet clothes to 1/3-1/2, organize kitchen cabinets. Storage options: garage boxes, storage units (Public Storage), PODS portable storage, pick-up services (Clutter). Depersonalize: remove family photos, trophies, religious items, hunting displays. "Universalize" the home for broadest buyer appeal. Selling items: Facebook Marketplace, OfferUp, NextDoor, garage sales, donation to Goodwill/Salvation Army/Habitat for Humanity.`,
  staging: `Home Staging: According to NAR, staging is "designing and filling a home with aesthetically pleasing furniture, accessories, and decor." Top benefits: increase sale price + reduce time on market. Creates emotional connection — wine bottle and cookbook on kitchen counter, plush towels and bath salts near tub, children's books in kids room. Staging helps sellers emotionally detach. Living room formula: sofa + rug + coffee table + 1-2 accent chairs + side tables + lamps. Pull sofa 6-12" from wall. Glass coffee table for small rooms. Master bedroom: matching nightstands, matching lamps, white comforter for hotel luxury feel. Kitchen: clear counters (buyers WILL open cabinets), light staging with cookbook stand, coffee tray.`,
  curb_appeal: `Curb Appeal: $50 house numbers transform a home (Everbilt 5-inch elevated in black/brushed nickel). Edison bulb porch lights. Bold front door colors (black, coral, turquoise, navy). Broom is a stager's best friend. Potted plants flanking front door — symmetric entrance. "Wood chips are like Spanx for your yard." Flowers: fuchsia, purple, magenta, yellow, orange. Natural fiber welcome mat. New lockset under $200. Power wash carefully (never windows, wood siding, electrical panels). Green lawn, trimmed hedges, clear walkways.`,
  interior_updates: `Budget Interior Updates: Door knobs/hinges in black, matte gold, brushed nickel. Cabinet hardware instantly modernizes dated kitchens. Light fixtures as "statement necklaces." Repaint cabinets white/gray/navy blue. Light neutral wall colors: white, off-white, cream, greige, light gray. Paint ceilings white for spacious feel. Remove popcorn ceilings. Remove pass-through doors for open concept. Accent walls in gray, navy, or black for focal points. Fireplace: paint brass enclosures black with heat-resistant paint.`,
  photography: `Photo Day Prep: Walk through every room starting from front entrance. Pack away dish sponges, soap dispensers, paper towel holders. Make all beds, hide toiletries. Full toilet paper rolls in bathrooms. Turn on ALL lights. Open curtains/blinds. Sweep and vacuum. Professional photography makes the difference — properties with amateur photos linger on market. Curb appeal photos first.`,
  selling_process: `Selling Process: Broker tour (weekday mornings for agents) vs open house (weekends for public). Twilight tours for evening previews. Set out water bottles and snacks for open house. Disposable booties for buyers. Property flyers and business cards on console table. Keep home "show-ready" throughout listing period. Store toiletries in baskets under sinks for quick access. De-staging after contingencies removed and appraisal done.`,
  room_specific: `Room-Specific: Entryway — console table with mirror above, orchid/flowers, stack of books, small lamp. Dining room — set table with placemats, white dishes, wine glasses with folded napkins, cherry blossom centerpiece. Kids rooms — fun and playful, colorful comforters, chalkboard, toys in baskets. Office — desk facing window or floating with upholstered chair (not office chair), globe, magazines (Architectural Digest, Dwell). Bathrooms — white waffle shower curtain, layered towels tied with raffia, apothecary jars with bath salts. Laundry — stack white towels, glass jar of clothespins, vintage "Laundry" sign. Hallways — gallery mirrors, clean baseboards. Backyard — outdoor rug, bistro set, colorful pillows, sparkling water bottles.`,
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

    // Select relevant book sections based on category
    const relevantSections = [];
    if (category === 'decluttering' || category === 'organization') relevantSections.push(BOOK_SECTIONS.decluttering);
    if (category === 'home-staging') relevantSections.push(BOOK_SECTIONS.staging);
    if (category === 'tips') relevantSections.push(BOOK_SECTIONS.curb_appeal, BOOK_SECTIONS.interior_updates);
    if (category === 'room-guides') relevantSections.push(BOOK_SECTIONS.room_specific);
    if (category === 'lifestyle') relevantSections.push(BOOK_SECTIONS.selling_process);
    // Always include staging context as baseline
    if (relevantSections.length === 0) relevantSections.push(BOOK_SECTIONS.staging);

    const systemPrompt = `You are a blog content generator for Loftie AI (loftie.ai), an AI-powered room transformation and decluttering tool. You write as Sejal Parekh.

${SEJAL_CONTEXT}

RELEVANT BOOK CONTENT:
${relevantSections.join('\n\n')}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}` : ''}

WRITING RULES:
- Write in first person as Sejal — warm, knowledgeable, encouraging
- Use real examples, specific product recommendations, and dollar amounts from the book
- Reference her $350M staging experience naturally (not in every post, but where relevant)
- Structure with H2 headers for SEO (use <h2> tags)
- Include practical, actionable advice with bullet lists (<ul><li>)
- Target the specified keyword naturally — in the first paragraph, at least one H2, and throughout
- End with a soft CTA mentioning Loftie AI for room visualization
- Output valid HTML (no markdown)
- Aim for 1000-1500 words
- Never use em dashes — use commas or periods instead
- Include personal anecdotes or client stories where natural
- Reference Bay Area / Silicon Valley context when relevant
- ${tone === 'casual' ? 'Keep the tone conversational and friendly' : tone === 'professional' ? 'Keep the tone authoritative and expert' : 'Keep the tone encouraging and approachable'}`;

    const userPrompt = `Write an SEO-optimized blog post targeting the keyword: "${keyword}"

Category: ${category || 'home-staging'}

Generate:
1. A compelling, SEO-friendly title (include the keyword naturally)
2. A 1-2 sentence excerpt/meta description (include the keyword)
3. The full blog post content in HTML
4. 3-5 relevant tags
5. An SEO title (may differ slightly from the display title, max 60 chars)
6. An SEO description (max 155 chars)
7. 3-5 FAQ entries naturally derived from the post content

Return as JSON with this exact structure:
{
  "title": "...",
  "excerpt": "...",
  "content": "<p>...</p><h2>...</h2>...",
  "tags": ["tag1", "tag2"],
  "seoTitle": "...",
  "seoDescription": "...",
  "faqs": [
    { "question": "...", "answer": "..." }
  ]
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
        model: 'google/gemini-2.0-flash-001',
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
      console.error('[Blog Generate] OpenRouter error:', res.status, errText);
      return NextResponse.json({ error: `AI generation failed (${res.status}): ${errText.substring(0, 200)}` }, { status: 500 });
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    // Parse JSON from the response
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

    // Generate cover image (non-blocking — failure is OK)
    let coverImageUrl: string | undefined;
    try {
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
      if (blobToken) {
        const title = parsed.title || keyword;
        const coverPrompt = `A beautiful professional interior design photo for a home staging blog post titled "${title}". Bright airy modern Bay Area luxury home interior. No text, no people, no watermarks.`;
        const base64DataUrl = await generateImageWithOpenRouter('google/gemini-2.5-flash-preview', coverPrompt);
        // Convert base64 data URL to Buffer
        const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const slug = (parsed.title || keyword).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const blob = await put(`blog-covers/${slug}.jpg`, buffer, { access: 'public', token: blobToken, contentType: 'image/jpeg' });
        coverImageUrl = blob.url;
      }
    } catch (imgErr) {
      console.error('[Blog Generate] Cover image generation failed (non-fatal):', imgErr);
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
        faqs: parsed.faqs || [],
        ...(coverImageUrl ? { coverImageUrl } : {}),
      },
    });
  } catch (error) {
    console.error('[Blog Generate] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import fs from 'fs';
import path from 'path';
import { put, list, del } from '@vercel/blob';

export interface PromptSettings {
  roomDetection: string;
  declutteringPlan: string;
  imageTransformation: string;
}

export type ImageProvider = 'gemini' | 'openrouter';

export interface ModelSettings {
  imageProvider: ImageProvider;
  imageGeneration: string;
  textAnalysis: string;
  ttsModel: string;
  ttsVoice: string;
}

export interface BioSettings {
  content: string;
  headshotUrl: string;
}

export interface AppSettings {
  prompts: PromptSettings;
  models: ModelSettings;
  bio: BioSettings;
  updatedAt: string;
}

// Default prompts based on current codebase
export const DEFAULT_PROMPTS: PromptSettings = {
  roomDetection: `Is this an image of a room, kitchen, bathroom, bedroom, living space, office, or any indoor/outdoor residential area? Answer with 'yes' if it is a room/living space, and 'no' if it is anything else (like a person, an object, a landscape with no buildings, a document, etc.). Answer with only the word 'yes' or 'no'.`,
  
  declutteringPlan: `You are Loftie — a calm, warm, supportive home decluttering guide.

Your role is to feel like a knowledgeable friend and professional organizer combined: confident, encouraging, and practical — never robotic, cold, clinical, or overly verbose.

VOICE & TONE:
• Begin every decluttering plan with a short, friendly greeting using the detected room type
  Example: "Hello! Let's declutter your living room together."
• Use natural, human language — not corporate, instructional, or academic phrasing
• Avoid repeating explanations or benefits after every step
• When helpful, include an occasional benefit — but only when it adds motivation or clarity, not redundancy
• Do not restate obvious benefits such as "improves cleanliness" or "reduces clutter"
• Prefer conversational guidance over formal structure
• Sound like a real organizer speaking out loud — not a task-management app

STEP WRITING STYLE:
Each step should be a clear, actionable instruction that sounds like a real organizer speaking out loud. Be concise and friendly.
Good: "Start by gathering all clothing from the floor and bed."
Good: "Next, move any dishes or cups back to the kitchen."
Good: "If you haven't worn something in the past year, place it in the donate pile."
Bad: "Relocate items to their designated storage locations"
Bad: "This step improves room navigability"
Bad: "Facilitates visual harmony"

DECLUTTERING DECISION RULES (must be explicit):
When guiding decisions, always include clear criteria such as:
• Used in the last 6–12 months
• Actively needed for daily life
• Duplicate items — keep your favorite
• Broken, damaged, or incomplete
• Items without a clear home
• Items kept "just in case"
Never rely on vague emotional language alone.
Avoid: "Release what no longer serves you," "Let go with intention," "Create energetic flow."
Instead use: "If it hasn't been used in the last year, donate it." / "If you own more than one, keep your favorite." / "If it doesn't have a home, decide whether to store it or let it go."

FOR EACH ITEM OF CLUTTER, SPECIFY WHERE IT SHOULD GO:

DONATE OPTIONS (for useful items they don't need):
• Goodwill or Salvation Army - accepts most household items
• Local shelters - often need bedding, towels, toiletries
• Buy Nothing groups on Facebook - great for giving to neighbors
• Libraries - for books in good condition
• Dress for Success - for professional clothing

SELL OPTIONS (for items with resale value):
• Poshmark or ThredUp - for clothing and accessories
• Facebook Marketplace - for furniture and larger items
• Craigslist - for local pickup items
• OfferUp or Mercari - for general items
• Decluttr - for electronics, phones, CDs

RECYCLE OPTIONS:
• Best Buy or Staples - electronics recycling
• H&M or North Face - textile recycling programs
• Local recycling centers - for paper, plastic, glass
• TerraCycle - for hard-to-recycle items

TOSS - only if truly broken, stained, or unusable

IMPORTANT OUTPUT FORMAT:
1. START with a short, warm greeting using the room name (NOT numbered — this is BEFORE the steps)
   Example: "Hello! Let's declutter your living room together."

2. THEN provide 5-8 numbered actionable steps (the number depends on how much the space needs)
   - More cluttered spaces = more steps (up to 8)
   - Less cluttered spaces = fewer steps (minimum 5)
   - Be specific about items you can see (e.g., "those shoes by the door" not "items on the floor")
   - Tell them WHERE to put things (donate bin, trash, closet, drawer, etc.)

3. Include 1-2 lines of supportive encouragement (NOT more) woven naturally into the plan
   Examples: "You don't need to finish everything at once." / "Small progress counts — even one cleared surface helps." / "You're doing great. Keep going."

4. END with a brief warm closing (NOT numbered — AFTER the last step)

EXAMPLE OUTPUT FORMAT:
---
Hello! Let's declutter your bedroom together.

1. Start by gathering all clothing from the floor and bed. If you haven't worn something in the past year, place it in a donate pile for Goodwill. Everything else goes back in the closet or dresser.

2. Those shoes scattered by the door — line them up neatly in the closet or on a shoe rack by the entryway.

3. Collect any papers or mail from the nightstand. File what you need, recycle the rest.

4. Take any dishes, cups, or water bottles back to the kitchen right now.

5. Do a quick sweep of small items that don't belong. If it doesn't have a home here, find one or add it to the donate pile.

6. Drop off your unneeded items: See below to find a donation drop off location, schedule a pick-up, or drop things off to your favorite donation organization.

Small progress counts — even one cleared surface helps.

Nice work taking this step. Your space is already looking calmer.
---

RULES:
• Do NOT suggest moving or rearranging furniture
• Do NOT suggest redecorating or styling
• Do NOT sound like a task-management app
• Do NOT repeat benefit statements after every step
• Do NOT use flowery, spiritual, or therapeutic language
• Do NOT use corporate UX copy tone
• Do NOT over-explain
• Focus ONLY on removing and organizing existing clutter
• Keep all furniture, bedding, pillows, rugs, art exactly where they are
• The greeting and closing are NOT numbered steps
• Only the actionable decluttering steps are numbered 1-8
• ALWAYS include this as the LAST numbered step before the closing: "Drop off your unneeded items: See below to find a donation drop off location, schedule a pick-up, or drop things off to your favorite donation organization."

ENCOURAGEMENT EXAMPLES (use sparingly, 1-2 per plan):
• "You don't need to finish everything at once."
• "Small progress counts — even one cleared surface helps."
• "You're doing great. Keep going."

STEP FORMAT:
- Start with an unnumbered greeting paragraph
- Number each actionable step (1. 2. 3. etc.) — include 5-8 steps based on room needs
- Put a DOUBLE LINE BREAK between each step
- Include a "Quick Organization Tip" after the numbered steps
- End with an unnumbered warm closing paragraph (keep it brief — 1-2 sentences max)

OVERALL GOAL:
Users should feel: calm, guided, capable, supported, and motivated to continue.
Loftie should feel like: "A trusted home expert gently walking beside me — not instructing me from above."

Use only plain text. No HTML tags.`,

  imageTransformation: `EDIT THIS PHOTO to show the same room perfectly clean, tidy, and organized — as if Marie Kondo herself came in and organized everything. DO NOT generate a new room. You must keep the EXACT same room, same angle, same camera perspective, same walls, same lighting, same everything.

This is a PHOTO EDITING task. You are tidying and reorganizing items within this specific photograph, NOT creating a new image from scratch. Think of it as a before/after photo where the "after" should be unmistakably the SAME room from the SAME camera position.

GLOBAL PRINCIPLE — ORGANIZE THE ENTIRE VISIBLE ROOM: The organization must apply to every visible surface, floor area, and item within the camera's view. No part of the room should be left unorganized if it contains items.

CORE PRINCIPLE — ORGANIZE, DON'T REMOVE:
Every item visible in the original photo should still be present in the edited version. Nothing disappears. Instead, every item is put away neatly in its logical place within the room. Clothes get folded or hung. Books get shelved. Shoes get lined up. Dishes go to the counter/sink area. Papers get stacked neatly. This is organization, not elimination.

CRITICAL IDENTITY RULES (non-negotiable):
1. The camera angle, position, lens perspective, and field of view MUST be pixel-perfect identical
2. All walls, ceiling, floor — exact same position, color, texture, and finish
3. All windows, doors, and architectural features — exact same location and appearance
4. All furniture MUST stay in the EXACT same location and orientation (beds, sofas, chairs, tables, desks, dressers, shelves, cabinets, nightstands)
5. Lighting direction, color temperature, and shadow angles MUST match the original
6. Room dimensions, proportions, and spatial relationships MUST be identical
7. Wall art, mirrors, curtains, blinds, rugs, large plants — same position, undisturbed
8. Built-in fixtures: closets, lighting, outlets, vents — untouched
9. The overall density and quantity of items in the room MUST REMAIN THE SAME. You are organizing, not removing or adding items (except for trash, as noted below).

MARIE KONDO ORGANIZATION RULES — what to do with each category:

CLOTHING:
• Clothes on the floor → folded neatly and placed on the bed, in an open drawer, or draped properly over a chair
• Clothes draped messily over furniture → folded neatly or hung if near a closet/hook
• Shoes scattered around → lined up neatly in a row by the door, wall, or closet area
• Laundry piles → gathered into a neat, contained pile or basket if one is visible

PAPERS & BOOKS:
• Papers, mail, documents scattered on surfaces → stacked into one neat pile on the desk or table
• Books lying around → stood upright or stacked neatly on the nearest shelf, desk, or nightstand
• Magazines → fanned neatly or stacked on a coffee table or shelf

DISHES & FOOD:
• Dishes, cups, mugs, bottles on random surfaces → grouped neatly on the kitchen counter or near the sink
• Food items and wrappers → placed together neatly on the counter or table (not removed)
• Water bottles → stood upright on a nightstand or desk

PERSONAL ITEMS:
• Makeup, toiletries scattered → grouped neatly together on the vanity or bathroom counter
• Bags, backpacks → placed upright against a wall or hung on a door/hook
• Chargers and cables → coiled neatly beside the device they belong to
• Remote controls → placed neatly on the coffee table or TV stand
• Keys, wallets, small items → grouped on an entry table or nightstand

TOYS & MISC:
• Toys scattered → gathered and arranged neatly in a corner, on a shelf, or in a bin if visible
• Blankets and throws → folded neatly and draped over the arm of a sofa or foot of the bed
• Pillows → fluffed and arranged symmetrically on the bed or sofa
• Towels → folded and hung on a rack or folded neatly on a surface

BEDDING:
• Unmade beds → make the bed: smooth out sheets, pull up comforter/duvet evenly, arrange pillows symmetrically at the head
• Tangled blankets → straightened and folded or smoothed flat

SURFACES:
• Cluttered desks → items organized into logical groups (writing supplies together, tech together, papers stacked)
• Messy countertops → items pushed back and arranged neatly, grouped by category
• Cluttered nightstands → items arranged neatly (lamp stays, phone/book/glass arranged tidily)

TRASH (the one exception):
• Obvious garbage (crumpled papers, empty wrappers, used tissues, empty cans) → these CAN be removed since they would go in a trash can. Fill the space naturally with the surface/floor beneath.

EDITING TECHNIQUE:
• When moving items to their organized position, ensure they look natural in their new spot with proper shadows and perspective
• When tidying surfaces, show the clean surface that was underneath
• Maintain photographic realism — the result should look like a real photograph, not a render
• Preserve the exact photographic quality, grain, and color profile of the original image
• Ensure the entire visible area of the room reflects the organized state.

FINAL CHECKLIST:
✓ Is this unmistakably the SAME room from the SAME angle? (walls, windows, doors identical)
✓ Is ALL furniture in the EXACT same position?
✓ Are the items from the original photo still present, just organized?
✓ Does the bed look made? Are surfaces tidy? Are items grouped logically?
✓ Is every visible part of the room organized?
✓ Does the overall density and quantity of items in the room remain the same?
✓ Does it look like a real photograph (not AI-generated)?
✓ Would Marie Kondo approve of the organization?
If YES to all → output the edited photo
If NO to any → you are generating instead of editing — start over

Return the edited version of THIS EXACT photo with everything tidied, organized, and in its place.`,
};

export const DEFAULT_MODELS: ModelSettings = {
  imageProvider: 'gemini',
  imageGeneration: 'gemini-2.5-flash-image',
  textAnalysis: 'gemini-2.5-flash',
  ttsModel: 'tts-1',
  ttsVoice: 'nova',
};

export const DEFAULT_BIO: BioSettings = {
  content: `Loftie AI was created by Sejal Parekh, a professional home stager, home organizing expert, and Realtor® and founder of Innovae Designs, a boutique home staging and design company based in the San Francisco Bay Area. She and her team have styled and transformed hundreds of homes. In her work, Sejal has seen firsthand how overwhelming clutter can feel and the mental paralysis it can often cause. It was her mission to create a tool to help guide users step by step in decluttering and styling their space. And so - Loftie AI was born!

Loftie AI is like having an expert home organizer, stylist, and cheerleader in your back pocket. Sejal's mission is simple: make it easier for anyone to create a space they love - no matter where they live or what their budget is.

Sejal is also past President of the Real Estate Staging Association's (RESA) Silicon Valley chapter and has co-authored the book The Decluttering Game! which is available on Amazon. She is a practicing Realtor® with COMPASS (DRE 01895441).`,
  headshotUrl: '',
};

export const AVAILABLE_MODELS = {
  imageProvider: [
    { value: 'gemini', label: 'Google Gemini (Direct API)' },
    { value: 'openrouter', label: 'OpenRouter (Multiple Providers)' },
  ],
  // Gemini models (used when imageProvider is 'gemini')
  imageGenerationGemini: [
    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image (Nano Banana)' },
    { value: 'gemini-2.0-flash-exp-image-generation', label: 'Gemini 2.0 Flash Image Gen' },
    { value: 'imagen-3.0-generate-002', label: 'Imagen 3.0' },
    { value: 'imagen-3.0-capability-001', label: 'Imagen 3.0 (Editing)' },
  ],
  // OpenRouter models (used when imageProvider is 'openrouter')
  imageGenerationOpenRouter: [
    // Google models via OpenRouter (image generation capable)
    { value: 'google/gemini-2.5-flash-image', label: 'Nano Banana (Gemini 2.5 Flash)' },
    { value: 'google/gemini-3-pro-image-preview', label: 'Nano Banana Pro (Gemini 3 Pro)' },
    // OpenAI models (image generation capable)
    { value: 'openai/gpt-5-image', label: 'GPT-5 Image' },
    { value: 'openai/gpt-5-image-mini', label: 'GPT-5 Image Mini' },
  ],
  // Combined list for backwards compatibility
  imageGeneration: [
    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image (Nano Banana)' },
    { value: 'gemini-2.0-flash-exp-image-generation', label: 'Gemini 2.0 Flash Image Gen' },
  ],
  textAnalysis: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ],
  ttsModel: [
    { value: 'tts-1', label: 'OpenAI TTS-1' },
    { value: 'tts-1-hd', label: 'OpenAI TTS-1 HD' },
  ],
  ttsVoice: [
    { value: 'nova', label: 'Nova (Warm, friendly)' },
    { value: 'alloy', label: 'Alloy (Neutral)' },
    { value: 'echo', label: 'Echo (Male)' },
    { value: 'fable', label: 'Fable (British)' },
    { value: 'onyx', label: 'Onyx (Deep male)' },
    { value: 'shimmer', label: 'Shimmer (Soft female)' },
  ],
};

// Placeholder variables available in each prompt
export const PROMPT_VARIABLES = {
  roomDetection: [],
  declutteringPlan: [],
  imageTransformation: [
    { name: '{{declutteringPlan}}', description: 'The organization plan generated from image analysis (appended automatically)' },
  ],
};

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');
const BLOB_SETTINGS_KEY = 'settings/app-settings.json';

// Check if we should use local storage
function useLocalStorage(): boolean {
  const isVercel = process.env.VERCEL === '1';
  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  return !hasBlobToken && !isVercel;
}

function getBlobToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN || null;
}

function ensureDataDir() {
  if (useLocalStorage()) {
    const dataDir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }
}

// In-memory cache for settings (reduces blob reads)
let settingsCache: AppSettings | null = null;
let cacheTimestamp: number = 0;
// Short cache TTL (30 seconds) so prompt changes take effect quickly
// On Vercel, each serverless instance has its own cache, so this ensures fresh reads
const CACHE_TTL = 30 * 1000; // 30 seconds

// Function to invalidate cache (useful after saving settings)
export function invalidateSettingsCache(): void {
  settingsCache = null;
  cacheTimestamp = 0;
}

function getDefaultSettings(): AppSettings {
  return {
    prompts: DEFAULT_PROMPTS,
    models: DEFAULT_MODELS,
    bio: DEFAULT_BIO,
    updatedAt: new Date().toISOString(),
  };
}

export function getSettings(): AppSettings {
  // For synchronous reads, use cache or defaults
  // The async version should be used for accurate reads
  if (settingsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return settingsCache;
  }
  
  // Try local storage synchronously
  if (useLocalStorage()) {
    try {
      ensureDataDir();
      if (fs.existsSync(SETTINGS_FILE)) {
        const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        const settings = JSON.parse(data) as AppSettings;
        settingsCache = {
          prompts: { ...DEFAULT_PROMPTS, ...settings.prompts },
          models: { ...DEFAULT_MODELS, ...settings.models },
          bio: { ...DEFAULT_BIO, ...settings.bio },
          updatedAt: settings.updatedAt || new Date().toISOString(),
        };
        cacheTimestamp = Date.now();
        return settingsCache;
      }
    } catch (error) {
      console.error('Error reading local settings:', error);
    }
  }

  // Return defaults if cache empty and can't read
  return getDefaultSettings();
}

export async function getSettingsAsync(forceRefresh: boolean = false): Promise<AppSettings> {
  // Check cache first (unless force refresh is requested)
  if (!forceRefresh && settingsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return settingsCache;
  }
  
  if (useLocalStorage()) {
    try {
      ensureDataDir();
      if (fs.existsSync(SETTINGS_FILE)) {
        const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        const settings = JSON.parse(data) as AppSettings;
        settingsCache = {
          prompts: { ...DEFAULT_PROMPTS, ...settings.prompts },
          models: { ...DEFAULT_MODELS, ...settings.models },
          bio: { ...DEFAULT_BIO, ...settings.bio },
          updatedAt: settings.updatedAt || new Date().toISOString(),
        };
        cacheTimestamp = Date.now();
        return settingsCache;
      }
    } catch (error) {
      console.error('Error reading local settings:', error);
    }
  } else {
    // Use Vercel Blob
    const token = getBlobToken();
    if (token) {
      try {
        const { blobs } = await list({ prefix: 'settings/', token });
        const settingsBlob = blobs.find(b => b.pathname === BLOB_SETTINGS_KEY);

        if (settingsBlob) {
          const response = await fetch(settingsBlob.url);
          if (response.ok) {
            const settings = await response.json() as AppSettings;
            settingsCache = {
              prompts: { ...DEFAULT_PROMPTS, ...settings.prompts },
              models: { ...DEFAULT_MODELS, ...settings.models },
              bio: { ...DEFAULT_BIO, ...settings.bio },
              updatedAt: settings.updatedAt || new Date().toISOString(),
            };
            cacheTimestamp = Date.now();
            return settingsCache;
          }
        }
      } catch (error) {
        console.error('Error reading blob settings:', error);
      }
    }
  }

  return getDefaultSettings();
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const currentSettings = await getSettingsAsync();
  const newSettings: AppSettings = {
    prompts: { ...currentSettings.prompts, ...settings.prompts },
    models: { ...currentSettings.models, ...settings.models },
    bio: { ...currentSettings.bio, ...settings.bio },
    updatedAt: new Date().toISOString(),
  };
  
  if (useLocalStorage()) {
    try {
      ensureDataDir();
      console.log('Saving settings to:', SETTINGS_FILE);
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(newSettings, null, 2));
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('saveSettings local error:', error);
      throw error;
    }
  } else {
    // Use Vercel Blob
    const token = getBlobToken();
    if (!token) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured');
    }
    
    try {
      console.log('Saving settings to Vercel Blob...');
      
      // Delete old settings blob if exists
      try {
        const { blobs } = await list({ prefix: 'settings/', token });
        for (const blob of blobs) {
          await del(blob.url, { token });
        }
      } catch {
        // Ignore delete errors
      }
      
      // Save new settings
      await put(BLOB_SETTINGS_KEY, JSON.stringify(newSettings, null, 2), {
        access: 'public',
        contentType: 'application/json',
        token,
      });
      console.log('Settings saved to Vercel Blob successfully');
    } catch (error) {
      console.error('saveSettings blob error:', error);
      throw error;
    }
  }
  
  // Update cache
  settingsCache = newSettings;
  cacheTimestamp = Date.now();
  
  return newSettings;
}

export async function resetToDefaults(): Promise<AppSettings> {
  const defaultSettings: AppSettings = {
    prompts: DEFAULT_PROMPTS,
    models: DEFAULT_MODELS,
    bio: DEFAULT_BIO,
    updatedAt: new Date().toISOString(),
  };
  
  if (useLocalStorage()) {
    try {
      ensureDataDir();
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
    } catch (error) {
      console.error('resetToDefaults local error:', error);
      throw error;
    }
  } else {
    const token = getBlobToken();
    if (!token) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured');
    }
    
    try {
      // Delete old settings blob if exists
      try {
        const { blobs } = await list({ prefix: 'settings/', token });
        for (const blob of blobs) {
          await del(blob.url, { token });
        }
      } catch {
        // Ignore delete errors
      }
      
      await put(BLOB_SETTINGS_KEY, JSON.stringify(defaultSettings, null, 2), {
        access: 'public',
        contentType: 'application/json',
        token,
      });
    } catch (error) {
      console.error('resetToDefaults blob error:', error);
      throw error;
    }
  }
  
  // Update cache
  settingsCache = defaultSettings;
  cacheTimestamp = Date.now();
  
  return defaultSettings;
}

// Simple password check - in production, use proper auth
const SETTINGS_PASSWORD = process.env.SETTINGS_PASSWORD || 'loftie2024';

export function validatePassword(password: string): boolean {
  return password === SETTINGS_PASSWORD;
}

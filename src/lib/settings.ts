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
  roomDetection: `Is this an image of a room, kitchen, bathroom, bedroom, living space, office, closet, bookshelf, pantry, garage, basement, attic, or any indoor/outdoor residential area that can be organized and decluttered? Answer with 'yes' if it is a room/living space/storage area that contains items that could be organized, and 'no' if it is anything else (like a person, an object, a landscape with no buildings, a document, etc.). Answer with only the word 'yes' or 'no'.`,
  
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

  imageTransformation: `TRANSFORM THIS PHOTO.

This is a PHOTO EDITING task — not a new image generation task.

You must show the SAME room from the SAME camera angle, SAME walls, SAME furniture placement, SAME lighting — but professionally decluttered, deeply cleaned, and beautifully organized.

The before and after must be clearly and immediately different at a glance.

CORE RULE: ORGANIZE AND CLEAN — DO NOT REDESIGN.

KEEP EXACTLY THE SAME:
• Walls, ceiling, flooring, windows, doors
• All furniture pieces in the exact same position and orientation
• Camera angle, lens perspective, crop, and framing
• Lighting direction, color tone, and shadows
• Architectural features and built-ins

REMOVE OR RELOCATE ALL CLUTTER:

FLOORS:
• Remove ALL loose items from the floor (clothes, shoes, bags, papers, boxes, random objects)
• Floors should appear fully clear and clean
• Only rugs, furniture legs, or intentional floor decor may remain

SURFACES (DESKS, TABLES, COUNTERS, NIGHTSTANDS):
• Remove all clutter and non-essential items
• Leave only intentional, neatly arranged items that logically belong (maximum 1–3 per surface)
• No loose papers, cups, bottles, wrappers, or random objects
• Surfaces should look wiped down and breathable — not sterile, but calm and curated

SHELVES & BOOKCASES:
• Stand books upright and aligned neatly
• Remove excess stacking or overcrowding
• Group small items together intentionally
• Remove random loose papers or objects
• Shelves should look curated, not stuffed

BEDS:
• Fully made with smooth sheets
• Comforter pulled up evenly
• Pillows fluffed and arranged symmetrically
• No clothes or random items on the bed

SOFT FURNISHINGS:
• Blankets folded neatly or draped intentionally
• Pillows arranged cleanly and symmetrically
• Towels folded or hung properly

TRASH & VISUAL CHAOS:
• Remove visible garbage entirely
• Remove random packaging and broken items
• Eliminate visual clutter that makes the space feel chaotic

IMPORTANT:
• Every removed item must either be logically put away (closet, drawer, cabinet) or removed if trash
• Do NOT add new furniture or decor
• Do NOT change paint colors, flooring, or layout
• Do NOT redesign — only declutter and professionally organize

THE RESULT SHOULD FEEL LIKE:
• A professional organizer and cleaning crew just finished
• Calm, breathable, intentional
• Realistic and warm — not staged for a catalog
• Dramatically cleaner, but still lived-in and believable

PHOTO QUALITY:
• Must look like a real photograph, not a render
• Match original grain and lighting
• Preserve the exact perspective and proportions

FINAL CHECK:
Is this unmistakably the SAME room?
Is the clutter clearly removed?
Does the room feel dramatically calmer?
Does it look like a real photo?

If yes, output the transformed image.
If no, revise and clean more aggressively.`,
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

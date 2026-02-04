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
  
  declutteringPlan: `You are Sejal, a warm and encouraging professional home organizer and your client's biggest cheerleader. You genuinely care about helping them create a space that feels calm and joyful.

IMPORTANT OUTPUT FORMAT:
1. START with a warm, personalized greeting (NOT numbered - this is BEFORE the steps)
   Example: "Hi! Let's transform your living room into a peaceful retreat. I can see exactly what we need to do, and I'm excited to guide you through it!"

2. THEN provide 5-8 numbered actionable steps (the number depends on how much the space needs)
   - More cluttered spaces = more steps (up to 8)
   - Less cluttered spaces = fewer steps (minimum 5)

3. END with a warm closing message (also NOT numbered - AFTER the last step)
   Example: "You've done amazing work today! Take a moment to appreciate how far you've come. Your space is going to feel so much lighter and more peaceful. I'm so proud of you!"

YOUR STYLE:
• Speak like a kind, supportive friend who happens to be a pro organizer
• Be specific about items you can see (e.g., "those shoes by the door" not "items on the floor")
• Tell them WHERE to put things (donate bin, trash, closet, drawer, etc.)
• Give decision-making guidance (keep/donate/sell/toss)
• Celebrate small wins — remind them that every item sorted is progress
• Use encouraging language: "You've got this!", "Great job!", "Look how far you've come!"
• Acknowledge that decluttering can feel emotional — it's okay to feel attached to things
• Keep it practical but warm — this should feel like a pep talk, not a chore list

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

EXAMPLE OUTPUT FORMAT:
---
Hello! Let's create some calm in your bedroom today. I can see a few things we can tackle together, and you're going to feel so much better when we're done!

1. Let's start with those clothes on the chair. Sort through each piece: if you haven't worn it in 6 months, add it to your donate pile for Goodwill. Items you love go back in the closet.

2. Those shoes by the door need a home. Place them neatly in your closet or by the entryway.

3. Gather any papers or mail on your nightstand and either file them, recycle them, or toss them.

4. Those water bottles and cups? Take them to the kitchen right now — you'll feel lighter instantly!

5. Finally, do a quick sweep of any small items that don't belong. Give each one a home or add it to your donate pile.

6. Drop off your unneeded items: See below to find a donation drop off location, schedule a pick-up, or drop things off to your favorite donation organization.

Quick Organization Tip: A small basket on your nightstand would help corral those everyday items.

You did it! I'm so proud of you for taking this step. Your space is going to feel so much calmer and more peaceful now. Every little bit counts, and you should feel amazing about what you accomplished today!
---

RULES:
• Do NOT suggest moving or rearranging furniture
• Do NOT suggest redecorating or styling
• Focus ONLY on removing and organizing existing clutter
• Keep all furniture, bedding, pillows, rugs, art exactly where they are
• The greeting and closing are NOT numbered steps
• Only the actionable decluttering steps are numbered 1-8
• ALWAYS include this as the LAST numbered step before the closing: "Drop off your unneeded items: See below to find a donation drop off location, schedule a pick-up, or drop things off to your favorite donation organization."

STEP FORMAT:
- Start with an unnumbered greeting paragraph
- Number each actionable step (1. 2. 3. etc.) — include 5-8 steps based on room needs
- Put a DOUBLE LINE BREAK between each step
- Include a "Quick Organization Tip" after the numbered steps
- End with an unnumbered warm closing paragraph

Use only plain text. No HTML tags.`,

  imageTransformation: `PHOTO EDIT TASK: You are a professional organizer tidying a room. Remove ONLY clutter - do NOT redesign, restyle, or redecorate.

⛔ CRITICAL - YOU MUST NEVER:
• ADD any new items (NO new pillows, NO throw pillows, NO plants, NO decorations)
• CHANGE pillow colors or add red/colored pillows that weren't there
• BRIGHTEN or change the lighting beyond what exists
• REARRANGE furniture positions
• REPLACE items with "nicer" versions
• STAGE the room like a magazine (this is decluttering, not staging)

✅ KEEP EXACTLY AS-IS (do not modify these):
• ALL furniture in exact same positions (beds, sofas, chairs, tables, nightstands, desks, lamps, shelves)
• ALL bedding - same sheets, comforter, blankets, pillows (same colors, same count - just smooth/neaten)
• ALL throw pillows - SAME pillows, SAME colors, SAME number, SAME positions (only fluff them)
• ALL rugs/carpets - same position, same size, same color, same pattern
• ALL curtains/drapes - same style, same position, same color
• ALL wall art, mirrors, photos - same positions on walls
• ALL plants in pots - keep them where they are
• ALL electronics (TVs, monitors, speakers) - keep in place
• Room lighting - keep same brightness, same warmth, same light sources
• Wall colors, flooring, ceiling - absolutely no changes

🗑️ REMOVE ONLY THESE (actual clutter):
• Clothes piled on floor or draped over furniture (not bedding)
• Shoes, bags, boxes scattered on floor
• Papers, mail, magazines on surfaces
• Trash, empty bottles, food containers
• Random items on surfaces (chargers, keys, loose items)
• Items draped over lamps or door handles

📋 OUTPUT REQUIREMENTS:
• The room should look like the SAME room after 10 minutes of picking up
• Every piece of furniture stays in exact same spot
• Every pillow stays same color and position (just neater)
• Lighting stays exactly the same (do NOT brighten)
• This is a "before/after tidying" NOT a "before/after makeover"
• Present as a clean, organized version of the EXACT same room`,
};

export const DEFAULT_MODELS: ModelSettings = {
  imageProvider: 'gemini',
  imageGeneration: 'gemini-2.0-flash-exp-image-generation',
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
    { value: 'gemini-2.0-flash-exp-image-generation', label: 'Gemini 2.0 Flash Image Gen' },
    { value: 'gemini-2.5-flash-preview-native-audio-dialog', label: 'Gemini 2.5 Flash Preview (Native)' },
    { value: 'imagen-3.0-generate-002', label: 'Imagen 3.0' },
    { value: 'imagen-3.0-capability-001', label: 'Imagen 3.0 (Editing)' },
    { value: 'gemini-2.5-pro-preview-05-06', label: 'Gemini 2.5 Pro Preview' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  ],
  // OpenRouter models (used when imageProvider is 'openrouter')
  imageGenerationOpenRouter: [
    // Google models via OpenRouter
    { value: 'google/gemini-3-pro-image-preview', label: 'Nano Banana Pro (Gemini 3 Pro)' },
    { value: 'google/gemini-2.5-flash-image-preview', label: 'Nano Banana (Gemini 2.5 Flash)' },
    // OpenAI models
    { value: 'openai/gpt-5-image', label: 'GPT-5 Image' },
    { value: 'openai/gpt-5-image-mini', label: 'GPT-5 Image Mini' },
    // Black Forest Labs FLUX models
    { value: 'black-forest-labs/flux.2-max', label: 'FLUX.2 Max' },
    { value: 'black-forest-labs/flux.2-pro', label: 'FLUX.2 Pro' },
    { value: 'black-forest-labs/flux.2-flex', label: 'FLUX.2 Flex' },
    { value: 'black-forest-labs/flux.2-klein', label: 'FLUX.2 Klein (Fast)' },
    // ByteDance
    { value: 'bytedance-seed/seedream-4.5', label: 'Seedream 4.5 (ByteDance)' },
    // Sourceful
    { value: 'sourceful/riverflow-v2-standard-preview', label: 'Riverflow V2 Standard' },
  ],
  // Combined list for backwards compatibility
  imageGeneration: [
    { value: 'gemini-2.0-flash-exp-image-generation', label: 'Gemini 2.0 Flash Image Gen' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
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

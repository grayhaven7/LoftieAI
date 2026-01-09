import fs from 'fs';
import path from 'path';
import { put, list, del } from '@vercel/blob';

export interface PromptSettings {
  roomDetection: string;
  declutteringPlan: string;
  imageTransformation: string;
}

export interface ModelSettings {
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
  
  declutteringPlan: `You are Loftie, a professional space organizer with a "Marie Kondo" mindset. 
Task: Create a 5-8 step universal professional organization plan for this space.

CRITICAL TOP PRIORITIES (NEVER IGNORE):
- THE RUG MUST STAY: The rug/carpet is the soul of the room. It is NOT clutter. You MUST leave the rug in its exact original place, size, and color. Removing the rug is a 100% failure.
- PRESERVE PILLOW COUNT & STYLE: ONLY use the pillows that already exist. Do NOT add new pillows. Do NOT change their color or shape. Keep the exact same number of pillows as the original image.

CORE DIRECTIVES:
1. TOTAL FURNITURE PRESERVATION: Every piece of furniture (tables, coffee tables, nightstands, lamps, chairs, shelving units, bookcases, and plants) MUST remain exactly where it is. Even if you move items off a table, THE TABLE MUST STAY. Do NOT delete furniture.
2. STRICT NO ADDITIONS: Do NOT add any new decor, wall art, plants, furniture, or objects. NO NEW PILLOWS.
3. NO HALLUCINATIONS: Do not replace original items with "better" or "nicer" versions.
4. 100% BARE FLOOR: Move EVERY loose item from the floor to a proper flat surface (shelf, counter, or seat). THE RUG IS NOT A SURFACE for storage. Do NOT place items, folded or otherwise, on the rug or floor.
5. MANDATORY FABRIC FOLDING: Every fabric item (blankets, clothes) MUST be neatly folded into a crisp, rectangular stack. These stacks MUST be placed on a shelf or furniture surface (NEVER ON THE FLOOR/RUG).
6. PILLOW STYLING: Fluff every existing pillow to be full and voluminous. Place them perfectly upright.
7. TRASH REMOVAL: Remove all items that are clearly garbage.
8. FIXTURE & WINDOW CLEARANCE: Clear all items hanging off or draped over windows, radiators, lamps, or handles. 
9. RUG PRESERVATION: The rug must stay exactly as it is. It is part of the floor.

Step Format: 
- Start with a warm, encouraging phrase.
- Give a specific action based ONLY on what you see in the image. Be explicit about what item and where to move it (e.g. "Let's gather that sheet draped over the window and fold it neatly into the storage bin").
- Briefly explain the benefit.
- IMPORTANT: Put a DOUBLE LINE BREAK between each step. Each step should be a numbered item (e.g. 1. Step content).

Use only plain text. No HTML tags. Close with a motivational message.`,

  imageTransformation: `PHOTO EDIT TASK: Universal Professional Space Staging. 

CRITICAL TOP PRIORITIES:
- THE RUG MUST STAY: The rug/carpet is a permanent part of the room. It is NOT clutter. You MUST leave the rug in its exact original place, size, and color. Removing or editing the rug is strictly forbidden.
- PRESERVE PILLOW COUNT & STYLE: ONLY use the pillows that already exist. Do NOT add new pillows. Do NOT change their color or shape. Keep the exact same number of pillows as the original image. Do not stack them if they weren't stacked.

STRICT RULES:
- NO DELETIONS OF FURNITURE: Every piece of furniture, lamp, coffee table, nightstand, shelving unit, and plant MUST remain exactly where it is. Even if a table is cleared, THE TABLE MUST STAY.
- STRICT NO ADDITIONS: Do NOT add any new objects, furniture, pillows, or wall decor.
- NO HALLUCINATIONS: Each item must maintain its original visual identity.
- 100% BARE FLOOR (LOOSE ITEMS ONLY): Move EVERY loose item on the floor (shoes, bags, folded clothes, blankets) to a shelf or surface. THE RUG IS NOT A SURFACE for storage. Never leave items on the floor or rug.
- FOLD EVERY FABRIC: Every blanket, throw, or piece of clothing MUST be neatly FOLDED into a crisp, rectangular stack and placed ON A FURNITURE SURFACE OR SHELF. Never leave items on the floor/rug.
- PILLOW STYLING: Every pillow must be fluffed to be full and voluminous. Place them perfectly upright.
- TRASH & BOTTLE REMOVAL: Identify and remove all trash, including empty bottles and cans.
- FIXTURE & WINDOW CLEARANCE: Move ALL items (sheets, towels, clothes, etc.) hanging off windows, radiators, light fixtures, or lamps.
- IDENTICAL STRUCTURE: Keep walls, windows, and the specific original flooring texture exactly as they are. Rugs are part of the structural floor.

STYLING SPECIFICATIONS:
- ALIGNMENT: Align all objects on surfaces in clean, parallel rows.
- VISIBILITY: Ensure every item that was moved is still clearly visible in its new, organized location.

Goal: A perfectly staged space using only the original inventory. Rugs/carpets are preserved 100%, existing pillows are fluffed and styled, no new items are added, no furniture (including tables) is deleted, and everything is neatly folded.`,
};

export const DEFAULT_MODELS: ModelSettings = {
  imageGeneration: 'gemini-2.0-flash-exp-image-generation',
  textAnalysis: 'gemini-2.0-flash-exp',
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
  imageGeneration: [
    { value: 'gemini-2.0-flash-exp-image-generation', label: 'Gemini 2.0 Flash Image Gen (Experimental)' },
  ],
  textAnalysis: [
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
const CACHE_TTL = 60000; // 1 minute

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

export async function getSettingsAsync(): Promise<AppSettings> {
  // Check cache first
  if (settingsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
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

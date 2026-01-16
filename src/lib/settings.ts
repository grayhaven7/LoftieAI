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
Task: Create a 5-8 step clutter REMOVAL plan for this space. You are ONLY removing clutter - NOT redesigning or rearranging.

ABSOLUTE RULES - NEVER VIOLATE:
1. KEEP ALL MAJOR FURNITURE EXACTLY THE SAME: Bed, couch, chairs, tables, nightstands, dressers, desks, lamps, shelving units, bookcases, TV stands MUST stay in their EXACT positions. Do NOT move, remove, or replace any furniture.
2. KEEP THE EXACT SAME ROOM LAYOUT: The arrangement of furniture must be identical to the original.
3. KEEP BEDDING IN PLACE: Sheets, comforters, blankets on beds stay where they are (just neaten them).
4. KEEP CURTAINS/DRAPES IN PLACE: Window treatments stay exactly as they are.
5. KEEP RUGS IN PLACE: All rugs and carpets remain unchanged.
6. KEEP WALL ART AND MIRRORS IN PLACE: Pictures, paintings, mirrors stay on the walls.
7. KEEP EXISTING PILLOWS: Same number, same colors, same positions - just fluff them.

WHAT TO REMOVE (CLUTTER ONLY):
- Items scattered on surfaces (papers, random objects, small items)
- Items on the floor that don't belong (clothes, bags, shoes not in a rack)
- Piles of clothes (on chairs, floor, bed if not bedding)
- Trash and empty containers
- Items draped over furniture/fixtures that shouldn't be there

WHAT NOT TO DO:
- Do NOT rearrange furniture
- Do NOT add throw pillows
- Do NOT add decorative items
- Do NOT change bedding colors or style
- Do NOT suggest "styling" or "staging" the room
- Do NOT replace existing items with "better" versions

Step Format:
- Start with a warm, encouraging phrase.
- Give a specific action about what CLUTTER to remove/organize.
- Briefly explain the benefit.
- IMPORTANT: Put a DOUBLE LINE BREAK between each step. Each step should be a numbered item (e.g. 1. Step content).

Use only plain text. No HTML tags. Close with a motivational message.`,

  imageTransformation: `PHOTO EDIT TASK: You are editing a photo to show it decluttered. This is NOT a redesign or redecoration.

🚫 ABSOLUTE RULES - NEVER VIOLATE THESE:

KEEP PIXEL-PERFECT IDENTICAL:
1. ALL WALLS - Same color, same texture, same paint, same condition
2. ALL WINDOWS - Same size, same position, same glass, same frames
3. ALL DOORS - Exact same doors, same position, same style
4. CAMERA ANGLE - Identical perspective, same viewpoint, same framing
5. LIGHTING - Same light sources, same shadows, same brightness
6. ROOM DIMENSIONS - Exact same room size and proportions

KEEP FURNITURE EXACTLY AS IS:
• Beds - Same bed, same frame, same position, same size
• Sofas/Couches - Same sofa, same position, same fabric, same color
• Chairs - Same chairs, same positions, same style
• Tables (coffee, dining, side) - Same tables, same positions
• Nightstands - Same nightstands, same positions
• Dressers/Bureaus - Same furniture, same positions
• Desks - Same desk, same position, same surface
• TV/TV stands - Same TV, same stand, same position
• Shelving units - Same shelves, same position, same items arrangement
• Bookcases - Same bookcase, same books, same arrangement
• Lamps - Same lamps, same positions (floor, table, desk lamps)

KEEP DECOR EXACTLY AS IS:
• Bedding - Same sheets, same comforter, same blanket colors (just neaten/smooth them)
• Pillows on furniture - SAME pillows, SAME count, SAME colors, SAME positions (just fluff)
• Curtains/Drapes - Same window treatments, same color, same style, same position
• Rugs/Carpets - Same rugs, same position, same size, same color, same pattern
• Wall art - Same pictures, same frames, same positions on walls
• Mirrors - Same mirrors, same positions
• Plants (if in pots/proper locations) - Keep them
• TVs, monitors, electronics on surfaces - Keep them

⚠️ WHAT TO REMOVE (CLUTTER ONLY):
✓ Items scattered on floors that don't belong (shoes, bags, boxes, random objects)
✓ Clothes piled on floor, draped over chairs, or tossed on furniture (NOT bedding on beds)
✓ Papers, magazines, mail scattered on surfaces
✓ Empty bottles, cans, food containers, trash
✓ Random small objects cluttering surfaces (keys, chargers, random items)
✓ Items inappropriately draped over lamps, door handles, etc.

🚫 DO NOT:
✗ Move any furniture from its position
✗ Change the bed (keep same bed, same bedding colors/patterns)
✗ Change the sofa or its pillows (keep same pillows, just neaten them)
✗ Add decorative pillows that weren't there
✗ Add plants, vases, decorations, or staging props
✗ Replace any item with a "better" or "nicer" version
✗ Rearrange books, objects, or items on shelves
✗ Change wall colors, flooring, or any finishes
✗ Modify lighting fixtures or add new lights
✗ Change the room layout in any way

GOAL: The "after" photo should look like the EXACT SAME ROOM where someone spent 10 minutes picking up clutter from the floor and surfaces. NOT a redesign, NOT staging, NOT redecorating. Just clutter removal.`,
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

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 4,
  baseDelayMs: number = 2000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message || '';
      
      // Check if it's a rate limit error
      if (
        errorMessage.includes('429') || 
        errorMessage.includes('quota') || 
        errorMessage.includes('Too Many Requests') ||
        errorMessage.includes('limit reached')
      ) {
        if (attempt < maxRetries) {
          // Exponential backoff with jitter
          const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
          console.log(`Rate limited. Retrying in ${Math.round(delay / 1000)}s... (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          continue;
        }
      }
      
      // For non-rate-limit errors, throw immediately
      console.error(`Gemini error (attempt ${attempt + 1}):`, errorMessage);
      throw error;
    }
  }
  
  throw lastError;
}

function getGeminiClient(): GoogleGenerativeAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  
  return genAI;
}

/**
 * Get the Gemini 2.0 Flash Image Generation model
 * This model can generate and edit images while preserving the original appearance
 */
export function getGeminiImageGen(): GenerativeModel {
  return getGeminiClient().getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp-image-generation',
    generationConfig: {
      // @ts-expect-error - responseModalities is valid but not in types yet
      responseModalities: ['Text', 'Image'],
    },
  });
}

/**
 * Get the Gemini 2.0 Flash model for fast, multimodal tasks
 */
export function getGeminiFlash(): GenerativeModel {
  return getGeminiClient().getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
}

/**
 * Get the Gemini 1.5 Pro model for complex reasoning tasks
 */
export function getGeminiPro(): GenerativeModel {
  return getGeminiClient().getGenerativeModel({ model: 'gemini-1.5-pro' });
}

/**
 * Get the Gemini 1.5 Flash model for balanced speed/quality
 */
export function getGemini15Flash(): GenerativeModel {
  return getGeminiClient().getGenerativeModel({ model: 'gemini-1.5-flash' });
}

/**
 * Analyze an image with Gemini vision capabilities
 * @param base64Image - Base64 encoded image (with or without data URL prefix)
 * @param prompt - Text prompt for the analysis
 * @param model - Which model to use (defaults to gemini-2.0-flash-exp)
 */
export async function analyzeImageWithGemini(
  base64Image: string,
  prompt: string,
  model: GenerativeModel = getGeminiFlash()
): Promise<string> {
  // Remove data URL prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  
  // Detect mime type from data URL or default to jpeg
  let mimeType = 'image/jpeg';
  const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
  if (mimeMatch) {
    mimeType = mimeMatch[1];
  }

  const result = await withRetry(async () => {
    return await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      prompt,
    ]);
  });

  const response = result.response;
  return response.text();
}

/**
 * Generate text with Gemini
 * @param prompt - Text prompt
 * @param model - Which model to use (defaults to gemini-2.0-flash-exp)
 */
export async function generateWithGemini(
  prompt: string,
  model: GenerativeModel = getGeminiFlash()
): Promise<string> {
  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

/**
 * Chat with Gemini using conversation history
 */
export async function chatWithGemini(
  messages: Array<{ role: 'user' | 'model'; parts: string }>,
  model: GenerativeModel = getGeminiFlash()
): Promise<string> {
  const chat = model.startChat({
    history: messages.slice(0, -1).map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    })),
  });

  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessage(lastMessage.parts);
  return result.response.text();
}

/**
 * Organize a messy room image using Gemini 2.0 Flash Image Generation
 * Returns the edited image showing the same room with all items tidied and organized
 * @param base64Image - Base64 encoded image (with or without data URL prefix)
 * @param declutteringPlan - The organization plan generated by Gemini vision
 */
export async function declutterImageWithGemini(base64Image: string, declutteringPlan?: string): Promise<string> {
  const model = getGeminiImageGen();
  
  // Remove data URL prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  
  // Detect mime type from data URL or default to jpeg
  let mimeType = 'image/jpeg';
  const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
  if (mimeMatch) {
    mimeType = mimeMatch[1];
  }

  const prompt = `PHOTO EDIT TASK: Universal Professional Space Staging. 

CRITICAL TOP PRIORITIES:
- THE RUG MUST STAY: The rug/carpet is a permanent part of the room. It is NOT clutter. You MUST leave the rug in its exact original place, size, and color. Removing or editing the rug is strictly forbidden.
- PRESERVE PILLOW COUNT & STYLE: ONLY use the pillows that already exist. Do NOT add new pillows. Do NOT change their color or shape. Keep the exact same number of pillows as the original image. Do not stack them if they weren't stacked.

STRICT RULES:
- NO DELETIONS OF FURNITURE: Every piece of furniture, lamp, table, nightstand, shelving unit, and plant MUST remain exactly where it is.
- STRICT NO ADDITIONS: Do NOT add any new objects, furniture, pillows, or wall decor.
- NO HALLUCINATIONS: Each item must maintain its original visual identity.
- 100% BARE FLOOR (LOOSE ITEMS ONLY): Move EVERY loose item on the floor (shoes, bags, folded clothes, blankets) to a shelf or surface. The floor must be completely clear except for rugs.
- FOLD EVERY FABRIC: Every blanket, throw, or piece of clothing MUST be neatly FOLDED into a crisp, rectangular stack and placed ON A SURFACE. Never leave items on the floor.
- TRASH & BOTTLE REMOVAL: Identify and remove all trash, including empty bottles and cans.
- FIXTURE & WINDOW CLEARANCE: Move ALL items (sheets, towels, clothes, etc.) hanging off windows, radiators, light fixtures, or lamps.
- IDENTICAL STRUCTURE: Keep walls, windows, and the specific original flooring texture exactly as they are.

STYLING SPECIFICATIONS:
- ALIGNMENT: Align all objects on surfaces in clean, parallel rows.
- VISIBILITY: Ensure every item that was moved is still clearly visible in its new, organized location.

Goal: A perfectly staged space using only the original inventory. Rugs/carpets are preserved 100%, existing pillows are fluffed and styled, no new items are added, no furniture (including tables) is deleted, and everything is neatly folded. Follow this plan:
${declutteringPlan || 'Tidy all items into neat arrangements on existing surfaces.'}`;

  // Use retry logic for rate limit handling
  // Put image FIRST, then prompt - this helps with image editing tasks
  const result = await withRetry(async () => {
    return await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      prompt,
    ]);
  });

  const response = result.response;
  
  // Extract the image from the response
  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (part: { inlineData?: { mimeType: string; data: string } }) => part.inlineData?.mimeType?.startsWith('image/')
  );
  
  if (!imagePart?.inlineData?.data) {
    throw new Error('No image returned from Gemini Image Generation model');
  }
  
  // Return as data URL
  const outputMimeType = imagePart.inlineData.mimeType || 'image/png';
  return `data:${outputMimeType};base64,${imagePart.inlineData.data}`;
}

export { getGeminiClient };


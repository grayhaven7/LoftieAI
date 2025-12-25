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

STRICT RULES:
- PRESERVE ALL FURNITURE: Every piece of furniture (lamps, tables, chairs, shelving, plants, wall art) MUST remain exactly where it is. Deleting furniture or decor is strictly forbidden.
- 100% CLEAR FLOOR: Every single loose item on the floor (shoes, bags, clutter, debris) MUST be moved to a shelf, table, or surface. The floor must be completely clear except for rugs and furniture legs.
- FOLD EVERY FABRIC: Every single blanket, throw, towel, or piece of clothing MUST be neatly FOLDED into a crisp, rectangular stack and placed on a surface. No draped or messy fabrics allowed.
- DELETE TRASH: Identify and remove items that are clearly garbage (crumpled paper, empty wrappers, scrap debris). 
- IDENTICAL STRUCTURE: Keep walls, windows, and floors (including rugs) exactly as they are.

STYLING SPECIFICATIONS:
- PROTECT FLOOR COVERINGS: Rugs and carpets MUST REMAIN in their EXACT ORIGINAL POSITION AND SIZE.
- FIXTURE CLEARANCE: Remove all items hanging off light fixtures, lamps, radiators, or handles. The fixtures themselves must stay.
- ALIGNMENT: Align all objects on surfaces in clean, parallel rows. Group similar items together.
- VISIBILITY: Ensure every item that was moved is still clearly visible in its new, organized location.

Goal: A perfectly staged space for any room type. All furniture is preserved, the floor is 100% clear of loose items, all fabrics are crisply folded, and the room looks professionally organized. Follow this plan:
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


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

  const prompt = `PHOTO EDIT TASK: Professional Reorganization. 

STRICT RULES:
- PRESERVE BELONGINGS: Every meaningful object (books, clothes, toys, personal items) MUST remain in the edited photo. Deleting inventory is strictly forbidden. IF UNSURE IF AN ITEM IS TRASH, KEEP IT.
- REMOVE TRASH: Only remove items that are clearly 100% garbage (crumpled paper, empty wrappers, scrap debris, empty cans/bottles).
- NO ADDITIONS: Do not add any new furniture, drawers, or items that weren't there.
- IDENTICAL STRUCTURE: Keep the room layout, walls, and existing furniture exactly as they are.

TIDYING SPECIFICATIONS:
- CLEAR THE FLOOR (PROTECT RUGS): Move all loose items (clothes, books, clutter) from the floor to an existing surface (shelf, table, etc.). Keep rugs and carpets in their EXACT ORIGINAL POSITION AND SIZE. Do not expand or resize rugs to cover more floor than they originally did.
- PROFESSIONAL STYLING: Every item must be neatly styled. FOLD blankets and clothes into crisp, rectangular shapes. FLUFF and center pillows on sofas or beds. Center objects on tables or shelves with intentional spacing.
- NEAT ARRANGEMENT: Group similar items into single, tidy, professional stacks or rows.
- ALIGNMENT: Align remaining visible objects in clean, parallel rows.
- VISIBILITY: Ensure every item that was moved is still clearly visible in its new, organized location.

Goal: The exact same room but professionally staged. Only obvious garbage is gone, all personal belongings are CRISPLY FOLDED and neatly organized on surfaces, and the floor is clear of loose items while KEEPING all rugs and carpets in their original size and position. Follow this plan:
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


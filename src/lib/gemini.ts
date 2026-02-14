import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { getSettings, ModelSettings, ImageProvider } from './settings';
import { generateImageWithOpenRouter } from './openrouter';

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
 * Get a Gemini model configured for image generation
 * @param modelName - The model to use (defaults to gemini-2.0-flash-exp-image-generation)
 * This model can generate and edit images while preserving the original appearance
 */
export function getGeminiImageGen(modelName: string = 'gemini-2.0-flash-exp-image-generation'): GenerativeModel {
  // Imagen models use a different configuration
  const isImagenModel = modelName.startsWith('imagen-');

  return getGeminiClient().getGenerativeModel({
    model: modelName,
    generationConfig: isImagenModel ? undefined : {
      // @ts-expect-error - responseModalities is valid but not in types yet
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });
}

/**
 * Get the Gemini 2.5 Flash model for fast, multimodal tasks
 */
export function getGeminiFlash(): GenerativeModel {
  return getGeminiClient().getGenerativeModel({ model: 'gemini-2.5-flash' });
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
 * Build the decluttering plan prompt with personalization and creativity adjustments.
 * Shared by /api/transform (background pre-generation) and /api/process/[id] (fallback).
 */
export function buildPlanPrompt(
  basePrompt: string,
  options?: { firstName?: string; creativityLevel?: 'strict' | 'balanced' | 'creative'; keepItems?: string }
): string {
  let prompt = basePrompt;

  const userName = options?.firstName || '';
  if (userName) {
    prompt = `The user's name is ${userName}. Use their name in the greeting (e.g. "Hello ${userName}!" instead of just "Hello!"). Do NOT add a separate greeting — only modify the existing greeting in the plan to include their name.\n\n` + prompt;
  }

  const creativityLevel = options?.creativityLevel || 'strict';
  if (creativityLevel === 'strict') {
    prompt += `\n\nIMPORTANT: Be VERY conservative. Only suggest removing the most obvious clutter. Preserve as much as possible.`;
  } else if (creativityLevel === 'creative') {
    prompt += `\n\nYou have more flexibility to suggest tidying, reorganizing items on surfaces, and light styling while still keeping all furniture and major elements in place.`;
  }

  if (options?.keepItems) {
    prompt += `\n\nUSER REQUEST - MUST PRESERVE: The user specifically wants to keep these items: "${options.keepItems}". Do NOT suggest removing or moving these items.`;
  }

  return prompt;
}

/**
 * Generate a decluttering plan from an image and clean up the result.
 * Shared by /api/transform (background pre-generation) and /api/process/[id] (fallback).
 */
export async function generateDeclutteringPlan(
  imageUrl: string,
  planPrompt: string
): Promise<string> {
  let plan = await analyzeImageWithGemini(imageUrl, planPrompt);
  plan = plan.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, '');
  plan = plan.replace(/([^\n])\s*(\d+\.\s)/g, '$1\n$2');
  return plan;
}

/**
 * Build the full prompt for image transformation
 */
function buildImageTransformationPrompt(
  basePrompt: string,
  declutteringPlan?: string,
  options?: { creativityLevel?: 'strict' | 'balanced' | 'creative'; keepItems?: string }
): string {
  let prompt = basePrompt;

  // Append the decluttering plan so the model knows what specific items to clean
  if (declutteringPlan) {
    prompt += `\n\n${declutteringPlan}`;
  }

  // Add keep items instruction if specified
  if (options?.keepItems) {
    prompt += `\n\nException: keep these items exactly as they are: "${options.keepItems}".`;
  }

  return prompt;
}

/**
 * Organize a messy room image using configured image generation model
 * Supports both Gemini (direct) and OpenRouter providers
 * Returns the edited image showing the same room with all items tidied and organized
 * @param base64Image - Base64 encoded image (with or without data URL prefix)
 * @param declutteringPlan - The organization plan generated by Gemini vision
 * @param options - Additional options for controlling the transformation
 */
export async function declutterImageWithGemini(
  base64Image: string,
  declutteringPlan?: string,
  options?: { creativityLevel?: 'strict' | 'balanced' | 'creative'; keepItems?: string; settings?: { prompts: { imageTransformation: string }; models?: ModelSettings } }
): Promise<string> {
  // Use passed settings if available (for fresh prompt reads), otherwise fall back to cached
  const currentSettings = options?.settings || getSettings();

  // Get provider and model from settings
  const imageProvider: ImageProvider = currentSettings.models?.imageProvider || 'gemini';
  let imageGenModel = currentSettings.models?.imageGeneration || 'gemini-2.0-flash-exp-image-generation';

  // Migrate deprecated model IDs to their replacements
  const modelMigrations: Record<string, string> = {
    'google/gemini-2.5-flash-image-preview': 'google/gemini-2.5-flash-image',
  };
  if (modelMigrations[imageGenModel]) {
    console.warn(`Migrating deprecated model "${imageGenModel}" to "${modelMigrations[imageGenModel]}"`);
    imageGenModel = modelMigrations[imageGenModel];
  }

  // Validate that the model is actually an image generation model (not a text-only model)
  const validGeminiImageModels = [
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-exp-image-generation',
    'imagen-3.0-generate-002',
    'imagen-3.0-capability-001',
  ];
  if (imageProvider === 'gemini' && !validGeminiImageModels.includes(imageGenModel)) {
    console.warn(`Invalid Gemini image generation model "${imageGenModel}", falling back to gemini-2.0-flash-exp-image-generation`);
    imageGenModel = 'gemini-2.0-flash-exp-image-generation';
  }

  // Build the full prompt
  const prompt = buildImageTransformationPrompt(
    currentSettings.prompts.imageTransformation,
    declutteringPlan,
    options
  );

  // Use OpenRouter if configured
  if (imageProvider === 'openrouter') {
    console.log(`Using OpenRouter with model: ${imageGenModel}`);
    try {
      return await generateImageWithOpenRouter(imageGenModel, prompt, base64Image);
    } catch (error) {
      console.error('OpenRouter image generation failed:', error);
      throw error;
    }
  }

  // Use Gemini (direct API)
  console.log(`Using Gemini direct API with model: ${imageGenModel}`);
  const model = getGeminiImageGen(imageGenModel);

  // Remove data URL prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

  // Detect mime type from data URL or default to jpeg
  let mimeType = 'image/jpeg';
  const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
  if (mimeMatch) {
    mimeType = mimeMatch[1];
  }

  // Single call with editing-focused prompt
  // Note: When an input image is provided, the model should edit it rather than generate new
  // The prompt emphasizes this to prevent the model from creating a new room from scratch
  console.log('Sending image with editing prompt...');
  const result = await withRetry(async () => {
    return await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      { text: prompt },
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


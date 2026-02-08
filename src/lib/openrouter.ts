/**
 * OpenRouter API client for image generation
 * Provides access to multiple image generation models through a unified API
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterImagePart {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string | null | Array<{
        type: 'text' | 'image_url' | 'image';
        text?: string;
        image_url?: {
          url: string;
        };
        // Some models return image data directly
        image?: string;
        // Base64 data
        b64_json?: string;
        data?: string;
      }>;
      // Images can be in a separate array (OpenRouter format)
      images?: OpenRouterImagePart[];
    };
    // Some models put the image at the choice level
    image?: {
      b64_json?: string;
      url?: string;
    };
  }>;
  // Some responses include images at the root level
  images?: Array<{
    b64_json?: string;
    url?: string;
  }>;
}

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
        errorMessage.includes('rate limit')
      ) {
        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
          console.log(`Rate limited. Retrying in ${Math.round(delay / 1000)}s... (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          continue;
        }
      }

      console.error(`OpenRouter error (attempt ${attempt + 1}):`, errorMessage);
      throw error;
    }
  }

  throw lastError;
}

function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }
  return apiKey;
}

/**
 * Generate or edit an image using OpenRouter
 * @param modelId - The OpenRouter model ID (e.g., 'openai/gpt-5-image', 'google/gemini-3-pro-image-preview')
 * @param prompt - The text prompt for image generation/editing
 * @param inputImage - Optional base64 image for editing (with or without data URL prefix)
 * @returns Base64 data URL of the generated image
 */
export async function generateImageWithOpenRouter(
  modelId: string,
  prompt: string,
  inputImage?: string
): Promise<string> {
  const apiKey = getOpenRouterApiKey();

  // Build the message content
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

  // Add input image if provided (for editing)
  if (inputImage) {
    // Ensure proper data URL format
    const imageUrl = inputImage.startsWith('data:')
      ? inputImage
      : `data:image/jpeg;base64,${inputImage}`;

    content.push({
      type: 'image_url',
      image_url: { url: imageUrl }
    });
  }

  // Add the text prompt - prefix with explicit edit instruction for image models
  const editPrefix = inputImage
    ? 'CRITICAL: You MUST edit the attached image, NOT generate a new one. Keep the EXACT same camera angle, perspective, walls, furniture positions, and room layout. This is a PHOTO EDITING task - remove objects from THIS specific photo like content-aware fill in Photoshop. DO NOT create a new room from scratch.\n\n'
    : '';
  content.push({
    type: 'text',
    text: editPrefix + prompt
  });

  // Log request details for debugging
  const inputImageSize = inputImage ? Math.round(inputImage.length / 1024) : 0;
  console.log(`OpenRouter request: model=${modelId}, hasInputImage=${!!inputImage}, inputImageSizeKB=${inputImageSize}, promptLength=${prompt.length}`);
  console.log(`OpenRouter prompt preview: ${(editPrefix + prompt).substring(0, 200)}...`);

  const response = await withRetry(async () => {
    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://loftie.ai',
        'X-Title': 'Loftie AI'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'user',
            content
          }
        ],
        modalities: ['text', 'image'],
        // Some models support additional parameters
        ...(modelId.includes('flux') ? {
          // FLUX models may have specific parameters
        } : {})
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${res.status} ${res.statusText} - ${JSON.stringify(errorData)}`);
    }

    return res.json() as Promise<OpenRouterResponse>;
  });

  // Extract the image from the response - handle multiple formats
  console.log('OpenRouter full response:', JSON.stringify(response, null, 2).slice(0, 2000));

  // Check for images at root level first
  if (response.images && response.images.length > 0) {
    const img = response.images[0];
    if (img.url) return img.url;
    if (img.b64_json) return `data:image/png;base64,${img.b64_json}`;
  }

  const choice = response.choices?.[0];
  if (!choice) {
    console.error('OpenRouter response has no choices:', JSON.stringify(response, null, 2));
    throw new Error('No response from OpenRouter');
  }

  // Check for image at choice level
  if (choice.image) {
    if (choice.image.url) return choice.image.url;
    if (choice.image.b64_json) return `data:image/png;base64,${choice.image.b64_json}`;
  }

  const message = choice.message;
  if (!message) {
    console.error('OpenRouter choice has no message:', JSON.stringify(response, null, 2));
    throw new Error('No message in OpenRouter response');
  }

  console.log('OpenRouter message structure:', JSON.stringify({
    hasImages: !!message.images,
    imagesLength: message.images?.length,
    contentType: typeof message.content,
    contentIsArray: Array.isArray(message.content),
    contentNull: message.content === null
  }));

  // Check for images in the separate images array (OpenRouter format)
  if (message.images && message.images.length > 0) {
    const firstImage = message.images[0];
    if (firstImage.image_url?.url) {
      console.log(`OpenRouter returned image via images array, size: ${Math.round(firstImage.image_url.url.length / 1024)}KB`);
      return firstImage.image_url.url;
    }
  }

  // Handle different content formats
  const messageContent = message.content;

  if (Array.isArray(messageContent)) {
    // Find the image in the content array - check multiple formats
    for (const part of messageContent) {
      if (part.type === 'image_url' && part.image_url?.url) {
        console.log(`OpenRouter returned image via content array, size: ${Math.round(part.image_url.url.length / 1024)}KB`);
        return part.image_url.url;
      }
      if (part.type === 'image' && part.image) {
        return part.image.startsWith('data:') ? part.image : `data:image/png;base64,${part.image}`;
      }
      if (part.b64_json) {
        return `data:image/png;base64,${part.b64_json}`;
      }
      if (part.data && typeof part.data === 'string' && part.data.length > 100) {
        return part.data.startsWith('data:') ? part.data : `data:image/png;base64,${part.data}`;
      }
    }
  } else if (typeof messageContent === 'string' && messageContent.length > 0) {
    // Some models return base64 directly in text or as a data URL
    if (messageContent.startsWith('data:image/')) {
      console.log(`OpenRouter returned image as data URL string, size: ${Math.round(messageContent.length / 1024)}KB`);
      return messageContent;
    }
    // Check if it's raw base64 (long string with base64 chars)
    if (messageContent.length > 1000 && messageContent.match(/^[A-Za-z0-9+/]+=*$/)) {
      console.log(`OpenRouter returned raw base64 image, size: ${Math.round(messageContent.length / 1024)}KB`);
      return `data:image/png;base64,${messageContent}`;
    }
    // Log text responses that aren't images
    console.log(`OpenRouter returned text response (not image): ${messageContent.substring(0, 200)}`);
  }

  console.error('Full OpenRouter response (could not extract image):', JSON.stringify(response, null, 2));
  throw new Error('No image returned from OpenRouter model - check logs for response format');
}

/**
 * Check if OpenRouter is configured
 */
export function isOpenRouterConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

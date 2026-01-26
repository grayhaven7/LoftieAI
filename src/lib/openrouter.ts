/**
 * OpenRouter API client for image generation
 * Provides access to multiple image generation models through a unified API
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: Array<{
        type: 'text' | 'image_url';
        text?: string;
        image_url?: {
          url: string;
        };
      }> | string;
    };
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

  // Add the text prompt
  content.push({
    type: 'text',
    text: prompt
  });

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

  // Extract the image from the response
  const message = response.choices?.[0]?.message;
  if (!message) {
    throw new Error('No response from OpenRouter');
  }

  // Handle different response formats
  const messageContent = message.content;

  if (Array.isArray(messageContent)) {
    // Find the image in the response
    const imagePart = messageContent.find(part =>
      part.type === 'image_url' && part.image_url?.url
    );

    if (imagePart?.image_url?.url) {
      return imagePart.image_url.url;
    }
  } else if (typeof messageContent === 'string') {
    // Some models return base64 directly in text or as a data URL
    if (messageContent.startsWith('data:image/')) {
      return messageContent;
    }
    // Check if it's raw base64
    if (messageContent.match(/^[A-Za-z0-9+/]+=*$/)) {
      return `data:image/png;base64,${messageContent}`;
    }
  }

  throw new Error('No image returned from OpenRouter model');
}

/**
 * Check if OpenRouter is configured
 */
export function isOpenRouterConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

/**
 * Resize a base64 image to a maximum dimension while preserving aspect ratio.
 * Uses sharp for server-side processing — fast and memory-efficient.
 */

import sharp from 'sharp';

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 85;

/**
 * Resize a base64 image if it exceeds MAX_DIMENSION on any side.
 * Returns a base64 string (without data URL prefix) and the mime type.
 */
export async function resizeImageForAPI(base64Input: string): Promise<{ base64: string; mimeType: string; resized: boolean }> {
  // Strip data URL prefix if present
  const base64Data = base64Input.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const metadata = await sharp(buffer).metadata();
  const { width, height } = metadata;

  if (!width || !height) {
    // Can't determine size, return as-is
    return { base64: base64Data, mimeType: 'image/jpeg', resized: false };
  }

  const maxSide = Math.max(width, height);

  if (maxSide <= MAX_DIMENSION) {
    // Already small enough
    return { base64: base64Data, mimeType: 'image/jpeg', resized: false };
  }

  // Resize maintaining aspect ratio
  const resizedBuffer = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  const resizedBase64 = resizedBuffer.toString('base64');
  console.log(`[Image Resize] ${width}x${height} (${(base64Data.length / 1024).toFixed(0)}KB) → ${MAX_DIMENSION}px max (${(resizedBase64.length / 1024).toFixed(0)}KB)`);

  return { base64: resizedBase64, mimeType: 'image/jpeg', resized: true };
}

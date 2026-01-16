import { put, list, del } from '@vercel/blob';
import { RoomTransformation } from './types';
import * as fs from 'fs';
import * as path from 'path';

const LOCAL_DATA_PATH = path.join(process.cwd(), 'data', 'transformations.json');
const LOCAL_UPLOADS_PATH = path.join(process.cwd(), 'public', 'uploads');

// Check if we should use local storage
function useLocalStorage(): boolean {
  const isVercel = process.env.VERCEL === '1';
  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  
  console.log(`[Storage] VERCEL=${isVercel}, hasBlobToken=${hasBlobToken}, useLocalStorage=${!hasBlobToken && !isVercel}`);
  
  if (isVercel && !hasBlobToken) {
    console.error('WARNING: Running on Vercel without BLOB_READ_WRITE_TOKEN!');
    console.error('Please set BLOB_READ_WRITE_TOKEN in your Vercel environment variables.');
  }
  
  return !hasBlobToken && !isVercel;
}

function getBlobToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN || null;
}

function ensureLocalDirs(): void {
  const dataDir = path.dirname(LOCAL_DATA_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_UPLOADS_PATH)) {
    fs.mkdirSync(LOCAL_UPLOADS_PATH, { recursive: true });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getTransformations(): Promise<RoomTransformation[]> {
  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      if (fs.existsSync(LOCAL_DATA_PATH)) {
        const data = fs.readFileSync(LOCAL_DATA_PATH, 'utf-8');
        return JSON.parse(data) as RoomTransformation[];
      }
      return [];
    } catch (error) {
      console.error('Error reading local transformations:', error);
      return [];
    }
  }

  // Use Vercel Blob - each transformation is stored as its own file
  const token = getBlobToken();
  if (!token) {
    // On Vercel, returning [] makes the UI look "empty" and hides the real issue.
    // Fail loudly so callers can surface a useful error message.
    console.error('[Storage] BLOB_READ_WRITE_TOKEN not configured');
    throw new Error('Storage is not configured: BLOB_READ_WRITE_TOKEN is missing');
  }
  
  try {
    console.log('[Storage] Fetching transformations from Vercel Blob...');
    // List all transformation blobs
    const { blobs } = await list({ prefix: 'transformations/', token });
    console.log(`[Storage] Found ${blobs.length} transformation blobs`);
    
    if (blobs.length === 0) {
      console.log('[Storage] No transformations found in blob storage');
      return [];
    }
    
    // Fetch each transformation in parallel
    const transformations = await Promise.all(
      blobs.map(async (blob) => {
        try {
          const response = await fetch(blob.url);
          if (!response.ok) {
            console.error(`[Storage] Failed to fetch blob ${blob.pathname}: ${response.status} ${response.statusText}`);
            return null;
          }
          const data = await response.json();
          return data as RoomTransformation;
        } catch (error) {
          console.error(`[Storage] Failed to fetch blob ${blob.pathname}:`, error);
          return null;
        }
      })
    );
    
    // Filter out nulls and sort by createdAt
    const valid = transformations.filter((t): t is RoomTransformation => t !== null);
    console.log(`[Storage] Loaded ${valid.length} valid transformations`);
    return valid;
  } catch (error) {
    console.error('[Storage] Error fetching transformations from blob:', error);
    if (error instanceof Error) {
      console.error('[Storage] Error details:', error.message, error.stack);
    }
    return [];
  }
}

export async function getTransformation(id: string, blobUrl?: string): Promise<RoomTransformation | null> {
  const cleanId = id.trim();
  const isVercel = process.env.VERCEL === '1';

  if (useLocalStorage()) {
    // Retry logic for local storage too, in case of file system latency or temporary locks
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const transformations = await getTransformations();
      const found = transformations.find(t => t.id === cleanId);

      if (found) {
        return found;
      }

      if (attempt < maxAttempts) {
        console.log(`[Storage] Local transformation ${cleanId} not found, retrying... (${attempt}/${maxAttempts})`);
        await sleep(200);
      }
    }

    console.log(`[Storage] Local transformation ${cleanId} not found after ${maxAttempts} attempts`);
    return null;
  }

  // Fetch single transformation directly from blob
  const token = getBlobToken();
  if (!token) {
    if (isVercel) {
      console.error(`[Storage] CRITICAL: BLOB_READ_WRITE_TOKEN is missing on Vercel!`);
      throw new Error('Storage is not configured: BLOB_READ_WRITE_TOKEN is missing. Please link a Vercel Blob store to your project.');
    }
    console.error(`[Storage] BLOB_READ_WRITE_TOKEN not configured for transformation ${cleanId}`);
    return null;
  }

  try {
    console.log(`[Storage] Fetching transformation ${cleanId} from blob...`);

    // If we have a direct blob URL, try it first (immediate, no consistency issues)
    if (blobUrl) {
      console.log(`[Storage] Trying direct blob URL: ${blobUrl}`);
      try {
        const response = await fetch(blobUrl, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json() as RoomTransformation;
          console.log(`[Storage] Successfully loaded transformation ${cleanId} via direct URL (status: ${data.status})`);
          return data;
        }
      } catch (directError) {
        console.warn(`[Storage] Direct URL fetch failed, falling back to list():`, directError);
      }
    }

    // NOTE: Vercel Blob `list()` can be briefly eventually-consistent right after a `put()`.
    const maxAttempts = 12; // Sufficient attempts with backoff

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[Storage] Search attempt ${attempt}/${maxAttempts} for ${cleanId}...`);

        // Attempt 1: Specific prefix search (fastest)
        const { blobs } = await list({
          prefix: `transformations/${cleanId}.json`,
          limit: 1,
          token,
        });

        if (blobs.length > 0) {
          console.log(`[Storage] Found blob for ${cleanId} at ${blobs[0].url}`);
          const response = await fetch(blobs[0].url, { cache: 'no-store' });

          if (response.ok) {
            const data = await response.json() as RoomTransformation;
            console.log(`[Storage] Successfully loaded transformation ${cleanId} (status: ${data.status})`);
            return data;
          } else {
            console.error(`[Storage] Failed to fetch transformation content for ${cleanId}: ${response.status}`);
          }
        }

        // Attempt 2: Broad search (list more) if specific prefix search fails after a few tries
        if (attempt > 3) {
          const { blobs: allTransformations } = await list({
            prefix: `transformations/`,
            token,
          });

          const matching = allTransformations.find(b => b.pathname.includes(cleanId));
          if (matching) {
            console.log(`[Storage] Found ${cleanId} via broad transformations list!`);
            const response = await fetch(matching.url, { cache: 'no-store' });
            if (response.ok) {
              return await response.json() as RoomTransformation;
            }
          }
        }
      } catch (innerError) {
        console.warn(`[Storage] Search attempt ${attempt} failed with error:`, innerError instanceof Error ? innerError.message : String(innerError));
        // If it's a token error, don't bother retrying
        if (innerError instanceof Error && (innerError.message.includes('token') || innerError.message.includes('401') || innerError.message.includes('403'))) {
          throw innerError;
        }
        // Otherwise, fall through to backoff and retry
      }

      // Backoff and retry
      const delayMs = attempt <= 4 ? 1000 : (attempt <= 8 ? 2000 : 4000);
      await sleep(delayMs);
    }

    console.log(`[Storage] Transformation ${cleanId} not found in blob storage after ${maxAttempts} retries`);
    return null;
  } catch (error) {
    console.error(`[Storage] Fatal error fetching transformation ${cleanId}:`, error);
    throw error; // Propagate fatal errors to the API route (returns 500 instead of confusing 404)
  }
}

export async function saveTransformation(transformation: RoomTransformation): Promise<void> {
  console.log(`Saving transformation ${transformation.id} with status ${transformation.status}`);
  
  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      const transformations = await getTransformations();
      const existingIndex = transformations.findIndex(t => t.id === transformation.id);
      
      if (existingIndex >= 0) {
        transformations[existingIndex] = transformation;
      } else {
        transformations.push(transformation);
      }
      
      fs.writeFileSync(LOCAL_DATA_PATH, JSON.stringify(transformations, null, 2));
      console.log(`Saved transformation to local file`);
      return;
    } catch (error) {
      console.error('Error saving local transformation:', error);
      throw error;
    }
  }

  // Save as individual blob file - no race conditions!
  const token = getBlobToken();
  if (!token) {
    console.error('[Storage] BLOB_READ_WRITE_TOKEN is not configured');
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured. Please set it in your Vercel environment variables.');
  }

  try {
    // Delete existing blob first to avoid conflicts and stale CDN cache
    try {
      const { blobs } = await list({ prefix: `transformations/${transformation.id}`, token });
      for (const existingBlob of blobs) {
        await del(existingBlob.url, { token });
        console.log(`[Storage] Deleted old blob: ${existingBlob.url}`);
      }
    } catch (deleteError) {
      // Ignore delete errors - blob might not exist
      console.log(`[Storage] No existing blob to delete for ${transformation.id}`);
    }

    console.log(`[Storage] Saving transformation ${transformation.id} to Vercel Blob...`);
    const blob = await put(`transformations/${transformation.id}.json`, JSON.stringify(transformation, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      token,
    });
    // Store the blob URL for direct access (avoids list() consistency issues)
    transformation.blobUrl = blob.url;
    console.log(`[Storage] Successfully saved transformation ${transformation.id} to Vercel Blob at ${blob.url}`);
  } catch (error) {
    console.error('[Storage] Error saving transformation to blob:', error);
    if (error instanceof Error) {
      console.error('[Storage] Error details:', error.message, error.stack);
    }
    throw error;
  }
}

export async function deleteTransformation(id: string): Promise<void> {
  if (useLocalStorage()) {
    const transformations = await getTransformations();
    const filtered = transformations.filter(t => t.id !== id);
    fs.writeFileSync(LOCAL_DATA_PATH, JSON.stringify(filtered, null, 2));
    return;
  }

  const token = getBlobToken();
  if (!token) return;
  
  try {
    const { blobs } = await list({ prefix: `transformations/${id}.json`, token });
    for (const blob of blobs) {
      await del(blob.url, { token });
    }
  } catch (error) {
    console.error(`Error deleting transformation ${id}:`, error);
  }
}

export async function saveImage(base64Data: string, filename: string): Promise<string> {
  console.log(`Saving image: ${filename}`);
  
  let base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  base64 = base64.replace(/[\s\r\n]+/g, '');
  
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  
  const buffer = Buffer.from(base64, 'base64');
  
  if (buffer.length === 0) {
    throw new Error('Failed to decode base64 image data');
  }
  
  console.log(`Image buffer size: ${buffer.length} bytes`);
  const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      const filePath = path.join(LOCAL_UPLOADS_PATH, filename);
      fs.writeFileSync(filePath, buffer);
      console.log(`Saved image to local file: ${filePath}`);
      return `/uploads/${filename}`;
    } catch (error) {
      console.error('Error saving local image:', error);
      throw error;
    }
  }
  
  const token = getBlobToken();
  if (!token) {
    console.error('[Storage] BLOB_READ_WRITE_TOKEN is not configured');
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured. Please set it in your Vercel environment variables.');
  }
  
  try {
    console.log(`[Storage] Saving image ${filename} to Vercel Blob...`);
    const blob = await put(`uploads/${filename}`, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });
    console.log(`[Storage] Successfully saved image to Vercel Blob: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error('[Storage] Error saving image to blob:', error);
    if (error instanceof Error) {
      console.error('[Storage] Error details:', error.message, error.stack);
    }
    throw error;
  }
}

export async function saveAudio(audioBuffer: ArrayBuffer, filename: string): Promise<string> {
  console.log(`Saving audio: ${filename}`);
  const buffer = Buffer.from(audioBuffer);

  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      const filePath = path.join(LOCAL_UPLOADS_PATH, filename);
      fs.writeFileSync(filePath, buffer);
      console.log(`Saved audio to local file: ${filePath}`);
      return `/uploads/${filename}`;
    } catch (error) {
      console.error('Error saving local audio:', error);
      throw error;
    }
  }
  
  const token = getBlobToken();
  if (!token) {
    console.error('[Storage] BLOB_READ_WRITE_TOKEN is not configured');
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured. Please set it in your Vercel environment variables.');
  }
  
  try {
    console.log(`[Storage] Saving audio ${filename} to Vercel Blob...`);
    const blob = await put(`uploads/${filename}`, buffer, {
      access: 'public',
      contentType: 'audio/mpeg',
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });
    console.log(`[Storage] Successfully saved audio to Vercel Blob: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error('[Storage] Error saving audio to blob:', error);
    if (error instanceof Error) {
      console.error('[Storage] Error details:', error.message, error.stack);
    }
    throw error;
  }
}

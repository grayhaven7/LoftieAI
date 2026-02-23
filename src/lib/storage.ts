import { put, list, del } from '@vercel/blob';
import { RoomTransformation, User, MagicLinkToken } from './types';
import * as fs from 'fs';
import * as path from 'path';

const LOCAL_DATA_PATH = path.join(process.cwd(), 'data', 'transformations.json');
const LOCAL_USERS_PATH = path.join(process.cwd(), 'data', 'users.json');
const LOCAL_TOKENS_PATH = path.join(process.cwd(), 'data', 'magic-tokens.json');
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

export interface PaginatedTransformations {
  transformations: RoomTransformation[];
  nextCursor?: string;
  hasMore: boolean;
}

export async function getTransformations(limit = 50, cursor?: string): Promise<PaginatedTransformations> {
  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      if (fs.existsSync(LOCAL_DATA_PATH)) {
        const data = fs.readFileSync(LOCAL_DATA_PATH, 'utf-8');
        const all = JSON.parse(data) as RoomTransformation[];
        // Simple pagination for local storage
        const startIndex = cursor ? parseInt(cursor, 10) : 0;
        const transformations = all.slice(startIndex, startIndex + limit);
        const nextIndex = startIndex + limit;
        return {
          transformations,
          nextCursor: nextIndex < all.length ? String(nextIndex) : undefined,
          hasMore: nextIndex < all.length,
        };
      }
      return { transformations: [], hasMore: false };
    } catch (error) {
      console.error('Error reading local transformations:', error);
      return { transformations: [], hasMore: false };
    }
  }

  // Use Vercel Blob - each transformation is stored as its own file
  const token = getBlobToken();
  if (!token) {
    console.error('[Storage] BLOB_READ_WRITE_TOKEN not configured');
    throw new Error('Storage is not configured: BLOB_READ_WRITE_TOKEN is missing');
  }

  try {
    console.log(`[Storage] Fetching transformations from Vercel Blob (limit: ${limit}, cursor: ${cursor || 'none'})...`);
    // List transformation blobs with pagination
    const { blobs, cursor: nextCursor } = await list({
      prefix: 'transformations/',
      limit,
      cursor,
      token,
    });
    console.log(`[Storage] Found ${blobs.length} transformation blobs`);

    if (blobs.length === 0) {
      console.log('[Storage] No transformations found in blob storage');
      return { transformations: [], hasMore: false };
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

    // Filter out nulls
    const valid = transformations.filter((t): t is RoomTransformation => t !== null);
    console.log(`[Storage] Loaded ${valid.length} valid transformations`);
    return {
      transformations: valid,
      nextCursor: nextCursor || undefined,
      hasMore: !!nextCursor,
    };
  } catch (error) {
    console.error('[Storage] Error fetching transformations from blob:', error);
    if (error instanceof Error) {
      console.error('[Storage] Error details:', error.message, error.stack);
    }
    return { transformations: [], hasMore: false };
  }
}

export async function getTransformation(id: string, blobUrl?: string): Promise<RoomTransformation | null> {
  const cleanId = id.trim();
  const isVercel = process.env.VERCEL === '1';

  if (useLocalStorage()) {
    // Retry logic for local storage too, in case of file system latency or temporary locks
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // For local storage, read all transformations directly
      let transformations: RoomTransformation[] = [];
      if (fs.existsSync(LOCAL_DATA_PATH)) {
        const data = fs.readFileSync(LOCAL_DATA_PATH, 'utf-8');
        transformations = JSON.parse(data) as RoomTransformation[];
      }
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

    // If we have a direct blob URL, try it first with retries (more reliable than list())
    if (blobUrl) {
      console.log(`[Storage] Trying direct blob URL: ${blobUrl}`);
      const directMaxAttempts = 5;
      for (let directAttempt = 1; directAttempt <= directMaxAttempts; directAttempt++) {
        try {
          const response = await fetch(blobUrl, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
          });
          if (response.ok) {
            const data = await response.json() as RoomTransformation;
            console.log(`[Storage] Successfully loaded transformation ${cleanId} via direct URL (status: ${data.status})`);
            return data;
          }
          // Log the error but retry
          console.warn(`[Storage] Direct URL attempt ${directAttempt}/${directMaxAttempts} returned ${response.status}`);
        } catch (directError) {
          console.warn(`[Storage] Direct URL attempt ${directAttempt}/${directMaxAttempts} failed:`, directError);
        }
        // Wait before retry (exponential backoff)
        if (directAttempt < directMaxAttempts) {
          await sleep(Math.min(1000 * Math.pow(1.5, directAttempt - 1), 5000));
        }
      }
      console.warn(`[Storage] Direct URL fetch failed after ${directMaxAttempts} attempts, falling back to list()`);
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
      // For local storage, read all transformations directly (not paginated)
      let transformations: RoomTransformation[] = [];
      if (fs.existsSync(LOCAL_DATA_PATH)) {
        const data = fs.readFileSync(LOCAL_DATA_PATH, 'utf-8');
        transformations = JSON.parse(data) as RoomTransformation[];
      }
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
    // Note: With addRandomSuffix: false, put() will overwrite existing blobs at the same path.
    // We removed the delete-before-save logic because:
    // 1. It's not atomic and can cause race conditions (client fetches between delete and put)
    // 2. list() has eventual consistency issues
    // 3. put() with addRandomSuffix: false should handle overwrites correctly

    console.log(`[Storage] Saving transformation ${transformation.id} to Vercel Blob...`);
    const blob = await put(`transformations/${transformation.id}.json`, JSON.stringify(transformation, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      token,
      cacheControlMaxAge: 0, // Disable CDN caching for transformations since they change state
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
    // For local storage, read all transformations directly
    let transformations: RoomTransformation[] = [];
    if (fs.existsSync(LOCAL_DATA_PATH)) {
      const data = fs.readFileSync(LOCAL_DATA_PATH, 'utf-8');
      transformations = JSON.parse(data) as RoomTransformation[];
    }
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
      cacheControlMaxAge: 31536000, // 1 year - images are immutable
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
      cacheControlMaxAge: 31536000, // 1 year - audio files are immutable
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

// ==================== User Storage ====================

export async function getUser(id: string): Promise<User | null> {
  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      if (fs.existsSync(LOCAL_USERS_PATH)) {
        const data = fs.readFileSync(LOCAL_USERS_PATH, 'utf-8');
        const users = JSON.parse(data) as User[];
        return users.find(u => u.id === id) || null;
      }
      return null;
    } catch (error) {
      console.error('[Storage] Error reading local user:', error);
      return null;
    }
  }

  const token = getBlobToken();
  if (!token) return null;

  try {
    const { blobs } = await list({ prefix: `users/${id}.json`, limit: 1, token });
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url, { cache: 'no-store' });
      if (response.ok) return await response.json() as User;
    }
    return null;
  } catch (error) {
    console.error(`[Storage] Error fetching user ${id}:`, error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase().trim();

  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      if (fs.existsSync(LOCAL_USERS_PATH)) {
        const data = fs.readFileSync(LOCAL_USERS_PATH, 'utf-8');
        const users = JSON.parse(data) as User[];
        return users.find(u => u.email === normalizedEmail) || null;
      }
      return null;
    } catch (error) {
      console.error('[Storage] Error reading local users:', error);
      return null;
    }
  }

  const token = getBlobToken();
  if (!token) return null;

  try {
    const { blobs } = await list({ prefix: 'users/', token });
    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url, { cache: 'no-store' });
        if (response.ok) {
          const user = await response.json() as User;
          if (user.email === normalizedEmail) return user;
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error('[Storage] Error searching users by email:', error);
    return null;
  }
}

export async function saveUser(user: User): Promise<void> {
  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      let users: User[] = [];
      if (fs.existsSync(LOCAL_USERS_PATH)) {
        const data = fs.readFileSync(LOCAL_USERS_PATH, 'utf-8');
        users = JSON.parse(data) as User[];
      }
      const existingIndex = users.findIndex(u => u.id === user.id);
      if (existingIndex >= 0) {
        users[existingIndex] = user;
      } else {
        users.push(user);
      }
      fs.writeFileSync(LOCAL_USERS_PATH, JSON.stringify(users, null, 2));
      return;
    } catch (error) {
      console.error('[Storage] Error saving local user:', error);
      throw error;
    }
  }

  const token = getBlobToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not configured');

  try {
    await put(`users/${user.id}.json`, JSON.stringify(user, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      token,
      cacheControlMaxAge: 0,
    });
  } catch (error) {
    console.error('[Storage] Error saving user to blob:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<User[]> {
  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      if (fs.existsSync(LOCAL_USERS_PATH)) {
        const data = fs.readFileSync(LOCAL_USERS_PATH, 'utf-8');
        return JSON.parse(data) as User[];
      }
      return [];
    } catch (error) {
      console.error('[Storage] Error reading local users:', error);
      return [];
    }
  }

  const token = getBlobToken();
  if (!token) return [];

  try {
    const { blobs } = await list({ prefix: 'users/', token });
    const users = await Promise.all(
      blobs.map(async (blob) => {
        try {
          const response = await fetch(blob.url, { cache: 'no-store' });
          if (response.ok) return await response.json() as User;
          return null;
        } catch {
          return null;
        }
      })
    );
    return users.filter((u): u is User => u !== null);
  } catch (error) {
    console.error('[Storage] Error fetching all users:', error);
    return [];
  }
}

// ==================== Magic Link Token Storage ====================

export async function saveMagicLinkToken(tokenData: MagicLinkToken): Promise<void> {
  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      let tokens: MagicLinkToken[] = [];
      if (fs.existsSync(LOCAL_TOKENS_PATH)) {
        const data = fs.readFileSync(LOCAL_TOKENS_PATH, 'utf-8');
        tokens = JSON.parse(data) as MagicLinkToken[];
      }
      tokens.push(tokenData);
      fs.writeFileSync(LOCAL_TOKENS_PATH, JSON.stringify(tokens, null, 2));
      return;
    } catch (error) {
      console.error('[Storage] Error saving local magic link token:', error);
      throw error;
    }
  }

  const token = getBlobToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not configured');

  try {
    await put(`magic-tokens/${tokenData.token}.json`, JSON.stringify(tokenData, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      token,
      cacheControlMaxAge: 0,
    });
  } catch (error) {
    console.error('[Storage] Error saving magic link token to blob:', error);
    throw error;
  }
}

export async function getMagicLinkToken(tokenId: string): Promise<MagicLinkToken | null> {
  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      if (fs.existsSync(LOCAL_TOKENS_PATH)) {
        const data = fs.readFileSync(LOCAL_TOKENS_PATH, 'utf-8');
        const tokens = JSON.parse(data) as MagicLinkToken[];
        return tokens.find(t => t.token === tokenId) || null;
      }
      return null;
    } catch (error) {
      console.error('[Storage] Error reading local magic link token:', error);
      return null;
    }
  }

  const token = getBlobToken();
  if (!token) return null;

  try {
    const { blobs } = await list({ prefix: `magic-tokens/${tokenId}.json`, limit: 1, token });
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url, { cache: 'no-store' });
      if (response.ok) return await response.json() as MagicLinkToken;
    }
    return null;
  } catch (error) {
    console.error(`[Storage] Error fetching magic link token ${tokenId}:`, error);
    return null;
  }
}

export async function markMagicLinkTokenUsed(tokenId: string): Promise<void> {
  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      if (fs.existsSync(LOCAL_TOKENS_PATH)) {
        const data = fs.readFileSync(LOCAL_TOKENS_PATH, 'utf-8');
        const tokens = JSON.parse(data) as MagicLinkToken[];
        const idx = tokens.findIndex(t => t.token === tokenId);
        if (idx >= 0) {
          tokens[idx].used = true;
          fs.writeFileSync(LOCAL_TOKENS_PATH, JSON.stringify(tokens, null, 2));
        }
      }
      return;
    } catch (error) {
      console.error('[Storage] Error marking local token as used:', error);
      throw error;
    }
  }

  const tokenData = await getMagicLinkToken(tokenId);
  if (!tokenData) return;

  tokenData.used = true;
  const blobToken = getBlobToken();
  if (!blobToken) return;

  try {
    await put(`magic-tokens/${tokenId}.json`, JSON.stringify(tokenData, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      token: blobToken,
      cacheControlMaxAge: 0,
    });
  } catch (error) {
    console.error('[Storage] Error marking token as used in blob:', error);
    throw error;
  }
}

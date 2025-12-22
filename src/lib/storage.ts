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
  
  if (isVercel && !hasBlobToken) {
    console.error('WARNING: Running on Vercel without BLOB_READ_WRITE_TOKEN!');
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
    console.error('BLOB_READ_WRITE_TOKEN not configured');
    return [];
  }
  
  try {
    // List all transformation blobs
    const { blobs } = await list({ prefix: 'transformations/', token });
    console.log(`Found ${blobs.length} transformation blobs`);
    
    if (blobs.length === 0) {
      return [];
    }
    
    // Fetch each transformation in parallel
    const transformations = await Promise.all(
      blobs.map(async (blob) => {
        try {
          const response = await fetch(blob.url);
          if (!response.ok) return null;
          const data = await response.json();
          return data as RoomTransformation;
        } catch {
          console.error(`Failed to fetch blob: ${blob.pathname}`);
          return null;
        }
      })
    );
    
    // Filter out nulls and sort by createdAt
    const valid = transformations.filter((t): t is RoomTransformation => t !== null);
    console.log(`Loaded ${valid.length} valid transformations`);
    return valid;
  } catch (error) {
    console.error('Error fetching transformations from blob:', error);
    return [];
  }
}

export async function getTransformation(id: string): Promise<RoomTransformation | null> {
  if (useLocalStorage()) {
    const transformations = await getTransformations();
    return transformations.find(t => t.id === id) || null;
  }

  // Fetch single transformation directly from blob
  const token = getBlobToken();
  if (!token) return null;
  
  try {
    const { blobs } = await list({ prefix: `transformations/${id}.json`, token });
    if (blobs.length === 0) return null;
    
    const response = await fetch(blobs[0].url);
    if (!response.ok) return null;
    
    return await response.json() as RoomTransformation;
  } catch (error) {
    console.error(`Error fetching transformation ${id}:`, error);
    return null;
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
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }
  
  try {
    await put(`transformations/${transformation.id}.json`, JSON.stringify(transformation, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      token,
    });
    console.log(`Saved transformation ${transformation.id} to Vercel Blob`);
  } catch (error) {
    console.error('Error saving transformation to blob:', error);
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
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }
  
  try {
    const blob = await put(`uploads/${filename}`, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      token,
    });
    console.log(`Saved image to Vercel Blob: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error('Error saving image to blob:', error);
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
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }
  
  try {
    const blob = await put(`uploads/${filename}`, buffer, {
      access: 'public',
      contentType: 'audio/mpeg',
      addRandomSuffix: false,
      token,
    });
    console.log(`Saved audio to Vercel Blob: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error('Error saving audio to blob:', error);
    throw error;
  }
}

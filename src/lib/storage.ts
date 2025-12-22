import { put, list } from '@vercel/blob';
import { RoomTransformation } from './types';
import * as fs from 'fs';
import * as path from 'path';

const TRANSFORMATIONS_BLOB_KEY = 'transformations.json';
const LOCAL_DATA_PATH = path.join(process.cwd(), 'data', 'transformations.json');
const LOCAL_UPLOADS_PATH = path.join(process.cwd(), 'public', 'uploads');

// Check if we should use local storage (no blob token configured)
function useLocalStorage(): boolean {
  // Only use local storage if BLOB_READ_WRITE_TOKEN is not set AND we're not on Vercel
  // On Vercel, the file system is read-only so we must use Blob storage
  const isVercel = process.env.VERCEL === '1';
  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  
  if (isVercel && !hasBlobToken) {
    console.error('WARNING: Running on Vercel without BLOB_READ_WRITE_TOKEN. Storage will not work!');
  }
  
  return !hasBlobToken && !isVercel;
}

function getBlobToken(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return token || null;
}

// Ensure local directories exist
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
  // Use local storage in development
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

  // Use Vercel Blob in production
  const token = getBlobToken();
  if (!token) {
    console.error('BLOB_READ_WRITE_TOKEN is not configured - cannot read transformations');
    return [];
  }
  
  try {
    const { blobs } = await list({ prefix: TRANSFORMATIONS_BLOB_KEY, token });
    console.log(`Found ${blobs.length} blobs with prefix ${TRANSFORMATIONS_BLOB_KEY}`);
    
    if (blobs.length === 0) {
      console.log('No transformations.json blob found, returning empty array');
      return [];
    }
    
    const response = await fetch(blobs[0].url);
    if (!response.ok) {
      console.error(`Failed to fetch transformations.json: ${response.status}`);
      return [];
    }
    
    const text = await response.text();
    
    // Handle empty or invalid JSON
    if (!text || text.trim() === '') {
      console.log('transformations.json is empty, returning empty array');
      return [];
    }
    
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) {
        console.error('transformations.json is not an array, returning empty array');
        return [];
      }
      console.log(`Loaded ${data.length} transformations from blob`);
      return data as RoomTransformation[];
    } catch (parseError) {
      console.error('Failed to parse transformations.json:', parseError);
      console.error('Raw content:', text.substring(0, 200));
      return [];
    }
  } catch (error) {
    console.error('Error fetching transformations from blob:', error);
    return [];
  }
}

export async function getTransformation(id: string): Promise<RoomTransformation | null> {
  const transformations = await getTransformations();
  return transformations.find(t => t.id === id) || null;
}

export async function saveTransformation(transformation: RoomTransformation): Promise<void> {
  console.log(`Saving transformation ${transformation.id} with status ${transformation.status}`);
  
  const transformations = await getTransformations();
  const existingIndex = transformations.findIndex(t => t.id === transformation.id);
  
  if (existingIndex >= 0) {
    transformations[existingIndex] = transformation;
  } else {
    transformations.push(transformation);
  }
  
  // Use local storage in development
  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      fs.writeFileSync(LOCAL_DATA_PATH, JSON.stringify(transformations, null, 2));
      console.log(`Saved transformation to local file`);
      return;
    } catch (error) {
      console.error('Error saving local transformation:', error);
      throw error;
    }
  }

  // Use Vercel Blob in production
  const token = getBlobToken();
  if (!token) {
    console.error('BLOB_READ_WRITE_TOKEN is not configured - cannot save transformation');
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }
  
  try {
    await put(TRANSFORMATIONS_BLOB_KEY, JSON.stringify(transformations, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      token,
    });
    console.log(`Saved transformation to Vercel Blob`);
  } catch (error) {
    console.error('Error saving transformation to blob:', error);
    throw error;
  }
}

export async function saveImage(base64Data: string, filename: string): Promise<string> {
  console.log(`Saving image: ${filename}`);
  
  // Remove data URL prefix if present
  let base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  
  // Clean up base64 string - remove whitespace, newlines, and carriage returns
  base64 = base64.replace(/[\s\r\n]+/g, '');
  
  // Ensure proper base64 padding
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  
  const buffer = Buffer.from(base64, 'base64');
  
  // Validate that we have valid image data
  if (buffer.length === 0) {
    throw new Error('Failed to decode base64 image data');
  }
  
  console.log(`Image buffer size: ${buffer.length} bytes`);
  
  // Determine content type from filename
  const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

  // Use local storage in development
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
  
  // Use Vercel Blob in production
  const token = getBlobToken();
  if (!token) {
    console.error('BLOB_READ_WRITE_TOKEN is not configured - cannot save image');
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

export async function saveImageFromUrl(imageUrl: string, filename: string): Promise<string> {
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Determine content type from filename
  const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

  // Use local storage in development
  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      const filePath = path.join(LOCAL_UPLOADS_PATH, filename);
      fs.writeFileSync(filePath, buffer);
      return `/uploads/${filename}`;
    } catch (error) {
      console.error('Error saving local image from URL:', error);
      throw error;
    }
  }
  
  // Use Vercel Blob in production
  const token = getBlobToken();
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }
  
  const blob = await put(`uploads/${filename}`, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    token,
  });
  
  return blob.url;
}

export async function saveAudio(audioBuffer: ArrayBuffer, filename: string): Promise<string> {
  const buffer = Buffer.from(audioBuffer);

  // Use local storage in development
  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      const filePath = path.join(LOCAL_UPLOADS_PATH, filename);
      fs.writeFileSync(filePath, buffer);
      return `/uploads/${filename}`;
    } catch (error) {
      console.error('Error saving local audio:', error);
      throw error;
    }
  }
  
  // Use Vercel Blob in production
  const token = getBlobToken();
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }
  
  const blob = await put(`uploads/${filename}`, buffer, {
    access: 'public',
    contentType: 'audio/mpeg',
    addRandomSuffix: false,
    token,
  });
  
  return blob.url;
}

import { put, list } from '@vercel/blob';
import { RoomTransformation } from './types';
import * as fs from 'fs';
import * as path from 'path';

const TRANSFORMATIONS_BLOB_KEY = 'transformations.json';
const LOCAL_DATA_PATH = path.join(process.cwd(), 'data', 'transformations.json');
const LOCAL_UPLOADS_PATH = path.join(process.cwd(), 'public', 'uploads');

// Check if we should use local storage (no blob token configured)
function useLocalStorage(): boolean {
  // Only use local storage if BLOB_READ_WRITE_TOKEN is not set
  // In production on Vercel, this token should always be set
  return !process.env.BLOB_READ_WRITE_TOKEN;
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
  // Always try local storage first in development
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
  try {
    const token = getBlobToken();
    if (!token) {
      throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
    }
    
    const { blobs } = await list({ prefix: TRANSFORMATIONS_BLOB_KEY, token });
    
    if (blobs.length === 0) {
      return [];
    }
    
    const response = await fetch(blobs[0].url);
    const data = await response.json();
    return data as RoomTransformation[];
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
      return;
    } catch (error) {
      console.error('Error saving local transformation:', error);
      throw error;
    }
  }

  // Use Vercel Blob in production
  const token = getBlobToken();
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }
  
  await put(TRANSFORMATIONS_BLOB_KEY, JSON.stringify(transformations, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    token,
  });
}

export async function saveImage(base64Data: string, filename: string): Promise<string> {
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
  
  // Determine content type from filename
  const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

  // Use local storage in development
  if (useLocalStorage()) {
    try {
      ensureLocalDirs();
      const filePath = path.join(LOCAL_UPLOADS_PATH, filename);
      fs.writeFileSync(filePath, buffer);
      // Return relative URL for local development
      return `/uploads/${filename}`;
    } catch (error) {
      console.error('Error saving local image:', error);
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

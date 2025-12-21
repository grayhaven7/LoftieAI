import { put, list } from '@vercel/blob';
import { RoomTransformation } from './types';

const TRANSFORMATIONS_BLOB_KEY = 'transformations.json';

function getBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }
  return token;
}

export async function getTransformations(): Promise<RoomTransformation[]> {
  try {
    const token = getBlobToken();
    
    // List blobs to find our transformations file
    const { blobs } = await list({ prefix: TRANSFORMATIONS_BLOB_KEY, token });
    
    if (blobs.length === 0) {
      return [];
    }
    
    // Fetch the blob content
    const response = await fetch(blobs[0].url);
    const data = await response.json();
    return data as RoomTransformation[];
  } catch (error) {
    console.error('Error fetching transformations:', error);
    return [];
  }
}

export async function getTransformation(id: string): Promise<RoomTransformation | null> {
  const transformations = await getTransformations();
  return transformations.find(t => t.id === id) || null;
}

export async function saveTransformation(transformation: RoomTransformation): Promise<void> {
  const token = getBlobToken();
  const transformations = await getTransformations();
  const existingIndex = transformations.findIndex(t => t.id === transformation.id);
  
  if (existingIndex >= 0) {
    transformations[existingIndex] = transformation;
  } else {
    transformations.push(transformation);
  }
  
  // Save to Vercel Blob (overwrite existing)
  await put(TRANSFORMATIONS_BLOB_KEY, JSON.stringify(transformations, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    token,
  });
}

export async function saveImage(base64Data: string, filename: string): Promise<string> {
  const token = getBlobToken();
  
  // Remove data URL prefix if present
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  
  // Determine content type from filename
  const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
  
  const blob = await put(`uploads/${filename}`, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    token,
  });
  
  return blob.url;
}

export async function saveImageFromUrl(imageUrl: string, filename: string): Promise<string> {
  const token = getBlobToken();
  
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Determine content type from filename
  const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
  
  const blob = await put(`uploads/${filename}`, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    token,
  });
  
  return blob.url;
}

export async function saveAudio(audioBuffer: ArrayBuffer, filename: string): Promise<string> {
  const token = getBlobToken();
  
  const buffer = Buffer.from(audioBuffer);
  
  const blob = await put(`uploads/${filename}`, buffer, {
    access: 'public',
    contentType: 'audio/mpeg',
    addRandomSuffix: false,
    token,
  });
  
  return blob.url;
}

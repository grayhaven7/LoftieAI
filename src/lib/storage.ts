import { promises as fs } from 'fs';
import path from 'path';
import { RoomTransformation } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const TRANSFORMATIONS_FILE = path.join(DATA_DIR, 'transformations.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

async function ensureDirectories() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function getTransformations(): Promise<RoomTransformation[]> {
  await ensureDirectories();
  try {
    const data = await fs.readFile(TRANSFORMATIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function getTransformation(id: string): Promise<RoomTransformation | null> {
  const transformations = await getTransformations();
  return transformations.find(t => t.id === id) || null;
}

export async function saveTransformation(transformation: RoomTransformation): Promise<void> {
  await ensureDirectories();
  const transformations = await getTransformations();
  const existingIndex = transformations.findIndex(t => t.id === transformation.id);
  
  if (existingIndex >= 0) {
    transformations[existingIndex] = transformation;
  } else {
    transformations.push(transformation);
  }
  
  await fs.writeFile(TRANSFORMATIONS_FILE, JSON.stringify(transformations, null, 2));
}

export async function saveImage(base64Data: string, filename: string): Promise<string> {
  await ensureDirectories();
  
  // Remove data URL prefix if present
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  
  const filepath = path.join(UPLOADS_DIR, filename);
  await fs.writeFile(filepath, buffer);
  
  return `/uploads/${filename}`;
}

export async function saveImageFromUrl(imageUrl: string, filename: string): Promise<string> {
  await ensureDirectories();
  
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const filepath = path.join(UPLOADS_DIR, filename);
  await fs.writeFile(filepath, buffer);
  
  return `/uploads/${filename}`;
}


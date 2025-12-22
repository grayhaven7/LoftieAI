import { NextResponse } from 'next/server';
import { getTransformations } from '@/lib/storage';

export async function GET() {
  try {
    const transformations = await getTransformations();
    
    // Sort by createdAt descending (newest first)
    const sorted = transformations.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(sorted);
  } catch (error) {
    console.error('Error fetching transformations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transformations' },
      { status: 500 }
    );
  }
}



